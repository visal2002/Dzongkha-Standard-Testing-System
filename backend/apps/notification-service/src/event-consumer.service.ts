/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { DataSource } from 'typeorm';
import { DomainEvent, DomainEventTypes } from '@dzongjuk/contracts';
import {
  NotificationChannel, NotificationDeliveryEntity, NotificationDeliveryStatus, NotificationEntity,
  NotificationProcessedEventEntity, NotificationTemplateEntity, NotificationTemplateStatus,
} from './entities';

const TARGETED_EVENTS = [
  DomainEventTypes.ApplicationSubmitted, DomainEventTypes.ApplicationWaitlisted, DomainEventTypes.ApplicationCancelled,
  DomainEventTypes.WaitlistCandidatePromoted, DomainEventTypes.ApplicationReturned, DomainEventTypes.ApplicationVerified,
  DomainEventTypes.CandidateMarkedAbsent, DomainEventTypes.AppealSubmitted, DomainEventTypes.AppealPaymentCompleted,
  DomainEventTypes.AppealRevisionRequested, DomainEventTypes.AppealApproved, DomainEventTypes.AppealRejected,
  DomainEventTypes.AppealCompleted, DomainEventTypes.ScoreRevised,
  DomainEventTypes.CertificateIssued, DomainEventTypes.CertificateRevoked,
];

@Injectable()
export class NotificationEventConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationEventConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL is not configured; notifications will not be projected.'); return; }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      await this.channel.assertExchange('dzongjuk.dead-letter', 'topic', { durable: true });
      const queue = 'notification-service.user-events';
      await this.channel.assertQueue(queue, { durable: true, deadLetterExchange: 'dzongjuk.dead-letter' });
      for (const eventType of TARGETED_EVENTS) await this.channel.bindQueue(queue, 'dzongjuk.domain', eventType);
      await this.channel.prefetch(20);
      await this.channel.consume(queue, (message) => { if (message) void this.handle(message); });
    } catch (error) { this.logger.error('Unable to start notification event consumer.', error); }
  }

  async onApplicationShutdown() { await this.channel?.close(); await this.connection?.close(); }

  private async handle(message: ConsumeMessage) {
    try {
      const event = JSON.parse(message.content.toString('utf8')) as DomainEvent<Record<string, unknown>>;
      await this.dataSource.transaction(async (manager) => {
        if (await manager.existsBy(NotificationProcessedEventEntity, { eventId: event.eventId })) return;
        const userId = event.payload.testTakerUserId;
        if (typeof userId !== 'string') throw new Error(`${event.eventType} is missing testTakerUserId.`);
        const now = new Date();
        const templates = (await manager.findBy(NotificationTemplateEntity, { eventType: event.eventType, status: NotificationTemplateStatus.Approved }))
          .filter((item) => item.effectiveFrom <= now && (!item.effectiveTo || item.effectiveTo > now));
        const inApp = templates.find((item) => item.channel === NotificationChannel.InApp);
        if (!inApp) throw new Error(`No approved in-app template exists for ${event.eventType}.`);
        const notification = await manager.save(NotificationEntity, manager.create(NotificationEntity, {
          userId, eventType: event.eventType, templateId: inApp.id,
          title: this.render(inApp.titleTemplate, event.payload), message: this.render(inApp.bodyTemplate, event.payload),
          safeMetadata: this.safeMetadata(event.payload),
        }));
        for (const channel of new Set(templates.map((item) => item.channel))) {
          const delivered = channel === NotificationChannel.InApp;
          await manager.save(NotificationDeliveryEntity, manager.create(NotificationDeliveryEntity, {
            notificationId: notification.id, channel,
            status: delivered ? NotificationDeliveryStatus.Delivered : NotificationDeliveryStatus.PendingProvider,
            attempts: delivered ? 1 : 0, deliveredAt: delivered ? now : null,
          }));
        }
        await manager.save(NotificationProcessedEventEntity, manager.create(NotificationProcessedEventEntity, { eventId: event.eventId, eventType: event.eventType }));
      });
      this.channel?.ack(message);
    } catch (error) {
      this.logger.error('Notification event moved to the dead-letter exchange.', error);
      this.channel?.nack(message, false, false);
    }
  }

  private render(template: string, payload: Record<string, unknown>) {
    return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_match, key: string) => {
      const value = payload[key];
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    });
  }

  private safeMetadata(payload: Record<string, unknown>) {
    const allowed = ['applicationId', 'examId', 'appealId', 'scoreSheetId', 'version', 'certificateId', 'certificateNumber', 'outcome'];
    return Object.fromEntries(allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  }
}
