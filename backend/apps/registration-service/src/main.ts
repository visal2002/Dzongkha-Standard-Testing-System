/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  await bootstrapService(app, {
    name: 'Dzongjuk Examination Registration Service',
    description: 'Examinations, applications, verification, waitlist and attendance.',
    portEnv: 'REGISTRATION_PORT',
    defaultPort: 8002,
    requires: [
      // Guards the internal certificate-profile and contact lookups.
      { key: 'INTERNAL_SERVICE_SECRET', kind: 'secret' },
      // BIRMS is a live payment gateway. This used to fall back to the staging
      // host in code, so an unset variable silently pointed real registration
      // payments at a test system - see BirmsPaymentService.baseUrl().
      {
        key: 'BIRMS_BASE_URL',
        kind: 'url',
        rejectHostsContaining: ['stagging', 'staging', 'localhost'],
        allowNonProductionHostKey: 'BIRMS_ALLOW_NON_PRODUCTION_HOST',
      },
    ],
  });
}
void bootstrap();
