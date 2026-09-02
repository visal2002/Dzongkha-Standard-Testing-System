/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, DomainEventTypes, ScoreSheetStatus } from '@dzongjuk/contracts';
import { ResultService } from '../../../apps/result-service/src/result.service';
import { ScoringService } from '../../../apps/result-service/src/scoring.service';
import {
  CandidateEligibilityEntity,
  CommitteeEntity,
  CommitteeMemberEntity,
  CommitteeRole,
  EligibilityStatus,
  ResultIdempotencyEntity,
  ResultOutboxEntity,
  ScoreSheetEntity,
  ScoreVersionEntity,
  ScoringRuleEntity,
  ScoringRuleStatus,
} from '../../../apps/result-service/src/entities';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const uuid = () => `10000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const mfaActor = (overrides: Partial<AccessClaims> = {}): AccessClaims => ({
  sub: uuid(),
  sessionId: uuid(),
  roles: ['committee_head'],
  permissions: ['score.submit'],
  assurance: 'MFA',
  ...overrides,
});

const INTERNAL_KEY = 'a'.repeat(32);
const config = new ConfigService({ PRIVILEGED_ASSURANCE_LEVELS: 'MFA', INTERNAL_SERVICE_SECRET: INTERNAL_KEY });

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(false),
    existsBy: jest.fn().mockResolvedValue(false),
    countBy: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    // ScoringService resolves the approved rule through the transaction manager
    getRepository: jest.fn().mockReturnValue(makeRepo([approvedRule])),
    // TypeORM save is called both as save(entity) and as save(Entity, data)
    save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) =>
      ({ ...((data ?? entityOrData) as Record<string, unknown>), id: uuid() })),
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
    count: jest.fn().mockResolvedValue(rows.length),
    countBy: jest.fn().mockResolvedValue(rows.length),
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
    existsBy: jest.fn().mockResolvedValue(rows.length > 0),
  } as unknown as Repository<T>);

const approvedRule: ScoringRuleEntity = Object.assign(new ScoringRuleEntity(), {
  id: uuid(),
  code: 'DSTS-TOTAL-1-50-V1',
  name: 'DSTS Total Score to Standard 1–10',
  minimumScore: '1',
  maximumScore: '50',
  increment: '0.5',
  roundingDecimals: 2,
  aggregation: 'ARITHMETIC_MEAN' as const,
  bands: [
    { min: 1, max: 5.5, label: 'Standard 1', standard: 1 },
    { min: 6, max: 12.5, label: 'Standard 2', standard: 2 },
    { min: 13, max: 19.5, label: 'Standard 3', standard: 3 },
    { min: 20, max: 26.5, label: 'Standard 4', standard: 4 },
    { min: 27, max: 33.5, label: 'Standard 5', standard: 5 },
    { min: 34, max: 40.5, label: 'Standard 6', standard: 6 },
    { min: 41, max: 44.5, label: 'Standard 7', standard: 7 },
    { min: 45, max: 47.5, label: 'Standard 8', standard: 8 },
    { min: 48, max: 49.5, label: 'Standard 9', standard: 9 },
    { min: 50, max: 50, label: 'Standard 10', standard: 10 },
  ],
  status: ScoringRuleStatus.Approved,
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: null,
});

const makeScoring = (): ScoringService =>
  new ScoringService(
    {} as DataSource,
    makeRepo([approvedRule]),
    config,
  );

const buildService = (
  manager = makeManager(),
  {
    committees = makeRepo<CommitteeEntity>(),
    members = makeRepo<CommitteeMemberEntity>(),
    eligibility = makeRepo<CandidateEligibilityEntity>(),
    sheets = makeRepo<ScoreSheetEntity>(),
    versions = makeRepo<ScoreVersionEntity>(),
  }: {
    committees?: Repository<CommitteeEntity>;
    members?: Repository<CommitteeMemberEntity>;
    eligibility?: Repository<CandidateEligibilityEntity>;
    sheets?: Repository<ScoreSheetEntity>;
    versions?: Repository<ScoreVersionEntity>;
  } = {},
): ResultService => {
  const ds = makeDataSource(manager);
  const scoring = makeScoring();
  return new ResultService(ds, scoring, config, committees, members, eligibility, sheets, versions);
};

// ─── committee tests ──────────────────────────────────────────────────────────

describe('ResultService — Committee formation (BRD §2.5)', () => {
  it('rejects committee with duplicate member user IDs', async () => {
    const service = buildService();
    const userId = uuid();
    await expect(
      service.setCommittee(uuid(), {
        members: [
          { userId, role: CommitteeRole.Head },
          { userId, role: CommitteeRole.Member },
        ],
      }, mfaActor(), 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'COMMITTEE_MEMBER_DUPLICATE' } });
  });

  it('rejects committee with zero Heads', async () => {
    const service = buildService();
    await expect(
      service.setCommittee(uuid(), {
        members: [
          { userId: uuid(), role: CommitteeRole.Member },
          { userId: uuid(), role: CommitteeRole.Member },
        ],
      }, mfaActor(), 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'COMMITTEE_HEAD_REQUIRED' } });
  });

  it('rejects committee with two Heads', async () => {
    const service = buildService();
    await expect(
      service.setCommittee(uuid(), {
        members: [
          { userId: uuid(), role: CommitteeRole.Head },
          { userId: uuid(), role: CommitteeRole.Head },
        ],
      }, mfaActor(), 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'COMMITTEE_HEAD_REQUIRED' } });
  });

  it('locks committee once score entry has begun', async () => {
    const examId = uuid();
    const committeeId = uuid();
    const existingCommittee = { id: committeeId, examId, status: 'ACTIVE' };
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(existingCommittee),
      exists: jest.fn().mockResolvedValue(true), // score sheets exist
    });
    const service = buildService(manager);
    await expect(
      service.setCommittee(examId, {
        members: [{ userId: uuid(), role: CommitteeRole.Head }],
      }, mfaActor(), 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'COMMITTEE_LOCKED' } });
  });

  it('emits CommitteeConfigured outbox event on success', async () => {
    const examId = uuid();
    const outboxEvents: ResultOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as ResultOutboxEntity)?.eventType) outboxEvents.push(data as ResultOutboxEntity);
        return Array.isArray(data) ? data : { ...data as Record<string, unknown>, id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService(manager);
    await service.setCommittee(examId, {
      members: [
        { userId: uuid(), role: CommitteeRole.Head },
        { userId: uuid(), role: CommitteeRole.Member },
      ],
    }, mfaActor(), 'req-1');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.CommitteeConfigured)).toBe(true);
  });
});

// ─── score draft / submit tests ───────────────────────────────────────────────

describe('ResultService — Score entry (BRD §2.5)', () => {
  const validScores = { writing: 41, reading: 45, listening: 48, speaking: 50 };
  const headActor = mfaActor({ permissions: ['score.submit'] });

  it('blocks absent/ineligible candidates from receiving scores', async () => {
    const applicationId = uuid();
    const absentCandidate = Object.assign(new CandidateEligibilityEntity(), {
      applicationId,
      examId: uuid(),
      testTakerUserId: uuid(),
      status: EligibilityStatus.Absent,
      sourceEventId: 'evt-1',
    });
    const manager = makeManager({
      findOneBy: jest.fn().mockResolvedValue(absentCandidate),
    });
    const service = buildService(manager);
    await expect(service.saveDraft(applicationId, validScores, headActor, 'req-1'))
      .rejects.toMatchObject({ response: { code: 'CANDIDATE_NOT_SCOREABLE' } });
  });

  it('blocks non-Head from saving a draft score', async () => {
    const applicationId = uuid();
    const examId = uuid();
    const committeeId = uuid();
    const memberId = uuid();
    const eligibleCandidate = Object.assign(new CandidateEligibilityEntity(), {
      applicationId, examId, testTakerUserId: uuid(), status: EligibilityStatus.Eligible, sourceEventId: 'evt-2',
    });
    const committee = { id: committeeId, examId, status: 'ACTIVE' };
    const manager = makeManager({
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === CandidateEligibilityEntity) return eligibleCandidate;
        if (entity === CommitteeEntity) return committee;
        if (entity === ScoreSheetEntity) return null;
        return null;
      }),
      existsBy: jest.fn().mockResolvedValue(false), // member is NOT a Head
    });
    const memberActor = mfaActor({ sub: memberId, permissions: ['score.view'] });
    const service = buildService(manager);
    await expect(service.saveDraft(applicationId, validScores, memberActor, 'req-1'))
      .rejects.toMatchObject({ response: { code: 'COMMITTEE_HEAD_REQUIRED' } });
  });

  it('locks score sheet after submission — further save attempts throw SCORE_SHEET_LOCKED', async () => {
    const sheetId = uuid();
    const submittedSheet = Object.assign(new ScoreSheetEntity(), {
      id: sheetId,
      applicationId: uuid(),
      examId: uuid(),
      committeeId: uuid(),
      status: ScoreSheetStatus.Submitted,
      currentVersion: 1,
      draftScores: { WRITING: 41, READING: 41, LISTENING: 41, SPEAKING: 41 },
    });
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultIdempotencyEntity) return null;
        return submittedSheet;
      }),
      findOneBy: jest.fn().mockResolvedValue(null),
    });
    const service = buildService(manager);
    await expect(service.submit(sheetId, headActor, 'req-1', 'idem-key-2'))
      .rejects.toMatchObject({ response: { code: 'SCORE_SHEET_LOCKED' } });
  });

  it('emits ScoreSubmitted event and returns score details on successful submission', async () => {
    const sheetId = uuid();
    const examId = uuid();
    const applicationId = uuid();
    const committeeId = uuid();
    const draftSheet = Object.assign(new ScoreSheetEntity(), {
      id: sheetId, examId, applicationId, committeeId,
      status: ScoreSheetStatus.Draft, currentVersion: 0,
      draftScores: { WRITING: 41, READING: 45, LISTENING: 48, SPEAKING: 50 },
    });
    const candidate = Object.assign(new CandidateEligibilityEntity(), {
      applicationId, examId, testTakerUserId: uuid(), status: EligibilityStatus.Eligible, sourceEventId: 'evt-3',
    });
    const outboxEvents: ResultOutboxEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultIdempotencyEntity) return null;
        if (entity === ScoreSheetEntity) return draftSheet;
        return null;
      }),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === CandidateEligibilityEntity) return candidate;
        return null;
      }),
      existsBy: jest.fn().mockResolvedValue(true), // head is a HEAD
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as ResultOutboxEntity)?.eventType) outboxEvents.push(data as ResultOutboxEntity);
        return { ...data as Record<string, unknown>, id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    // Override scoring service activeRule to return approvedRule
    const ds = makeDataSource(manager);
    const scoring = makeScoring();
    jest.spyOn(scoring, 'activeRule').mockResolvedValue(approvedRule);
    const service = new ResultService(ds, scoring, config, makeRepo(), makeRepo(), makeRepo(), makeRepo(), makeRepo());
    const result = await service.submit(sheetId, mfaActor({ sub: headActor.sub }), 'req-1', 'idem-submit-1');
    expect(result.status).toBe(ScoreSheetStatus.Submitted);
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.ScoreSubmitted)).toBe(true);
  });
});

// ─── result declaration tests ─────────────────────────────────────────────────

describe('ResultService — Result declaration (BRD §2.5)', () => {
  it('requires MFA assurance level for declaration', async () => {
    const service = buildService();
    const localActor = mfaActor({ assurance: 'LOCAL' });
    await expect(service.declareResults(uuid(), localActor, 'req-1'))
      .rejects.toMatchObject({ response: { code: 'PRIVILEGED_ASSURANCE_REQUIRED' } });
  });

  it('blocks declaration if already declared', async () => {
    const examId = uuid();
    const manager = makeManager({
      existsBy: jest.fn().mockResolvedValue(true), // already declared
    });
    const service = buildService(manager);
    await expect(service.declareResults(examId, mfaActor(), 'req-1'))
      .rejects.toMatchObject({ response: { code: 'RESULTS_ALREADY_DECLARED' } });
  });

  it('blocks declaration if any eligible candidate has no submitted score', async () => {
    const examId = uuid();
    const manager = makeManager({
      existsBy: jest.fn().mockResolvedValue(false),
      countBy: jest.fn().mockResolvedValue(3), // 3 eligible
      findBy: jest.fn().mockResolvedValue([{}, {}]), // only 2 submitted sheets
    });
    const service = buildService(manager);
    await expect(service.declareResults(examId, mfaActor(), 'req-1'))
      .rejects.toMatchObject({ response: { code: 'RESULTS_INCOMPLETE' } });
  });

  it('emits ResultsDeclared event and marks all sheets Published on success', async () => {
    const examId = uuid();
    const sheet1 = { id: uuid(), examId, applicationId: uuid(), status: ScoreSheetStatus.Submitted };
    const sheet2 = { id: uuid(), examId, applicationId: uuid(), status: ScoreSheetStatus.Submitted };
    const outboxEvents: ResultOutboxEntity[] = [];
    const manager = makeManager({
      existsBy: jest.fn().mockResolvedValue(false),
      countBy: jest.fn().mockResolvedValue(2),
      findBy: jest.fn().mockResolvedValue([sheet1, sheet2]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as ResultOutboxEntity)?.eventType) outboxEvents.push(data as ResultOutboxEntity);
        return { ...data as Record<string, unknown>, id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const ds = makeDataSource(manager);
    const scoring = makeScoring();
    jest.spyOn(scoring, 'activeRule').mockResolvedValue(approvedRule);
    const service = new ResultService(ds, scoring, config, makeRepo(), makeRepo(), makeRepo(), makeRepo(), makeRepo());
    await service.declareResults(examId, mfaActor(), 'req-1');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.ResultsDeclared)).toBe(true);
    expect(sheet1.status).toBe(ScoreSheetStatus.Published);
    expect(sheet2.status).toBe(ScoreSheetStatus.Published);
  });
});

// ─── appeal revision tests ────────────────────────────────────────────────────

describe('ResultService — Appeal score revision (BRD §2.6)', () => {
  it('blocks revision on non-Published sheets', async () => {
    const sheetId = uuid();
    const draftSheet = { id: sheetId, status: ScoreSheetStatus.Draft, applicationId: uuid(), currentVersion: 1 };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultIdempotencyEntity) return null;
        if (entity === ScoreVersionEntity) return null; // no existing revision
        return draftSheet;
      }),
    });
    const service = buildService(manager);
    await expect(
      service.applyAppealRevision(
        sheetId,
        { appealId: uuid(), expectedVersion: 1, approvedByUserId: uuid(), changes: { writing: 8 } },
        INTERNAL_KEY,
        'req-1',
        'idem-rev-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'SCORE_REVISION_STATE_INVALID' } });
  });

  it('detects version conflict when expected version does not match current', async () => {
    const sheetId = uuid();
    const publishedSheet = {
      id: sheetId, applicationId: uuid(), examId: uuid(), committeeId: uuid(),
      status: ScoreSheetStatus.Published, currentVersion: 2, // version 2 is current
    };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultIdempotencyEntity) return null;
        if (entity === ScoreVersionEntity) return null;
        return publishedSheet;
      }),
      findOneBy: jest.fn().mockResolvedValue(null),
    });
    const service = buildService(manager);
    await expect(
      service.applyAppealRevision(
        sheetId,
        { appealId: uuid(), expectedVersion: 1, approvedByUserId: uuid(), changes: { writing: 8 } }, // expecting v1 but current is v2
        INTERNAL_KEY,
        'req-1',
        'idem-rev-2',
      ),
    ).rejects.toMatchObject({ response: { code: 'SCORE_REVISION_VERSION_CONFLICT' } });
  });

  it('rejects revision with empty skill changes', async () => {
    const sheetId = uuid();
    const publishedSheet = {
      id: sheetId, applicationId: uuid(), examId: uuid(), committeeId: uuid(),
      status: ScoreSheetStatus.Published, currentVersion: 1,
    };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ResultIdempotencyEntity) return null;
        if (entity === ScoreVersionEntity) return null;
        return publishedSheet;
      }),
      // applyAppealRevision resolves its idempotency replay, the prior appeal revision,
      // the candidate and the current score version all through findOneBy, so a blanket
      // stub makes the replay branch swallow the call before it can validate the changes.
      findOneBy: jest.fn().mockImplementation(async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === ResultIdempotencyEntity) return null;
        if (entity === ScoreVersionEntity) {
          return where?.appealId
            ? null
            : { scoreSheetId: sheetId, versionNumber: 1, scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 } };
        }
        return { status: EligibilityStatus.Eligible, applicationId: publishedSheet.applicationId };
      }),
    });
    const service = buildService(manager);
    await expect(
      service.applyAppealRevision(
        sheetId,
        { appealId: uuid(), expectedVersion: 1, approvedByUserId: uuid(), changes: {} }, // no changes
        INTERNAL_KEY,
        'req-1',
        'idem-rev-3',
      ),
    ).rejects.toMatchObject({ response: { code: 'SCORE_REVISION_EMPTY' } });
  });
});
