/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, AppealStatus, DomainEventTypes, Skill } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AppealService } from '../../../apps/appeal-certificate-service/src/appeal.service';
import { CertificateService } from '../../../apps/appeal-certificate-service/src/certificate.service';
import { ResultClientService } from '../../../apps/appeal-certificate-service/src/result-client.service';
import {
  AppealDecision,
  AppealEntity,
  AppealIdempotencyEntity,
  AppealOutboxEntity,
  AppealRecommendation,
  AppealSkillEntity,
  FeeRuleEntity,
  FeeRuleStatus,
  PaymentStatus,
} from '../../../apps/appeal-certificate-service/src/entities';

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
        { applicationId: uuid(), examId: uuid(), skills: [Skill.Writing], reason: 'Query score' },
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
        { applicationId, examId, skills: [Skill.Writing], reason: 'Resubmit' },
        actor, undefined, 'req-2', 'idem-2',
      ),
    ).rejects.toMatchObject({ response: { code: 'ACTIVE_APPEAL_EXISTS' } });
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
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === FeeRuleEntity) return feeRule;
        return null;
      }),
      // submit() first probes for an active appeal by applicationId, then projects the new
      // one through detail() by id — only the second lookup may resolve to a row.
      findOneBy: jest.fn().mockImplementation(async (entity: unknown, where: Record<string, unknown>) =>
        (entity === AppealEntity && where?.id
          ? Object.assign(new AppealEntity(), { id: where.id as string, examId, paymentId: null })
          : null)),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as Record<string, unknown>)?.referenceType === 'APPEAL') savedPayments.push(data as Record<string, unknown>);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, resultClient, fees: makeRepo([feeRule]) });
    const actor = mfaActor({ roles: ['test_taker'], assurance: 'LOCAL' });
    await service.submit(
      { applicationId: uuid(), examId, skills: [Skill.Writing, Skill.Reading], reason: 'Check score' },
      actor, undefined, 'req-3', 'idem-3',
    );
    expect(savedPayments[0]?.amount).toBe('1000.00'); // 2 skills × 500
  });

  it('throws when Idempotency-Key header is missing', async () => {
    const service = buildService();
    await expect(
      service.submit({ applicationId: uuid(), examId: uuid(), skills: [Skill.Writing], reason: 'Test' }, mfaActor(), undefined, 'req-4', ''),
    ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REQUIRED' } });
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
    ).rejects.toMatchObject({ response: { code: 'INTERNAL_SERVICE_AUTH_FAILED' } });
  });

  it('rejects when appeal is not awaiting payment', async () => {
    const appealId = uuid();
    const completedAppeal = Object.assign(new AppealEntity(), {
      id: appealId, paymentId: uuid(), status: AppealStatus.Completed,
    });
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AppealEntity) return completedAppeal;
        return { id: completedAppeal.paymentId, status: PaymentStatus.Initiated, amount: '500.00', currency: 'BTN' };
      }),
    });
    const service = buildService({ manager });
    await expect(
      service.confirmPayment(appealId, {
        externalTransactionId: 'tx-002', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB',
      }, internalSecret, 'req-6'),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_STATE_INVALID' } });
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
      save: jest.fn().mockImplementation(async (_e: unknown, d: unknown) => d),
      create: jest.fn().mockImplementation((_e: unknown, d: unknown) => d),
    });
    const service = buildService({ manager });
    await expect(
      service.confirmPayment(appealId, {
        externalTransactionId: 'tx-003', amount: 500, currency: 'BTN', paidAt: new Date().toISOString(), gateway: 'BNB', // wrong amount
      }, internalSecret, 'req-7'),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_AMOUNT_MISMATCH' } });
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
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: null, finalScore: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      // detail() re-reads the appeal through findOneBy after the transition is written
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({ assertCommitteeAccess: jest.fn().mockResolvedValue(undefined) });
    const service = buildService({ manager, resultClient, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
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
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: null, finalScore: null }),
    ];
    const appealStatuses: AppealStatus[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      // detail() re-reads the appeal through findOneBy after the transition is written
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealEntity)?.status) appealStatuses.push((data as AppealEntity).status);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({ assertCommitteeAccess: jest.fn().mockResolvedValue(undefined) });
    const service = buildService({ manager, resultClient, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
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
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: null }),
    ];
    const appeals = makeRepo<AppealEntity>([pendingAppeal]);
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      // detail() re-reads the appeal through findOneBy after the transition is written
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
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
    ).rejects.toMatchObject({ response: { code: 'APPEAL_PROPOSED_SKILLS_INVALID' } });
  });
});

// ─── chief executive decision tests ──────────────────────────────────────────

