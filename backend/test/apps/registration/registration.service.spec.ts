/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { ApplicationStatus, DomainEventTypes, ExamStatus, Skill } from '@dzongjuk/contracts';
import { RegistrationService } from '../../../apps/registration-service/src/registration.service';
import { DcrcClientService } from '../../../apps/registration-service/src/dcrc-client.service';
import {
  ApplicationEntity,
  ApplicationHistoryEntity,
  AttendanceEntity,
  ExamEntity,
  IdempotencyRecordEntity,
  OutboxEventEntity,
  RegistrationPaymentStatus,
  WaitlistEntryEntity,
} from '../../../apps/registration-service/src/entities';

// ─── helpers ─────────────────────────────────────────────────────────────────

const uuid = () => `00000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const openExam = (overrides: Partial<ExamEntity> = {}): ExamEntity =>
  Object.assign(new ExamEntity(), {
    id: uuid(),
    code: 'DSTS-2026-01',
    title: 'Dzongkha Proficiency Test 2026',
    examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    registrationStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    registrationEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    capacity: 10,
    venue: 'Thimphu Dzong',
    registrationFee: '0',
    status: ExamStatus.RegistrationOpen,
    version: 1,
    ...overrides,
  });

const application = (overrides: Partial<ApplicationEntity> = {}): ApplicationEntity =>
  Object.assign(new ApplicationEntity(), {
    id: uuid(),
    examId: uuid(),
    testTakerUserId: uuid(),
    identityKey: 'CID-10701000001',
    profileSnapshot: { fullName: 'Test Taker' },
    status: ApplicationStatus.Submitted,
    registrationNumber: null,
    reviewStartedAt: null,
    submittedAt: new Date(),
    verifiedAt: null,
    dcrcLookupId: null,
    dcrcVerifiedAt: null,
    cancelledAt: null,
    reviewRemarks: null,
    paymentStatus: RegistrationPaymentStatus.Waived,
    paymentAmount: '0',
    paymentCurrency: 'BTN',
    paymentMethod: null,
    paymentReference: null,
    paidAt: null,
    version: 1,
    ...overrides,
  });

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
    existsBy: jest.fn().mockResolvedValue(false),
    count: jest.fn().mockResolvedValue(0),
    save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => data ?? entityOrData),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as EntityManager);

// `submit` resolves its idempotency record through the same manager.findOne as the
// exam lookup, so the mock has to answer per entity instead of returning the exam
// for every call — otherwise the idempotency hit short-circuits the whole method.
const examLookup = (exam: ExamEntity) =>
  jest.fn().mockImplementation(async (entity: unknown) => (entity === IdempotencyRecordEntity ? null : exam));

const makeDataSource = (manager: EntityManager): DataSource =>
  ({
    transaction: jest.fn().mockImplementation(async (isolationOrFn: unknown, fn?: unknown) => {
      const transact = typeof isolationOrFn === 'function' ? isolationOrFn : fn!;
      return (transact as (m: EntityManager) => Promise<unknown>)(manager);
    }),
    getRepository: jest.fn().mockReturnValue({ findBy: jest.fn().mockResolvedValue([]) }),
    manager,
  } as unknown as DataSource);

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({
    find: jest.fn().mockResolvedValue(rows),
    findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
    count: jest.fn().mockResolvedValue(rows.length),
    save: jest.fn().mockImplementation(async (data: T) => data),
    create: jest.fn().mockImplementation((data: Partial<T>) => data as T),
    exists: jest.fn().mockResolvedValue(rows.length > 0),
    existsBy: jest.fn().mockResolvedValue(rows.length > 0),
  } as unknown as Repository<T>);

const config = new ConfigService({ INTERNAL_SERVICE_SECRET: 'a'.repeat(32) });
const dcrc = { isRequired: jest.fn().mockReturnValue(false), verify: jest.fn() } as unknown as DcrcClientService;

// ─── factory ─────────────────────────────────────────────────────────────────

const buildService = ({
  exams = makeRepo<ExamEntity>(),
  applications = makeRepo<ApplicationEntity>(),
  history = makeRepo<ApplicationHistoryEntity>(),
  manager = makeManager(),
  dcrcClient = dcrc,
}: {
  exams?: Repository<ExamEntity>;
  applications?: Repository<ApplicationEntity>;
  history?: Repository<ApplicationHistoryEntity>;
  manager?: EntityManager;
  dcrcClient?: DcrcClientService;
} = {}) => {
  const ds = makeDataSource(manager);
  return new RegistrationService(ds, config, exams, applications, history, dcrcClient);
};

// ─── test suites ─────────────────────────────────────────────────────────────

describe('RegistrationService — Exam management (BRD §2.2)', () => {
  it('rejects exam creation when end date ≤ start date', async () => {
    const service = buildService();
    await expect(
      service.createExam(
        {
          code: 'X', title: 'T',
          registrationStart: '2026-09-01T00:00:00Z',
          registrationEnd: '2026-08-31T00:00:00Z',
          examDate: '2026-10-01T00:00:00Z',
          capacity: 10,
          venue: 'V',
          registrationFee: '0',
        },
        'actor-1',
        'req-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'EXAM_WINDOW_INVALID' } });
  });

  it('rejects exam creation when exam date ≤ registration end date', async () => {
    const service = buildService();
    await expect(
      service.createExam(
        {
          code: 'X', title: 'T',
          registrationStart: '2026-08-01T00:00:00Z',
          registrationEnd: '2026-09-01T00:00:00Z',
          examDate: '2026-08-31T00:00:00Z',
          capacity: 10,
          venue: 'V',
          registrationFee: '0',
        },
        'actor-1',
        'req-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'EXAM_DATE_INVALID' } });
  });

  it('enforces state-machine: Draft → Published only (not Draft → InProgress)', async () => {
    const exam = openExam({ status: ExamStatus.Draft });
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(exam),
      save: jest.fn().mockImplementation(async (_: unknown, data: unknown) => data ?? exam),
    });
    const service = buildService({ manager });
    await expect(
      service.setExamStatus(exam.id, ExamStatus.InProgress, 'actor-1', 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'EXAM_TRANSITION_INVALID' } });
  });

  it('allows valid state transition Draft → Published', async () => {
    const exam = openExam({ status: ExamStatus.Draft });
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(exam),
      save: jest.fn().mockImplementation(async (entity: unknown) => entity),
      create: jest.fn().mockImplementation((_: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const result = await service.setExamStatus(exam.id, ExamStatus.Published, 'actor-1', 'req-1');
    expect(result.status).toBe(ExamStatus.Published);
  });

  it('blocks editing after exam is InProgress', async () => {
    const exam = openExam({ status: ExamStatus.InProgress });
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(exam) });
    const service = buildService({ manager });
    await expect(
      service.updateExam(exam.id, { title: 'New Title' }, 'actor-1', 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'EXAM_EDIT_BLOCKED' } });
  });
});

describe('RegistrationService — Application submission (BRD §2.2 BR-1)', () => {
  // A complete snapshot: fullName, cid and dateOfBirth are required by
  // ProfileSnapshotDto because certificate generation reads all three.
  const dto = {
    identityKey: 'CID-10701000001',
    profileSnapshot: { fullName: 'Tenzin Dorji', cid: 'CID-10701000001', dateOfBirth: '1998-05-01' },
  };
  const idempotencyKey = 'idem-001';

  it('rejects submission when registration window is closed', async () => {
    const closedExam = openExam({ status: ExamStatus.RegistrationClosed });
    const manager = makeManager({ findOne: examLookup(closedExam) });
    const service = buildService({ manager });
    await expect(service.submit(closedExam.id, dto, 'user-1', 'req-1', idempotencyKey))
      .rejects.toMatchObject({ response: { code: 'REGISTRATION_CLOSED' } });
  });

  it('rejects submission outside the registration date window (past end)', async () => {
    const pastExam = openExam({
      status: ExamStatus.RegistrationOpen,
      registrationEnd: new Date(Date.now() - 1000),
    });
    const manager = makeManager({ findOne: examLookup(pastExam) });
    const service = buildService({ manager });
    await expect(service.submit(pastExam.id, dto, 'user-1', 'req-1', idempotencyKey))
      .rejects.toMatchObject({ response: { code: 'REGISTRATION_CLOSED' } });
  });

  it('rejects duplicate CID within same exam window (409)', async () => {
    const exam = openExam();
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === IdempotencyRecordEntity) return null;
        return exam;
      }),
      exists: jest.fn().mockResolvedValue(true), // duplicate exists
      count: jest.fn().mockResolvedValue(3),
    });
    const service = buildService({ manager });
    await expect(service.submit(exam.id, dto, 'user-1', 'req-1', idempotencyKey))
      .rejects.toMatchObject({ response: { code: 'APPLICATION_DUPLICATE' } });
  });

  it('creates a WAITLISTED record when capacity is full', async () => {
    const exam = openExam({ capacity: 5 });
    const savedObjects: unknown[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === IdempotencyRecordEntity) return null;
        return exam;
      }),
      exists: jest.fn().mockResolvedValue(false),
      count: jest.fn().mockResolvedValue(5), // at capacity
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        savedObjects.push(data);
        return data ?? {};
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const result = await service.submit(exam.id, dto, 'user-1', 'req-1', idempotencyKey);
    expect(result.status).toBe(ApplicationStatus.Waitlisted);
  });

  it('returns Submitted status when capacity is available', async () => {
    const exam = openExam({ capacity: 10 });
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === IdempotencyRecordEntity) return null;
        return exam;
      }),
      exists: jest.fn().mockResolvedValue(false),
      count: jest.fn().mockResolvedValue(3),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: object) => ({ ...data, id: uuid() })),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const result = await service.submit(exam.id, dto, 'user-1', 'req-1', idempotencyKey);
    expect(result.status).toBe(ApplicationStatus.Submitted);
  });

  it('returns cached response on idempotency key replay', async () => {
    const cachedResponse = { applicationId: uuid(), status: ApplicationStatus.Submitted };
    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === IdempotencyRecordEntity) return { response: cachedResponse };
        return null;
      }),
    });
    const service = buildService({ manager });
    const result = await service.submit(uuid(), dto, 'user-1', 'req-1', idempotencyKey);
    expect(result).toEqual(cachedResponse);
  });

  it('throws when Idempotency-Key header is missing', async () => {
    const service = buildService();
    await expect(service.submit(uuid(), dto, 'user-1', 'req-1', '')).rejects
      .toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REQUIRED' } });
  });
});

describe('RegistrationService — Cancellation & waitlist promotion (BRD §2.2)', () => {
  it('blocks cancellation once reviewStartedAt is set', async () => {
    const app = application({ reviewStartedAt: new Date(), status: ApplicationStatus.UnderReview });
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(app) });
    const service = buildService({ manager });
    await expect(service.cancel(app.id, app.testTakerUserId, 'req-1'))
      .rejects.toMatchObject({ response: { code: 'APPLICATION_CANCELLATION_BLOCKED' } });
  });

  it('blocks cancellation for non-owner', async () => {
    const app = application({ status: ApplicationStatus.Submitted, reviewStartedAt: null });
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(app) });
    const service = buildService({ manager });
    await expect(service.cancel(app.id, 'different-user-id', 'req-1'))
      .rejects.toMatchObject({ response: { code: 'APPLICATION_FORBIDDEN' } });
  });

  it('promotes the next waitlist entry on successful cancellation of a Submitted application', async () => {
    const userId = uuid();
    const examId = uuid();
    const app = application({ testTakerUserId: userId, examId, status: ApplicationStatus.Submitted, reviewStartedAt: null });
    const waitlistApp = application({ examId, status: ApplicationStatus.Waitlisted });
    const waitlistEntry = { id: uuid(), examId, applicationId: waitlistApp.id, positionKey: '1000', status: 'WAITING' };
    const saved: unknown[] = [];

    const manager = makeManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown, opts: { where?: { id?: string } }) => {
        if (entity === WaitlistEntryEntity) return waitlistEntry;
        if (opts?.where?.id === waitlistApp.id) return waitlistApp;
        return app;
      }),
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === ApplicationEntity) return waitlistApp;
        return null;
      }),
      findOneByOrFail: jest.fn().mockResolvedValue(waitlistApp),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => {
        const row = data ?? entityOrData;
        saved.push(row);
        return row;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    await service.cancel(app.id, userId, 'req-1');
    // Verify waitlist entry was saved with PROMOTED status
    const promotedEntry = saved.find((s) => (s as Record<string, unknown>).status === 'PROMOTED');
    expect(promotedEntry).toBeDefined();
  });
});

describe('RegistrationService — Verify & registration number (BRD §2.2)', () => {
  it('records DCRC verification provenance when enforcement is enabled', async () => {
    const app = application({ status: ApplicationStatus.UnderReview });
    const lookupId = uuid();
    const dcrcClient = {
      isRequired: jest.fn().mockReturnValue(true),
      verify: jest.fn().mockResolvedValue({ lookupId, verified: true, matchedFields: ['cid'], mismatchFields: [] }),
    } as unknown as DcrcClientService;
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(app) });
    const service = buildService({ manager, applications: makeRepo([app]), dcrcClient });

    const verified = await service.verify(app.id, 'actor-1', 'req-1');

    expect(dcrcClient.verify).toHaveBeenCalledWith(app, 'actor-1', 'req-1');
    expect(verified.dcrcLookupId).toBe(lookupId);
    expect(verified.dcrcVerifiedAt).toBeInstanceOf(Date);
  });

  it('generates a unique registration number matching DSTS-YYYY-XXXXXXXX', async () => {
    const app = application({ status: ApplicationStatus.UnderReview });
    const manager = makeManager({ findOne: jest.fn().mockResolvedValue(app) });
    const service = buildService({ manager, applications: makeRepo([app]) });
    const verified = await service.verify(app.id, 'actor-1', 'req-1');
    expect(verified.registrationNumber).toMatch(/^DSTS-\d{4}-[A-F0-9]{8}$/);
  });

  it('emits ApplicationVerified outbox event after successful verify', async () => {
    const app = application({ status: ApplicationStatus.UnderReview });
    const outboxEvents: OutboxEventEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(app),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as OutboxEventEntity)?.eventType !== undefined) outboxEvents.push(data as OutboxEventEntity);
        return data;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager, applications: makeRepo([app]) });
    await service.verify(app.id, 'actor-1', 'req-1');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.ApplicationVerified)).toBe(true);
  });
});

describe('RegistrationService — Attendance / absent marking (BRD §2.3)', () => {
  it('blocks attendance marking for non-Verified applications', async () => {
    const app = application({ status: ApplicationStatus.Submitted });
    const manager = makeManager({ findOneBy: jest.fn().mockResolvedValue(app) });
    const service = buildService({ manager });
    await expect(
      service.markAttendance(app.id, { absentSkills: [Skill.Writing] }, 'actor-1', 'req-1'),
    ).rejects.toMatchObject({ response: { code: 'ATTENDANCE_NOT_ELIGIBLE' } });
  });

  it('marking ANY single skill absent sets overall status to ABSENT and transitions application', async () => {
    const app = application({ status: ApplicationStatus.Verified });
    let savedStatus: string | undefined;
    const manager = makeManager({
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AttendanceEntity) return null;
        return app;
      }),
      save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => {
        const row = (data ?? entityOrData) as ApplicationEntity;
        if (row?.status) savedStatus = row.status;
        return row;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const attendance = await service.markAttendance(app.id, { absentSkills: [Skill.Writing] }, 'actor-1', 'req-1');
    expect(attendance.overallStatus).toBe('ABSENT');
    expect(savedStatus).toBe(ApplicationStatus.Absent);
  });

  it('marking zero skills absent keeps overall status as PRESENT and does not change application status', async () => {
    const app = application({ status: ApplicationStatus.Verified });
    let applicationSaved = false;
    const manager = makeManager({
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AttendanceEntity) return null;
        return app;
      }),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as ApplicationEntity)?.status === ApplicationStatus.Absent) applicationSaved = true;
        return data;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const attendance = await service.markAttendance(app.id, { absentSkills: [] }, 'actor-1', 'req-1');
    expect(attendance.overallStatus).toBe('PRESENT');
    expect(applicationSaved).toBe(false);
  });

  it('emits CandidateMarkedAbsent outbox event when absent', async () => {
    const app = application({ status: ApplicationStatus.Verified });
    const outboxEvents: OutboxEventEntity[] = [];
    const manager = makeManager({
      findOneBy: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === AttendanceEntity) return null;
        return app;
      }),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        if ((data as OutboxEventEntity)?.eventType) outboxEvents.push(data as OutboxEventEntity);
        return data;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    await service.markAttendance(app.id, { absentSkills: [Skill.Speaking, Skill.Reading] }, 'actor-1', 'req-1');
    expect(outboxEvents.some((e) => e.eventType === DomainEventTypes.CandidateMarkedAbsent)).toBe(true);
  });
});

describe('RegistrationService — Certificate profile internal endpoint (BRD §2.7)', () => {
  it('returns 409 when application has no registration number yet', async () => {
    const app = application({ registrationNumber: null });
    const applications = makeRepo<ApplicationEntity>([app]);
    const service = buildService({ applications });
    await expect(service.certificateProfile(app.id, 'a'.repeat(32)))
      .rejects.toMatchObject({ response: { code: 'CERTIFICATE_PROFILE_UNAVAILABLE' } });
  });

  it('returns 403 when internal key is wrong', async () => {
    const wrongKeyConfig = new ConfigService({ INTERNAL_SERVICE_SECRET: 'b'.repeat(32) });
    const ds = makeDataSource(makeManager());
    const service = new RegistrationService(ds, wrongKeyConfig, makeRepo(), makeRepo(), makeRepo(), dcrc);
    await expect(service.certificateProfile(uuid(), 'wrong-key'))
      .rejects.toMatchObject({ response: { code: 'INTERNAL_SERVICE_AUTH_FAILED' } });
  });

  it('returns profile when application is verified and internal key matches', async () => {
    const correctKey = 'a'.repeat(32);
    const app = application({
      registrationNumber: 'DSTS-2026-ABCD1234',
      profileSnapshot: { fullName: 'Test Taker', cid: 'CID-10701000001', dateOfBirth: '1998-05-01' },
    });
    const applications = makeRepo<ApplicationEntity>([app]);
    const correctKeyConfig = new ConfigService({ INTERNAL_SERVICE_SECRET: correctKey });
    const ds = makeDataSource(makeManager());
    const service = new RegistrationService(ds, correctKeyConfig, makeRepo(), applications, makeRepo(), dcrc);
    const profile = await service.certificateProfile(app.id, correctKey);
    expect(profile.registrationNumber).toBe('DSTS-2026-ABCD1234');
    expect(profile.applicationId).toBe(app.id);
  });
});
