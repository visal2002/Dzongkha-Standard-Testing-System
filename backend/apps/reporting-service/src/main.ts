/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); await bootstrapService(app, { name: 'Dzongjuk Reporting Service', description: 'Role dashboards, governed reports and asynchronous exports.', portEnv: 'REPORTING_PORT', defaultPort: 8007 }); }
void bootstrap();
