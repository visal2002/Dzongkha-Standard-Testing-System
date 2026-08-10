/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RawResponse } from '@dzongjuk/common';
import { Permissions } from '@dzongjuk/security';
import { AuditQueryDto, CreateReportJobDto, DashboardConfigDto, ReportQueryDto, SaveReportDto } from './dtos';
import { ReportingService } from './reporting.service';

@ApiBearerAuth()
@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reporting: ReportingService) {}

  @Permissions('report.run') @Get('catalog') catalog() { return this.reporting.catalog(); }
  @Permissions('report.run') @Get('summary') summary() { return this.reporting.summary(); }
  @Permissions('report.run') @Get('registration') registration(@Query('examId') examId?: string) { return this.reporting.registrationReport(examId); }
  @Permissions('report.run') @Get('scores') scores(@Query('examId') examId?: string) { return this.reporting.scoreReport(examId); }
  @Permissions('report.run') @Get('appeals') appeals(@Query('examId') examId?: string) { return this.reporting.appealsReport(examId); }
  @Permissions('report.run') @Post('query') query(@Body() dto: ReportQueryDto) { return this.reporting.query(dto); }
  @Permissions('report.run') @Post('saved') save(@Body() dto: SaveReportDto, @Req() request: Request) { return this.reporting.save(dto, request.user!.sub); }
  @Permissions('report.run') @Get('saved') saved(@Req() request: Request) { return this.reporting.listSaved(request.user!.sub); }
  @HttpCode(202) @Permissions('report.run') @Post('jobs') job(@Body() dto: CreateReportJobDto, @Req() request: Request) { return this.reporting.createJob(dto, request.user!.sub); }
  @Permissions('report.run') @Get('jobs/:id') getJob(@Param('id') id: string, @Req() request: Request) { return this.reporting.getJob(id, request.user!.sub); }

  @RawResponse() @Permissions('report.run') @Get('jobs/:id/download')
  async download(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    const job = await this.reporting.downloadJob(id, request.user!.sub);
    response.setHeader('Content-Type', job.mimeType!);
    response.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(job.artifact);
  }
}

@ApiBearerAuth()
@ApiTags('Dashboards')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly reporting: ReportingService) {}
  @Get() get(@Req() request: Request) { return this.reporting.dashboard(request.user!); }
  @Get('stats') stats(@Req() request: Request) { return this.reporting.dashboard(request.user!); }
  @Permissions('dashboard.configure') @Put('config/:roleCode')
  configure(@Param('roleCode') roleCode: string, @Body() dto: DashboardConfigDto, @Req() request: Request) {
    return this.reporting.configureDashboard(roleCode, dto, request.user!.sub);
  }
}

@ApiBearerAuth()
@ApiTags('Audit')
@Permissions('audit.view')
@Controller('audit')
export class AuditController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('events') events(@Query() query: AuditQueryDto) { return this.reporting.audit(query); }
  @Get('events/:id') event(@Param('id') id: string) { return this.reporting.auditOne(id); }

  @RawResponse() @Get('export')
  async export(@Query() query: AuditQueryDto, @Res() response: Response) {
    const result = await this.reporting.audit({ ...query, page: 1, pageSize: 100 });
    const fields = ['id', 'eventId', 'action', 'source', 'resourceId', 'actorUserId', 'correlationId', 'occurredAt'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = `\uFEFF${fields.join(',')}\r\n${result.items.map((item) => fields.map((field) => escape((item as unknown as Record<string, unknown>)[field])).join(',')).join('\r\n')}`;
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="dzongjuk-audit-export.csv"');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(csv);
  }
}
