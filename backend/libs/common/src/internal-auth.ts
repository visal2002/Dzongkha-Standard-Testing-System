/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DomainException } from './http';

export function assertInternalService(config: ConfigService, presented: string | undefined) {
  const expected = config.get<string>('INTERNAL_SERVICE_SECRET', '');
  if (expected.length < 32) throw new DomainException('INTERNAL_SERVICE_UNAVAILABLE', 'Internal service authentication is not configured.', 503);
  const expectedBuffer = Buffer.from(expected);
  const presentedBuffer = Buffer.from(presented ?? '');
  if (expectedBuffer.length !== presentedBuffer.length || !timingSafeEqual(expectedBuffer, presentedBuffer)) {
    throw new DomainException('INTERNAL_SERVICE_AUTH_FAILED', 'Internal service authentication failed.', 401);
  }
}
