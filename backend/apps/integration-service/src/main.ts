/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); await bootstrapService(app, { name: 'Dzongjuk Integration Gateway Service', description: 'Isolated adapters for NDI, DCRC, payments, SMS and email.', portEnv: 'INTEGRATION_PORT', defaultPort: 8008 }); }
void bootstrap();
