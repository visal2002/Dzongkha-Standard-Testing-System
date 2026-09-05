/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `list()` and `listSamples()` each used to issue one `QuestionDocumentEntity`
 * query per question paper inside a `Promise.all`. They now fetch every matching
 * paper's documents in a single query and group them in memory via `withDocuments`.
 */
import { ConfigService } from '@nestjs/config';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, QuestionPaperStatus, Skill } from '@dzongjuk/contracts';
import { AssessmentService } from '../../../apps/assessment-content-service/src/assessment.service';
import { EncryptionService } from '../../../apps/assessment-content-service/src/encryption.service';
import { MalwareScannerService } from '../../../apps/assessment-content-service/src/malware-scanner.service';
import { ObjectStorageService } from '../../../apps/assessment-content-service/src/object-storage.service';
import { DocumentType, ExamContentAssignmentEntity, QuestionDocumentEntity, QuestionPaperEntity } from '../../../apps/assessment-content-service/src/entities';

const uuid = () => `40000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const managerActor: AccessClaims = { sub: uuid(), sessionId: uuid(), roles: ['identity_admin'], permissions: ['*'], assurance: 'MFA' };

const paper = (id: string, examId: string, status = QuestionPaperStatus.Ready) =>
  Object.assign(new QuestionPaperEntity(), {
    id, examId, title: 'Writing Paper', skill: Skill.Writing, status,
    accessAllowedFrom: new Date(), accessAllowedUntil: new Date(), uploadedByUserId: uuid(), createdAt: new Date(),
  });

const document = (id: string, questionPaperId: string, type: DocumentType) =>
  Object.assign(new QuestionDocumentEntity(), {
    id, questionPaperId, documentType: type, originalName: 'paper.pdf', sizeBytes: 1024, sha256: 'x'.repeat(64), scanStatus: 'CLEAN',
  });

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({ find: jest.fn().mockResolvedValue(rows), findBy: jest.fn().mockResolvedValue(rows) } as unknown as Repository<T>);

const buildService = (papers: Repository<QuestionPaperEntity>, documentsFindBy: jest.Mock) => new AssessmentService(
  {} as DataSource,
  {} as EncryptionService,
  {} as MalwareScannerService,
  {} as ObjectStorageService,
  new ConfigService({ MAX_ASSESSMENT_FILE_BYTES: 52_428_800 }),
  papers,
  { findBy: documentsFindBy } as unknown as Repository<QuestionDocumentEntity>,
  {} as never,
  makeRepo<ExamContentAssignmentEntity>(),
);

describe('AssessmentService document batching', () => {
  it('list() fetches documents for every paper in one query, grouped by paper', async () => {
    const paperA = paper('paper-a', 'exam-1');
    const paperB = paper('paper-b', 'exam-1');
    const documentsFindBy = jest.fn().mockResolvedValue([
      document('doc-a', 'paper-a', DocumentType.QuestionPaper),
      document('doc-b', 'paper-b', DocumentType.QuestionPaper),
      document('doc-b2', 'paper-b', DocumentType.AnswerSheet),
    ]);
    const service = buildService(makeRepo([paperA, paperB]), documentsFindBy);

    const result = await service.list(managerActor);

    expect(documentsFindBy).toHaveBeenCalledTimes(1);
    expect(result.find((p) => p.id === 'paper-a')!.documents).toHaveLength(1);
    expect(result.find((p) => p.id === 'paper-b')!.documents).toHaveLength(2);
  });

  it('gives a paper with no uploaded documents an empty array, not undefined', async () => {
    const paperA = paper('paper-a', 'exam-1');
    const documentsFindBy = jest.fn().mockResolvedValue([]);
    const service = buildService(makeRepo([paperA]), documentsFindBy);

    const result = await service.list(managerActor);
    expect(result[0].documents).toEqual([]);
  });

  it('issues no document query at all when no papers match', async () => {
    const documentsFindBy = jest.fn();
    const service = buildService(makeRepo<QuestionPaperEntity>([]), documentsFindBy);

    expect(await service.list(managerActor)).toEqual([]);
    expect(documentsFindBy).not.toHaveBeenCalled();
  });

  it('listSamples() batches documents the same way as list()', async () => {
    const paperA = paper('paper-a', 'exam-1', QuestionPaperStatus.SamplePublished);
    const documentsFindBy = jest.fn().mockResolvedValue([document('doc-a', 'paper-a', DocumentType.QuestionPaper)]);
    const service = buildService(makeRepo([paperA]), documentsFindBy);

    const result = await service.listSamples();

    expect(documentsFindBy).toHaveBeenCalledTimes(1);
    expect(result[0].documents).toHaveLength(1);
  });
});