describe('AppealService — Chief Executive decision (BRD §2.6)', () => {
  it('blocks non-privileged assurance from deciding', async () => {
    const service = buildService();
    const localActor = mfaActor({ assurance: 'LOCAL', roles: ['chief_executive'] });
    await expect(
      service.decide(uuid(), { skillDecisions: { WRITING: AppealDecision.Approved }, remarks: '' }, localActor, 'req-11'),
    ).rejects.toMatchObject({ response: { code: 'PRIVILEGED_ASSURANCE_REQUIRED' } });
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
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8', finalScore: null, chiefDecision: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      // detail() re-reads the appeal through findOneBy after the transition is written
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    await service.decide(appealId, { skillDecisions: { WRITING: AppealDecision.Approved }, remarks: 'Approved.' }, mfaActor(), 'req-12');
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
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8', finalScore: null, chiefDecision: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      // detail() re-reads the appeal through findOneBy after the transition is written
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    await service.decide(appealId, { skillDecisions: { WRITING: AppealDecision.Rejected }, remarks: 'No merit.' }, mfaActor(), 'req-13');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealRejected)).toBe(true);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealCompleted)).toBe(true);
  });

  it('rejects skill decisions that do not cover exactly the appealed skills', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, status: AppealStatus.PendingChiefApproval, committeeRecommendation: AppealRecommendation.Revise,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8' }),
      Object.assign(new AppealSkillEntity(), { skill: Skill.Speaking, originalScore: '6', proposedScore: '7' }),
    ];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findBy: jest.fn().mockResolvedValue(skills),
    });
    const service = buildService({ manager, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    await expect(
      service.decide(appealId, { skillDecisions: { WRITING: AppealDecision.Approved }, remarks: 'Only one skill decided.' }, mfaActor(), 'req-14'),
    ).rejects.toMatchObject({ response: { code: 'APPEAL_SKILL_DECISIONS_INVALID' } });
  });

  it('a mixed decision approves only the approved skill and still notifies of the rejection', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(),
      status: AppealStatus.PendingChiefApproval,
      committeeRecommendation: AppealRecommendation.Revise,
      chiefDecision: null, paymentId: uuid(), submittedAt: new Date(), completedAt: null,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8', finalScore: null, chiefDecision: null }),
      Object.assign(new AppealSkillEntity(), { skill: Skill.Speaking, originalScore: '6', proposedScore: '7', finalScore: null, chiefDecision: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    await service.decide(appealId, {
      skillDecisions: { WRITING: AppealDecision.Approved, SPEAKING: AppealDecision.Rejected },
      remarks: 'Writing warranted a revision; Speaking did not.',
    }, mfaActor(), 'req-15');

    // A partial approval still routes the appeal into the score-update stage - the
    // rejected skill's finding is carried in the same event, not a separate one.
    const approvedEvent = outboxEvents.find((e) => e.eventType === DomainEventTypes.AppealApproved);
    expect(approvedEvent).toBeDefined();
    expect((approvedEvent!.payload as { approvedSkills: string[] }).approvedSkills).toEqual([Skill.Writing]);
    expect((approvedEvent!.payload as { rejectedSkills: string[] }).rejectedSkills).toEqual([Skill.Speaking]);
    expect(skills.find((s) => s.skill === Skill.Writing)!.chiefDecision).toBe(AppealDecision.Approved);
    expect(skills.find((s) => s.skill === Skill.Speaking)!.chiefDecision).toBe(AppealDecision.Rejected);
  });

  it('auto-applies the approved revision immediately - nobody manually unlocks the score afterward', async () => {
    // BRD §5.6.1-5.6.2: the score field stays locked until the Chief approves; once
    // approved, the committee's already-recorded proposed score becomes final on its
    // own. This exercises the full chain decide() -> applyApprovedRevision() rather
    // than just the Chief's own decision transaction.
    const appealId = uuid();
    const examId = uuid();
    const applicationId = uuid();
    const testTakerUserId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId, scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId, testTakerUserId,
      status: AppealStatus.PendingChiefApproval,
      committeeRecommendation: AppealRecommendation.Revise,
      chiefDecision: null, paymentId: uuid(), submittedAt: new Date(), completedAt: null,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8', finalScore: null, chiefDecision: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({
      applyAppealRevision: jest.fn().mockResolvedValue({
        scoreSheetId: pendingAppeal.scoreSheetId, examId, applicationId, testTakerUserId, version: 2,
      }),
    });
    const service = buildService({ manager, resultClient, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    const response = await service.decide(appealId, { skillDecisions: { WRITING: AppealDecision.Approved }, remarks: 'Approved.' }, mfaActor(), 'req-16');

    expect(response).toMatchObject({ status: AppealStatus.Completed });
    expect(pendingAppeal.status).toBe(AppealStatus.Completed);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.AppealCompleted)).toBe(true);
  });

  it('keeps the Chief\'s decision recorded even when applying the revision fails', async () => {
    const appealId = uuid();
    const pendingAppeal = Object.assign(new AppealEntity(), {
      id: appealId, examId: uuid(), scoreSheetId: uuid(), scoreVersionNumber: 1,
      applicationId: uuid(), testTakerUserId: uuid(),
      status: AppealStatus.PendingChiefApproval,
      committeeRecommendation: AppealRecommendation.Revise,
      chiefDecision: null, paymentId: uuid(), submittedAt: new Date(), completedAt: null,
    });
    const skills = [
      Object.assign(new AppealSkillEntity(), { skill: Skill.Writing, originalScore: '7', proposedScore: '8', finalScore: null, chiefDecision: null }),
    ];
    const outboxEvents: AppealOutboxEntity[] = [];
    const auditedActions: string[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(pendingAppeal),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => (entity === AppealEntity ? pendingAppeal : null)),
      findBy: jest.fn().mockResolvedValue(skills),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as AppealOutboxEntity)?.eventType) outboxEvents.push(data as AppealOutboxEntity);
        if ((data as { action?: string })?.action) auditedActions.push((data as { action: string }).action);
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const resultClient = makeResultClient({
      applyAppealRevision: jest.fn().mockRejectedValue(new DomainException('RESULT_SERVICE_UNAVAILABLE', 'Result service is currently unavailable.', 503)),
    });
    const service = buildService({ manager, resultClient, appeals: makeRepo<AppealEntity>([pendingAppeal]) });
    const response = await service.decide(appealId, { skillDecisions: { WRITING: AppealDecision.Approved }, remarks: 'Approved.' }, mfaActor(), 'req-17');

    expect(response).toMatchObject({ status: AppealStatus.ApprovedPendingScoreUpdate, chiefDecision: AppealDecision.Approved });
    expect(pendingAppeal.status).toBe(AppealStatus.ApprovedPendingScoreUpdate);
    expect(auditedActions).toContain('APPEAL_AUTO_APPLY_FAILED');
  });
});
