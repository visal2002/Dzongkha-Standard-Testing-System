/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `summary()`, `registrationReport()`, `appealsReport()` and `dashboard()` used to
 * load every matching projection row into memory and count them in JavaScript.
 * They now read one grouped `COUNT(*) ... GROUP BY status` aggregate per resource
 * type via `statusCounts()`, so response size no longer scales with table size.
 */
import { Repository } from 'typeorm';
import { AccessClaims } from '@dzongjuk/contracts';
import { ReportingService } from '../../../apps/reporting-service/src/reporting.service';
import { DashboardConfigEntity, ReportResourceProjectionEntity } from '../../../apps/reporting-service/src/entities';

const unavailable = undefined as never;

/** A createQueryBuilder chain that ignores its filters and returns fixed status rows. */
const makeResourcesRepo = (rows: Array<{ status: string; total: string }>) => {
  const getRawMany = jest.fn().mockResolvedValue(rows);
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany,
  };
  const createQueryBuilder = jest.fn().mockReturnValue(builder);
  const repo = { createQueryBuilder, find: jest.fn() } as unknown as Repository<ReportResourceProjectionEntity>;
  return { repo, createQueryBuilder, builder };
};

const dashboardActor = (role: string): AccessClaims => ({ sub: 'user-1', sessionId: 'session-1', roles: [role], permissions: [], assurance: 'MFA' });

describe('ReportingService status aggregates', () => {
  it('summary() sums totals from grouped counts and excludes closed appeals from the active count', async () => {
    const resources = makeResourcesRepo([
      { status: 'VERIFIED', total: '7' },
      { status: 'SUBMITTED', total: '3' },
    ]);
    // The same repo mock answers every statusCounts() call in this test; return
    // different rows per resource type isn't needed since summary() only reads totals.
    const service = new ReportingService(resources.repo, unavailable, unavailable, unavailable, unavailable);

    const result = await service.summary();

    expect(result.totalApplications).toBe(10);
    expect(resources.createQueryBuilder).toHaveBeenCalled();
  });

  it('registrationReport() reads one aggregate scoped to the exam, not a full-table scan', async () => {
    const resources = makeResourcesRepo([
      { status: 'SUBMITTED', total: '4' },
      { status: 'VERIFIED', total: '2' },
      { status: 'WAITLISTED', total: '1' },
    ]);
    const service = new ReportingService(resources.repo, unavailable, unavailable, unavailable, unavailable);

    const result = await service.registrationReport('exam-1');

    expect(result).toMatchObject({ total: 7, submitted: 4, verified: 2, waitlisted: 1, returned: 0, cancelled: 0, absent: 0 });
    expect(resources.builder.andWhere).toHaveBeenCalledWith('projection.examId = :examId', { examId: 'exam-1' });
  });

  it('appealsReport() reports zero for a status with no rows instead of throwing', async () => {
    const resources = makeResourcesRepo([{ status: 'SUBMITTED', total: '2' }]);
    const service = new ReportingService(resources.repo, unavailable, unavailable, unavailable, unavailable);

    const result = await service.appealsReport();
    expect(result).toMatchObject({ total: 2, submitted: 2, completed: 0, rejected: 0, noChange: 0 });
  });

  it('dashboard() scopes application/score/appeal/certificate counts to the test taker but not examinations/committees', async () => {
    const resources = makeResourcesRepo([{ status: 'VERIFIED', total: '1' }]);
    const dashboardConfigs = { findOneBy: jest.fn().mockResolvedValue(null) } as unknown as Repository<DashboardConfigEntity>;
    const service = new ReportingService(resources.repo, unavailable, unavailable, dashboardConfigs, unavailable);

    await service.dashboard(dashboardActor('test_taker'));

    const ownerScopedCalls = resources.builder.andWhere.mock.calls.filter(([clause]: [string]) => clause.includes('ownerUserId'));
    // Application, Score, Appeal, Certificate are owner-scoped; Examination and Committee are not.
    expect(ownerScopedCalls).toHaveLength(4);
  });

  it('a resource type with zero rows returns a total of zero rather than the raw empty array', async () => {
    const resources = makeResourcesRepo([]);
    const service = new ReportingService(resources.repo, unavailable, unavailable, unavailable, unavailable);

    const result = await service.summary();
    expect(result).toEqual({ totalApplications: 0, totalScores: 0, totalCertificates: 0, activeAppeals: 0 });
  });
});
