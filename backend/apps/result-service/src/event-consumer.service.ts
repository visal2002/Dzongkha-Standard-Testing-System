/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { DataSource } from 'typeorm';
import { DomainEventTypes } from '@dzongjuk/contracts';
import { CandidateEligibilityEntity, EligibilityStatus, ProcessedEventEntity } from './entities';

interface RegistrationEvent {
  eventId: string;
  eventType: string;
  payload: { applicationId?: string; examId?: string; testTakerUserId?: string };
}

@Injectable()
export class RegistrationEventConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RegistrationEventConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL is not configured; eligibility projections will not update.'); return; }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      await this.channel.assertExchange('dzongjuk.dead-letter', 'topic', { durable: true });
      await this.channel.assertQueue('dzongjuk.dead-letter.queue', { durable: true });
      await this.channel.bindQueue('dzongjuk.dead-letter.queue', 'dzongjuk.dead-letter', '#');
      const queue = 'result-service.registration-projections';
      await this.channel.assertQueue(queue, { durable: true, deadLetterExchange: 'dzongjuk.dead-letter' });
      await this.channel.bindQueue(queue, 'dzongjuk.domain', DomainEventTypes.ApplicationVerified);
      await this.channel.bindQueue(queue, 'dzongjuk.domain', DomainEventTypes.CandidateMarkedAbsent);
      await this.channel.prefetch(10);
      await this.channel.consume(queue, (message) => { if (message) void this.handle(message); });
    } catch (error) {
      this.logger.error('Unable to start registration event consumer.', error);
    }
  }

  async onApplicationShutdown() { await this.channel?.close(); await this.connection?.close(); }

  private async handle(message: ConsumeMessage) {
    try {
      const event = JSON.parse(message.content.toString('utf8')) as RegistrationEvent;
      await this.dataSource.transaction(async (manager) => {
        if (await manager.existsBy(ProcessedEventEntity, { eventId: event.eventId })) return;
        const { applicationId, examId, testTakerUserId } = event.payload;
        if (!applicationId || !examId) throw new Error('Registration event is missing application or exam identity.');
        if (event.eventType === DomainEventTypes.ApplicationVerified) {
          if (!testTakerUserId) throw new Error('ApplicationVerified is missing testTakerUserId.');
          await manager.upsert(CandidateEligibilityEntity, {
            examId, applicationId, testTakerUserId, status: EligibilityStatus.Eligible, sourceEventId: event.eventId,
          }, ['examId', 'applicationId']);
        } else if (event.eventType === DomainEventTypes.CandidateMarkedAbsent) {
          const projection = await manager.findOneBy(CandidateEligibilityEntity, { examId, applicationId });
          if (!projection) throw new Error('Absent event arrived before eligibility projection.');
          projection.status = EligibilityStatus.Absent;
          projection.sourceEventId = event.eventId;
          await manager.save(projection);
        }
        await manager.save(ProcessedEventEntity, manager.create(ProcessedEventEntity, { eventId: event.eventId, eventType: event.eventType }));
      });
      this.channel?.ack(message);
    } catch (error) {
      this.logger.error('Registration projection event moved to dead-letter exchange.', error);
      this.channel?.nack(message, false, false);
    }
  }
}
