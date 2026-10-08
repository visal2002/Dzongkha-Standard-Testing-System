/*
 * Automatically issues a certificate when the Committee Head submits a score.
 * The score event is durable in the result-service outbox, and certificate issuance
 * is idempotent on scoreSheetId + scoreVersionNumber.
 */
import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { DomainEventTypes } from '@dzongjuk/contracts';
import { CertificateResultSource } from './certificate-source-client.service';
import { CertificateService } from './certificate.service';

interface ScoreSubmittedEvent {
  eventId: string;
  eventType: string;
  correlationId: string;
  payload: CertificateResultSource & { actorId?: string };
}

@Injectable()
export class ScoreSubmittedCertificateConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ScoreSubmittedCertificateConsumer.name);
  private readonly queueName = 'appeal-certificate-service.score-submitted';
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: ConfigService, private readonly certificates: CertificateService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL is not configured; automatic certificate issuance is disabled.'); return; }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('dzongjuk.domain', 'topic', { durable: true });
      await this.channel.assertExchange('dzongjuk.dead-letter', 'topic', { durable: true });
      await this.channel.assertQueue('dzongjuk.dead-letter.queue', { durable: true });
      await this.channel.bindQueue('dzongjuk.dead-letter.queue', 'dzongjuk.dead-letter', '#');
      await this.channel.assertQueue(this.queueName, { durable: true, deadLetterExchange: 'dzongjuk.dead-letter' });
      await this.channel.bindQueue(this.queueName, 'dzongjuk.domain', DomainEventTypes.ScoreSubmitted);
      await this.channel.prefetch(5);
      await this.channel.consume(this.queueName, (message) => { if (message) void this.handle(message); });
    } catch (error) {
      this.logger.error('Unable to start automatic certificate consumer.', error);
    }
  }

  async onApplicationShutdown() { await this.channel?.close(); await this.connection?.close(); }

  private async handle(message: ConsumeMessage) {
    try {
      const event = JSON.parse(message.content.toString('utf8')) as ScoreSubmittedEvent;
      const result = event.payload;
      if (event.eventType !== DomainEventTypes.ScoreSubmitted || !event.eventId || !result?.examId || !result.applicationId ||
          !result.testTakerUserId || !result.scoreSheetId || !result.scoreVersionNumber || !result.scores || !result.actorId) {
        throw new Error('ScoreSubmitted event is missing certificate source data.');
      }
      await this.certificates.issueSubmittedScore(result, result.actorId, event.correlationId || event.eventId);
      this.channel?.ack(message);
    } catch (error) {
      const retries = Number(message.properties.headers?.['x-retry-count'] ?? 0);
      this.logger.error(`Automatic certificate issuance failed (attempt ${retries + 1}).`, error);
      if (this.channel && retries < 4) {
        this.channel.sendToQueue(this.queueName, message.content, {
          persistent: true,
          contentType: message.properties.contentType,
          messageId: message.properties.messageId,
          correlationId: message.properties.correlationId,
          type: message.properties.type,
          headers: { ...message.properties.headers, 'x-retry-count': retries + 1 },
        });
        this.channel.ack(message);
      } else {
        this.channel?.nack(message, false, false);
      }
    }
  }
}
