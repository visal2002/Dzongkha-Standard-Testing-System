/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { AppealStatus, CertificateStatus, Skill } from '@dzongjuk/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum PaymentStatus { Initiated = 'INITIATED', Paid = 'PAID', Failed = 'FAILED' }
export enum ReconciliationStatus { Pending = 'PENDING', Matched = 'MATCHED', Exception = 'EXCEPTION' }
export enum AppealRecommendation { NoChange = 'NO_CHANGE', Revise = 'REVISE' }
export enum AppealDecision { Approved = 'APPROVED', Rejected = 'REJECTED' }
export enum FeeRuleStatus { Draft = 'DRAFT', Approved = 'APPROVED', Retired = 'RETIRED' }

@Entity('fee_rules')
export class FeeRuleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 80 }) code: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amountPerSkill: string;
  @Column({ length: 3 }) currency: string;
  @Column({ type: 'enum', enum: FeeRuleStatus, enumName: 'fee_rule_status', default: FeeRuleStatus.Draft }) status: FeeRuleStatus;
  @Column({ type: 'timestamptz' }) effectiveFrom: Date;
  @Column({ type: 'timestamptz', nullable: true }) effectiveTo: Date | null;
  @Column({ type: 'uuid', nullable: true }) approvedByUserId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('appeals')
export class AppealEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) applicationId: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Column({ type: 'uuid' }) scoreSheetId: string;
  @Column() scoreVersionNumber: number;
  @Index() @Column({ type: 'uuid' }) testTakerUserId: string;
  @Column({ type: 'text' }) reason: string;
  @Column({ type: 'enum', enum: AppealStatus, enumName: 'appeal_status' }) status: AppealStatus;
  @Column({ type: 'uuid', nullable: true }) paymentId: string | null;
  @Column({ type: 'enum', enum: AppealRecommendation, enumName: 'appeal_recommendation', nullable: true }) committeeRecommendation: AppealRecommendation | null;
  @Column({ type: 'enum', enum: AppealDecision, enumName: 'appeal_decision', nullable: true }) chiefDecision: AppealDecision | null;
  @Column({ type: 'timestamptz' }) submittedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) completedAt: Date | null;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('appeal_skills')
@Unique('uq_appeal_skill', ['appealId', 'skill'])
export class AppealSkillEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) appealId: string;
  @Column({ type: 'enum', enum: Skill, enumName: 'appeal_skill' }) skill: Skill;
  @Column({ type: 'numeric', precision: 8, scale: 3 }) originalScore: string;
  @Column({ type: 'numeric', precision: 8, scale: 3, nullable: true }) proposedScore: string | null;
  @Column({ type: 'numeric', precision: 8, scale: 3, nullable: true }) finalScore: string | null;
  // BRD §5.6.2 Committee BR-2: only the selected and approved skills are updated, so the
  // Chief's decision is recorded per skill rather than once for the whole appeal.
  @Column({ type: 'enum', enum: AppealDecision, enumName: 'appeal_decision', nullable: true }) chiefDecision: AppealDecision | null;
}

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ length: 24, default: 'APPEAL' }) referenceType: 'APPEAL';
  @Index({ unique: true }) @Column({ type: 'uuid' }) referenceId: string;
  @Column({ type: 'uuid' }) feeRuleId: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: string;
  @Column({ length: 3 }) currency: string;
  @Column({ type: 'enum', enum: PaymentStatus, enumName: 'payment_status' }) status: PaymentStatus;
  @Column({ type: 'varchar', length: 80, nullable: true }) gateway: string | null;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 160, nullable: true }) externalTransactionId: string | null;
  @Column({ type: 'timestamptz' }) initiatedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) paidAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) failedAt: Date | null;
  @Column({ type: 'enum', enum: ReconciliationStatus, enumName: 'reconciliation_status' }) reconciliationStatus: ReconciliationStatus;
}

@Entity('payment_events')
export class PaymentEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) paymentId: string;
  @Column({ length: 40 }) eventType: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) externalTransactionId: string | null;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('committee_reviews')
export class AppealCommitteeReviewEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) appealId: string;
  @Column({ type: 'uuid' }) reviewedByUserId: string;
  @Column({ type: 'text' }) remarks: string;
  @Column({ type: 'enum', enum: AppealRecommendation, enumName: 'appeal_recommendation' }) recommendation: AppealRecommendation;
  @CreateDateColumn({ type: 'timestamptz' }) submittedAt: Date;
}

@Entity('approvals')
export class AppealApprovalEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) appealId: string;
  @Column({ type: 'enum', enum: AppealDecision, enumName: 'appeal_decision' }) decision: AppealDecision;
  @Column({ type: 'uuid' }) decidedByUserId: string;
  @Column({ type: 'text' }) remarks: string;
  @CreateDateColumn({ type: 'timestamptz' }) decidedAt: Date;
}

@Entity('appeal_history')
export class AppealHistoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) appealId: string;
  @Column({ type: 'enum', enum: AppealStatus, enumName: 'appeal_status', nullable: true }) fromStatus: AppealStatus | null;
  @Column({ type: 'enum', enum: AppealStatus, enumName: 'appeal_status' }) toStatus: AppealStatus;
  @Column({ type: 'uuid', nullable: true }) actorUserId: string | null;
  @Column({ length: 24 }) actorType: 'USER' | 'INTEGRATION' | 'SYSTEM';
  @Column({ type: 'text', nullable: true }) remarks: string | null;
  @Column({ length: 64 }) requestId: string;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('audit_events')
