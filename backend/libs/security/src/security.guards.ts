/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AccessClaims } from '@dzongjuk/contracts';
import { IS_PUBLIC, REQUIRED_PERMISSIONS } from './security.decorators';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Authentication is required.');
    try {
      request.user = await this.jwt.verifyAsync<AccessClaims>(token);
      return true;
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new UnauthorizedException();
    if (user.permissions.includes('*') || required.every((permission) => user.permissions.includes(permission))) return true;
    throw new ForbiddenException('You do not have permission to perform this action.');
  }
}
