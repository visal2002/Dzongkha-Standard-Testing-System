import { ConfigService } from '@nestjs/config';
import { AdminService } from '../../../apps/identity-service/src/admin.service';
import { SessionEntity } from '../../../apps/identity-service/src/entities';

describe('directory last login', () => {
  const setup = (users: any[], logins: any[]) => {
    const query = { select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue(logins) };
    const getRepository = jest.fn().mockReturnValue({createQueryBuilder:()=>query});
    const repository = {find:jest.fn().mockResolvedValue(users),manager:{getRepository}};
    const service = new AdminService(repository as never, {} as never, {} as never, {} as never, new ConfigService());
    return {service,query,getRepository};
  };
  it('returns the latest successful session creation time per account and null for an unrecorded account', async()=>{
    const {service,query,getRepository}=setup([{id:'signed-in',roles:[]},{id:'unrecorded',roles:[]}],[{userId:'signed-in',lastLogin:new Date('2026-10-10T02:07:00Z')}]);
    const users=await service.listUsers();
    expect(users[0].lastLogin).toBe('2026-10-10T02:07:00.000Z');expect(users[1].lastLogin).toBeNull();
    expect(getRepository).toHaveBeenCalledWith(SessionEntity);
    expect(query.addSelect).toHaveBeenCalledWith('MAX(session.createdAt)','lastLogin');
    expect(query.where).toHaveBeenCalledTimes(1);
    expect(query.where).toHaveBeenCalledWith('session.userId IN (:...userIds)',{userIds:['signed-in','unrecorded']});
    expect(query.groupBy).toHaveBeenCalledWith('session.userId');
  });
  it('normalizes database timestamp strings and does not use refresh activity or require active sessions',async()=>{
    const {service,query}=setup([{id:'logged-out',roles:[]}],[{userId:'logged-out',lastLogin:'2026-10-09T23:30:00+00:00'}]);
    expect((await service.listUsers())[0].lastLogin).toBe('2026-10-09T23:30:00.000Z');
    expect(JSON.stringify(query.where.mock.calls)).not.toMatch(/revokedAt|expiresAt|lastActivityAt/);
  });
  it('skips the login query when the directory is empty',async()=>{
    const {service,getRepository}=setup([],[]);expect(await service.listUsers()).toEqual([]);expect(getRepository).not.toHaveBeenCalled();
  });
});
