/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Repository } from 'typeorm';
import { DomainException } from '../libs/common/src/http';
import { ReportDataset, ReportResourceProjectionEntity, ReportResourceType } from '../apps/reporting-service/src/entities';
import { ReportingService } from '../apps/reporting-service/src/reporting.service';

describe('ReportingService', () => {
  const resource = (id: string, status: string, dimensions: Record<string, unknown> = {}) => ({
    id, resourceType: ReportResourceType.Application, resourceId: id, examId: '10000000-0000-4000-8000-000000000001',
    ownerUserId: '20000000-0000-4000-8000-000000000001', status, dimensions,
    sourceEventId: `event-${id}`, occurredAt: new Date('2026-08-10T00:00:00Z'), updatedAt: new Date('2026-08-10T00:00:00Z'),
  }) as ReportResourceProjectionEntity;

  const resources = {
    find: jest.fn().mockResolvedValue([resource('application-1', 'VERIFIED'), resource('application-2', 'WAITLISTED')]),
  } as unknown as Repository<ReportResourceProjectionEntity>;
  const unavailableRepository = undefined as never;
  const service = new ReportingService(resources, unavailableRepository, unavailableRepository, unavailableRepository, unavailableRepository);

  it('queries only catalogued projection fields and supports grouping', async () => {
    const result = await service.query({ dataset: ReportDataset.Applications, fields: ['resourceId', 'status'], groupBy: 'status', limit: 100 });
    expect(result.rows).toEqual([
      { resourceId: 'application-1', status: 'VERIFIED' },
      { resourceId: 'application-2', status: 'WAITLISTED' },
    ]);
    expect(result.grouped).toEqual(expect.arrayContaining([{ value: 'VERIFIED', count: 1 }, { value: 'WAITLISTED', count: 1 }]));
  });

  it('rejects arbitrary fields instead of translating them into SQL', async () => {
    await expect(service.query({ dataset: ReportDataset.Applications, fields: ['passwordHash'], limit: 10 }))
      .rejects.toBeInstanceOf(DomainException);
  });
});
