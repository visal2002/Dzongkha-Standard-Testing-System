import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull, In, Not } from 'typeorm';
import bcrypt from 'bcryptjs';
import { DomainException } from '@dzongjuk/common';
import { TransferUserDto } from './dtos';
import { AuditEventEntity, RoleEntity, SessionEntity, UserEntity, UserHandoverEntity } from './entities';

const singleton = ['admin', 'dcdd', 'exam_head', 'committee_head'];
@Injectable()
export class StaffHandoverService {
 constructor(private readonly db: DataSource, private readonly config: ConfigService) {}
 private services() {
  return [
   ['result', this.config.get<string>('RESULT_SERVICE_URL', 'http://result-service:8004/api/v1')],
   ['assessment', this.config.get<string>('ASSESSMENT_SERVICE_URL', 'http://assessment-content-service:8003/api/v1')],
   ['reporting', this.config.get<string>('REPORTING_SERVICE_URL', 'http://reporting-service:8007/api/v1')],
  ];
 }
 private async call(base: string, path: string, body?: unknown) {
  const secret=this.config.get<string>('INTERNAL_SERVICE_SECRET', '');
  if(secret.length<32) throw new DomainException('HANDOVER_NOT_CONFIGURED','Handover service authentication is not configured.',503);
  try {
   const response=await fetch(base.replace(/\/$/,'')+'/internal/staff-handover'+path, { method:body?'POST':'GET', headers:{'Content-Type':'application/json','x-internal-service-key':secret}, ...(body?{body:JSON.stringify(body)}:{}), signal:AbortSignal.timeout(15000) });
   const envelope=await response.json() as {success:boolean,data:Record<string,number>,error?:{message:string}};
   if(!response.ok || !envelope.success) throw new Error(envelope.error?.message || 'A responsibility service could not complete the handover.');
   return envelope.data;
  } catch(error) { throw new DomainException('HANDOVER_SERVICE_UNAVAILABLE',error instanceof Error?error.message:'Handover service unavailable.',503); }
 }
 async plan(id: string) {
  const source=await this.db.getRepository(UserEntity).findOneBy({id,deletedAt:IsNull()});
  if(!source)throw new DomainException('USER_NOT_FOUND','User not found.',404);
  const pending=await this.db.getRepository(UserHandoverEntity).findOneBy({sourceUserId:id});
  const responsibilities:Record<string,Record<string,number>>={};
  for(const [name,url] of this.services())responsibilities[name]=await this.call(url,'/'+id);
  return {sourceUserId:id,roles:pending?.roleCodes ?? source.roles.filter(r=>r.code!=='test_taker').map(r=>r.code), responsibilities, pending:pending?{targetUserId:pending.targetUserId,targetEmail:pending.targetEmail,status:pending.status,lastError:pending.lastError}:null, preservesHistory:true};
 }
 async transfer(id:string,dto:TransferUserDto,actorId:string,requestId:string) {
  if(id===actorId)throw new DomainException('SELF_DELETE_FORBIDDEN','You cannot delete your own account.');
  if(Boolean(dto.targetUserId)===Boolean(dto.newUser))throw new DomainException('HANDOVER_TARGET_REQUIRED','Choose exactly one existing or new successor.');
  if(dto.targetUserId===id)throw new DomainException('HANDOVER_SELF_TARGET','Choose a different successor.');
  const runner=this.db.createQueryRunner(); await runner.connect();
  const [lock]=await runner.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',['staff-handover:'+id]);
  if(!lock.locked){await runner.release();throw new DomainException('HANDOVER_IN_PROGRESS','Another handover attempt is running. Please wait.',409);}
  let job:UserHandoverEntity|undefined;
  try {
   job=await this.db.getRepository(UserHandoverEntity).findOneBy({sourceUserId:id}) ?? undefined;
   if(job && ((dto.targetUserId && dto.targetUserId!==job.targetUserId)||(dto.newUser && dto.newUser.email.toLowerCase()!==job.targetEmail)))throw new DomainException('HANDOVER_TARGET_CONFLICT','Resume with the original successor; responsibilities may already have moved.',409);
   if(job?.status==='COMPLETED')return {deleted:true,transferred:true,targetUserId:job.targetUserId};
   if(!job){
    await this.plan(id); // Every responsibility service must be reachable before freezing the account.
    job=await this.db.transaction('SERIALIZABLE',async m=>{
     const source=await m.findOne(UserEntity,{where:{id,deletedAt:IsNull()},relations:{roles:true}});
     if(!source)throw new DomainException('USER_NOT_FOUND','User not found.',404);
     if(source.handoverPending)throw new DomainException('HANDOVER_IN_PROGRESS','This user is already involved in another handover.',409);
     if(source.roles.length===1 && source.roles[0].code==='test_taker' && !source.requiresRoleTransfer)throw new DomainException('HANDOVER_NOT_REQUIRED','Test Taker-only accounts use ordinary deletion.');
     let target:UserEntity;
     if(dto.newUser){
      if(await m.exists(UserEntity,{where:[{email:dto.newUser.email.toLowerCase()},{cid:dto.newUser.cid}]}))throw new DomainException('USER_DUPLICATE','The successor email or CID already exists.',409);
      const [row]=await m.query('SELECT COALESCE(MAX(NULLIF("userId",\'\')::int),1000)+1 AS next FROM identity.users');
      if(row.next>9999)throw new DomainException('USER_ID_ALLOCATION_FAILED','No available four-digit User ID.',409);
      target=await m.save(UserEntity,m.create(UserEntity,{fullName:dto.newUser.fullName,email:dto.newUser.email.toLowerCase(),cid:dto.newUser.cid,passwordHash:await bcrypt.hash(dto.newUser.password,12),userId:String(row.next),roles:[],status:'DISABLED',requiresRoleTransfer:true}));
     }else{
      const existing=await m.findOne(UserEntity,{where:{id:dto.targetUserId!,deletedAt:IsNull()},relations:{roles:true}});
      if(!existing || existing.status!=='ACTIVE' || existing.handoverPending)throw new DomainException('HANDOVER_TARGET_INVALID','The successor must be an active, unlocked existing user.');
      target=existing;
     }
     target.handoverPending=true;await m.save(UserEntity,target);
     const roleCodes=source.roles.filter(r=>r.code!=='test_taker').map(r=>r.code);
     source.status='DISABLED';source.handoverPending=true;source.requiresRoleTransfer=true;
     await m.save(UserEntity,source);
     await m.update(SessionEntity,{user:{id},revokedAt:IsNull()},{revokedAt:new Date()});
     const created=await m.save(UserHandoverEntity,m.create(UserHandoverEntity,{sourceUserId:id,targetUserId:target.id,targetEmail:target.email,createdTarget:Boolean(dto.newUser),roleCodes,actorUserId:actorId,status:'PENDING',lastError:null}));
     await m.save(AuditEventEntity,m.create(AuditEventEntity,{action:'USER_HANDOVER_STARTED',resourceType:'User',resourceId:id,actorUserId:actorId,requestId,safeData:{transferId:created.id,targetUserId:target.id,roles:roleCodes}}));
     return created;
    });
   }
   for(const [,url] of this.services())await this.call(url,'',{sourceUserId:id,targetUserId:job.targetUserId,transferId:job.id});
   for(const [,url] of this.services()){
    const remaining=await this.call(url,'/'+id);
    if(Object.values(remaining).some(v=>v!==0))throw new DomainException('HANDOVER_INCOMPLETE','Responsibilities remain. Retry the handover.',409);
   }
   const completed=job;
   await this.db.transaction('SERIALIZABLE',async m=>{
    const source=await m.findOneByOrFail(UserEntity,{id});const target=await m.findOne(UserEntity,{where:{id:completed.targetUserId,deletedAt:IsNull()},relations:{roles:true}});
    if(!target || (!completed.createdTarget && target.status!=='ACTIVE'))throw new DomainException('HANDOVER_TARGET_INVALID','The successor is no longer eligible.',409);
    const codes=[...new Set([...target.roles.map(r=>r.code),...completed.roleCodes])];
    const roles=await m.findBy(RoleEntity,{code:In(codes),active:true});if(roles.length!==codes.length)throw new DomainException('ROLE_INVALID','A transferred role is inactive. Restore it before retrying.',409);
    const holders=await m.find(UserEntity,{where:{status:Not('DISABLED'),deletedAt:IsNull()},relations:{roles:true}});
    if(holders.some(u=>u.id!==id&&u.id!==target.id&&u.roles.some(r=>singleton.includes(r.code)&&codes.includes(r.code))))throw new DomainException('ROLE_SINGLETON_CONFLICT','A singleton role now belongs to another active user. Resolve that conflict and retry.',409);
    target.roles=roles;target.status='ACTIVE';target.handoverPending=false;target.requiresRoleTransfer=true;await m.save(UserEntity,target);
    source.roles=[];source.status='DISABLED';source.deletedAt=new Date();source.handoverPending=false;await m.save(UserEntity,source);
    await m.update(SessionEntity,{user:{id:target.id},revokedAt:IsNull()},{revokedAt:new Date()});
    completed.status='COMPLETED';completed.completedAt=new Date();completed.lastError=null;await m.save(UserHandoverEntity,completed);
    await m.save(AuditEventEntity,m.create(AuditEventEntity,{action:'USER_HANDOVER_COMPLETED',resourceType:'User',resourceId:id,actorUserId:actorId,requestId,safeData:{transferId:completed.id,targetUserId:target.id,roles:completed.roleCodes,historyPreserved:true}}));
   });
   return {deleted:true,transferred:true,targetUserId:job.targetUserId};
  } catch(error){
   if(job)await this.db.getRepository(UserHandoverEntity).update(job.id,{lastError:error instanceof Error?error.message:'Handover failed. Retry.'});
   throw error;
  } finally {await runner.query('SELECT pg_advisory_unlock(hashtext($1))',['staff-handover:'+id]);await runner.release();}
 }
}
