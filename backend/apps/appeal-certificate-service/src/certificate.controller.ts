/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RawResponse } from '@dzongjuk/common';
import { AnyPermissions, Permissions, Public } from '@dzongjuk/security';
import { CertificateService } from './certificate.service';
import { CreateCertificateTemplateDto, GenerateCertificatesDto, RevokeCertificateDto } from './dtos';

@ApiBearerAuth()
@ApiTags('Certificate templates')
@Controller('certificate-templates')
export class CertificateTemplatesController {
  constructor(private readonly certificates: CertificateService) {}
  @Permissions('certificate.template.manage') @Get() list() { return this.certificates.listTemplates(); }
  @Permissions('certificate.template.manage') @Post() create(@Body() dto: CreateCertificateTemplateDto, @Req() request: Request) { return this.certificates.createTemplate(dto, request.user!, request.id); }
  @Permissions('certificate.template.manage') @Post(':id/approve') approve(@Param('id') id: string, @Req() request: Request) { return this.certificates.approveTemplate(id, request.user!, request.id); }
}

@ApiBearerAuth()
@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificateService) {}
  @Permissions('certificate.issue') @Post('generate') generate(@Body() dto: GenerateCertificatesDto, @Headers('idempotency-key') key: string, @Req() request: Request) { return this.certificates.generate(dto.examId, request.user!, request.id, key); }
  @Permissions('certificate.manage') @Get() list() { return this.certificates.listAll(); }
  @Permissions('certificate.view_own') @Get('my') my(@Req() request: Request) { return this.certificates.listMine(request.user!.sub); }
  // Test Taker self-service download: no id in the path (the client just wants
  // "my certificate"), so this must be declared before @Get(':id') or Express
  // routes "download" into the id param. Streams a freshly rendered PDF of the
  // caller's most recently issued certificate.
  @RawResponse() @Permissions('certificate.view_own') @Get('download') async download(@Req() request: Request, @Res() response: Response) {
    const file = await this.certificates.downloadLatestOwn(request.user!, request.id);
    response.setHeader('content-type', 'application/pdf');
    response.setHeader('content-disposition', `attachment; filename="${file.filename.replace(/["\r\n]/g, '_')}"`);
    response.setHeader('cache-control', 'private, no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    response.end(file.buffer);
  }
  // These three carried no @Permissions declaration. Authentication was never
  // optional on them - JwtAccessGuard is global and none of them is @Public() - and
  // ownership is enforced in CertificateService.getAuthorized(), which admits the
  // holder, `certificate.manage` and the admin wildcard and 403s everyone else. The
  // declarations below state that same rule at the routing layer so it is visible
  // in the controller and enforced before the handler runs, rather than only in the
  // service. `certificate.view_own` and `certificate.manage` are alternatives, not a
  // pair: no role holds both, so @Permissions with both would lock everyone out.
  @AnyPermissions('certificate.view_own', 'certificate.manage')
  @Get(':id') get(@Param('id') id: string, @Req() request: Request) { return this.certificates.getOne(id, request.user!, request.id); }
  @AnyPermissions('certificate.view_own', 'certificate.manage')
  @Get(':id/history') history(@Param('id') id: string, @Req() request: Request) { return this.certificates.history(id, request.user!); }
  @AnyPermissions('certificate.view_own', 'certificate.manage')
  @RawResponse() @Get(':id/file') async file(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    const file = await this.certificates.download(id, request.user!, request.id);
    response.setHeader('content-type', 'application/pdf');
    response.setHeader('content-disposition', `attachment; filename="${file.filename.replace(/["\r\n]/g, '_')}"`);
    response.setHeader('cache-control', 'private, no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    response.end(file.buffer);
  }
  @Permissions('certificate.revoke') @Post(':id/revoke') revoke(@Param('id') id: string, @Body() dto: RevokeCertificateDto, @Req() request: Request) { return this.certificates.revoke(id, dto.reason, request.user!, request.id); }
}

@ApiTags('Public certificate verification')
@Controller('public/certificates')
export class PublicCertificatesController {
  constructor(private readonly certificates: CertificateService) {}
  @Public() @Get('verify/:token') verify(@Param('token') token: string, @Req() request: Request) { return this.certificates.verify(token, request.id); }
}
