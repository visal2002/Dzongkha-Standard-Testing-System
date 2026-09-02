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
import { NdiProviderService } from './ndi-provider.service';
import { AuditEventEntity, LoginAttemptEntity, NdiLoginRequestEntity, PermissionEntity, RoleEntity, SessionEntity, UserEntity } from './entities';
import { MasterConfigurationEntity } from './entities';
import { MasterConfigurationController } from './master-configuration.controller';
import { MasterConfigurationService } from './master-configuration.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => databaseOptions(config, 'identity') }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity, SessionEntity, LoginAttemptEntity, NdiLoginRequestEntity, AuditEventEntity, MasterConfigurationEntity]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [AuthController, AdminController, MasterConfigurationController],
  providers: [AuthService, NdiProviderService, AdminService, AuditService, MasterConfigurationService],
})
export class AppModule {}
