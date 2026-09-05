/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); await bootstrapService(app, { name: 'Dzongjuk Notification Service', description: 'In-app, email and SMS delivery with retries and dead-letter handling.', portEnv: 'NOTIFICATION_PORT', defaultPort: 8006, requires: [{ key: 'INTERNAL_SERVICE_SECRET', kind: 'secret' }] }); }
void bootstrap();
