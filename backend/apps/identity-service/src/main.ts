/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  // Allow one transition release where an already-open frontend may still submit
  // the passport image under both `photo` and `avatar`. Each individual image is
  // still validated at a strict 3 MB maximum in AuthService.
  app.use(json({ limit: '10mb' }));
  await bootstrapService(app, {
    name: 'Dzongjuk Identity Access Service',
    description: 'Identity, NDI boundary, sessions, users, roles and permissions.',
    portEnv: 'IDENTITY_PORT',
    defaultPort: 8001,
    // Guards GET /admin/users/:id/internal-contact, which has no user session.
    requires: [{ key: 'INTERNAL_SERVICE_SECRET', kind: 'secret' }],
  });
}

void bootstrap();
