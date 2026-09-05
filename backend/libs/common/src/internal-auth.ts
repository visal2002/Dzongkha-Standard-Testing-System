/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DomainException } from './http';

/**
 * Constant-time check that a caller presented the shared service-to-service secret.
 *
 * @param unconfigured error code and message to raise when no secret is configured.
 *   Callers may override it where their endpoint already publishes a different code.
 */
export function assertSharedSecret(
  expected: string,
  presented: string | undefined,
  unconfigured = { code: 'INTERNAL_SERVICE_UNAVAILABLE', message: 'Internal service authentication is not configured.' },
) {
  if (expected.length < 32) throw new DomainException(unconfigured.code, unconfigured.message, 503);
  const expectedBuffer = Buffer.from(expected);
  const presentedBuffer = Buffer.from(presented ?? '');
  if (expectedBuffer.length !== presentedBuffer.length || !timingSafeEqual(expectedBuffer, presentedBuffer)) {
    throw new DomainException('INTERNAL_SERVICE_AUTH_FAILED', 'Internal service authentication failed.', 401);
  }
}

/** `assertSharedSecret` against the INTERNAL_SERVICE_SECRET this service is configured with. */
export function assertInternalService(config: ConfigService, presented: string | undefined) {
  assertSharedSecret(config.get<string>('INTERNAL_SERVICE_SECRET', ''), presented);
}
