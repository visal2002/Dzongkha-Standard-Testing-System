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
    name: 'Dzongjuk Identity Access Service',
    description: 'Identity, NDI boundary, sessions, users, roles and permissions.',
    portEnv: 'IDENTITY_PORT',
    defaultPort: 8001,
  });
}

void bootstrap();
