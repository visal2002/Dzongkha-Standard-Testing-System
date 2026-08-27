/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { AccessClaims, CanonicalRole } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AuditService } from './audit.service';
import { LoginDto, RegisterDto } from './dtos';
import { LoginAttemptEntity, NdiLoginRequestEntity, RoleEntity, SessionEntity, UserEntity } from './entities';
import { NdiProviderService } from './ndi-provider.service';

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
    @InjectRepository(NdiLoginRequestEntity) private readonly ndiLogins: Repository<NdiLoginRequestEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly ndi: NdiProviderService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    const duplicate = await this.users.findOne({ where: [{ email: dto.email.toLowerCase() }, { cid: dto.cid }] });
    if (duplicate) throw new DomainException('USER_DUPLICATE', 'An account already exists for this email or CID.', 409);
    const role = await this.roles.findOneByOrFail({ code: CanonicalRole.TestTaker, active: true });
    const user = await this.users.save(this.users.create({
      email: dto.email.toLowerCase(), cid: dto.cid, fullName: dto.fullName, userId: await this.allocateUserId(),
      passwordHash: await bcrypt.hash(dto.password, 12), roles: [role], status: 'ACTIVE',
    }));
    await this.audit.record({ action: 'USER_REGISTERED', resourceType: 'User', resourceId: user.id, actorUserId: user.id, requestId: context.requestId });
    return this.publicUser(user);
  }

  /**
   * Allocates the next 4-digit login handle in sequence: one past the highest
   * currently in use (seed accounts start at 1001). The inner loop only advances if
   * a concurrent insert already claimed the computed number.
   */
  private async allocateUserId(): Promise<string> {
    const [highest] = await this.users.find({
      where: { userId: Not(IsNull()) }, select: ['userId'], order: { userId: 'DESC' }, take: 1,
    });
    let next = (Number(highest?.userId) || 1000) + 1;
    for (let attempt = 0; attempt < 25; attempt += 1, next += 1) {
      const candidate = String(next).padStart(4, '0');
      if (!(await this.users.findOne({ where: { userId: candidate } }))) return candidate;
    }
    throw new DomainException('USER_ID_ALLOCATION_FAILED', 'Could not allocate a unique User ID. Please try again.', 503);
  }

  async login(dto: LoginDto, context: RequestContext) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.email) = :identifier OR user.cid = :identifier OR user.userId = :identifier', { identifier })
      .getOne();
    if (!user) return this.failedLogin(identifier, null, context, 'INVALID_CREDENTIALS');
    if (user.status === 'DISABLED') throw new DomainException('ACCOUNT_DISABLED', 'This account is disabled.', 403);
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new DomainException('ACCOUNT_LOCKED', 'This account is temporarily locked.', 423);
    if (user.status === 'LOCKED') user.status = 'ACTIVE';
    const allowAdministrativePasswordLogin = this.config.get<string>('ALLOW_ADMIN_LOCAL_LOGIN', 'false') === 'true';
    if (user.roles.some((role) => role.administrative) && !allowAdministrativePasswordLogin) {
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

  async ndiInitiate() {
    const proof = await this.ndi.createProofRequest();
    const pollToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.get<number>('NDI_LOGIN_TTL_SECONDS', 300) * 1000);
    await this.ndiLogins.save(this.ndiLogins.create({
      threadId: proof.proofRequestThreadId,
      pollTokenHash: this.hash(pollToken),
      status: 'PENDING',
      proofRequestUrl: proof.proofRequestURL,
      deepLinkUrl: proof.deepLinkURL ?? null,
      verifiedIdentity: {}, user: null, expiresAt, completedAt: null, consumedAt: null,
    }));
    return {
      pollToken,
      proofRequestUrl: proof.proofRequestURL,
      deepLinkUrl: proof.deepLinkURL ?? null,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async ndiStatus(pollToken: string, context: RequestContext) {
    const login = await this.ndiLogins.findOneBy({ pollTokenHash: this.hash(pollToken) });
    if (!login) throw new DomainException('NDI_LOGIN_NOT_FOUND', 'This Bhutan NDI login request is no longer available.', 404);
    if (login.expiresAt <= new Date() && login.status === 'PENDING') {
      login.status = 'FAILED';
      login.completedAt = new Date();
      await this.ndiLogins.save(login);
      void this.ndi.unsubscribe(login.threadId);
      return { status: 'EXPIRED' };
    }
    if (login.status === 'PENDING') return { status: 'PENDING', expiresAt: login.expiresAt.toISOString() };
    if (login.status === 'REJECTED') return { status: 'REJECTED' };
    if (login.status === 'FAILED') return { status: 'FAILED' };
    if (login.status === 'CANCELLED') return { status: 'CANCELLED' };
    if (login.status === 'CONSUMED' || login.consumedAt) {
      throw new DomainException('NDI_LOGIN_CONSUMED', 'This Bhutan NDI login request has already been used.', 409);
    }
    if (!login.user) throw new DomainException('NDI_ACCOUNT_NOT_LINKED', 'No Dzongjuk account is linked to this verified identity.', 403);
    const claimed = await this.ndiLogins.update(
      { id: login.id, status: 'VALIDATED', consumedAt: IsNull() },
      { status: 'CONSUMED', consumedAt: new Date() },
    );
    if (claimed.affected !== 1) throw new DomainException('NDI_LOGIN_CONSUMED', 'This Bhutan NDI login request has already been used.', 409);
    void this.ndi.unsubscribe(login.threadId);
    const session = await this.createSession(login.user, 'NDI', context);
    return { status: 'VALIDATED', ...session };
  }

  async ndiCancel(pollToken: string) {
    const login = await this.ndiLogins.findOneBy({ pollTokenHash: this.hash(pollToken) });
    if (!login || login.status !== 'PENDING') return { cancelled: true };
    login.status = 'CANCELLED';
    login.completedAt = new Date();
    await this.ndiLogins.save(login);
    void this.ndi.unsubscribe(login.threadId);
    return { cancelled: true };
  }

  async ndiWebhook(authorization: string | undefined, payload: Record<string, unknown>) {
    this.assertWebhookAuthorization(authorization);
    const threadId = typeof payload.thid === 'string' ? payload.thid : null;
    if (!threadId) throw new DomainException('NDI_WEBHOOK_INVALID', 'The Bhutan NDI webhook is missing thid.', 400);
    const login = await this.ndiLogins.findOneBy({ threadId });
    if (!login || login.status !== 'PENDING') return { accepted: true };

    if (payload.type === 'present-proof/rejected') {
      login.status = 'REJECTED';
      login.completedAt = new Date();
      await this.ndiLogins.save(login);
      return { accepted: true };
    }
    if (payload.type !== 'present-proof/presentation-result' || payload.verification_result !== 'ProofValidated') {
      login.status = 'FAILED';
      login.completedAt = new Date();
      await this.ndiLogins.save(login);
      return { accepted: true };
    }

    const presentation = payload.requested_presentation as Record<string, unknown> | undefined;
    const attributes = presentation?.revealed_attrs as Record<string, unknown> | undefined;
    const cid = this.revealedValue(attributes?.['ID Number']);
    const fullName = this.revealedValue(attributes?.['Full Name']);
    if (!cid || !fullName) {
      login.status = 'FAILED';
      login.completedAt = new Date();
      await this.ndiLogins.save(login);
      return { accepted: true };
    }

    let user = await this.users.findOneBy({ cid });
    if (!user && this.config.get('NDI_ALLOW_TEST_TAKER_PROVISIONING', 'false') === 'true') {
      const role = await this.roles.findOneByOrFail({ code: CanonicalRole.TestTaker, active: true });
      user = await this.users.save(this.users.create({
        email: `ndi-${this.hash(cid).slice(0, 24)}@users.dzongjuk.bt`, cid, fullName, userId: await this.allocateUserId(),
        passwordHash: null, roles: [role], status: 'ACTIVE', ndiLinkedAt: new Date(),
      }));
    }
    if (!user || user.status !== 'ACTIVE') {
      login.status = 'FAILED';
      login.completedAt = new Date();
      login.verifiedIdentity = { cid, fullName };
      await this.ndiLogins.save(login);
      return { accepted: true };
    }

    user.ndiLinkedAt = new Date();
    await this.users.save(user);
    login.user = user;
    login.status = 'VALIDATED';
    login.completedAt = new Date();
    login.verifiedIdentity = {
      cid, fullName,
      relationshipDid: typeof payload.relationship_did === 'string' ? payload.relationship_did : undefined,
    };
    await this.ndiLogins.save(login);
    await this.audit.record({
      action: 'NDI_PROOF_VALIDATED', resourceType: 'User', resourceId: user.id,
      actorUserId: user.id, requestId: `ndi:${threadId}`, safeData: { threadId },
    });
    return { accepted: true };
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

  private assertWebhookAuthorization(authorization: string | undefined) {
    const expected = this.config.get<string>('NDI_WEBHOOK_BEARER_TOKEN');
    const received = authorization?.replace(/^Bearer\s+/i, '');
    if (!expected || !received) throw new DomainException('NDI_WEBHOOK_UNAUTHORIZED', 'Webhook authentication failed.', HttpStatus.UNAUTHORIZED);
    const left = Buffer.from(expected);
    const right = Buffer.from(received);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new DomainException('NDI_WEBHOOK_UNAUTHORIZED', 'Webhook authentication failed.', HttpStatus.UNAUTHORIZED);
    }
  }

  private revealedValue(value: unknown): string | null {
    const first = Array.isArray(value) ? value[0] : value;
    if (!first || typeof first !== 'object') return null;
    const revealed = (first as Record<string, unknown>).value;
    return typeof revealed === 'string' && revealed.trim() ? revealed.trim() : null;
  }

  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private publicUser(user: UserEntity) { return { id: user.id, userId: user.userId, email: user.email, cid: user.cid, fullName: user.fullName, status: user.status, roles: user.roles.map((role) => role.code) }; }
}
