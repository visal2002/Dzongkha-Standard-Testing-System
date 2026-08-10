/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { AppealService } from './appeal.service';
import { ChiefDecisionDto, CommitteeReviewDto, ConfirmAppealPaymentDto, CreateAppealDto, CreateFeeRuleDto } from './dtos';

@ApiBearerAuth()
@ApiTags('Appeals')
@Controller('appeals')
export class AppealsController {
  constructor(private readonly appeals: AppealService) {}

  @Permissions('appeal.submit') @Post()
  submit(@Body() dto: CreateAppealDto, @Req() request: Request, @Headers('authorization') authorization: string | undefined, @Headers('idempotency-key') key: string) {
    return this.appeals.submit(dto, request.user!, authorization, request.id, key);
  }

  @Permissions('appeal.submit') @Get('my') my(@Req() request: Request) { return this.appeals.listMine(request.user!); }
  @Get() list(@Req() request: Request) { return this.appeals.listAll(request.user!); }
  @Get(':id') get(@Param('id') id: string, @Req() request: Request) { return this.appeals.getOne(id, request.user!); }
  @Get(':id/history') history(@Param('id') id: string, @Req() request: Request) { return this.appeals.getHistory(id, request.user!); }

  @Permissions('appeal.review') @Post(':id/committee-review')
  review(@Param('id') id: string, @Body() dto: CommitteeReviewDto, @Req() request: Request, @Headers('authorization') authorization: string | undefined) {
    return this.appeals.committeeReview(id, dto, request.user!, authorization, request.id);
  }

  @Permissions('appeal.approve') @Post(':id/decision')
  decide(@Param('id') id: string, @Body() dto: ChiefDecisionDto, @Req() request: Request) { return this.appeals.decide(id, dto, request.user!, request.id); }

  @Permissions('appeal.approve') @Post(':id/apply-revision')
  applyRevision(@Param('id') id: string, @Headers('idempotency-key') key: string, @Req() request: Request) {
    return this.appeals.applyApprovedRevision(id, request.user!, request.id, key);
  }

  @Public() @Post(':id/payment/confirm')
  confirmPayment(@Param('id') id: string, @Body() dto: ConfirmAppealPaymentDto, @Headers('x-internal-service-key') internalKey: string | undefined, @Req() request: Request) {
    return this.appeals.confirmPayment(id, dto, internalKey, request.id);
  }
}

@ApiBearerAuth()
@ApiTags('Appeal fee configuration')
@Controller('appeal-fees')
export class AppealFeesController {
  constructor(private readonly appeals: AppealService) {}

  @Get('active') active() { return this.appeals.getActiveFee(); }
  @Permissions('appeal.fee.manage') @Get() list() { return this.appeals.listFees(); }
  @Permissions('appeal.fee.manage') @Post() create(@Body() dto: CreateFeeRuleDto, @Req() request: Request) { return this.appeals.createFee(dto, request.user!, request.id); }
  @Permissions('appeal.fee.manage') @Post(':id/approve') approve(@Param('id') id: string, @Req() request: Request) { return this.appeals.approveFee(id, request.user!, request.id); }
}
