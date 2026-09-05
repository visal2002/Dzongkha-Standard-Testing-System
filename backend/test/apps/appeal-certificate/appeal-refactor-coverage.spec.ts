/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `confirmPayment`, `applyApprovedRevision` and `validateRecommendation` were split
 * into named helper methods to bring their cyclomatic complexity under the
 * project's ESLint limit (see appeal.service.ts). The extraction was mechanical -
 * every check, error code and side effect kept its exact order - but several of
 * the branches it touches had no direct unit coverage before. These tests close
 * that gap so the behavior the refactor promised to preserve is actually pinned.
 */
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, AppealStatus, Skill } from '@dzongjuk/contracts';
import { AppealService } from '../../../apps/appeal-certificate-service/src/appeal.service';
import { CertificateService } from '../../../apps/appeal-certificate-service/src/certificate.service';
import { ResultClientService } from '../../../apps/appeal-certificate-service/src/result-client.service';
import {
  AppealDecision,
  AppealEntity,
  AppealIdempotencyEntity,
  AppealRecommendation,
  AppealSkillEntity,
  FeeRuleEntity,
  PaymentStatus,
} from '../../../apps/appeal-certificate-service/src/entities';

const uuid = () => `60000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;
const internalSecret = 'a'.repeat(32);

const mfaActor = (overrides: Partial<AccessClaims> = {}): AccessClaims => ({
  sub: uuid(), sessionId: uuid(), roles: ['chief_executive'], permissions: ['appeal.approve'], assurance: 'MFA', ...overrides,
});

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => ({ ...(data as Record<string, unknown>), id: uuid() })),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
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
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
    existsBy: jest.fn().mockResolvedValue(rows.length > 0),
  } as unknown as Repository<T>);

const makeResultClient = (overrides: Partial<ResultClientService> = {}): ResultClientService =>
  ({
    applyAppealRevision: jest.fn().mockResolvedValue({ scoreSheetId: uuid(), examId: uuid(), applicationId: uuid(), testTakerUserId: uuid(), version: 2 }),
    assertCommitteeAccess: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ResultClientService);

const makeCertService = (overrides: Partial<CertificateService> = {}): CertificateService =>
  ({ supersedeForScoreRevision: jest.fn().mockResolvedValue({ supersededCount: 0, certificateIds: [] }), ...overrides } as unknown as CertificateService);

const buildService = ({
  manager = makeManager(),
  resultClient = makeResultClient(),
  certService = makeCertService(),
  appeals = makeRepo<AppealEntity>(),
}: {
  manager?: EntityManager; resultClient?: ResultClientService; certService?: CertificateService; appeals?: Repository<AppealEntity>;
} = {}) =>
  new AppealService(
    makeDataSource(manager), resultClient, certService,
    new ConfigService({ INTERNAL_SERVICE_SECRET: internalSecret, PRIVILEGED_ASSURANCE_LEVELS: 'MFA' }),
    appeals, makeRepo<FeeRuleEntity>(), makeRepo<AppealIdempotencyEntity>(),
  );

// ─── confirmPayment: branches not covered by the existing spec ────────────────

describe('AppealService.confirmPayment - additional branches', () => {
  it('rejects a provider transaction id already reconciled against a different payment', async () => {
    const appealId = uuid();
    const paymentId = uuid();
    const appeal = Object.assign(new AppealEntity(), { id: appealId, paymentId, status: AppealStatus.Submitted });
    const payment = { id: paymentId, status: PaymentStatus.Initiated, amount: '500.00', currency: 'BTN' };
    const otherPayment = { id: uuid() }; // a different payment already using this transaction id
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? appeal : payment)),
      findOneBy: jest.fn().mockResolvedValue(otherPayment),
    });
    const service = buildService({ manager });

    await expect(
      service.confirmPayment(appealId, { externalTransactionId: 'tx-reused', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB' }, internalSecret, 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_TRANSACTION_DUPLICATE' } });
  });

  it('replays the same detail when the same transaction confirms an already-paid payment', async () => {
    const appealId = uuid();
    const paymentId = uuid();
    const appeal = Object.assign(new AppealEntity(), { id: appealId, paymentId, status: AppealStatus.PaymentCompleted });
    const payment = { id: paymentId, status: PaymentStatus.Paid, externalTransactionId: 'tx-same', amount: '500.00', currency: 'BTN' };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? appeal : payment)),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? appeal : null)),
    });
    const service = buildService({ manager });

    const result = await service.confirmPayment(appealId, { externalTransactionId: 'tx-same', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB' }, internalSecret, 'req-2');
    expect((result as { id: string }).id).toBe(appealId);
  });

  it('rejects when an already-paid payment is confirmed again with a different transaction id', async () => {
    const appealId = uuid();
    const paymentId = uuid();
    const appeal = Object.assign(new AppealEntity(), { id: appealId, paymentId, status: AppealStatus.PaymentCompleted });
    const payment = { id: paymentId, status: PaymentStatus.Paid, externalTransactionId: 'tx-original', amount: '500.00', currency: 'BTN' };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? appeal : payment)),
    });
    const service = buildService({ manager });

    await expect(
      service.confirmPayment(appealId, { externalTransactionId: 'tx-different', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB' }, internalSecret, 'req-3'),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_ALREADY_CONFIRMED' } });
  });
});

// ─── applyApprovedRevision: branches not covered by the existing spec ─────────

describe('AppealService.applyApprovedRevision - additional branches', () => {
  it('returns the existing detail without touching Result/Certificate services when already completed', async () => {
    const appealId = uuid();
    const appeal = Object.assign(new AppealEntity(), { id: appealId, status: AppealStatus.Completed, chiefDecision: AppealDecision.Approved });
    const manager = makeManager({ findOneBy: jest.fn().mockResolvedValue(appeal) });
    const applyAppealRevision = jest.fn();
    const supersedeForScoreRevision = jest.fn();
    const resultClient = makeResultClient({ applyAppealRevision });
    const certService = makeCertService({ supersedeForScoreRevision });
    const service = buildService({ manager, appeals: makeRepo([appeal]), resultClient, certService });

    const result = await service.applyApprovedRevision(appealId, mfaActor(), 'req-4', 'key-1');

    expect((result as { id: string }).id).toBe(appealId);
    expect(applyAppealRevision).not.toHaveBeenCalled();
    expect(supersedeForScoreRevision).not.toHaveBeenCalled();
  });

  it('rejects when the appeal is not an approved appeal awaiting a score update', async () => {
    const appealId = uuid();
    const appeal = Object.assign(new AppealEntity(), { id: appealId, status: AppealStatus.PendingCommittee, chiefDecision: null });
    const service = buildService({ appeals: makeRepo([appeal]) });

    await expect(service.applyApprovedRevision(appealId, mfaActor(), 'req-5', 'key-2'))
      .rejects.toMatchObject({ response: { code: 'APPEAL_SCORE_UPDATE_STATE_INVALID' } });
  });

  it('rejects when a Chief-approved skill has no committee-proposed score to apply', async () => {
    const appealId = uuid();
    const appeal = Object.assign(new AppealEntity(), {
      id: appealId, status: AppealStatus.ApprovedPendingScoreUpdate, chiefDecision: AppealDecision.Approved,
      scoreSheetId: uuid(), scoreVersionNumber: 1,
    });
    const skills = [Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, chiefDecision: AppealDecision.Approved, proposedScore: null })];
    const manager = makeManager({ findBy: jest.fn().mockResolvedValue(skills) });
    const service = buildService({ manager, appeals: makeRepo([appeal]) });

    await expect(service.applyApprovedRevision(appealId, mfaActor(), 'req-6', 'key-3'))
      .rejects.toMatchObject({ response: { code: 'APPEAL_PROPOSED_SCORE_MISSING' } });
  });

  it('rejects when the Result service applies the revision to a different candidate than the appeal names', async () => {
    const appealId = uuid();
    const examId = uuid();
    const applicationId = uuid();
    const testTakerUserId = uuid();
    const appeal = Object.assign(new AppealEntity(), {
      id: appealId, examId, applicationId, testTakerUserId,
      status: AppealStatus.ApprovedPendingScoreUpdate, chiefDecision: AppealDecision.Approved,
      scoreSheetId: uuid(), scoreVersionNumber: 1,
    });
    const skills = [Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, chiefDecision: AppealDecision.Approved, proposedScore: '8' })];
    const manager = makeManager({ findBy: jest.fn().mockResolvedValue(skills) });
    // Result-service reports a revision against a different exam - the mismatch must be caught, not applied.
    const resultClient = makeResultClient({
      applyAppealRevision: jest.fn().mockResolvedValue({ scoreSheetId: appeal.scoreSheetId, examId: uuid(), applicationId, testTakerUserId, version: 2 }),
    });
    const service = buildService({ manager, appeals: makeRepo([appeal]), resultClient });

    await expect(service.applyApprovedRevision(appealId, mfaActor(), 'req-7', 'key-4'))
      .rejects.toMatchObject({ response: { code: 'APPEAL_SCORE_UPDATE_MISMATCH' } });
  });

  it('only sends Chief-approved skills to the Result service, not rejected ones', async () => {
    const appealId = uuid();
    const examId = uuid();
    const applicationId = uuid();
    const testTakerUserId = uuid();
    const appeal = Object.assign(new AppealEntity(), {
      id: appealId, examId, applicationId, testTakerUserId,
      status: AppealStatus.ApprovedPendingScoreUpdate, chiefDecision: AppealDecision.Approved,
      scoreSheetId: uuid(), scoreVersionNumber: 1,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, chiefDecision: AppealDecision.Approved, proposedScore: '8' }),
      Object.assign(new AppealSkillEntity(), { skill: Skill.Speaking, chiefDecision: AppealDecision.Rejected, proposedScore: null }),
    ];
    const manager = makeManager({
      findBy: jest.fn().mockResolvedValue(skills),
      findOneBy: jest.fn().mockResolvedValue(appeal),
    });
    const applyAppealRevision = jest.fn().mockResolvedValue({ scoreSheetId: appeal.scoreSheetId, examId, applicationId, testTakerUserId, version: 2 });
    const resultClient = makeResultClient({ applyAppealRevision });
    const service = buildService({ manager, appeals: makeRepo([appeal]), resultClient });

    await service.applyApprovedRevision(appealId, mfaActor(), 'req-8', 'key-5');

    expect(applyAppealRevision).toHaveBeenCalledWith(
      appeal.scoreSheetId, appeal.id, 1, expect.any(String), { writing: 8 }, 'req-8',
    );
  });
});

// ─── validateRecommendation (via committeeReview): branches not covered ───────

describe('AppealService committee recommendation validation - additional branches', () => {
  const pendingReview = (appealId: string) => Object.assign(new AppealEntity(), { id: appealId, examId: uuid(), status: AppealStatus.PendingCommittee, paymentId: uuid() });

  it('rejects a NoChange recommendation that still carries proposed scores', async () => {
    const appealId = uuid();
    const appeal = pendingReview(appealId);
    const skills = [Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7' })];
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(appeal), findBy: jest.fn().mockResolvedValue(skills) });
    const service = buildService({ manager, appeals: makeRepo([appeal]) });

    await expect(
      service.committeeReview(appealId, { recommendation: AppealRecommendation.NoChange, proposedScores: { WRITING: 7 }, remarks: 'x' }, mfaActor({ roles: ['committee_head'] }), undefined, 'req-9'),
    ).rejects.toMatchObject({ response: { code: 'APPEAL_PROPOSED_SCORE_NOT_ALLOWED' } });
  });

  it('rejects a proposed score that is negative', async () => {
    const appealId = uuid();
    const appeal = pendingReview(appealId);
    const skills = [Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7' })];
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(appeal), findBy: jest.fn().mockResolvedValue(skills) });
    const service = buildService({ manager, appeals: makeRepo([appeal]) });

    await expect(
      service.committeeReview(appealId, { recommendation: AppealRecommendation.Revise, proposedScores: { WRITING: -1 }, remarks: 'x' }, mfaActor({ roles: ['committee_head'] }), undefined, 'req-10'),
    ).rejects.toMatchObject({ response: { code: 'APPEAL_PROPOSED_SCORE_INVALID' } });
  });

  it('rejects a Revise recommendation whose proposed scores all equal the published scores', async () => {
    const appealId = uuid();
    const appeal = pendingReview(appealId);
    const skills = [Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7' })];
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(appeal), findBy: jest.fn().mockResolvedValue(skills) });
    const service = buildService({ manager, appeals: makeRepo([appeal]) });

    await expect(
      service.committeeReview(appealId, { recommendation: AppealRecommendation.Revise, proposedScores: { WRITING: 7 }, remarks: 'x' }, mfaActor({ roles: ['committee_head'] }), undefined, 'req-11'),
    ).rejects.toMatchObject({ response: { code: 'APPEAL_REVISION_UNCHANGED' } });
  });
});
