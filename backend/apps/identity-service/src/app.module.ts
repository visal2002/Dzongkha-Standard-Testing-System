/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions, PlatformModule } from '@dzongjuk/common';
import { SecurityModule } from '@dzongjuk/security';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditEventEntity, LoginAttemptEntity, PermissionEntity, RoleEntity, SessionEntity, UserEntity } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => databaseOptions(config, 'identity') }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity, SessionEntity, LoginAttemptEntity, AuditEventEntity]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [AuthController, AdminController],
  providers: [AuthService, AdminService, AuditService],
})
export class AppModule {}
