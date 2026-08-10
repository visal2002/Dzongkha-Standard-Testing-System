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
  });
}
void bootstrap();
