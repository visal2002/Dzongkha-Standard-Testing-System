/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createServiceInfoController, databaseOptions, PlatformModule } from '@dzongjuk/common';
import { SecurityModule } from '@dzongjuk/security';
const InfoController = createServiceInfoController('reporting-service', ['role-dashboard-projections', 'report-catalog', 'ad-hoc-query', 'async-pdf-excel-csv-export']);
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => databaseOptions(c, 'reporting') }), SecurityModule, PlatformModule], controllers: [InfoController] })
export class AppModule {}
