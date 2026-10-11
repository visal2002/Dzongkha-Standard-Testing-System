/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create<NestExpressApplication>(AppModule); app.useBodyParser('json', { limit: '20mb' }); await bootstrapService(app, { name: 'Dzongjuk Appeal and Certification Service', description: 'Appeals, revision approvals, certificate versioning and QR verification.', portEnv: 'APPEAL_PORT', defaultPort: 8005, requires: [{ key: 'INTERNAL_SERVICE_SECRET', kind: 'secret' }, { key: 'CERTIFICATE_VERIFICATION_SECRET', kind: 'secret' }, { key: 'CERTIFICATE_MASTER_KEY_BASE64', kind: 'secret', minLength: 44 }] }); }
void bootstrap();
