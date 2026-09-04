/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { DataSource, EntityManager } from 'typeorm';
import { DomainEvent, DomainEventTypes } from '@dzongjuk/contracts';
import { ReportResourceProjectionEntity, ReportResourceType, ReportingAuditEventEntity, ReportingProcessedEventEntity } from './entities';

interface ProjectionState { type: ReportResourceType; id: string; status: string; }

@Injectable()
export class ReportingEventConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ReportingEventConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL is not configured; reporting projections will remain unchanged.'); return; }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      await this.channel.assertExchange('dzongjuk.dead-letter', 'topic', { durable: true });
      const queue = 'reporting-service.domain-events';
      await this.channel.assertQueue(queue, { durable: true, deadLetterExchange: 'dzongjuk.dead-letter' });
      await this.channel.bindQueue(queue, 'dzongjuk.domain', '#');
      await this.channel.prefetch(50);
      await this.channel.consume(queue, (message) => { if (message) void this.handle(message); });
    } catch (error) { this.logger.error('Unable to start reporting event consumer.', error); }
  }

  async onApplicationShutdown() { await this.channel?.close(); await this.connection?.close(); }

  private async handle(message: ConsumeMessage) {
    try {
      const event = JSON.parse(message.content.toString('utf8')) as DomainEvent<Record<string, unknown>>;
      if (!event.eventId || !event.eventType || !event.source || !event.occurredAt) throw new Error('Invalid domain event envelope.');
      await this.dataSource.transaction(async (manager) => {
        if (await manager.existsBy(ReportingProcessedEventEntity, { eventId: event.eventId })) return;
        await this.audit(manager, event);
        const state = this.state(event);
        if (state) await this.project(manager, event, state);
        if (event.eventType === DomainEventTypes.ResultsDeclared && this.uuid(event.payload.examId)) {
          await manager.createQueryBuilder().update(ReportResourceProjectionEntity).set({ status: 'PUBLISHED' })
            .where('"resourceType" = :type AND "examId" = :examId', { type: ReportResourceType.Score, examId: event.payload.examId }).execute();
        }
        await manager.save(ReportingProcessedEventEntity, manager.create(ReportingProcessedEventEntity, { eventId: event.eventId, eventType: event.eventType }));
      });
      this.channel?.ack(message);
    } catch (error) {
      this.logger.error('Reporting event moved to the dead-letter exchange.', error);
      this.channel?.nack(message, false, false);
    }
  }

  private async project(manager: EntityManager, event: DomainEvent<Record<string, unknown>>, state: ProjectionState) {
    const existing = await manager.findOneBy(ReportResourceProjectionEntity, { resourceType: state.type, resourceId: state.id });
    // Events can arrive out of order across services; an older event must not
    // overwrite a projection a newer one already produced.
    if (existing && existing.occurredAt > new Date(event.occurredAt)) return;
    const projection = manager.create(ReportResourceProjectionEntity, this.projectionFields(event, state, existing));
    await manager.save(projection);
  }

  /** Merges this event's fields onto the current projection row, if any. */
  private projectionFields(event: DomainEvent<Record<string, unknown>>, state: ProjectionState, existing: ReportResourceProjectionEntity | null) {
    return {
      ...existing,
      resourceType: state.type,
      resourceId: state.id,
      examId: this.uuid(event.payload.examId) ?? existing?.examId ?? null,
      ownerUserId: this.uuid(event.payload.testTakerUserId) ?? existing?.ownerUserId ?? null,
      status: state.status,
      dimensions: { ...(existing?.dimensions ?? {}), ...this.dimensions(event.payload) },
      sourceEventId: event.eventId,
      occurredAt: new Date(event.occurredAt),
    };
  }

  private audit(manager: EntityManager, event: DomainEvent<Record<string, unknown>>) {
    const actor = event.payload.actorId ?? event.payload.actorUserId ?? event.payload.createdByUserId ?? event.payload.approvedByUserId;
    return manager.save(ReportingAuditEventEntity, manager.create(ReportingAuditEventEntity, {
      eventId: event.eventId, action: event.eventType, source: event.source, resourceId: event.resourceId,
      actorUserId: this.uuid(actor), correlationId: event.correlationId, safeData: this.auditData(event.payload), occurredAt: new Date(event.occurredAt),
    }));
  }

  private state(event: DomainEvent<Record<string, unknown>>): ProjectionState | null {
    const p = event.payload;
    const map: Record<string, [ReportResourceType, string, string]> = {
      [DomainEventTypes.ExamCreated]: [ReportResourceType.Examination, String(p.examId ?? event.resourceId), String(p.status ?? 'DRAFT')],
      [DomainEventTypes.ExamStatusChanged]: [ReportResourceType.Examination, String(p.examId ?? event.resourceId), String(p.status)],
      [DomainEventTypes.ApplicationSubmitted]: [ReportResourceType.Application, String(p.applicationId), 'SUBMITTED'],
      [DomainEventTypes.ApplicationWaitlisted]: [ReportResourceType.Application, String(p.applicationId), 'WAITLISTED'],
      [DomainEventTypes.ApplicationCancelled]: [ReportResourceType.Application, String(p.applicationId), 'CANCELLED'],
      [DomainEventTypes.WaitlistCandidatePromoted]: [ReportResourceType.Application, String(p.applicationId), 'SUBMITTED'],
      [DomainEventTypes.ApplicationReturned]: [ReportResourceType.Application, String(p.applicationId), 'RETURNED'],
      [DomainEventTypes.ApplicationVerified]: [ReportResourceType.Application, String(p.applicationId), 'VERIFIED'],
      [DomainEventTypes.CandidateMarkedAbsent]: [ReportResourceType.Application, String(p.applicationId), 'ABSENT'],
      [DomainEventTypes.QuestionPaperUploaded]: [ReportResourceType.QuestionPaper, String(p.questionPaperId), 'UPLOADED'],
      [DomainEventTypes.SamplePaperPublished]: [ReportResourceType.QuestionPaper, String(p.questionPaperId), 'SAMPLE_PUBLISHED'],
      [DomainEventTypes.CommitteeConfigured]: [ReportResourceType.Committee, String(p.committeeId ?? event.resourceId), 'ACTIVE'],
      [DomainEventTypes.ScoreSubmitted]: [ReportResourceType.Score, String(p.scoreSheetId), 'SUBMITTED'],
      [DomainEventTypes.ScoreRevised]: [ReportResourceType.Score, String(p.scoreSheetId), 'REVISED'],
      [DomainEventTypes.ResultsDeclared]: [ReportResourceType.ResultDeclaration, String(p.declarationId), 'DECLARED'],
      [DomainEventTypes.AppealSubmitted]: [ReportResourceType.Appeal, String(p.appealId), 'SUBMITTED'],
      [DomainEventTypes.AppealPaymentCompleted]: [ReportResourceType.Appeal, String(p.appealId), 'PENDING_COMMITTEE'],
      [DomainEventTypes.AppealRevisionRequested]: [ReportResourceType.Appeal, String(p.appealId), 'REVISION_REQUESTED'],
      [DomainEventTypes.AppealApproved]: [ReportResourceType.Appeal, String(p.appealId), 'APPROVED_PENDING_SCORE_UPDATE'],
      [DomainEventTypes.AppealRejected]: [ReportResourceType.Appeal, String(p.appealId), 'REJECTED'],
      [DomainEventTypes.AppealCompleted]: [ReportResourceType.Appeal, String(p.appealId), String(p.outcome ?? 'COMPLETED')],
      [DomainEventTypes.CertificateIssued]: [ReportResourceType.Certificate, String(p.certificateId), 'ACTIVE'],
      [DomainEventTypes.CertificateRevoked]: [ReportResourceType.Certificate, String(p.certificateId), 'REVOKED'],
    };
    const value = map[event.eventType];
    return value ? { type: value[0], id: value[1], status: value[2] } : null;
  }

  private dimensions(payload: Record<string, unknown>) {
    const allowed = [
      'applicationId', 'appealId', 'certificateNumber', 'code', 'title', 'examDate', 'registrationStart', 'registrationEnd',
      'capacity', 'venue', 'committeeId', 'memberCount', 'headUserId', 'version', 'overallScore', 'bandLabel', 'cefrLevel',
      'writing', 'reading', 'listening', 'speaking', 'outcome', 'skills', 'issuedAt', 'validUntil',
    ];
    return Object.fromEntries(allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  }

  private auditData(payload: Record<string, unknown>) {
    const allowed = ['examId', 'applicationId', 'appealId', 'certificateId', 'scoreSheetId', 'questionPaperId', 'committeeId', 'status', 'version', 'outcome'];
    return Object.fromEntries(allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  }

  private uuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null; }
}
