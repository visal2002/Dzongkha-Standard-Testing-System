/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationChannel, NotificationDeliveryEntity, NotificationDeliveryStatus, NotificationEntity } from './entities';
import { ContactResolverService } from './contact-resolver.service';
import { NotificationProviderService } from './notification-provider.service';

// A delivery that keeps failing (address unresolvable, provider down) is not retried
// forever - it is marked Failed for good after this many attempts, the same shape as
// the RabbitMQ dead-letter exchange every other consumer in this codebase uses for
// "stop retrying, this needs a human."
const MAX_ATTEMPTS = 5;

/**
 * Advances EMAIL/SMS `notification_deliveries` rows that the event consumer created
 * as PENDING_PROVIDER. Polls with SELECT ... FOR UPDATE SKIP LOCKED, the same pattern
 * report-job.worker.ts already uses in reporting-service, so this survives running
 * more than one notification-service instance without double-sending a message.
 */
@Injectable()
export class DeliveryDispatchService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DeliveryDispatchService.name);
  private timer?: NodeJS.Timeout;
  private working = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly contacts: ContactResolverService,
    private readonly provider: NotificationProviderService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processNext(), 2000);
    this.timer.unref();
  }

  onApplicationShutdown() { if (this.timer) clearInterval(this.timer); }

  private async processNext() {
    if (this.working) return;
    this.working = true;
    try {
      const claim = await this.claim();
      if (!claim) return;
      const { delivery, notification } = claim;
      if (!notification) { await this.fail(delivery, 'NOTIFICATION_MISSING'); return; }
      try {
        const address = await this.resolveAddress(delivery.channel, notification);
        if (!address) {
          await this.fail(delivery, 'ADDRESS_UNRESOLVED');
          return;
        }
        const result = await this.provider.send(delivery.channel as NotificationChannel.Email | NotificationChannel.Sms, address, notification.title, notification.message);
        delivery.status = NotificationDeliveryStatus.Delivered;
        delivery.providerMessageId = result.providerMessageId;
        delivery.deliveredAt = new Date();
        delivery.attempts += 1;
        await this.dataSource.getRepository(NotificationDeliveryEntity).save(delivery);
      } catch (error) {
        this.logger.error(`Delivery ${delivery.id} (${delivery.channel}) failed.`, error);
        await this.fail(delivery, 'PROVIDER_ERROR');
      }
    } finally { this.working = false; }
  }

  private async resolveAddress(channel: NotificationChannel, notification: NotificationEntity): Promise<string | null> {
    if (channel === NotificationChannel.Email) return this.contacts.email(notification.userId);
    const applicationId = notification.safeMetadata.applicationId;
    if (typeof applicationId !== 'string') return null;
    return this.contacts.phone(applicationId);
  }

  private async fail(delivery: NotificationDeliveryEntity, failureCode: string) {
    delivery.attempts += 1;
    delivery.failureCode = failureCode;
    delivery.status = delivery.attempts >= MAX_ATTEMPTS ? NotificationDeliveryStatus.Failed : NotificationDeliveryStatus.PendingProvider;
    await this.dataSource.getRepository(NotificationDeliveryEntity).save(delivery);
  }

  private claim() {
    return this.dataSource.transaction(async (manager) => {
      const delivery = await manager.findOne(NotificationDeliveryEntity, {
        where: { status: NotificationDeliveryStatus.PendingProvider },
        order: { createdAt: 'ASC' },
        lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });
      if (!delivery) return null;
      delivery.status = NotificationDeliveryStatus.Sending;
      await manager.save(delivery);
      const notification = await manager.findOneBy(NotificationEntity, { id: delivery.notificationId });
      return { delivery, notification };
    });
  }
}
