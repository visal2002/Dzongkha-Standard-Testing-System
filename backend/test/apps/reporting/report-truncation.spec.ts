/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Lower-priority finding 2, as it actually presents.
 *
 * The audit reported a "100-row limit" on audit export. GET /audit is a paginated
 * endpoint - pageSize capped at 100, with `total` returned - so a caller can reach
 * every record and knows how many there are; that is pagination, not truncation.
 *
 * The genuine data-integrity problem was next door, in the report query: it read at
 * most 10000 projections and then reported `total` as the number found *within that
 * window*. A dataset larger than the window therefore returned a confident, wrong
 * figure on a governed report. These tests cover the truncation metadata added for
 * that, and pin the audit endpoint's pagination so the distinction stays visible.
 */

import { Repository } from 'typeorm';
import { ReportingService } from '../../../apps/reporting-service/src/reporting.service';
import { ReportDataset, ReportResourceProjectionEntity, ReportResourceType } from '../../../apps/reporting-service/src/entities';

const SCAN_LIMIT = 10000;

const projection = (index: number) =>
  ({
    resourceType: ReportResourceType.Application,
    resourceId: `application-${index}`,
    status: 'SUBMITTED',
    examId: 'exam-1',
    occurredAt: new Date(Date.now() - index * 1000),
    payload: {},
  }) as unknown as ReportResourceProjectionEntity;

/** A repository whose find() honours `take`, the way the real one does. */
function serviceWith(rowCount: number) {
  const all = Array.from({ length: rowCount }, (_, index) => projection(index));
  const find = jest.fn(async (options: { take?: number }) => all.slice(0, options.take ?? all.length));
  const resources = { find } as unknown as Repository<ReportResourceProjectionEntity>;
  const empty = {} as never;
  const auditEvents = { findAndCount: jest.fn().mockResolvedValue([[], 0]) } as never;
  return {
    service: new ReportingService(resources, empty, empty, empty, auditEvents),
    find,
  };
}

const query = (rowCount: number, limit?: number) =>
  serviceWith(rowCount).service.query({ dataset: ReportDataset.Applications, limit } as never);

describe('report query reports truncation instead of implying completeness', () => {
  it('is not truncated when everything fits', async () => {
    const result = await query(25);
    expect(result.rows).toHaveLength(25);
    expect(result.total).toBe(25);
    expect(result.truncated).toBe(false);
    expect(result.truncatedBy).toBeUndefined();
  });

  it('flags truncation by the caller-supplied row limit, and still reports the true match count', async () => {
    const result = await query(500, 100);
    expect(result.rows).toHaveLength(100);
    expect(result.total).toBe(500);
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('limit');
  });

  it('flags truncation by the scan cap, which previously looked like a complete answer', async () => {
    const result = await query(SCAN_LIMIT + 5000);
    expect(result.total).toBe(SCAN_LIMIT);
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('scan');
  });

  it('does not flag a scan truncation when the dataset ends exactly on the cap', async () => {
    const result = await query(SCAN_LIMIT, SCAN_LIMIT);
    expect(result.total).toBe(SCAN_LIMIT);
    expect(result.truncatedBy).not.toBe('scan');
  });

  it('reads only one row beyond the cap, so detecting truncation costs nothing', async () => {
    const { service, find } = serviceWith(SCAN_LIMIT + 5000);
    await service.query({ dataset: ReportDataset.Applications } as never);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ take: SCAN_LIMIT + 1 }));
  });
});

describe('the audit endpoint paginates rather than truncating', () => {
  it('caps the page size at 100 but returns the full total, so every record is reachable', async () => {
    const auditEvents = { findAndCount: jest.fn().mockResolvedValue([[], 4321]) };
    const empty = {} as never;
    const service = new ReportingService(empty, empty, empty, empty, auditEvents as never);

    const result = await service.audit({ page: 2, pageSize: 500 } as never);
    expect(result.pageSize).toBe(100);
    expect(result.page).toBe(2);
    // The caller is told there are 4321 records and can page to all of them.
    expect(result.total).toBe(4321);
    expect(auditEvents.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ skip: 100, take: 100 }));
  });
});
