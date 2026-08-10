/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ScoreSheetStatus } from '@dzongjuk/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum CommitteeRole { Head = 'HEAD', Member = 'MEMBER' }
export enum EligibilityStatus { Eligible = 'ELIGIBLE', Absent = 'ABSENT', Ineligible = 'INELIGIBLE' }
export enum ScoringRuleStatus { Draft = 'DRAFT', Approved = 'APPROVED', Retired = 'RETIRED' }

@Entity('committees')
export class CommitteeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) examId: string;
  @Column({ length: 20, default: 'ACTIVE' }) status: 'ACTIVE' | 'CLOSED';
  @Column({ type: 'uuid' }) createdByUserId: string;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('committee_members')
@Unique('uq_committee_active_member', ['committeeId', 'userId'])
export class CommitteeMemberEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) committeeId: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'enum', enum: CommitteeRole }) role: CommitteeRole;
  @CreateDateColumn({ type: 'timestamptz' }) assignedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) removedAt: Date | null;
}

@Entity('candidate_eligibility')
@Unique('uq_candidate_exam_application', ['examId', 'applicationId'])
export class CandidateEligibilityEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Index() @Column({ type: 'uuid' }) applicationId: string;
  @Index() @Column({ type: 'uuid' }) testTakerUserId: string;
  @Column({ type: 'enum', enum: EligibilityStatus }) status: EligibilityStatus;
  @Column({ length: 64 }) sourceEventId: string;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

export interface ScoreValues {
  WRITING: number;
  READING: number;
  LISTENING: number;
  SPEAKING: number;
}

export interface BandRange {
  min: number;
  max: number;
  label: string;
  cefr?: string;
}

@Entity('scoring_rules')
export class ScoringRuleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 80 }) code: string;
  @Column({ length: 160 }) name: string;
  @Column({ type: 'numeric', precision: 8, scale: 3 }) minimumScore: string;
  @Column({ type: 'numeric', precision: 8, scale: 3 }) maximumScore: string;
  @Column({ type: 'numeric', precision: 8, scale: 3 }) increment: string;
  @Column({ type: 'smallint' }) roundingDecimals: number;
  @Column({ length: 40, default: 'ARITHMETIC_MEAN' }) aggregation: 'ARITHMETIC_MEAN';
  @Column({ type: 'jsonb' }) bands: BandRange[];
  @Column({ type: 'enum', enum: ScoringRuleStatus, default: ScoringRuleStatus.Draft }) status: ScoringRuleStatus;
  @Column({ type: 'timestamptz' }) effectiveFrom: Date;
  @Column({ type: 'timestamptz', nullable: true }) effectiveTo: Date | null;
  @Column({ type: 'uuid', nullable: true }) approvedByUserId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('score_sheets')
@Unique('uq_score_sheet_application_exam', ['examId', 'applicationId'])
export class ScoreSheetEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Index() @Column({ type: 'uuid' }) applicationId: string;
  @Column({ type: 'uuid' }) committeeId: string;
  @Column({ type: 'uuid' }) enteredByUserId: string;
  @Column({ type: 'jsonb' }) draftScores: ScoreValues;
  @Column({ type: 'enum', enum: ScoreSheetStatus, default: ScoreSheetStatus.Draft }) status: ScoreSheetStatus;
  @Column({ default: 0 }) currentVersion: number;
  @Column({ type: 'timestamptz', nullable: true }) submittedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @VersionColumn() rowVersion: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('score_versions')
@Unique('uq_score_version', ['scoreSheetId', 'versionNumber'])
export class ScoreVersionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) scoreSheetId: string;
  @Column() versionNumber: number;
  @Column({ type: 'jsonb' }) scores: ScoreValues;
  @Column({ type: 'numeric', precision: 8, scale: 3 }) overallScore: string;
  @Column({ length: 80 }) bandLabel: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) cefrLevel: string | null;
  @Column({ type: 'uuid' }) scoringRuleId: string;
  @Column({ length: 30 }) source: 'ORIGINAL' | 'APPEAL_REVISION';
  @Index({ unique: true }) @Column({ type: 'uuid', nullable: true }) appealId: string | null;
  @Column({ type: 'uuid' }) createdByUserId: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('result_declarations')
export class ResultDeclarationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) examId: string;
  @Column({ type: 'uuid' }) scoringRuleId: string;
  @Column({ type: 'uuid' }) declaredByUserId: string;
  @CreateDateColumn({ type: 'timestamptz' }) declaredAt: Date;
}

@Entity('audit_events')
export class ResultAuditEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) action: string;
  @Column({ length: 60 }) resourceType: string;
  @Column({ type: 'uuid' }) resourceId: string;
  @Column({ type: 'uuid' }) actorUserId: string;
  @Column({ length: 64 }) requestId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('processed_events')
export class ProcessedEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) eventId: string;
  @Column({ length: 80 }) eventType: string;
  @CreateDateColumn({ type: 'timestamptz' }) processedAt: Date;
}

@Entity('idempotency_records')
@Unique('uq_result_idempotency', ['scope', 'key'])
export class ResultIdempotencyEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) scope: string;
  @Column({ length: 128 }) key: string;
  @Column({ type: 'jsonb' }) response: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('outbox_events')
export class ResultOutboxEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) eventType: string;
  @Column({ type: 'uuid' }) aggregateId: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ length: 64 }) correlationId: string;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
