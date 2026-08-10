/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessGuard, PermissionGuard } from './security.guards';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m', issuer: 'dzongjuk-identity', audience: 'dzongjuk-services' },
        verifyOptions: { issuer: 'dzongjuk-identity', audience: 'dzongjuk-services' },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [JwtModule],
})
export class SecurityModule {}
