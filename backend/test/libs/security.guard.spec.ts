/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../libs/security/src/security.guards';

describe('PermissionGuard', () => {
  const context = (permissions: string[]) => ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user: { sub: 'user-1', permissions, roles: [], sessionId: 'session-1', assurance: 'LOCAL' } }),
    }),
  }) as unknown as ExecutionContext;

  it('allows an explicitly granted permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['score.submit']) } as unknown as Reflector;
    expect(new PermissionGuard(reflector).canActivate(context(['score.submit']))).toBe(true);
  });

  it('allows the system administrator wildcard', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin.role.manage']) } as unknown as Reflector;
    expect(new PermissionGuard(reflector).canActivate(context(['*']))).toBe(true);
  });

  it('denies a missing permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['question.secure.download']) } as unknown as Reflector;
    expect(() => new PermissionGuard(reflector).canActivate(context(['score.view']))).toThrow(ForbiddenException);
  });
});
