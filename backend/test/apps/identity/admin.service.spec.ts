/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AdminService } from '../../../apps/identity-service/src/admin.service';
import { AuditService } from '../../../apps/identity-service/src/audit.service';
import { PermissionEntity, RoleEntity, UserEntity } from '../../../apps/identity-service/src/entities';

describe('AdminService — account lock administration', () => {
  it('shows the lock reason and clears every lock field when an administrator unblocks a user', async () => {
    const user = Object.assign(new UserEntity(), {
      id: '50000000-0000-4000-8000-000000000001',
      email: 'locked@example.com', fullName: 'Locked User', status: 'LOCKED',
      failedLoginCount: 5, lockedUntil: new Date(Date.now() + 30 * 60_000), roles: [],
    });
    const find = jest.fn().mockResolvedValue([user]);
    const findOneBy = jest.fn().mockResolvedValue(user);
    const save = jest.fn().mockImplementation(async (value: UserEntity) => value);
    const auditRecord = jest.fn().mockResolvedValue(undefined);
    const users = { find, findOneBy, save } as unknown as Repository<UserEntity>;
    const service = new AdminService(
      users,
      {} as Repository<RoleEntity>,
      {} as Repository<PermissionEntity>,
      { record: auditRecord } as unknown as AuditService,
      new ConfigService(),
    );

    const listed = await service.listUsers();
    expect(listed[0]).toMatchObject({
      status: 'LOCKED', lockReasonCode: 'TOO_MANY_FAILED_LOGIN_ATTEMPTS',
    });

    const result = await service.unlockUser(user.id, 'admin-id', 'request-id');
    expect(result).toMatchObject({ status: 'ACTIVE', failedLoginCount: 0, lockedUntil: null, lockReason: null });
    expect(save.mock.calls).toHaveLength(1);
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_ACCOUNT_UNLOCKED', resourceId: user.id }));
  });
});
