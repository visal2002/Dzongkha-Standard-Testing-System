/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `listMine` and `listAll` used to call the five-query `detail()` once per appeal
 * inside a `Promise.all`, so an organisation-wide queue cost five round-trips per
 * row. `details()` now reads each related table once for the whole page and
 * matches skills/payment/review/approval back onto their appeal in memory.
 */
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims } from '@dzongjuk/contracts';
import { AppealService } from '../../../apps/appeal-certificate-service/src/appeal.service';
import { CertificateService } from '../../../apps/appeal-certificate-service/src/certificate.service';
import { ResultClientService } from '../../../apps/appeal-certificate-service/src/result-client.service';
import {
  AppealApprovalEntity,
  AppealCommitteeReviewEntity,
  AppealEntity,
  AppealIdempotencyEntity,
  AppealSkillEntity,
  FeeRuleEntity,
  PaymentEntity,
} from '../../../apps/appeal-certificate-service/src/entities';

const uuid = () => `50000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const appeal = (id: string, testTakerUserId: string, paymentId: string | null) =>
  Object.assign(new AppealEntity(), { id, testTakerUserId, paymentId, examId: uuid(), applicationId: uuid() });

const skill = (appealId: string) => Object.assign(new AppealSkillEntity(), { id: uuid(), appealId });
const payment = (id: string) => Object.assign(new PaymentEntity(), { id });
const review = (appealId: string) => Object.assign(new AppealCommitteeReviewEntity(), { id: uuid(), appealId });
const approval = (appealId: string) => Object.assign(new AppealApprovalEntity(), { id: uuid(), appealId });

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({ find: jest.fn().mockResolvedValue(rows) } as unknown as Repository<T>);

/** Dispatches `manager.find(Entity, ...)` to a per-entity-class fixture table. */
const makeManagerFind = (tables: { skills: AppealSkillEntity[]; payments: PaymentEntity[]; reviews: AppealCommitteeReviewEntity[]; approvals: AppealApprovalEntity[] }) =>
  jest.fn().mockImplementation(async (entity: unknown) => {
    if (entity === AppealSkillEntity) return tables.skills;
    if (entity === PaymentEntity) return tables.payments;
    if (entity === AppealCommitteeReviewEntity) return tables.reviews;
    if (entity === AppealApprovalEntity) return tables.approvals;
    return [];
  });

const buildService = (appeals: Repository<AppealEntity>, managerFind: jest.Mock) => {
  const manager = { find: managerFind } as unknown as EntityManager;
  const dataSource = { manager, transaction: jest.fn() } as unknown as DataSource;
  return new AppealService(
    dataSource,
    {} as ResultClientService,
    {} as CertificateService,
    new ConfigService({ INTERNAL_SERVICE_SECRET: 'a'.repeat(32), PRIVILEGED_ASSURANCE_LEVELS: 'MFA' }),
    appeals,
    makeRepo<FeeRuleEntity>(),
    makeRepo<AppealIdempotencyEntity>(),
  );
};

describe('AppealService list batching', () => {
  it('listMine attaches each appeal its own skills, payment, review and approval from one read per table', async () => {
    const userId = uuid();
    const appealA = appeal('appeal-a', userId, 'payment-a');
    const appealB = appeal('appeal-b', userId, null);
    const managerFind = makeManagerFind({
      skills: [skill('appeal-a'), skill('appeal-b'), skill('appeal-b')],
      payments: [payment('payment-a')],
      reviews: [review('appeal-a')],
      approvals: [approval('appeal-b')],
    });
    const service = buildService(makeRepo([appealA, appealB]), managerFind);

    const result = await service.listMine({ sub: userId } as AccessClaims);

    // Four related tables, one query each, regardless of appeal count.
    expect(managerFind).toHaveBeenCalledTimes(4);
    const a = result.find((r) => r.id === 'appeal-a')!;
    const b = result.find((r) => r.id === 'appeal-b')!;
    expect(a.skills).toHaveLength(1);
    expect(a.payment?.id).toBe('payment-a');
    expect(a.committeeReview?.appealId).toBe('appeal-a');
    expect(a.approval).toBeNull();
    expect(b.skills).toHaveLength(2);
    expect(b.payment).toBeNull(); // no paymentId on this appeal
    expect(b.committeeReview).toBeNull();
    expect(b.approval?.appealId).toBe('appeal-b');
  });

  it('does not query PaymentEntity at all when no appeal in the page has a payment', async () => {
    const appealA = appeal('appeal-a', uuid(), null);
    const managerFind = makeManagerFind({ skills: [], payments: [], reviews: [], approvals: [] });
    const service = buildService(makeRepo([appealA]), managerFind);

    await service.listAll({ sub: uuid(), permissions: ['appeal.review'] } as AccessClaims);

    const paymentCalls = managerFind.mock.calls.filter(([entity]) => entity === PaymentEntity);
    expect(paymentCalls).toHaveLength(0);
  });

  it('returns an empty list without querying any related table when there are no appeals', async () => {
    const managerFind = jest.fn();
    const service = buildService(makeRepo<AppealEntity>([]), managerFind);

    expect(await service.listMine({ sub: uuid() } as AccessClaims)).toEqual([]);
    expect(managerFind).not.toHaveBeenCalled();
  });
});
