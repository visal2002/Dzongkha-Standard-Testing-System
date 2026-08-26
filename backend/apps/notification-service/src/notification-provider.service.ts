/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from './entities';

export interface NotificationSendResult { providerMessageId: string }

/**
 * The vendor boundary for SMS/Email delivery. `DeliveryDispatchService` only ever
 * talks to this interface, so swapping the logging default below for a real SMS
 * gateway or SMTP/transactional-email provider later is a one-line DI change in
 * app.module.ts - nothing about the dispatch/retry logic needs to move.
 */
export abstract class NotificationProviderService {
  abstract send(channel: NotificationChannel.Email | NotificationChannel.Sms, address: string, title: string, body: string): Promise<NotificationSendResult>;
}

/**
 * Default provider: logs the message and returns a synthetic id. No SMS gateway or
 * SMTP relay is configured anywhere in this codebase yet - this makes that visible in
 * logs rather than pretending delivery happened, while still exercising the full
 * dispatch/retry pipeline end-to-end.
 */
@Injectable()
export class LoggingNotificationProvider implements NotificationProviderService {
  private readonly logger = new Logger(LoggingNotificationProvider.name);

  async send(channel: NotificationChannel.Email | NotificationChannel.Sms, address: string, title: string, body: string): Promise<NotificationSendResult> {
    const providerMessageId = `log_${channel.toLowerCase()}_${randomUUID()}`;
    this.logger.warn(`[NON-PRODUCTION LOGGING PROVIDER] ${channel} to ${address} :: ${title} :: ${body} (id=${providerMessageId})`);
    return { providerMessageId };
  }
}