export class AppealAuditEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) action: string;
  @Column({ length: 60 }) resourceType: string;
  @Column({ type: 'uuid' }) resourceId: string;
  @Column({ type: 'uuid', nullable: true }) actorUserId: string | null;
  @Column({ length: 64 }) requestId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('idempotency_records')
@Unique('uq_appeal_idempotency', ['scope', 'key'])
export class AppealIdempotencyEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) scope: string;
  @Column({ length: 128 }) key: string;
  @Column({ type: 'jsonb' }) response: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('outbox_events')
export class AppealOutboxEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) eventType: string;
  @Column({ type: 'uuid' }) aggregateId: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ length: 64 }) correlationId: string;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

export enum CertificateTemplateStatus { Draft = 'DRAFT', Approved = 'APPROVED', Retired = 'RETIRED' }
export enum CertificatePaperSize { A4 = 'A4', Letter = 'LETTER' }
export enum CertificateOrientation { Landscape = 'LANDSCAPE', Portrait = 'PORTRAIT' }
export enum CertificateAccessType { View = 'VIEW', Download = 'DOWNLOAD', Verify = 'VERIFY' }

@Entity('certificate_templates')
@Unique('uq_certificate_template_version', ['code', 'versionNumber'])
export class CertificateTemplateEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) code: string;
  @Column() versionNumber: number;
  @Column({ length: 180 }) title: string;
  @Column({ type: 'text' }) declarationText: string;
  @Column({ length: 180 }) signatoryName: string;
  @Column({ length: 180 }) signatoryTitle: string;
  @Column({ length: 180 }) chiefExecutiveName: string;
  @Column({ length: 180 }) chiefExecutiveTitle: string;
  @Column({ type: 'enum', enum: CertificatePaperSize, enumName: 'certificate_paper_size' }) paperSize: CertificatePaperSize;
  @Column({ type: 'enum', enum: CertificateOrientation, enumName: 'certificate_orientation' }) orientation: CertificateOrientation;
  @Column({ type: 'smallint' }) validityMonths: number;
  @Column({ default: false }) testOnly: boolean;
  @Column({ type: 'enum', enum: CertificateTemplateStatus, enumName: 'certificate_template_status', default: CertificateTemplateStatus.Draft }) status: CertificateTemplateStatus;
  @Column({ type: 'timestamptz' }) effectiveFrom: Date;
  @Column({ type: 'timestamptz', nullable: true }) effectiveTo: Date | null;
  @Column({ type: 'uuid' }) createdByUserId: string;
  @Column({ type: 'uuid', nullable: true }) approvedByUserId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('certificate_files')
export class CertificateFileEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 320 }) objectKey: string;
  @Column({ length: 64 }) sha256: string;
  @Column({ type: 'bigint' }) byteSize: string;
  @Column({ type: 'text' }) dataIv: string;
  @Column({ type: 'text' }) dataAuthTag: string;
  @Column({ type: 'text' }) wrappedKey: string;
  @Column({ type: 'text' }) wrapIv: string;
  @Column({ type: 'text' }) wrapAuthTag: string;
  @Column({ length: 24 }) keyVersion: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('certificates')
@Unique('uq_certificate_application_version', ['applicationId', 'versionNumber'])
export class CertificateEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) certificateNumber: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Index() @Column({ type: 'uuid' }) applicationId: string;
  @Index() @Column({ type: 'uuid' }) testTakerUserId: string;
  @Column({ type: 'uuid' }) scoreSheetId: string;
  @Column() scoreVersionNumber: number;
  @Column() versionNumber: number;
  @Column({ type: 'uuid' }) templateId: string;
  @Column() templateVersionNumber: number;
  @Column({ length: 180 }) holderName: string;
  @Column({ length: 64 }) registrationNumber: string;
  @Column({ type: 'varchar', length: 64, nullable: true }) cid: string | null;
  @Column({ type: 'timestamptz', nullable: true }) dateOfBirth: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) examDate: Date | null;
  @Column({ type: 'jsonb' }) scoreSnapshot: Record<string, unknown>;
  @Column({ length: 80 }) bandLabel: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) cefrLevel: string | null;
  @Column({ length: 64 }) verificationTokenHash: string;
  @Column({ type: 'uuid' }) fileId: string;
  @Column({ type: 'enum', enum: CertificateStatus, enumName: 'certificate_status' }) status: CertificateStatus;
  @Column({ type: 'timestamptz' }) issuedAt: Date;
  @Column({ type: 'timestamptz' }) validUntil: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
  @Column({ type: 'text', nullable: true }) revocationReason: string | null;
  @Column({ type: 'uuid', nullable: true }) revokedByUserId: string | null;
  @VersionColumn() rowVersion: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('certificate_access_events')
export class CertificateAccessEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) certificateId: string;
  @Column({ type: 'enum', enum: CertificateAccessType, enumName: 'certificate_access_type' }) accessType: CertificateAccessType;
  @Column({ type: 'uuid', nullable: true }) actorUserId: string | null;
  @Column({ length: 64 }) requestId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}
