/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { DomainEventTypes } from '@dzongjuk/contracts';
import { AssessmentService } from './assessment.service';

interface ResultEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  payload: { examId?: string; declarationId?: string; declaredAt?: string };
}

@Injectable()
export class ResultEventConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ResultEventConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: ConfigService, private readonly assessment: AssessmentService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL is not configured; result declaration projections will not update.'); return; }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      await this.channel.assertExchange('dzongjuk.dead-letter', 'topic', { durable: true });
      await this.channel.assertQueue('dzongjuk.dead-letter.queue', { durable: true });
      await this.channel.bindQueue('dzongjuk.dead-letter.queue', 'dzongjuk.dead-letter', '#');
      const queue = 'assessment-content-service.result-projections';
      await this.channel.assertQueue(queue, { durable: true, deadLetterExchange: 'dzongjuk.dead-letter' });
      await this.channel.bindQueue(queue, 'dzongjuk.domain', DomainEventTypes.ResultsDeclared);
      await this.channel.prefetch(10);
      await this.channel.consume(queue, (message) => { if (message) void this.handle(message); });
    } catch (error) {
      this.logger.error('Unable to start result event consumer.', error);
    }
  }

  async onApplicationShutdown() { await this.channel?.close(); await this.connection?.close(); }

  private async handle(message: ConsumeMessage) {
    try {
      const event = JSON.parse(message.content.toString('utf8')) as ResultEvent;
      const examId = event.payload.examId;
      const declarationId = event.payload.declarationId;
      if (!examId || !declarationId) throw new Error('ResultsDeclared event is missing required identity.');
      await this.assessment.projectResultDeclaration(event.eventId, examId, declarationId, new Date(event.payload.declaredAt ?? event.occurredAt));
      this.channel?.ack(message);
    } catch (error) {
      this.logger.error('Result projection event moved to dead-letter exchange.', error);
      this.channel?.nack(message, false, false);
    }
  }
}
