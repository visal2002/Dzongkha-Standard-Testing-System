/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { CancelBirmsPaymentDto, CreateExamDto, MarkAttendanceDto, RecordRegistrationPaymentDto, ReturnApplicationDto, SubmitApplicationDto, UpdateExamDto, UpdateExamStatusDto } from './dtos';
import { RegistrationService } from './registration.service';
import { BirmsPaymentService } from './birms-payment.service';

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
  constructor(private readonly service: RegistrationService, private readonly birms: BirmsPaymentService) {}

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
  @Permissions('registration.application.verify') @Post(':id/payment') payment(@Param('id') id: string, @Body() dto: RecordRegistrationPaymentDto, @Req() req: Request) {
    return this.service.recordPayment(id, dto, req.user!.sub, req.id);
  }
  @Permissions('registration.application.submit') @Post(':id/payment-advice')
  createPaymentAdvice(@Param('id') id: string, @Req() req: Request) { return this.birms.createAdvice(id, req.user!.sub, req.id); }
  @Permissions('registration.application.submit') @Post(':id/payment-refresh')
  refreshPayment(@Param('id') id: string, @Req() req: Request) { return this.birms.refresh(id, req.user!.sub, req.id); }
  @Permissions('registration.application.submit') @Post(':id/payment-cancel')
  cancelPayment(@Param('id') id: string, @Body() dto: CancelBirmsPaymentDto, @Req() req: Request) { return this.birms.cancel(id, dto.reason, req.user!.sub, req.id); }
  @Permissions('registration.application.submit') @Get(':id/payment-receipt')
  receipt(@Param('id') id: string, @Req() req: Request) { return this.birms.receipt(id, req.user!.sub); }
  @Get(':id/history') history(@Param('id') id: string) { return this.service.applicationHistory(id); }

  @Public() @Get('internal/:id/certificate-profile')
  certificateProfile(@Param('id') id: string, @Headers('x-internal-service-key') key: string | undefined) {
    return this.service.certificateProfile(id, key);
  }
}

@ApiTags('BIRMS Payments')
@Controller('payments/birms')
export class BirmsPaymentsController {
  constructor(private readonly birms: BirmsPaymentService) {}

  @Public() @Post('callback') callback(@Body() payload: Record<string, unknown>, @Req() req: Request) {
    return this.birms.receiveCallback(payload, req.id);
  }

  @Public() @Post('reversal') reversal(@Body() payload: Record<string, unknown>, @Req() req: Request) {
    return this.birms.receiveReversal(payload, req.id);
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
