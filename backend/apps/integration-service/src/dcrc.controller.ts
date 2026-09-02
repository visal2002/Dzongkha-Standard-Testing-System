/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Public } from '@dzongjuk/security';
import { assertInternalService } from '@dzongjuk/common';
import { DcrcService, DcrcVerificationRequest } from './dcrc.service';

@Controller('internal/dcrc')
export class DcrcController {
  constructor(private readonly dcrc: DcrcService, private readonly config: ConfigService) {}

  @Public() @Post('citizens/:cid/verify')
  verify(
    @Param('cid') cid: string,
    @Body() body: DcrcVerificationRequest,
    @Headers('x-internal-service-key') internalKey: string | undefined,
    @Req() request: Request,
  ) {
    assertInternalService(this.config, internalKey);
    return this.dcrc.verifyCitizenTrusted(cid, body, request.id);
  }

  @Public() @Post('citizens/lookup')
  lookup(
    @Body() body: DcrcVerificationRequest & { cid?: string },
    @Headers('x-internal-service-key') internalKey: string | undefined,
    @Req() request: Request,
  ) {
    assertInternalService(this.config, internalKey);
    return this.dcrc.lookupCitizenTrusted(body.cid ?? '', body, request.id);
  }
}
