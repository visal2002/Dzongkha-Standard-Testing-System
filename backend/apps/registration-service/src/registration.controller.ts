/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { CreateExamDto, MarkAttendanceDto, ReturnApplicationDto, SubmitApplicationDto, UpdateExamDto, UpdateExamStatusDto } from './dtos';
import { RegistrationService } from './registration.service';

@ApiTags('Examinations')
@Controller('exams')
export class ExamsController {
  constructor(private readonly service: RegistrationService) {}

  @Public() @Get() list() { return this.service.listExams(); }
  @Public() @Get(':id') get(@Param('id') id: string) { return this.service.getExam(id); }
  @ApiBearerAuth() @Permissions('exam.window.manage') @Post() create(@Body() dto: CreateExamDto, @Req() req: Request) { return this.service.createExam(dto, req.user!.sub, req.id); }
  @ApiBearerAuth() @Permissions('exam.window.manage') @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Req() req: Request) { return this.service.updateExam(id, dto, req.user!.sub, req.id); }
  @ApiBearerAuth() @Permissions('exam.window.manage') @Patch(':id/status') status(@Param('id') id: string, @Body() dto: UpdateExamStatusDto, @Req() req: Request) { return this.service.setExamStatus(id, dto.status, req.user!.sub, req.id); }
}

@ApiBearerAuth()
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: RegistrationService) {}

  @Permissions('registration.application.submit') @Post('exam/:examId')
  submit(@Param('examId') examId: string, @Body() dto: SubmitApplicationDto, @Req() req: Request, @Headers('idempotency-key') key: string) {
    return this.service.submit(examId, dto, req.user!.sub, req.id, key);
  }

  @Permissions('registration.application.submit') @Get('my') my(@Req() req: Request) { return this.service.listMine(req.user!.sub); }
  @Permissions('registration.application.verify') @Get() list(@Query('examId') examId?: string) { return this.service.listApplications(examId); }
  @Get(':id') get(@Param('id') id: string, @Req() req: Request) {
    const elevated = req.user!.permissions.includes('*') || req.user!.permissions.includes('registration.application.verify');
    return this.service.getApplication(id, req.user!.sub, elevated);
  }
  @Permissions('registration.application.submit') @Post(':id/cancel') cancel(@Param('id') id: string, @Req() req: Request) { return this.service.cancel(id, req.user!.sub, req.id); }
  @Permissions('registration.application.submit') @Post(':id/resubmit') resubmit(@Param('id') id: string, @Req() req: Request) { return this.service.resubmit(id, req.user!.sub, req.id); }
  @Permissions('registration.application.verify') @Post(':id/start-review') startReview(@Param('id') id: string, @Req() req: Request) { return this.service.startReview(id, req.user!.sub, req.id); }
  @Permissions('registration.application.verify') @Post(':id/return') returnForCorrection(@Param('id') id: string, @Body() dto: ReturnApplicationDto, @Req() req: Request) { return this.service.returnForCorrection(id, dto, req.user!.sub, req.id); }
  @Permissions('registration.application.verify') @Post(':id/verify') verify(@Param('id') id: string, @Req() req: Request) { return this.service.verify(id, req.user!.sub, req.id); }
  @Get(':id/history') history(@Param('id') id: string) { return this.service.applicationHistory(id); }

  @Public() @Get('internal/:id/certificate-profile')
  certificateProfile(@Param('id') id: string, @Headers('x-internal-service-key') key: string | undefined) {
    return this.service.certificateProfile(id, key);
  }
}

@ApiBearerAuth()
@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly service: RegistrationService) {}
  @Permissions('registration.application.verify') @Get('pending') pending(@Query('examId') examId?: string) { return this.service.listPendingVerification(examId); }
}

@ApiBearerAuth()
@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: RegistrationService) {}
  @Permissions('attendance.mark') @Get() list(@Query('examId') examId?: string) { return this.service.listAttendance(examId); }
  @Permissions('attendance.mark') @Patch(':applicationId') mark(@Param('applicationId') id: string, @Body() dto: MarkAttendanceDto, @Req() req: Request) {
    return this.service.markAttendance(id, dto, req.user!.sub, req.id);
  }
}
