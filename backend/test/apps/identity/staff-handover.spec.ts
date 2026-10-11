import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { StaffHandoverService } from '../../../apps/identity-service/src/staff-handover.service';
import { AdminService } from '../../../apps/identity-service/src/admin.service';
import { AuditService } from '../../../apps/identity-service/src/audit.service';
import { PermissionEntity, RoleEntity, UserEntity, UserHandoverEntity } from '../../../apps/identity-service/src/entities';
import { createStaffTransferController } from '@dzongjuk/security';

const id='60000000-0000-4000-8000-000000000001',targetId='60000000-0000-4000-8000-000000000002';
function harness(){
 const job=Object.assign(new UserHandoverEntity(),{id:'60000000-0000-4000-8000-000000000003',sourceUserId:id,targetUserId:targetId,targetEmail:'target@example.invalid',roleCodes:['committee_member'],status:'PENDING',createdTarget:false});
 const source=Object.assign(new UserEntity(),{id,status:'DISABLED',handoverPending:true,roles:[{code:'committee_member'}]});
 const target=Object.assign(new UserEntity(),{id:targetId,status:'ACTIVE',handoverPending:true,roles:[{code:'test_taker'}]});
 const repo={findOneBy:jest.fn().mockResolvedValue(job),update:jest.fn()};
 const runner={connect:jest.fn(),release:jest.fn(),query:jest.fn().mockResolvedValue([{locked:true}])};
 const manager={findOneByOrFail:jest.fn().mockResolvedValue(source),findOne:jest.fn().mockResolvedValue(target),findBy:jest.fn().mockResolvedValue([{code:'test_taker'},{code:'committee_member'}]),find:jest.fn().mockResolvedValue([]),save:jest.fn(async(_e,v)=>v),update:jest.fn(),create:jest.fn((_e,v)=>v)};
 const db={getRepository:jest.fn(()=>repo),createQueryRunner:jest.fn(()=>runner),transaction:jest.fn(async(_isolation,fn)=>fn(manager))};
 const service=new StaffHandoverService(db as unknown as DataSource,new ConfigService());
 const call=jest.spyOn(service as any,'call').mockResolvedValue({assignments:0});
 return {service,call,db,repo,runner,job,source,target,manager};
}
describe('Staff handover safety',()=>{
 it('merges roles, archives the original identity, and preserves personal records',async()=>{
  const h=harness();await expect(h.service.transfer(id,{targetUserId:targetId},'actor','request')).resolves.toMatchObject({deleted:true,targetUserId:targetId});
  expect(h.source.deletedAt).toBeInstanceOf(Date);expect(h.source.roles).toEqual([]);expect(h.target.roles.map(r=>r.code)).toEqual(['test_taker','committee_member']);expect(h.job.status).toBe('COMPLETED');
  expect(h.call).toHaveBeenCalledTimes(6);expect(h.manager.save).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({action:'USER_HANDOVER_COMPLETED'}));
 });
 it('does not archive or grant roles when a responsibility service fails; the same job is retryable',async()=>{
  const h=harness();h.call.mockRejectedValueOnce(new Error('offline'));
  await expect(h.service.transfer(id,{targetUserId:targetId},'actor','request')).rejects.toThrow('offline');
  expect(h.db.transaction).not.toHaveBeenCalled();expect(h.source.deletedAt).toBeUndefined();expect(h.job.status).toBe('PENDING');expect(h.repo.update).toHaveBeenCalledWith(h.job.id,{lastError:'offline'});expect(h.runner.release).toHaveBeenCalled();
 });
 it('requires zero remaining responsibilities before completing',async()=>{
  const h=harness();h.call.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({assignments:1});
  await expect(h.service.transfer(id,{targetUserId:targetId},'actor','request')).rejects.toMatchObject({response:{code:'HANDOVER_INCOMPLETE'}});expect(h.db.transaction).not.toHaveBeenCalled();
 });
 it('cannot change successor after a partial handover',async()=>{
  const h=harness();await expect(h.service.transfer(id,{targetUserId:'60000000-0000-4000-8000-000000000009'},'actor','request')).rejects.toMatchObject({response:{code:'HANDOVER_TARGET_CONFLICT'}});expect(h.call).not.toHaveBeenCalled();
 });
 it('blocks self-deletion and ambiguous successors',async()=>{
  const h=harness();await expect(h.service.transfer(id,{targetUserId:targetId},id,'request')).rejects.toMatchObject({response:{code:'SELF_DELETE_FORBIDDEN'}});
  await expect(h.service.transfer(id,{},'actor','request')).rejects.toMatchObject({response:{code:'HANDOVER_TARGET_REQUIRED'}});expect(h.db.createQueryRunner).not.toHaveBeenCalled();
 });
 it('completed retries do not repeat assignment transfer',async()=>{
  const h=harness();h.job.status='COMPLETED';await h.service.transfer(id,{targetUserId:targetId},'actor','request');expect(h.call).not.toHaveBeenCalled();expect(h.db.transaction).not.toHaveBeenCalled();
 });
 it('blocks singleton conflicts at finalisation',async()=>{
  const h=harness();h.manager.find.mockResolvedValue([{id:'other',roles:[{code:'committee_head'}]}] as any);h.target.roles=[{code:'committee_head'} as RoleEntity];h.manager.findBy.mockResolvedValue([{code:'committee_head'},{code:'committee_member'}] as any);
  await expect(h.service.transfer(id,{targetUserId:targetId},'actor','request')).rejects.toMatchObject({response:{code:'ROLE_SINGLETON_CONFLICT'}});expect(h.source.deletedAt).toBeUndefined();
 });
 it.each(['committee_member','exam_head','admin'])('direct staff deletion is blocked for %s',async code=>{
  const users={findOneBy:jest.fn().mockResolvedValue({id,roles:[{code}]}),remove:jest.fn()} as unknown as Repository<UserEntity>;
  const service=new AdminService(users,{} as Repository<RoleEntity>,{} as Repository<PermissionEntity>,{record:jest.fn()} as unknown as AuditService,new ConfigService());
  await expect(service.deleteUser(id,'actor','request')).rejects.toMatchObject({response:{code:'ROLE_TRANSFER_REQUIRED'}});expect(users.remove).not.toHaveBeenCalled();
 });
 it('Test Taker-only deletion keeps the original direct flow',async()=>{
  const users={findOneBy:jest.fn().mockResolvedValue({id,roles:[{code:'test_taker'}]}),remove:jest.fn()} as unknown as Repository<UserEntity>;
  const service=new AdminService(users,{} as Repository<RoleEntity>,{} as Repository<PermissionEntity>,{record:jest.fn()} as unknown as AuditService,new ConfigService());await expect(service.deleteUser(id,'actor','request')).resolves.toEqual({deleted:true});
 });
 it.each(['result','assessment','reporting'] as const)('internal %s transfer rejects an unauthenticated caller',async schema=>{
  const C=createStaffTransferController(schema);const controller=new C({transaction:jest.fn()},new ConfigService({INTERNAL_SERVICE_SECRET:'x'.repeat(48)}));
  await expect(controller.transfer({sourceUserId:id,targetUserId:targetId,transferId:id},'wrong')).rejects.toMatchObject({response:{code:'INTERNAL_SERVICE_AUTH_FAILED'}});
 });
});
