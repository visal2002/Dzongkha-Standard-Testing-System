/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccessClaims, AppealStatus, DomainEventTypes } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AppealService } from '../apps/appeal-certificate-service/src/appeal.service';
import { CertificateService } from '../apps/appeal-certificate-service/src/certificate.service';
import { ResultClientService } from '../apps/appeal-certificate-service/src/result-client.service';
import {
  AppealEntity,
  AppealIdempotencyEntity,
  AppealOutboxEntity,
  AppealRecommendation,
  AppealDecision,
  AppealSkillEntity,
  FeeRuleEntity,
  FeeRuleStatus,
} from '../apps/appeal-certificate-service/src/entities';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const uuid = () => `20000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const mfaActor = (overrides: Partial<AccessClaims> = {}): AccessClaims => ({
  sub: uuid(),
  sessionId: uuid(),
  roles: ['chief_executive'],
  permissions: ['appeal.approve'],
  assurance: 'MFA',
  ...overrides,
});

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(false),
    existsBy: jest.fn().mockResolvedValue(false),
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
    getRepository: jest.fn().mockReturnValue({ findBy: jest.fn().mockResolvedValue([]) }),
  } as unknown as DataSource);

const makeRepo = <T>(rows: T[] = []): Repository<T> =>
  ({
    find: jest.fn().mockResolvedValue(rows),
    findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
    findBy: jest.fn().mockResolvedValue(rows),
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
    existsBy: jest.fn().mockResolvedValue(rows.length > 0),
  } as unknown as Repository<T>);

const activeFeeRule = (): FeeRuleEntity =>
  Object.assign(new FeeRuleEntity(), {
    id: uuid(),
    code: 'APPEAL-FEE-2026',
    amountPerSkill: '500.00',
    currency: 'BTN',
    status: FeeRuleStatus.Approved,
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
  });

const makeResultClient = (overrides: Partial<ResultClientService> = {}): ResultClientService =>
  ({
    ownPublishedResult: jest.fn().mockResolvedValue({
      id: uuid(),
      examId: uuid(),
      applicationId: uuid(),
      score: {
        versionNumber: 1,
        scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 },
      },
    }),
    assertCommitteeAccess: jest.fn().mockResolvedValue(undefined),
    applyAppealRevision: jest.fn().mockResolvedValue({
      scoreSheetId: uuid(), examId: uuid(), applicationId: uuid(), testTakerUserId: uuid(), version: 2,
    }),
    ...overrides,
  } as unknown as ResultClientService);

const makeCertService = (): CertificateService =>
  ({
    supersedeForScoreRevision: jest.fn().mockResolvedValue({ supersededCount: 1, certificateIds: [uuid()] }),
  } as unknown as CertificateService);

const internalSecret = 'a'.repeat(32);

const buildService = ({
  manager = makeManager(),
  resultClient = makeResultClient(),
  certService = makeCertService(),
  appeals = makeRepo<AppealEntity>(),
  fees = makeRepo<FeeRuleEntity>([activeFeeRule()]),
  idempotency = makeRepo<AppealIdempotencyEntity>(),
}: {
  manager?: EntityManager;
  resultClient?: ResultClientService;
  certService?: CertificateService;
  appeals?: Repository<AppealEntity>;
  fees?: Repository<FeeRuleEntity>;
  idempotency?: Repository<AppealIdempotencyEntity>;
} = {}): AppealService =>
  new AppealService(
    makeDataSource(manager),
    resultClient,
    certService,
    new ConfigService({ INTERNAL_SERVICE_SECRET: internalSecret, PRIVILEGED_ASSURANCE_LEVELS: 'MFA' }),
    appeals,
    fees,
    idempotency,
  );

// ─── appeal submission tests ──────────────────────────────────────────────────

describe('AppealService — Submission (BRD §2.6)', () => {
  it('blocks appeal submission when result is not yet available', async () => {
    const resultClient = makeResultClient({
      ownPublishedResult: jest.fn().mockRejectedValue(new DomainException('RESULT_NOT_FOUND', 'Not found.', 404)),
    });
    const service = buildService({ resultClient });
    const actor = mfaActor({ roles: ['test_taker'], permissions: [] });
    await expect(
      service.submit(
        { applicationId: uuid(), examId: uuid(), skills: ['WRITING'], reason: 'Query score' },
        actor,
        undefined,
        'req-1',
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('blocks resubmission when an active appeal already exists', async () => {
    const applicationId = uuid();
    const examId = uuid();
    const resultClient = makeResultClient({
      ownPublishedResult: jest.fn().mockResolvedValue({
        id: uuid(), examId,
        score: { versionNumber: 1, scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 } },
      }),
    });
    const existingAppeal = Object.assign(new AppealEntity(), {
      id: uuid(), applicationId, testTakerUserId: uuid(), status: AppealStatus.PendingCommittee,
    });
    const manager = makeManager({
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AppealIdempotencyEntity) return null;
        if (entity === AppealEntity) return existingAppeal;
        return activeFeeRule();
      }),
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === FeeRuleEntity) return activeFeeRule();
        return null;
      }),
    });
    const service = buildService({ manager, resultClient, fees: makeRepo([activeFeeRule()]) });
    const actor = mfaActor({ roles: ['test_taker'] });
    await expect(
      service.submit(
        { applicationId, examId, skills: ['WRITING'], reason: 'Resubmit' },
        actor, undefined, 'req-2', 'idem-2',
      ),
    ).rejects.toMatchObject({ code: 'ACTIVE_APPEAL_EXISTS' });
  });

  it('calculates appeal fee proportionally to number of appealed skills', async () => {
    const examId = uuid();
    const feeRule = activeFeeRule(); // 500.00 BTN per skill
    const savedPayments: Record<string, unknown>[] = [];
    const resultClient = makeResultClient({
      ownPublishedResult: jest.fn().mockResolvedValue({
        id: uuid(), examId, applicationId: uuid(),
        score: { versionNumber: 1, scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 } },
      }),
    });
    const manager = makeManager({
      findOneBy: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === FeeRuleEntity) return feeRule;
        return null;
      }),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as Record<string, unknown>)?.referenceType === 'APPEAL') savedPayments.push(data as Record<string, unknown>);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, resultClient, fees: makeRepo([feeRule]) });
    const actor = mfaActor({ roles: ['test_taker'], assurance: 'LOCAL' });
    await service.submit(
      { applicationId: uuid(), examId, skills: ['WRITING', 'READING'], reason: 'Check score' },
      actor, undefined, 'req-3', 'idem-3',
    );
    expect(savedPayments[0]?.amount).toBe('1000.00'); // 2 skills × 500
  });

  it('throws when Idempotency-Key header is missing', async () => {
    const service = buildService();
    await expect(
      service.submit({ applicationId: uuid(), examId: uuid(), skills: ['WRITING'], reason: 'Test' }, mfaActor(), undefined, 'req-4', ''),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
  });
});

// ─── payment confirmation tests ───────────────────────────────────────────────

describe('AppealService — Payment confirmation (BRD §2.6)', () => {
  it('rejects payment with wrong internal service key', async () => {
    const service = buildService();
    await expect(
      service.confirmPayment(uuid(), {
        externalTransactionId: 'tx-001', amount: 1000, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB',
      }, 'wrong-key', 'req-5'),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVICE_AUTH_FAILED' });
  });

  it('rejects when appeal is not awaiting payment', async () => {
    const appealId = uuid();
    const completedAppeal = Object.assign(new AppealEntity(), {
      id: appealId, paymentId: uuid(), status: AppealStatus.Completed,
    });
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AppealEntity) return completedAppeal;
        return { id: completedAppeal.paymentId, status: 'PAID', amount: '500.00', currency: 'BTN' };
      }),
    });
    const service = buildService({ manager });
    await expect(
      service.confirmPayment(appealId, {
        externalTransactionId: 'tx-002', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB',
      }, internalSecret, 'req-6'),
    ).rejects.toMatchObject({ code: 'PAYMENT_STATE_INVALID' });
  });

  it('rejects when payment amount does not match fee', async () => {
    const appealId = uuid();
    const paymentId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, paymentId, status: AppealStatus.Submitted,
    });
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AppealEntity) return pendingAppeal;
        return { id: paymentId, status: 'INITIATED', amount: '1000.00', currency: 'BTN' };
      }),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (_e: unknown, d: unknown) => d),
      create: jest.fn().mockImplementation((_e: unknown, d: unknown) => d),
    });
    const service = buildService({ manager });
    await expect(
      service.confirmPayment(appealId, {
        externalTransactionId: 'tx-003', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB', // wrong amount
      }, internalSecret, 'req-7'),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' });
  });
});

// ─── committee review tests ───────────────────────────────────────────────────

describe('AppealService — Committee review (BRD §2.6)', () => {
  it('NoChange recommendation immediately completes the appeal', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(), status: AppealStatus.PendingCommittee,
      paymentId: uuid(), committeeRecommendation: null, chiefDecision: null,
      submittedAt: new Date(), completedAt: null,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: 'WRITING', originalScore: '7', proposedScore: null, finalScore: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue(skills),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({ assertCommitteeAccess: jest.fn().mockResolvedValue(undefined) });
    const service = buildService({ manager, resultClient });
    await service.committeeReview(
      appealId,
      { recommendation: AppealRecommendation.NoChange, remarks: 'Score confirmed.' },
      mfaActor({ roles: ['committee_head'] }),
      undefined,
      'req-8',
    );
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealCompleted)).toBe(true);
  });

  it('Revise recommendation advances to PendingChiefApproval', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(), status: AppealStatus.PendingCommittee,
      paymentId: uuid(), committeeRecommendation: null, chiefDecision: null,
      submittedAt: new Date(), completedAt: null,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: 'WRITING', originalScore: '7', proposedScore: null, finalScore: null }),
    ];
    const appealStatuses: AppealStatus[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue(skills),
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealEntity)?.status) appealStatuses.push((data as AppealEntity).status);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({ assertCommitteeAccess: jest.fn().mockResolvedValue(undefined) });
    const service = buildService({ manager, resultClient });
    await service.committeeReview(
      appealId,
      { recommendation: AppealRecommendation.Revise, proposedScores: { WRITING: 8 }, remarks: 'Higher score warranted.' },
      mfaActor({ roles: ['committee_head'] }),
      undefined,
      'req-9',
    );
    expect(appealStatuses).toContain(AppealStatus.PendingChiefApproval);
  });

  it('rejects revision recommendation when proposed scores differ from appealed skills', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), status: AppealStatus.PendingCommittee, paymentId: uuid(),
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: 'WRITING', originalScore: '7', proposedScore: null }),
    ];
    const appeals = makeRepo<AppealEntity>([pendingAppeal]);
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue(skills),
    });
    const resultClient = makeResultClient({ assertCommitteeAccess: jest.fn().mockResolvedValue(undefined) });
    const service = buildService({ manager, resultClient, appeals });
    await expect(
      service.committeeReview(
        appealId,
        { recommendation: AppealRecommendation.Revise, proposedScores: { READING: 8 }, remarks: 'Wrong skill.' }, // READING not in appeal
        mfaActor({ roles: ['committee_head'] }),
        undefined,
        'req-10',
      ),
    ).rejects.toMatchObject({ code: 'APPEAL_PROPOSED_SKILLS_INVALID' });
  });
});

// ─── chief executive decision tests ──────────────────────────────────────────

describe('AppealService — Chief Executive decision (BRD §2.6)', () => {
  it('blocks non-privileged assurance from deciding', async () => {
    const service = buildService();
    const localActor = mfaActor({ assurance: 'LOCAL', roles: ['chief_executive'] });
    await expect(
      service.decide(uuid(), { decision: AppealDecision.Approved, remarks: '' }, localActor, 'req-11'),
    ).rejects.toMatchObject({ code: 'PRIVILEGED_ASSURANCE_REQUIRED' });
  });

  it('Approved decision transitions appeal to ApprovedPendingScoreUpdate and emits AppealApproved', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(),
      status: AppealStatus.PendingChiefApproval,
      committeeRecommendation: AppealRecommendation.Revise,
      chiefDecision: null, paymentId: uuid(), submittedAt: new Date(), completedAt: null,
    });
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    await service.decide(appealId, { decision: AppealDecision.Approved, remarks: 'Approved.' }, mfaActor(), 'req-12');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealApproved)).toBe(true);
  });

  it('Rejected decision completes appeal without score change', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(),
      status: AppealStatus.PendingChiefApproval,
      committeeRecommendation: AppealRecommendation.Revise,
      chiefDecision: null, paymentId: uuid(), submittedAt: new Date(), completedAt: null,
    });
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    await service.decide(appealId, { decision: AppealDecision.Rejected, remarks: 'No merit.' }, mfaActor(), 'req-13');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealRejected)).toBe(true);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealCompleted)).toBe(true);
  });
});
