/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `listExams` used to issue two COUNT queries per examination. It now resolves the
 * whole board from one grouped aggregate, so these cover the seat/waitlist split
 * the exam window screen depends on and pin the query count.
 */
import { ConfigService } from '@nestjs/config';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { ApplicationStatus, ExamStatus } from '@dzongjuk/contracts';
import { RegistrationService } from '../../../apps/registration-service/src/registration.service';
import { DcrcClientService } from '../../../apps/registration-service/src/dcrc-client.service';
import { ApplicationEntity, ApplicationHistoryEntity, ExamEntity } from '../../../apps/registration-service/src/entities';

const EXAM_A = '10000000-0000-4000-8000-000000000001';
const EXAM_B = '10000000-0000-4000-8000-000000000002';

const exam = (id: string, code: string): ExamEntity => Object.assign(new ExamEntity(), {
  id,
  code,
  title: 'Dzongkha Proficiency Test',
  examDate: new Date('2026-11-01'),
  registrationStart: new Date('2026-09-01'),
  registrationEnd: new Date('2026-10-01'),
  capacity: 100,
  venue: 'Thimphu',
  registrationFee: '0',
  status: ExamStatus.RegistrationOpen,
});

type CountRow = { examId: string; status: ApplicationStatus; total: string };

/** Records the aggregate the service builds and replays the rows Postgres would return. */
const makeApplicationsRepo = (rows: CountRow[]) => {
  const getRawMany = jest.fn().mockResolvedValue(rows);
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getRawMany,
  };
  const createQueryBuilder = jest.fn().mockReturnValue(builder);
  const repo = { createQueryBuilder, count: jest.fn() } as unknown as Repository<ApplicationEntity>;
  return { repo, createQueryBuilder, builder };
};

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({ find: jest.fn().mockResolvedValue(rows) } as unknown as Repository<T>);

const buildService = (exams: ExamEntity[], rows: CountRow[]) => {
  const applications = makeApplicationsRepo(rows);
  const service = new RegistrationService(
    {} as DataSource,
    new ConfigService({}),
    makeRepo<ExamEntity>(exams),
    applications.repo,
    makeRepo<ApplicationHistoryEntity>(),
    { isRequired: jest.fn().mockReturnValue(false) } as unknown as DcrcClientService,
  );
  return { service, applications };
};

describe('RegistrationService.listExams occupancy', () => {
  it('splits seats from the waitlist for every examination in one aggregate', async () => {
    const { service, applications } = buildService(
      [exam(EXAM_A, 'DSTS-2026-01'), exam(EXAM_B, 'DSTS-2026-02')],
      [
        { examId: EXAM_A, status: ApplicationStatus.Submitted, total: '4' },
        { examId: EXAM_A, status: ApplicationStatus.Verified, total: '3' },
        { examId: EXAM_A, status: ApplicationStatus.Absent, total: '1' },
        { examId: EXAM_A, status: ApplicationStatus.Waitlisted, total: '2' },
        { examId: EXAM_B, status: ApplicationStatus.UnderReview, total: '5' },
      ],
    );

    const result = await service.listExams();

    // Absent still occupied a seat for that sitting, so it counts towards capacity.
    expect(result[0]).toMatchObject({ id: EXAM_A, currentRegistrations: 8, waitlistCount: 2 });
    expect(result[1]).toMatchObject({ id: EXAM_B, currentRegistrations: 5, waitlistCount: 0 });
    // One aggregate for the whole board, not two counts per examination.
    expect(applications.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('reports zero for an examination with no applications yet', async () => {
    const { service } = buildService([exam(EXAM_A, 'DSTS-2026-01')], []);

    expect(await service.listExams()).toEqual([
      expect.objectContaining({ id: EXAM_A, currentRegistrations: 0, waitlistCount: 0 }),
    ]);
  });

  it('issues no aggregate at all when there are no examinations', async () => {
    const { service, applications } = buildService([], []);

    expect(await service.listExams()).toEqual([]);
    expect(applications.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('restricts the aggregate to the statuses the board reports on', async () => {
    const { service, applications } = buildService([exam(EXAM_A, 'DSTS-2026-01')], []);
    await service.listExams();

    const [, params] = applications.builder.andWhere.mock.calls[0] as [string, { statuses: ApplicationStatus[] }];
    expect(params.statuses).toEqual(expect.arrayContaining([
      ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned,
      ApplicationStatus.Verified, ApplicationStatus.Absent, ApplicationStatus.Waitlisted,
    ]));
    // Cancelled applications release their seat and must not be counted.
    expect(params.statuses).not.toContain(ApplicationStatus.Cancelled);
  });
});
