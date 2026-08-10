/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';
import { IsNull, LessThan, ObjectLiteral, Repository } from 'typeorm';

export interface OutboxRecord extends ObjectLiteral {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId: string;
  publishedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

export abstract class RabbitOutboxPublisher<T extends OutboxRecord> implements OnModuleInit, OnApplicationShutdown {
  private readonly logger: Logger;
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private timer?: NodeJS.Timeout;
  private publishing = false;

  protected constructor(
    private readonly events: Repository<T>,
    private readonly config: ConfigService,
    private readonly source: string,
  ) {
    this.logger = new Logger(`${source}OutboxPublisher`);
  }

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL is not configured; outbox events will remain pending.');
      return;
    }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      this.timer = setInterval(() => void this.publishBatch(), 2000);
      this.timer.unref();
    } catch (error) {
      this.logger.error('Unable to connect to RabbitMQ; transactions remain safe in the outbox.', error);
    }
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.channel?.close();
    await this.connection?.close();
  }

  private async publishBatch() {
    if (this.publishing || !this.channel) return;
    this.publishing = true;
    try {
      const events = await this.events.find({
        where: { publishedAt: IsNull(), attempts: LessThan(10) } as never,
        order: { createdAt: 'ASC' } as never,
        take: 50,
      });
      for (const event of events) {
        try {
          this.channel.publish(
            'dzongjuk.domain', event.eventType,
            Buffer.from(JSON.stringify({
              eventId: event.id, eventType: event.eventType, occurredAt: event.createdAt.toISOString(),
              source: this.source, correlationId: event.correlationId,
              resourceId: event.aggregateId, payload: event.payload,
            })),
            { persistent: true, contentType: 'application/json', messageId: event.id, correlationId: event.correlationId, type: event.eventType },
          );
          await this.channel.waitForConfirms();
          event.publishedAt = new Date();
        } catch {
          event.attempts += 1;
        }
        await this.events.save(event);
      }
    } finally {
      this.publishing = false;
    }
  }
}
