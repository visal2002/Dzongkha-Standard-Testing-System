/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { AccessClaims, DomainEventTypes, QuestionPaperStatus, Skill } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AssignExamContentDto, UploadQuestionPaperDto } from './dtos';
import { AccessAuditEntity, AssessmentOutboxEntity, DocumentType, ExamContentAssignmentEntity, QuestionDocumentEntity, QuestionPaperEntity, ResultDeclarationProjectionEntity, SamplePublicationEntity } from './entities';
import { EncryptionService } from './encryption.service';
import { MalwareScannerService } from './malware-scanner.service';
import { ObjectStorageService } from './object-storage.service';

interface UploadedDocuments {
  questionPaper?: Express.Multer.File[];
  file?: Express.Multer.File[];
  answerSheet?: Express.Multer.File[];
}

@Injectable()
export class AssessmentService {
  private readonly maxFileBytes: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly encryption: EncryptionService,
    private readonly scanner: MalwareScannerService,
    private readonly storage: ObjectStorageService,
    config: ConfigService,
    @InjectRepository(QuestionPaperEntity) private readonly papers: Repository<QuestionPaperEntity>,
    @InjectRepository(QuestionDocumentEntity) private readonly documents: Repository<QuestionDocumentEntity>,
    @InjectRepository(ResultDeclarationProjectionEntity) private readonly declarations: Repository<ResultDeclarationProjectionEntity>,
    @InjectRepository(ExamContentAssignmentEntity) private readonly assignments: Repository<ExamContentAssignmentEntity>,
  ) {
    this.maxFileBytes = config.get<number>('MAX_ASSESSMENT_FILE_BYTES', 52_428_800);
  }

  async upload(dto: UploadQuestionPaperDto, files: UploadedDocuments, actor: AccessClaims, requestId: string) {
    await this.assertAssigned(dto.examId, actor);
    const { questionFile, answerFile, allowedFrom, allowedUntil } = this.assertUploadInputs(dto, files);

    const paperId = randomUUID();
    const uploadedKeys: string[] = [];
    try {
      const prepared = await Promise.all([
        this.prepareDocument(paperId, DocumentType.QuestionPaper, questionFile),
        this.prepareDocument(paperId, DocumentType.AnswerSheet, answerFile),
      ]);
      for (const item of prepared) if (item) uploadedKeys.push(item.document.objectKey);

      return await this.dataSource.transaction((manager) =>
        this.persistUpload(manager, { id: paperId, dto, allowedFrom, allowedUntil, actor, requestId, prepared }),
      );
    } catch (error) {
      // Object storage sits outside the transaction above, so a failure anywhere in
      // it - including the transaction itself - must not leave orphaned ciphertext.
      await Promise.allSettled(uploadedKeys.map((key) => this.storage.delete(key)));
      throw error;
    }
  }

  /**
   * Resolves and validates the two required upload files and the access window.
   * Pulled out of `upload()` purely to keep that method's branching readable; every
   * check, error code and message is unchanged.
   */
  private assertUploadInputs(dto: UploadQuestionPaperDto, files: UploadedDocuments) {
    const questionFile = files.questionPaper?.[0] ?? files.file?.[0];
    if (!questionFile) throw new DomainException('QUESTION_DOCUMENT_REQUIRED', 'A question-paper PDF is required.');
    // BRD §5.4.2 BR-1: the question paper and the answer sheet are uploaded as two
    // separate documents, both required - a paper is not complete with only one of
    // them. Enforced here, not only in the upload form, because the form is a
    // usability layer and this is the binding check.
    const answerFile = files.answerSheet?.[0];
    if (!answerFile) throw new DomainException('ANSWER_DOCUMENT_REQUIRED', 'An answer-sheet PDF is required.');
    const allowedFrom = new Date(dto.accessAllowedFrom);
    const allowedUntil = new Date(dto.accessAllowedUntil);
    if (allowedUntil <= allowedFrom) throw new DomainException('ACCESS_WINDOW_INVALID', 'Access end must be after access start.');
    this.validatePdf(questionFile);
    this.validatePdf(answerFile);
    return { questionFile, answerFile, allowedFrom, allowedUntil };
  }

  private async persistUpload(manager: EntityManager, params: {
    id: string; dto: UploadQuestionPaperDto; allowedFrom: Date; allowedUntil: Date;
    actor: AccessClaims; requestId: string; prepared: Array<{ document: QuestionDocumentEntity } | null>;
  }) {
    const { id, dto, allowedFrom, allowedUntil, actor, requestId, prepared } = params;
    const paper = manager.create(QuestionPaperEntity, {
      id, examId: dto.examId, title: dto.title, skill: dto.skill,
      status: QuestionPaperStatus.Ready, accessAllowedFrom: allowedFrom,
      accessAllowedUntil: allowedUntil, uploadedByUserId: actor.sub,
    });
    await manager.save(QuestionPaperEntity, paper);
    for (const item of prepared) if (item) await manager.save(QuestionDocumentEntity, item.document);
    await this.audit(manager, paper.id, null, actor.sub, 'QUESTION_PAPER_UPLOADED', requestId, { examId: dto.examId, skill: dto.skill, documents: prepared.filter(Boolean).length });
    await this.outbox(manager, DomainEventTypes.QuestionPaperUploaded, paper.id, requestId, { questionPaperId: paper.id, examId: paper.examId, skill: paper.skill });
    return this.metadata(paper, prepared.filter((item): item is NonNullable<typeof item> => item !== null).map((item) => item.document));
  }

  async list(actor: AccessClaims, examId?: string) {
    let where: { examId?: string | ReturnType<typeof In> } = examId ? { examId } : {};
    if (!actor.permissions.includes('*') && !actor.permissions.includes('question.assignment.manage')) {
      const assignments = await this.assignments.findBy({ userId: actor.sub, active: true });
      const examIds = assignments.map((assignment) => assignment.examId);
      if (examId && !examIds.includes(examId)) throw new DomainException('EXAM_CONTENT_ASSIGNMENT_REQUIRED', 'You are not assigned to this examination.', 403);
      if (!examId) where = { examId: In(examIds.length ? examIds : ['00000000-0000-0000-0000-000000000000']) };
    }
    const papers = await this.papers.find({ where: where as never, order: { createdAt: 'DESC' }, take: 100 });
    return this.withDocuments(papers);
  }

  async getMetadata(id: string, actor: AccessClaims) {
    const paper = await this.getPaper(id);
    await this.assertAssigned(paper.examId, actor);
    return this.metadata(paper, await this.documents.findBy({ questionPaperId: id }));
  }

  async download(id: string, type: DocumentType, actor: AccessClaims | undefined, requestId: string, sample = false) {
    const paper = await this.getPaper(id);
    if (sample) {
      if (paper.status !== QuestionPaperStatus.SamplePublished) throw new DomainException('SAMPLE_NOT_PUBLISHED', 'This sample paper has not been published.', 404);
    } else {
      await this.assertAssigned(paper.examId, actor!);
      const now = new Date();
      if (now < paper.accessAllowedFrom || now > paper.accessAllowedUntil) {
        await this.dataSource.transaction((manager) => this.audit(manager, id, null, actor!.sub, 'DOCUMENT_ACCESS_DENIED_WINDOW', requestId, { type }));
        throw new DomainException('QUESTION_ACCESS_WINDOW_CLOSED', 'The examination document is outside its approved access window.', 403);
      }
    }
    const document = await this.documents.findOneBy({ questionPaperId: id, documentType: type });
    if (!document) throw new DomainException('QUESTION_DOCUMENT_NOT_FOUND', 'The requested document does not exist.', 404);
    const ciphertext = await this.storage.get(document.objectKey);
    const plaintext = this.encryption.decrypt(ciphertext, document);
    const action = sample ? 'SAMPLE_DOCUMENT_DOWNLOADED' : 'CLASSIFIED_DOCUMENT_DOWNLOADED';
    // The public sample-paper endpoint has no authenticated actor - the audit trail
    // records that explicitly rather than crashing on a missing user.
    await this.dataSource.transaction((manager) => this.audit(manager, id, document.id, actor?.sub ?? null, action, requestId, { type }));
    return { buffer: plaintext, filename: document.originalName, mimeType: document.mimeType };
  }

  async publishSample(id: string, actor: AccessClaims, requestId: string) {
    const existing = await this.getPaper(id);
    await this.assertAssigned(existing.examId, actor);
    return this.dataSource.transaction(async (manager) => {
      const paper = await manager.findOne(QuestionPaperEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!paper) throw new DomainException('QUESTION_PAPER_NOT_FOUND', 'Question paper not found.', 404);
      if (paper.status !== QuestionPaperStatus.Ready) throw new DomainException('SAMPLE_PUBLICATION_INVALID', 'Only a ready paper may be published as a sample.', 409);
      const declaration = await manager.findOneBy(ResultDeclarationProjectionEntity, { examId: paper.examId });
      if (!declaration) throw new DomainException('RESULTS_NOT_DECLARED', 'Sample publication is blocked until results are declared.', 409);
      paper.status = QuestionPaperStatus.SamplePublished;
      await manager.save(paper);
      await manager.save(SamplePublicationEntity, manager.create(SamplePublicationEntity, {
        questionPaperId: id, sourceResultDeclarationId: declaration.declarationId, approvedByUserId: actor.sub,
      }));
      await this.audit(manager, id, null, actor.sub, 'SAMPLE_PUBLISHED', requestId, { declarationId: declaration.declarationId });
      await this.outbox(manager, DomainEventTypes.SamplePaperPublished, id, requestId, { questionPaperId: id, examId: paper.examId });
      return this.metadata(paper, await manager.findBy(QuestionDocumentEntity, { questionPaperId: id }));
    });
  }

  async retire(id: string, actor: AccessClaims, requestId: string) {
    const existing = await this.getPaper(id);
    await this.assertAssigned(existing.examId, actor);
    return this.dataSource.transaction(async (manager) => {
      const paper = await manager.findOne(QuestionPaperEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!paper) throw new DomainException('QUESTION_PAPER_NOT_FOUND', 'Question paper not found.', 404);
      if (paper.status === QuestionPaperStatus.SamplePublished) throw new DomainException('PUBLISHED_SAMPLE_IMMUTABLE', 'A published sample cannot be deleted; use an approved revocation workflow.', 409);
      paper.status = QuestionPaperStatus.Retired;
      paper.retiredAt = new Date();
      await manager.save(paper);
      await this.audit(manager, id, null, actor.sub, 'QUESTION_PAPER_RETIRED', requestId, {});
      return { id, status: paper.status };
    });
  }

  async projectResultDeclaration(eventId: string, examId: string, declarationId: string, declaredAt: Date) {
    if (await this.declarations.existsBy({ eventId })) return;
    await this.declarations.upsert({ eventId, examId, declarationId, declaredAt }, ['examId']);
  }

  async listSamples() {
    const papers = await this.papers.find({ where: { status: QuestionPaperStatus.SamplePublished }, order: { updatedAt: 'DESC' } });
    return this.withDocuments(papers);
  }

  // Dashboard support for BR-1/BR-2: which exams the caller is assigned to manage
  // classified content for, and which skills within each still have no uploaded
  // paper. `list()` only ever surfaces exams that already have a paper, so an
  // assignment with nothing uploaded yet is otherwise invisible to the caller.
  async myAssignments(actor: AccessClaims) {
    const assignments = await this.assignments.findBy({ userId: actor.sub, active: true });
    const examIds = assignments.map((assignment) => assignment.examId);
    if (!examIds.length) return [];
    const papers = await this.papers.find({ where: { examId: In(examIds), status: Not(QuestionPaperStatus.Retired) } });
    const allSkills = Object.values(Skill);
    return examIds.map((examId) => {
      const skillsUploaded = papers.filter((paper) => paper.examId === examId).map((paper) => paper.skill);
      return { examId, skillsUploaded, skillsPending: allSkills.filter((skill) => !skillsUploaded.includes(skill)) };
    });
  }

  async assignExam(dto: AssignExamContentDto, actor: AccessClaims, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      await manager.upsert(ExamContentAssignmentEntity, { examId: dto.examId, userId: dto.userId, active: true, assignedByUserId: actor.sub }, ['examId', 'userId']);
      const assignment = await manager.findOneByOrFail(ExamContentAssignmentEntity, { examId: dto.examId, userId: dto.userId });
      await this.audit(manager, dto.examId, null, actor.sub, 'EXAM_CONTENT_ASSIGNED', requestId, { examId: dto.examId, assignedUserId: dto.userId });
      return assignment;
    });
  }

  private async prepareDocument(paperId: string, type: DocumentType, file: Express.Multer.File) {
    const scanStatus = await this.scanner.scan(file.buffer);
    const encrypted = this.encryption.encrypt(file.buffer);
    const objectKey = `classified/${paperId}/${type.toLowerCase()}-${randomUUID()}.bin`;
    await this.storage.put(objectKey, encrypted.ciphertext);
    return {
      document: this.documents.create({
        questionPaperId: paperId, documentType: type, objectKey,
        originalName: this.safeFilename(file.originalname), mimeType: 'application/pdf', sizeBytes: String(file.size),
        sha256: createHash('sha256').update(file.buffer).digest('hex'), classification: 'EXAM_CLASSIFIED',
        scanStatus, cipher: 'AES-256-GCM', dataIv: encrypted.dataIv, dataAuthTag: encrypted.dataAuthTag,
        wrappedKey: encrypted.wrappedKey, wrapIv: encrypted.wrapIv, wrapAuthTag: encrypted.wrapAuthTag, keyVersion: encrypted.keyVersion,
      }),
    };
  }

  private validatePdf(file: Express.Multer.File) {
    if (file.size <= 0 || file.size > this.maxFileBytes) throw new DomainException('QUESTION_FILE_SIZE_INVALID', `Files must be between 1 byte and ${this.maxFileBytes} bytes.`, 413);
    if (file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new DomainException('QUESTION_FILE_TYPE_INVALID', 'Only valid PDF documents are accepted.', 415);
    }
  }

  private safeFilename(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255); }
  private async getPaper(id: string) {
    const paper = await this.papers.findOneBy({ id });
    if (!paper || paper.status === QuestionPaperStatus.Retired) throw new DomainException('QUESTION_PAPER_NOT_FOUND', 'Question paper not found.', 404);
    return paper;
  }

  private async assertAssigned(examId: string, actor: AccessClaims) {
    if (actor.permissions.includes('*') || actor.permissions.includes('question.assignment.manage')) return;
    if (!await this.assignments.existsBy({ examId, userId: actor.sub, active: true })) {
      throw new DomainException('EXAM_CONTENT_ASSIGNMENT_REQUIRED', 'You are not assigned to manage classified content for this examination.', 403);
    }
  }

  /**
   * Attach each paper's documents, fetched in a single query and grouped in memory.
   *
   * The per-paper lookup this replaces ran inside a `Promise.all`, so listing a
   * hundred papers opened a hundred concurrent document queries.
   */
  private async withDocuments(papers: QuestionPaperEntity[]) {
    if (!papers.length) return [];
    const documents = await this.documents.findBy({ questionPaperId: In(papers.map((paper) => paper.id)) });
    const byPaper = new Map<string, QuestionDocumentEntity[]>();
    for (const document of documents) {
      const bucket = byPaper.get(document.questionPaperId);
      if (bucket) bucket.push(document);
      else byPaper.set(document.questionPaperId, [document]);
    }
    return papers.map((paper) => this.metadata(paper, byPaper.get(paper.id) ?? []));
  }

  private metadata(paper: QuestionPaperEntity, documents: QuestionDocumentEntity[]) {
    return {
      id: paper.id, examId: paper.examId, title: paper.title, skill: paper.skill, status: paper.status,
      accessAllowedFrom: paper.accessAllowedFrom, accessAllowedUntil: paper.accessAllowedUntil,
      uploadedByUserId: paper.uploadedByUserId, createdAt: paper.createdAt,
      documents: documents.map((document) => ({ id: document.id, type: document.documentType, originalName: document.originalName, sizeBytes: document.sizeBytes, sha256: document.sha256, scanStatus: document.scanStatus, encrypted: true })),
    };
  }

  private audit(manager: EntityManager, questionPaperId: string, documentId: string | null, actorUserId: string | null, action: string, requestId: string, safeData: Record<string, unknown>) {
    return manager.save(AccessAuditEntity, manager.create(AccessAuditEntity, { questionPaperId, documentId, actorUserId, action, requestId, safeData }));
  }

  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) {
    return manager.save(AssessmentOutboxEntity, manager.create(AssessmentOutboxEntity, { eventType, aggregateId, correlationId, payload }));
  }
}
