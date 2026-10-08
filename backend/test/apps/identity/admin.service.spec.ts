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
  it('only exposes Committee Head and Committee Member accounts to committee setup', async () => {
    const usersList = [
      Object.assign(new UserEntity(), { id: 'head', fullName: 'Actual Head', status: 'ACTIVE', roles: [{ code: 'committee_head', name: 'Committee Head' }] }),
      Object.assign(new UserEntity(), { id: 'member', fullName: 'Member', status: 'ACTIVE', roles: [{ code: 'committee_member', name: 'Committee Member' }] }),
      Object.assign(new UserEntity(), { id: 'admin', fullName: 'Administrator', status: 'ACTIVE', roles: [{ code: 'admin', name: 'System Administrator' }] }),
    ];
    const users = { find: jest.fn().mockResolvedValue(usersList) } as unknown as Repository<UserEntity>;
    const service = new AdminService(
      users,
      {} as Repository<RoleEntity>,
      {} as Repository<PermissionEntity>,
      { record: jest.fn() } as unknown as AuditService,
      new ConfigService(),
    );

    await expect(service.listCommitteeRosterCandidates()).resolves.toEqual([
      { id: 'head', name: 'Actual Head', role: 'Committee Head', roleCode: 'committee_head' },
      { id: 'member', name: 'Member', role: 'Committee Member', roleCode: 'committee_member' },
    ]);
  });
});
