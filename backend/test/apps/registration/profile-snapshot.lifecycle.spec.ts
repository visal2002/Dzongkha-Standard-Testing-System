/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * DSTS-04, second half: once a profile has been verified it must not be quietly
 * replaced, because certificateProfile() reads fullName, cid and dateOfBirth off that
 * stored snapshot and prints them onto a certificate.
 *
 * The protection is the application state machine rather than a new check:
 * RegistrationService.resubmit() only transitions out of RETURNED, so the sole
 * workflow that rewrites a snapshot is the one where DCDD has explicitly asked the
 * applicant to correct it. These tests pin that behaviour down so a later change to
 * the allowed states cannot loosen it unnoticed.
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { ApplicationStatus } from '@dzongjuk/contracts';
import { RegistrationService } from '../../../apps/registration-service/src/registration.service';
import { ProfileSnapshotDto } from '../../../apps/registration-service/src/dtos';
import {
  ApplicationEntity,
  ApplicationHistoryEntity,
  ExamEntity,
  RegistrationPaymentStatus,
} from '../../../apps/registration-service/src/entities';

const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'user-1';

const verifiedProfile = (): ProfileSnapshotDto =>
  Object.assign(new ProfileSnapshotDto(), {
    fullName: 'Tenzin Dorji',
    cid: '11009988776',
    dateOfBirth: '1998-05-01',
  });

const forgedProfile = (): ProfileSnapshotDto =>
  Object.assign(new ProfileSnapshotDto(), {
    fullName: 'Someone Else Entirely',
    cid: '99999999999',
    dateOfBirth: '1990-01-01',
  });

const applicationIn = (status: ApplicationStatus) =>
  Object.assign(new ApplicationEntity(), {
    id: APPLICATION_ID,
    examId: '22222222-2222-4222-8222-222222222222',
    testTakerUserId: OWNER_ID,
    identityKey: '11009988776',
    profileSnapshot: { ...verifiedProfile() },
    status,
    registrationNumber: status === ApplicationStatus.Verified ? 'DSTS-2026-11111111' : null,
    submittedAt: new Date(),
    version: 1,
    paymentStatus: RegistrationPaymentStatus.Waived,
  });

function harnessFor(status: ApplicationStatus) {
  const row = applicationIn(status);
  const manager = {
    findOne: jest.fn().mockResolvedValue(row),
    findOneBy: jest.fn().mockResolvedValue(row),
    save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => data ?? entityOrData),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn().mockImplementation(async (isolationOrFn: unknown, fn?: unknown) => {
      const transact = typeof isolationOrFn === 'function' ? isolationOrFn : fn!;
      return (transact as (m: EntityManager) => Promise<unknown>)(manager);
    }),
    getRepository: jest.fn().mockReturnValue({ findBy: jest.fn().mockResolvedValue([]) }),
    manager,
  } as unknown as DataSource;
  const repo = <T extends ObjectLiteral>(rows: T[]): Repository<T> =>
    ({
      find: jest.fn().mockResolvedValue(rows),
      findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
      findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
      save: jest.fn().mockImplementation(async (data: T) => data),
      create: jest.fn().mockImplementation((data: Partial<T>) => data as T),
    } as unknown as Repository<T>);

  const service = new RegistrationService(
    dataSource,
    new ConfigService({ INTERNAL_SERVICE_SECRET: 'a'.repeat(32) }),
    repo<ExamEntity>([]),
    repo<ApplicationEntity>([row]),
    repo<ApplicationHistoryEntity>([]),
  );
  return { service, row };
}

const resubmitCode = async (status: ApplicationStatus) => {
  const { service, row } = harnessFor(status);
  try {
    await service.resubmit(APPLICATION_ID, { profileSnapshot: forgedProfile() }, OWNER_ID, 'req-1');
    return { code: null as string | null, row };
  } catch (error) {
    const response = (error as { getResponse: () => { code: string } }).getResponse();
    return { code: response.code, row };
  }
};

describe('a verified profile cannot be silently replaced', () => {
  it.each([
    ApplicationStatus.Submitted,
    ApplicationStatus.UnderReview,
    ApplicationStatus.Verified,
    ApplicationStatus.Cancelled,
    ApplicationStatus.Absent,
  ])('refuses a resubmission from %s and leaves the stored profile untouched', async (status) => {
    const { code, row } = await resubmitCode(status);
    expect(code).toBe('APPLICATION_TRANSITION_INVALID');
    expect(row.profileSnapshot).toMatchObject({ fullName: 'Tenzin Dorji', cid: '11009988776' });
  });

  it('allows a resubmission from RETURNED, which is the workflow that exists to correct a profile', async () => {
    const { code, row } = await resubmitCode(ApplicationStatus.Returned);
    expect(code).toBeNull();
    expect(row.profileSnapshot).toMatchObject({ fullName: 'Someone Else Entirely' });
    expect(row.status).toBe(ApplicationStatus.Submitted);
    // Back to SUBMITTED, so the corrected profile is reviewed and verified again
    // rather than inheriting the previous verification.
    expect(row.reviewRemarks).toBeNull();
  });

  it('refuses a resubmission by someone who is not the applicant', async () => {
    const { service } = harnessFor(ApplicationStatus.Returned);
    await expect(
      service.resubmit(APPLICATION_ID, { profileSnapshot: forgedProfile() }, 'a-different-user', 'req-1'),
    ).rejects.toBeDefined();
  });
});
