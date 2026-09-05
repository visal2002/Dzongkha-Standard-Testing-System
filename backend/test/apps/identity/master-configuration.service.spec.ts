import { MasterConfigurationService } from '../../../apps/identity-service/src/master-configuration.service';

describe('MasterConfigurationService', () => {
  it('persists fee changes while retaining nested configuration and records an audit event', async () => {
    const entity = {
      id: 'SYSTEM',
      configuration: {
        registrationFee: 500,
        certificateTemplate: { paperSize: 'A4', orientation: 'landscape' },
      },
      updatedByUserId: null,
      version: 1,
    };
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(entity),
      create: jest.fn((value: typeof entity) => value),
      save: jest.fn(async (value: typeof entity) => ({ ...value, version: 2 })),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new MasterConfigurationService(repository as never, audit as never);

    const result = await service.update({
      registrationFee: 1,
      certificateTemplate: { paperSize: 'Letter' },
    }, '00000000-0000-0000-0000-000000000001', 'request-1');

    expect(result).toEqual(expect.objectContaining({
      registrationFee: 1,
      certificateTemplate: { paperSize: 'Letter', orientation: 'landscape' },
    }));
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'MASTER_CONFIGURATION_UPDATED',
      safeData: expect.objectContaining({ fields: ['registrationFee', 'certificateTemplate'], version: 2 }),
    }));
  });
});
