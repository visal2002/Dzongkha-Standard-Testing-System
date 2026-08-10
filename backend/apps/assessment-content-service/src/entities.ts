/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { QuestionPaperStatus, Skill } from '@dzongjuk/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum DocumentType {
  QuestionPaper = 'QUESTION_PAPER',
  AnswerSheet = 'ANSWER_SHEET',
}

@Entity('exam_content_assignments')
@Unique('uq_exam_content_assignment', ['examId', 'userId'])
export class ExamContentAssignmentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ default: true }) active: boolean;
  @Column({ type: 'uuid' }) assignedByUserId: string;
  @CreateDateColumn({ type: 'timestamptz' }) assignedAt: Date;
}

@Entity('question_papers')
@Index('uq_active_question_paper_exam_skill', ['examId', 'skill'], { unique: true, where: `status <> 'RETIRED'` })
export class QuestionPaperEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) examId: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'enum', enum: Skill }) skill: Skill;
  @Column({ type: 'enum', enum: QuestionPaperStatus, default: QuestionPaperStatus.Draft }) status: QuestionPaperStatus;
  @Column({ type: 'timestamptz' }) accessAllowedFrom: Date;
  @Column({ type: 'timestamptz' }) accessAllowedUntil: Date;
  @Column({ type: 'uuid' }) uploadedByUserId: string;
  @Column({ type: 'timestamptz', nullable: true }) retiredAt: Date | null;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('question_documents')
@Unique('uq_question_document_type', ['questionPaperId', 'documentType'])
export class QuestionDocumentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) questionPaperId: string;
  @Column({ type: 'enum', enum: DocumentType }) documentType: DocumentType;
  @Column({ length: 512 }) objectKey: string;
  @Column({ length: 255 }) originalName: string;
  @Column({ length: 100 }) mimeType: string;
  @Column({ type: 'bigint' }) sizeBytes: string;
  @Column({ length: 64 }) sha256: string;
  @Column({ length: 24 }) classification: 'EXAM_CLASSIFIED';
  @Column({ length: 20 }) scanStatus: 'CLEAN' | 'UNAVAILABLE';
  @Column({ length: 32 }) cipher: 'AES-256-GCM';
  @Column({ type: 'text' }) dataIv: string;
  @Column({ type: 'text' }) dataAuthTag: string;
  @Column({ type: 'text' }) wrappedKey: string;
  @Column({ type: 'text' }) wrapIv: string;
  @Column({ type: 'text' }) wrapAuthTag: string;
  @Column({ length: 40 }) keyVersion: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('result_declaration_projections')
export class ResultDeclarationProjectionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) examId: string;
  @Column({ type: 'uuid' }) declarationId: string;
  @Column({ type: 'timestamptz' }) declaredAt: Date;
  @Column({ length: 64 }) eventId: string;
  @CreateDateColumn({ type: 'timestamptz' }) projectedAt: Date;
}

@Entity('sample_publications')
export class SamplePublicationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'uuid' }) questionPaperId: string;
  @Column({ type: 'uuid' }) sourceResultDeclarationId: string;
  @Column({ type: 'uuid' }) approvedByUserId: string;
  @CreateDateColumn({ type: 'timestamptz' }) publishedAt: Date;
}

@Entity('access_audit_events')
export class AccessAuditEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) questionPaperId: string;
  @Column({ type: 'uuid', nullable: true }) documentId: string | null;
  @Index() @Column({ type: 'uuid' }) actorUserId: string;
  @Column({ length: 40 }) action: string;
  @Column({ length: 64 }) requestId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('outbox_events')
export class AssessmentOutboxEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) eventType: string;
  @Column({ type: 'uuid' }) aggregateId: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ length: 64 }) correlationId: string;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
