/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DomainException } from '@dzongjuk/common';
import { NotificationEntity } from './entities';

@Injectable()
export class NotificationService {
  constructor(@InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>) {}

  list(userId: string, limit: number) {
    return this.notifications.find({ where: { userId, archivedAt: IsNull() }, order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit || 30, 1), 100) });
  }

  async read(id: string, userId: string) {
    const item = await this.owned(id, userId);
    item.readAt ??= new Date();
    return this.notifications.save(item);
  }

  async readAll(userId: string) {
    const readAt = new Date();
    const result = await this.notifications.createQueryBuilder().update().set({ readAt }).where('"userId" = :userId AND "readAt" IS NULL AND "archivedAt" IS NULL', { userId }).execute();
    return { updated: result.affected ?? 0, readAt };
  }

  async archive(id: string, userId: string) {
    const item = await this.owned(id, userId);
    item.archivedAt = new Date();
    await this.notifications.save(item);
    return { id, archived: true };
  }

  private async owned(id: string, userId: string) {
    const item = await this.notifications.findOneBy({ id });
    if (!item) throw new DomainException('NOTIFICATION_NOT_FOUND', 'Notification not found.', 404);
    if (item.userId !== userId) throw new DomainException('NOTIFICATION_FORBIDDEN', 'You may only access your own notifications.', 403);
    return item;
  }
}
