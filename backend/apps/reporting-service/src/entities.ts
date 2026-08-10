/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export enum ReportResourceType {
  Examination = 'EXAMINATION', Application = 'APPLICATION', QuestionPaper = 'QUESTION_PAPER',
  Committee = 'COMMITTEE', Score = 'SCORE', ResultDeclaration = 'RESULT_DECLARATION',
  Appeal = 'APPEAL', Certificate = 'CERTIFICATE',
}

export enum ReportDataset {
  Applications = 'applications', Scores = 'scores', Appeals = 'appeals',
  Certificates = 'certificates', Examinations = 'examinations', Committees = 'committees',
}

export enum ReportFormat { Csv = 'CSV', Excel = 'XLSX', Pdf = 'PDF' }
export enum ReportJobStatus { Queued = 'QUEUED', Running = 'RUNNING', Completed = 'COMPLETED', Failed = 'FAILED', Expired = 'EXPIRED' }

@Entity('resource_projections')
@Unique('uq_reporting_resource', ['resourceType', 'resourceId'])
export class ReportResourceProjectionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'varchar', length: 40 }) resourceType: ReportResourceType;
  @Column({ length: 80 }) resourceId: string;
  @Index() @Column({ type: 'uuid', nullable: true }) examId: string | null;
  @Index() @Column({ type: 'uuid', nullable: true }) ownerUserId: string | null;
  @Index() @Column({ length: 60 }) status: string;
  @Column({ type: 'jsonb', default: {} }) dimensions: Record<string, unknown>;
  @Column({ length: 64 }) sourceEventId: string;
  @Column({ type: 'timestamptz' }) occurredAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('audit_events')
export class ReportingAuditEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) eventId: string;
  @Index() @Column({ length: 80 }) action: string;
  @Column({ length: 80 }) source: string;
  @Column({ length: 80 }) resourceId: string;
  @Index() @Column({ type: 'uuid', nullable: true }) actorUserId: string | null;
  @Index() @Column({ length: 64 }) correlationId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @Index() @Column({ type: 'timestamptz' }) occurredAt: Date;
  @CreateDateColumn({ type: 'timestamptz' }) projectedAt: Date;
}

@Entity('processed_events')
export class ReportingProcessedEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) eventId: string;
  @Column({ length: 80 }) eventType: string;
  @CreateDateColumn({ type: 'timestamptz' }) processedAt: Date;
}

@Entity('saved_reports')
export class SavedReportEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) ownerUserId: string;
  @Column({ length: 120 }) name: string;
  @Column({ type: 'varchar', length: 30 }) dataset: ReportDataset;
  @Column({ type: 'jsonb' }) definition: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('report_jobs')
export class ReportJobEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) ownerUserId: string;
  @Column({ type: 'varchar', length: 20 }) format: ReportFormat;
  @Index() @Column({ type: 'varchar', length: 20, default: ReportJobStatus.Queued }) status: ReportJobStatus;
  @Column({ type: 'jsonb' }) definition: Record<string, unknown>;
  @Column({ type: 'varchar', length: 180, nullable: true }) fileName: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) mimeType: string | null;
  @Column({ type: 'bytea', nullable: true, select: false }) artifact: Buffer | null;
  @Column({ type: 'integer', nullable: true }) rowCount: number | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) failureCode: string | null;
  @Column({ type: 'timestamptz', nullable: true }) startedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) completedAt: Date | null;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('dashboard_configs')
export class DashboardConfigEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) roleCode: string;
  @Column({ type: 'jsonb' }) metricKeys: string[];
  @Column({ type: 'uuid' }) updatedByUserId: string;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
