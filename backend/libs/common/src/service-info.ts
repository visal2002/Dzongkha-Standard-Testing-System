/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Controller, Get, Type } from '@nestjs/common';
import { Public } from '@dzongjuk/security';

export function createServiceInfoController(service: string, capabilities: string[]): Type<unknown> {
  @Controller('service')
  class ServiceInfoController {
    @Public()
    @Get('capabilities')
    capabilities() {
      return { service, capabilities, contractVersion: 'v1' };
    }
  }
  return ServiceInfoController;
}
