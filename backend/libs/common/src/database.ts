/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

function serviceSetting<T>(config: ConfigService, service: string, key: string, fallback: T): T {
  const prefix = service.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return config.get<T>(`${prefix}_DATABASE_${key}`) ?? config.get<T>(`DATABASE_${key}`) ?? fallback;
}

export function databaseOptions(config: ConfigService, service: string): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: serviceSetting(config, service, 'HOST', 'localhost'),
    port: Number(serviceSetting(config, service, 'PORT', 5432)),
    username: serviceSetting(config, service, 'USER', 'dzongjuk'),
    password: serviceSetting<string | undefined>(config, service, 'PASSWORD', undefined),
    database: serviceSetting(config, service, 'NAME', `dzongjuk_${service}`),
    schema: service,
    autoLoadEntities: true,
    synchronize: false,
    ssl: String(serviceSetting(config, service, 'SSL', 'false')) === 'true' ? { rejectUnauthorized: true } : false,
    extra: { max: Number(serviceSetting(config, service, 'POOL_MAX', 20)) },
  };
}
