/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { ApiEnvelopeInterceptor, ApiExceptionFilter } from './http';

export interface BootstrapOptions {
  name: string;
  description: string;
  portEnv: string;
  defaultPort: number;
}

export async function bootstrapService(app: INestApplication, options: BootstrapOptions) {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready', 'metrics'] });
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    request.id = request.header('x-request-id') ?? randomUUID();
    response.setHeader('x-request-id', request.id);
    next();
  });
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', 'http://localhost:5000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(options.name)
    .setDescription(options.description)
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('dzongjuk_refresh')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.get<number>(options.portEnv, options.defaultPort), '0.0.0.0');
}
