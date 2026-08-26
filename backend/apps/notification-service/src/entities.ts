/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum NotificationChannel { InApp = 'IN_APP', Email = 'EMAIL', Sms = 'SMS' }
export enum NotificationTemplateStatus { Draft = 'DRAFT', Approved = 'APPROVED', Retired = 'RETIRED' }
// 'SENDING' is claimed-and-in-flight, distinct from PendingProvider so a concurrent
// dispatch-worker instance's SKIP LOCKED poll excludes this row once the claiming
// transaction commits and the row lock releases, even before the send finishes.
export enum NotificationDeliveryStatus { Delivered = 'DELIVERED', PendingProvider = 'PENDING_PROVIDER', Sending = 'SENDING', Failed = 'FAILED' }

@Entity('notification_templates')
@Unique('uq_notification_template_version', ['eventType', 'channel', 'versionNumber'])
export class NotificationTemplateEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) eventType: string;
  @Column({ type: 'enum', enum: NotificationChannel, enumName: 'notification_channel' }) channel: NotificationChannel;
  @Column() versionNumber: number;
  @Column({ length: 180 }) titleTemplate: string;
  @Column({ type: 'text' }) bodyTemplate: string;
  @Column({ type: 'enum', enum: NotificationTemplateStatus, enumName: 'notification_template_status' }) status: NotificationTemplateStatus;
  @Column({ type: 'timestamptz' }) effectiveFrom: Date;
  @Column({ type: 'timestamptz', nullable: true }) effectiveTo: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ length: 80 }) eventType: string;
  @Column({ type: 'uuid' }) templateId: string;
  @Column({ length: 180 }) title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'jsonb', default: {} }) safeMetadata: Record<string, unknown>;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) archivedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('notification_deliveries')
export class NotificationDeliveryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) notificationId: string;
  @Column({ type: 'enum', enum: NotificationChannel, enumName: 'notification_channel' }) channel: NotificationChannel;
  @Column({ type: 'enum', enum: NotificationDeliveryStatus, enumName: 'notification_delivery_status' }) status: NotificationDeliveryStatus;
  @Column({ default: 0 }) attempts: number;
  @Column({ type: 'varchar', length: 120, nullable: true }) providerMessageId: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) failureCode: string | null;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('processed_events')
export class NotificationProcessedEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) eventId: string;
  @Column({ length: 80 }) eventType: string;
  @CreateDateColumn({ type: 'timestamptz' }) processedAt: Date;
}
