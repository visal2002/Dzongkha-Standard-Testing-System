import { Body, Controller, Get, Headers, Param, Post, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { IsUUID } from 'class-validator';
import { assertInternalService, DomainException } from '@dzongjuk/common';
import { Public } from './security.decorators';

class StaffTransferDto {
 @IsUUID() sourceUserId: string;
 @IsUUID() targetUserId: string;
 @IsUUID() transferId: string;
}

export function createStaffTransferController(schema: 'result' | 'assessment' | 'reporting'): Type<any> {
 @Controller('internal/staff-handover')
 class StaffTransferController {
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}
  private async counts(manager: EntityManager, source: string) {
   const sql = schema === 'result'
    ? `SELECT count(*)::int AS assignments FROM result.committee_members WHERE "userId"=$1 AND "removedAt" IS NULL AND "committeeId" IN (SELECT id FROM result.committees WHERE status='ACTIVE')`
    : schema === 'assessment'
    ? 'SELECT count(*)::int AS assignments FROM assessment.exam_content_assignments WHERE "userId"=$1 AND active=true'
    : 'SELECT (SELECT count(*) FROM reporting.saved_reports WHERE "ownerUserId"=$1)::int AS "savedReports", (SELECT count(*) FROM reporting.report_jobs WHERE "ownerUserId"=$1)::int AS "reportJobs"';
   return (await manager.query(sql, [source]))[0];
  }
  @Public() @Get(':sourceUserId')
  async preview(@Param('sourceUserId') source: string, @Headers('x-internal-service-key') key?: string) {
   assertInternalService(this.config, key);
   return this.counts(this.db.manager, source);
  }
  @Public() @Post()
  async transfer(@Body() dto: StaffTransferDto, @Headers('x-internal-service-key') key?: string) {
   assertInternalService(this.config, key);
   if(dto.sourceUserId === dto.targetUserId) throw new DomainException('HANDOVER_SELF_TARGET', 'The successor must be a different user.');
   return this.db.transaction('SERIALIZABLE', async m => {
    await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [dto.transferId]);
    const receipts = await m.query('SELECT * FROM '+schema+'.staff_transfer_receipts WHERE id=$1', [dto.transferId]);
    if(receipts.length && (receipts[0].sourceUserId!==dto.sourceUserId || receipts[0].targetUserId!==dto.targetUserId)) throw new DomainException('HANDOVER_TARGET_CONFLICT', 'This transfer has a different successor.', 409);
    const before = await this.counts(m,dto.sourceUserId);
    const args=[dto.sourceUserId,dto.targetUserId];
    if(schema==='result') {
     await m.query(`WITH moved AS (UPDATE result.committee_members SET "removedAt"=now() WHERE "userId"=$1 AND "removedAt" IS NULL AND "committeeId" IN (SELECT id FROM result.committees WHERE status='ACTIVE') RETURNING "committeeId",role) INSERT INTO result.committee_members (id,"committeeId","userId",role,"assignedAt","removedAt") SELECT gen_random_uuid(),"committeeId",$2,role,now(),NULL FROM moved ON CONFLICT ("committeeId","userId") DO UPDATE SET role=CASE WHEN EXCLUDED.role='HEAD' OR (committee_members.role='HEAD' AND committee_members."removedAt" IS NULL) THEN 'HEAD'::result.committee_role ELSE EXCLUDED.role END,"removedAt"=NULL`,args);
     await m.query(`UPDATE result.committee_members SET "removedAt"=now() WHERE "userId"=$1 AND "removedAt" IS NULL AND "committeeId" IN (SELECT id FROM result.committees WHERE status='ACTIVE')`,[dto.sourceUserId]);
    } else if(schema==='assessment') {
     await m.query('INSERT INTO assessment.exam_content_assignments (id,"examId","userId",active,"assignedByUserId","assignedAt") SELECT gen_random_uuid(),"examId",$2,true,"assignedByUserId",now() FROM assessment.exam_content_assignments WHERE "userId"=$1 AND active=true ON CONFLICT ("examId","userId") DO UPDATE SET active=true',args);
     await m.query('UPDATE assessment.exam_content_assignments SET active=false WHERE "userId"=$1 AND active=true',[dto.sourceUserId]);
    } else {
     const running = await m.query(`SELECT id FROM reporting.report_jobs WHERE "ownerUserId"=$1 AND status='RUNNING' FOR UPDATE`,[dto.sourceUserId]);
     if(running.length) throw new DomainException('HANDOVER_REPORT_RUNNING', 'A report is still generating. Retry once it finishes.',409);
     await m.query('UPDATE reporting.saved_reports SET "ownerUserId"=$2,"updatedAt"=now() WHERE "ownerUserId"=$1',args);
     await m.query('UPDATE reporting.report_jobs SET "ownerUserId"=$2 WHERE "ownerUserId"=$1',args);
    }
    await m.query('INSERT INTO '+schema+'.staff_transfer_receipts (id,"sourceUserId","targetUserId") VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET "updatedAt"=now()',[dto.transferId,...args]);
    return { transferred:before, remaining:await this.counts(m,dto.sourceUserId) };
   });
  }
 }
 return StaffTransferController;
}
