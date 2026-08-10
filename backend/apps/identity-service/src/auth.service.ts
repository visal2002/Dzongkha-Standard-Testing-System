/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createHash, randomBytes } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AccessClaims, CanonicalRole } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AuditService } from './audit.service';
import { LoginDto, RegisterDto } from './dtos';
import { LoginAttemptEntity, RoleEntity, SessionEntity, UserEntity } from './entities';

interface RequestContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>,
    @InjectRepository(LoginAttemptEntity) private readonly attempts: Repository<LoginAttemptEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    const duplicate = await this.users.findOne({ where: [{ email: dto.email.toLowerCase() }, { cid: dto.cid }] });
    if (duplicate) throw new DomainException('USER_DUPLICATE', 'An account already exists for this email or CID.', 409);
    const role = await this.roles.findOneByOrFail({ code: CanonicalRole.TestTaker, active: true });
    const user = await this.users.save(this.users.create({
      email: dto.email.toLowerCase(), cid: dto.cid, fullName: dto.fullName,
      passwordHash: await bcrypt.hash(dto.password, 12), roles: [role], status: 'ACTIVE',
    }));
    await this.audit.record({ action: 'USER_REGISTERED', resourceType: 'User', resourceId: user.id, actorUserId: user.id, requestId: context.requestId });
    return this.publicUser(user);
  }

  async login(dto: LoginDto, context: RequestContext) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.email) = :identifier OR user.cid = :identifier', { identifier })
      .getOne();
    if (!user) return this.failedLogin(identifier, null, context, 'INVALID_CREDENTIALS');
    if (user.status === 'DISABLED') throw new DomainException('ACCOUNT_DISABLED', 'This account is disabled.', 403);
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new DomainException('ACCOUNT_LOCKED', 'This account is temporarily locked.', 423);
    if (user.status === 'LOCKED') user.status = 'ACTIVE';
    if (user.roles.some((role) => role.administrative)) {
      await this.logAttempt(identifier, false, context, 'ADMIN_NDI_REQUIRED');
      throw new DomainException('ADMIN_NDI_REQUIRED', 'Administrative users must authenticate using NDI.', 403);
    }
    if (!user.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      return this.failedLogin(identifier, user, context, 'INVALID_CREDENTIALS');
    }
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.users.save(user);
    await this.logAttempt(identifier, true, context, null);
    return this.createSession(user, 'LOCAL', context);
  }

  async refresh(refreshToken: string | undefined, context: RequestContext) {
    if (!refreshToken) throw new DomainException('REFRESH_REQUIRED', 'A refresh token is required.', 401);
    const now = new Date();
    const session = await this.sessions.findOne({
      where: { refreshTokenHash: this.hash(refreshToken), revokedAt: IsNull(), expiresAt: MoreThan(now) },
    });
    if (!session) throw new DomainException('SESSION_INVALID', 'The session is invalid or expired.', 401);
    const idleMinutes = this.config.get<number>('SESSION_IDLE_MINUTES', 15);
    if (now.getTime() - session.lastActivityAt.getTime() >= idleMinutes * 60_000) {
      session.revokedAt = now;
      await this.sessions.save(session);
      throw new DomainException('SESSION_IDLE_TIMEOUT', 'The session expired due to inactivity.', 401);
    }
    const rawRefresh = randomBytes(48).toString('base64url');
    session.refreshTokenHash = this.hash(rawRefresh);
    session.lastActivityAt = now;
    await this.sessions.save(session);
    await this.audit.record({ action: 'SESSION_REFRESHED', resourceType: 'Session', resourceId: session.id, actorUserId: session.user.id, requestId: context.requestId });
    return { ...this.tokens(session), refreshToken: rawRefresh };
  }

  async logout(refreshToken: string | undefined, context: RequestContext) {
    if (!refreshToken) return;
    const session = await this.sessions.findOneBy({ refreshTokenHash: this.hash(refreshToken), revokedAt: IsNull() });
    if (!session) return;
    session.revokedAt = new Date();
    await this.sessions.save(session);
    await this.audit.record({ action: 'LOGOUT', resourceType: 'Session', resourceId: session.id, actorUserId: session.user.id, requestId: context.requestId });
  }

  ndiInitiate() {
    const url = this.config.get<string>('NDI_AUTHORIZATION_URL');
    const clientId = this.config.get<string>('NDI_CLIENT_ID');
    const redirectUri = this.config.get<string>('NDI_REDIRECT_URI');
    if (!url || !clientId || !redirectUri) {
      throw new DomainException('NDI_NOT_CONFIGURED', 'NDI integration credentials have not been configured.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const state = randomBytes(32).toString('base64url');
    const authorizationUrl = new URL(url);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', state);
    return { authorizationUrl: authorizationUrl.toString(), state };
  }

  private async createSession(user: UserEntity, assurance: 'LOCAL' | 'NDI' | 'MFA', context: RequestContext) {
    const refreshToken = randomBytes(48).toString('base64url');
    const session = await this.sessions.save(this.sessions.create({
      user, assurance, refreshTokenHash: this.hash(refreshToken), lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
      ipHash: context.ip ? this.hash(context.ip) : null, userAgent: context.userAgent?.slice(0, 512) ?? null,
    }));
    await this.audit.record({ action: 'LOGIN_SUCCESS', resourceType: 'Session', resourceId: session.id, actorUserId: user.id, requestId: context.requestId, safeData: { assurance } });
    return { ...this.tokens(session), refreshToken };
  }

  private tokens(session: SessionEntity) {
    const permissions = [...new Set(session.user.roles.flatMap((role) => role.permissions.map((permission) => permission.name)))];
    const claims: AccessClaims = { sub: session.user.id, sessionId: session.id, roles: session.user.roles.map((role) => role.code), permissions, assurance: session.assurance };
    return { accessToken: this.jwt.sign(claims), expiresIn: 900, user: this.publicUser(session.user) };
  }

  private async failedLogin(identifier: string, user: UserEntity | null, context: RequestContext, reason: string): Promise<never> {
    if (user) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.status = 'LOCKED';
        user.lockedUntil = new Date(Date.now() + this.config.get<number>('LOCKOUT_MINUTES', 30) * 60_000);
      }
      await this.users.save(user);
    }
    await this.logAttempt(identifier, false, context, reason);
    throw new DomainException('INVALID_CREDENTIALS', 'The supplied credentials are invalid.', 401);
  }

  private async logAttempt(identifier: string, success: boolean, context: RequestContext, reason: string | null) {
    await this.attempts.save(this.attempts.create({ identifier, success, reason, ipHash: context.ip ? this.hash(context.ip) : null }));
  }

  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private publicUser(user: UserEntity) { return { id: user.id, email: user.email, cid: user.cid, fullName: user.fullName, status: user.status, roles: user.roles.map((role) => role.code) }; }
}
