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
import { IS_PUBLIC, REQUIRED_ANY_PERMISSIONS, REQUIRED_PERMISSIONS } from './security.decorators';

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
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, targets) ?? [];
    const anyOf = this.reflector.getAllAndOverride<string[]>(REQUIRED_ANY_PERMISSIONS, targets) ?? [];
    if (!required.length && !anyOf.length) return true;
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new UnauthorizedException();
    if (this.satisfies(user.permissions, required, anyOf)) return true;
    throw new ForbiddenException('You do not have permission to perform this action.');
  }

  /**
   * @Permissions is conjunctive and @AnyPermissions is disjunctive. A route may
   * carry both, in which case every `required` permission and at least one `anyOf`
   * permission must be held. The admin wildcard satisfies either.
   */
  private satisfies(held: string[], required: string[], anyOf: string[]) {
    if (held.includes('*')) return true;
    const hasAllRequired = required.every((permission) => held.includes(permission));
    const hasOneOfAny = !anyOf.length || anyOf.some((permission) => held.includes(permission));
    return hasAllRequired && hasOneOfAny;
  }
}
