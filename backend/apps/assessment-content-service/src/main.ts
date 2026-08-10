/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { NestFactory } from '@nestjs/core';
import { bootstrapService } from '@dzongjuk/common';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); await bootstrapService(app, { name: 'Dzongjuk Secure Assessment Content Service', description: 'Classified question papers, answer sheets and sample-paper publication.', portEnv: 'ASSESSMENT_PORT', defaultPort: 8003 }); }
void bootstrap();
