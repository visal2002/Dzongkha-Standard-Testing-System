/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, DomainEventTypes, QuestionPaperStatus, Skill } from '@dzongjuk/contracts';
import { AssessmentService } from '../apps/assessment-content-service/src/assessment.service';
import { EncryptionService } from '../apps/assessment-content-service/src/encryption.service';
import { MalwareScannerService } from '../apps/assessment-content-service/src/malware-scanner.service';
import { ObjectStorageService } from '../apps/assessment-content-service/src/object-storage.service';
import {
  AssessmentOutboxEntity,
  DocumentType,
  ExamContentAssignmentEntity,
  QuestionDocumentEntity,
  QuestionPaperEntity,
  ResultDeclarationProjectionEntity,
} from '../apps/assessment-content-service/src/entities';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const uuid = () => `30000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const examHeadActor = (overrides: Partial<AccessClaims> = {}): AccessClaims => ({
  sub: uuid(),
  sessionId: uuid(),
  roles: ['exam_head'],
  permissions: ['question.upload', 'question.assignment.manage'],
  assurance: 'NDI',
  ...overrides,
});

const makePdf = (): Express.Multer.File =>
  ({
    fieldname: 'questionPaper',
    originalname: 'paper.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(1019)]),
  } as Express.Multer.File);

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => ({
      ...(data as Record<string, unknown>), id: uuid(),
    })),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    upsert: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as EntityManager);

const makeDataSource = (manager: EntityManager): DataSource =>
  ({
    transaction: jest.fn().mockImplementation(async (isolationOrFn: unknown, fn?: unknown) => {
      const transact = typeof isolationOrFn === 'function' ? isolationOrFn : fn!;
      return (transact as (m: EntityManager) => Promise<unknown>)(manager);
    }),
    manager,
  } as unknown as DataSource);

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({
    find: jest.fn().mockResolvedValue(rows),
    findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
    findBy: jest.fn().mockResolvedValue(rows),
    count: jest.fn().mockResolvedValue(rows.length),
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
    existsBy: jest.fn().mockResolvedValue(rows.length > 0),
    upsert: jest.fn().mockResolvedValue({}),
  } as unknown as Repository<T>);

const makeEncryption = (): EncryptionService => {
  const key = Buffer.alloc(32, 7).toString('base64');
  return new EncryptionService(new ConfigService({ ASSESSMENT_MASTER_KEY_BASE64: key, ASSESSMENT_KEY_VERSION: 'v1' }));
};

const makeScanner = (): MalwareScannerService =>
  ({ scan: jest.fn().mockResolvedValue('CLEAN') } as unknown as MalwareScannerService);

const makeStorage = (): ObjectStorageService =>
  ({
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(Buffer.alloc(16)),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as ObjectStorageService);

const buildService = ({
  manager = makeManager(),
  papers = makeRepo<QuestionPaperEntity>(),
  documents = makeRepo<QuestionDocumentEntity>(),
  declarations = makeRepo<ResultDeclarationProjectionEntity>(),
  assignments = makeRepo<ExamContentAssignmentEntity>(),
}: {
  manager?: EntityManager;
  papers?: Repository<QuestionPaperEntity>;
  documents?: Repository<QuestionDocumentEntity>;
  declarations?: Repository<ResultDeclarationProjectionEntity>;
  assignments?: Repository<ExamContentAssignmentEntity>;
} = {}): AssessmentService =>
  new AssessmentService(
    makeDataSource(manager),
    makeEncryption(),
    makeScanner(),
    makeStorage(),
    new ConfigService({ MAX_ASSESSMENT_FILE_BYTES: 52_428_800 }),
    papers,
    documents,
    declarations,
    assignments,
  );

// ─── upload tests ─────────────────────────────────────────────────────────────

describe('AssessmentService — Question paper upload (BRD §2.4)', () => {
  const validDto = {
    examId: uuid(),
    title: 'Dzongkha Writing Paper 2026',
    skill: Skill.Writing,
    accessAllowedFrom: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    accessAllowedUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  };

  it('rejects upload when access window end ≤ access window start', async () => {
    const actor = examHeadActor();
    const service = buildService();
    await expect(
      service.upload(
        { ...validDto, accessAllowedFrom: '2026-10-10T09:00:00Z', accessAllowedUntil: '2026-10-09T08:00:00Z' },
        { questionPaper: [makePdf()] },
        actor,
        'req-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'ACCESS_WINDOW_INVALID' } });
  });

  it('rejects upload when question paper file is missing', async () => {
    const actor = examHeadActor();
    const service = buildService();
    await expect(
      service.upload(validDto, {}, actor, 'req-2'),
    ).rejects.toMatchObject({ response: { code: 'QUESTION_DOCUMENT_REQUIRED' } });
  });

  it('rejects non-PDF file type', async () => {
    const actor = examHeadActor();
    const service = buildService();
    const badFile: Express.Multer.File = {
      ...makePdf(),
      mimetype: 'image/jpeg',
      buffer: Buffer.from('JPEG data'),
    };
    await expect(
      service.upload(validDto, { questionPaper: [badFile] }, actor, 'req-3'),
    ).rejects.toMatchObject({ response: { code: 'QUESTION_FILE_TYPE_INVALID' } });
  });

  it('stores the uploaded file encrypted and emits QuestionPaperUploaded outbox event', async () => {
    const actor = examHeadActor();
    const outboxEvents: AssessmentOutboxEntity[] = [];
    const manager = makeManager({
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AssessmentOutboxEntity)?.eventType) outboxEvents.push(data as AssessmentOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const result = await service.upload(validDto, { questionPaper: [makePdf()] }, actor, 'req-4');
    expect(result.documents[0].encrypted).toBe(true);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.QuestionPaperUploaded)).toBe(true);
  });
});

// ─── access window enforcement tests ─────────────────────────────────────────

describe('AssessmentService — Download access window enforcement (BRD §2.4)', () => {
  it('blocks download before the access window opens', async () => {
    const paper = Object.assign(new QuestionPaperEntity(), {
      id: uuid(),
      examId: uuid(),
      status: QuestionPaperStatus.Ready,
      accessAllowedFrom: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      accessAllowedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const papers = makeRepo([paper]);
    const actor = examHeadActor();
    const service = buildService({ papers });
    await expect(service.download(paper.id, DocumentType.QuestionPaper, actor, 'req-5'))
      .rejects.toMatchObject({ response: { code: 'QUESTION_ACCESS_WINDOW_CLOSED' } });
  });

  it('blocks download after the access window has closed', async () => {
    const paper = Object.assign(new QuestionPaperEntity(), {
      id: uuid(),
      examId: uuid(),
      status: QuestionPaperStatus.Ready,
      accessAllowedFrom: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      accessAllowedUntil: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    });
    const papers = makeRepo([paper]);
    const actor = examHeadActor();
    const service = buildService({ papers });
    await expect(service.download(paper.id, DocumentType.QuestionPaper, actor, 'req-6'))
      .rejects.toMatchObject({ response: { code: 'QUESTION_ACCESS_WINDOW_CLOSED' } });
  });
});

// ─── sample publication tests ─────────────────────────────────────────────────

describe('AssessmentService — Sample publication (BRD §2.4)', () => {
  it('blocks sample publication before results are declared', async () => {
    const paper = Object.assign(new QuestionPaperEntity(), {
      id: uuid(),
      examId: uuid(),
      status: QuestionPaperStatus.Ready,
      accessAllowedFrom: new Date(Date.now() - 2 * 60 * 60 * 1000),
      accessAllowedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const papers = makeRepo([paper]);
    const declarations = makeRepo<ResultDeclarationProjectionEntity>([]); // no declaration yet
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(paper),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultDeclarationProjectionEntity) return null; // results not declared
        return null;
      }),
    });
    const actor = examHeadActor();
    const service = buildService({ manager, papers, declarations });
    await expect(service.publishSample(paper.id, actor, 'req-7'))
      .rejects.toMatchObject({ response: { code: 'RESULTS_NOT_DECLARED' } });
  });

  it('changes paper status to SamplePublished after results are declared and emits event', async () => {
    const paper = Object.assign(new QuestionPaperEntity(), {
      id: uuid(), examId: uuid(), status: QuestionPaperStatus.Ready,
      accessAllowedFrom: new Date(Date.now() - 2 * 60 * 60 * 1000),
      accessAllowedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const declaration = { declarationId: uuid(), examId: paper.examId, declaredAt: new Date() };
    const outboxEvents: AssessmentOutboxEntity[] = [];
    let savedPaperStatus: string | undefined;
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(paper),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultDeclarationProjectionEntity) return declaration;
        return null;
      }),
      findBy: jest.fn().mockResolvedValue([]),
      // publishSample writes the paper with save(entity) and the outbox row with save(Entity, data)
      save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => {
        const row = (data ?? entityOrData) as QuestionPaperEntity & AssessmentOutboxEntity;
        if (row?.status) savedPaperStatus = row.status;
        if (row?.eventType) outboxEvents.push(row);
        return { ...(row as unknown as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const papers = makeRepo([paper]);
    const actor = examHeadActor();
    const service = buildService({ manager, papers });
    await service.publishSample(paper.id, actor, 'req-8');
    expect(savedPaperStatus).toBe(QuestionPaperStatus.SamplePublished);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.SamplePaperPublished)).toBe(true);
  });

  it('blocks publishing a paper that is not in Ready status', async () => {
    const paper = Object.assign(new QuestionPaperEntity(), {
      id: uuid(), examId: uuid(), status: QuestionPaperStatus.SamplePublished,
    });
    const declaration = { declarationId: uuid(), examId: paper.examId, declaredAt: new Date() };
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(paper),
      findOneBy: jest.fn().mockResolvedValue(declaration),
    });
    const papers = makeRepo([paper]);
    const actor = examHeadActor();
    const service = buildService({ manager, papers });
    await expect(service.publishSample(paper.id, actor, 'req-9'))
      .rejects.toMatchObject({ response: { code: 'SAMPLE_PUBLICATION_INVALID' } });
  });
});
