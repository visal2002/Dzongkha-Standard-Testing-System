/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ApplicationStatus, ExamStatus, Skill } from '@dzongjuk/contracts';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum RegistrationPaymentStatus {
  Initiated = 'INITIATED',
  Paid = 'PAID',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
  Reversed = 'REVERSED',
  Waived = 'WAIVED',
}

@Entity('exams')
export class ExamEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 40 }) code: string;
  @Column({ length: 180 }) title: string;
  @Column({ type: 'timestamptz' }) examDate: Date;
  @Column({ type: 'timestamptz' }) registrationStart: Date;
  @Column({ type: 'timestamptz' }) registrationEnd: Date;
  @Column({ type: 'integer' }) capacity: number;
  @Column({ length: 240 }) venue: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 }) registrationFee: string;
  @Column({ type: 'enum', enum: ExamStatus, default: ExamStatus.Draft }) status: ExamStatus;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('applications')
@Unique('uq_application_exam_identity', ['examId', 'identityKey'])
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @ManyToOne(() => ExamEntity, { onDelete: 'RESTRICT' }) exam: ExamEntity;
  @Index() @Column({ type: 'uuid' }) testTakerUserId: string;
  @Column({ length: 64 }) identityKey: string;
  @Column({ type: 'jsonb' }) profileSnapshot: Record<string, unknown>;
  @Column({ type: 'enum', enum: ApplicationStatus }) status: ApplicationStatus;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 64, nullable: true }) registrationNumber: string | null;
  @Column({ type: 'timestamptz', nullable: true }) reviewStartedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) submittedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) verifiedAt: Date | null;
  @Column({ type: 'uuid', nullable: true }) dcrcLookupId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) dcrcVerifiedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
  @Column({ type: 'text', nullable: true }) reviewRemarks: string | null;
  @Column({ type: 'enum', enum: RegistrationPaymentStatus, enumName: 'registration_payment_status', default: RegistrationPaymentStatus.Initiated }) paymentStatus: RegistrationPaymentStatus;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 }) paymentAmount: string;
  @Column({ length: 3, default: 'BTN' }) paymentCurrency: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) paymentMethod: string | null;
  @Index({ unique: true, where: '"paymentReference" IS NOT NULL' }) @Column({ type: 'varchar', length: 100, nullable: true }) paymentReference: string | null;
  @Index({ unique: true, where: '"paymentAdviceNo" IS NOT NULL' }) @Column({ type: 'varchar', length: 100, nullable: true }) paymentAdviceNo: string | null;
  @Column({ type: 'text', nullable: true }) paymentRedirectUrl: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) paymentReceiptNo: string | null;
  @Column({ type: 'jsonb', nullable: true }) paymentProviderDetails: Record<string, unknown> | null;
  @Column({ type: 'timestamptz', nullable: true }) paymentUpdatedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) paidAt: Date | null;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('waitlist_entries')
@Unique('uq_waitlist_application', ['applicationId'])
export class WaitlistEntryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Column({ type: 'uuid' }) applicationId: string;
  @Index() @Column({ type: 'bigint' }) positionKey: string;
  @Column({ length: 20, default: 'WAITING' }) status: 'WAITING' | 'PROMOTED' | 'CANCELLED';
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('attendance')
@Unique('uq_attendance_application', ['applicationId'])
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Column({ type: 'uuid' }) applicationId: string;
  @Column({ type: 'enum', enum: Skill, array: true, default: '{}' }) absentSkills: Skill[];
  @Column({ length: 16 }) overallStatus: 'PRESENT' | 'ABSENT';
  @Column({ type: 'uuid' }) markedByUserId: string;
  @CreateDateColumn({ type: 'timestamptz' }) markedAt: Date;
}

@Entity('application_history')
export class ApplicationHistoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) applicationId: string;
  @Column({ type: 'enum', enum: ApplicationStatus, nullable: true }) fromStatus: ApplicationStatus | null;
  @Column({ type: 'enum', enum: ApplicationStatus }) toStatus: ApplicationStatus;
  @Column({ type: 'uuid' }) actorUserId: string;
  @Column({ type: 'text', nullable: true }) remarks: string | null;
  @Column({ length: 64 }) requestId: string;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('outbox_events')
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) eventType: string;
  @Column({ type: 'uuid' }) aggregateId: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ length: 64 }) correlationId: string;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('idempotency_records')
@Unique('uq_idempotency_scope_key', ['scope', 'key'])
export class IdempotencyRecordEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) scope: string;
  @Column({ length: 128 }) key: string;
  @Column({ type: 'jsonb' }) response: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
