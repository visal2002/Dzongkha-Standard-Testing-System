import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { AdminService } from '../../../apps/identity-service/src/admin.service';
import { AdminResetPasswordDto } from '../../../apps/identity-service/src/dtos';
import { AuditEventEntity, SessionEntity, UserEntity } from '../../../apps/identity-service/src/entities';
const password='QA-reset-password-2026';
const actor={sub:'admin-id',roles:['admin'],permissions:['admin.user.manage'],assurance:'LOCAL'} as any;
const setup=()=>{
 const manager={findOne:jest.fn().mockResolvedValue({id:'target',status:'LOCKED',handoverPending:false}),update:jest.fn().mockResolvedValue({affected:1}),create:jest.fn().mockImplementation((_type,data)=>data),save:jest.fn().mockResolvedValue({})};
 const transaction=jest.fn().mockImplementation(fn=>fn(manager));
 const service=new AdminService({manager:{transaction}} as never,{} as never,{} as never,{} as never,new ConfigService());
 return {service,manager,transaction};
};
describe('System Admin password reset',()=>{
 it('hashes the password, revokes refresh sessions and audits atomically without changing profile, status or roles',async()=>{
  const {service,manager,transaction}=setup();
  expect(await service.resetPassword('target',{password},actor,'request-id')).toEqual({passwordReset:true});
  expect(transaction).toHaveBeenCalledTimes(1);
  const patch=manager.update.mock.calls.find(([type])=>type===UserEntity)![2];
  expect(Object.keys(patch).sort()).toEqual(['passwordHash','passwordSet']);
  expect(patch.passwordSet).toBe(true);expect(patch.passwordHash).not.toBe(password);expect(await bcrypt.compare(password,patch.passwordHash)).toBe(true);
  expect(manager.update).toHaveBeenCalledWith(SessionEntity,expect.objectContaining({user:{id:'target'}}),{revokedAt:expect.any(Date)});
  expect(manager.save).toHaveBeenCalledWith(AuditEventEntity,expect.objectContaining({action:'ADMIN_PASSWORD_RESET',resourceId:'target',actorUserId:'admin-id',safeData:{refreshSessionsRevoked:true}}));
  expect(JSON.stringify(manager.save.mock.calls)).not.toContain(password);
 });
 it.each([{...actor,roles:['dcdd']},{...actor,permissions:['admin.user.read']}])('rejects callers without both System Admin role and manage grant',async caller=>{
  const {service,transaction}=setup();await expect(service.resetPassword('target',{password},caller,'request-id')).rejects.toThrow('Only a System Administrator');expect(transaction).not.toHaveBeenCalled();
 });
 it.each(['short','            ','ཀ'.repeat(25)])('rejects invalid or bcrypt-truncated passwords before making changes',async password=>{
  const {service,transaction}=setup();await expect(service.resetPassword('target',{password},actor,'request-id')).rejects.toThrow('at least 12 characters');expect(transaction).not.toHaveBeenCalled();
 });
 it('rejects missing/deleted users and pending handovers without updating credentials',async()=>{
  const {service,manager}=setup();manager.findOne.mockResolvedValueOnce(null);
  await expect(service.resetPassword('target',{password},actor,'r')).rejects.toThrow('User not found');
  manager.findOne.mockResolvedValueOnce({id:'target',handoverPending:true});
  await expect(service.resetPassword('target',{password},actor,'r')).rejects.toThrow('pending handover');expect(manager.update).not.toHaveBeenCalled();
 });
 it('propagates audit failures from the same transaction rather than reporting success',async()=>{
  const {service,manager}=setup();manager.save.mockRejectedValue(new Error('audit unavailable'));
  await expect(service.resetPassword('target',{password},actor,'r')).rejects.toThrow('audit unavailable');
 });
 it('validates required password length at the endpoint DTO',async()=>{
  for(const password of ['short','x'.repeat(73)])expect((await validate(Object.assign(new AdminResetPasswordDto(),{password}))).length).toBeGreaterThan(0);
  expect(await validate(Object.assign(new AdminResetPasswordDto(),{password}))).toEqual([]);
 });
});
