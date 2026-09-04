/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNull, ObjectLiteral, Repository } from 'typeorm';
import { CanonicalRole } from '@dzongjuk/contracts';
import { AuthService } from '../../../apps/identity-service/src/auth.service';
import { AuditService } from '../../../apps/identity-service/src/audit.service';
import { NdiProviderService } from '../../../apps/identity-service/src/ndi-provider.service';
import {
  LoginAttemptEntity,
  NdiLoginRequestEntity,
  RoleEntity,
  SessionEntity,
  UserEntity,
} from '../../../apps/identity-service/src/entities';

// ─── shared fixtures ──────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';

const uuid = () => `50000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const makeRole = (code: CanonicalRole, administrative = false): RoleEntity =>
  Object.assign(new RoleEntity(), {
    id: uuid(), code, name: code, active: true, administrative,
    permissions: [],
  });

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: uuid(),
    email: 'test@dsts.bt',
    cid: '10701000001',
    fullName: 'Test User',
    passwordHash: null,
    status: 'ACTIVE',
    roles: [makeRole(CanonicalRole.TestTaker)],
    failedLoginCount: 0,
    lockedUntil: null,
    ndiLinkedAt: null,
    ...overrides,
  });

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({
    find: jest.fn().mockResolvedValue(rows),
    findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneByOrFail: jest.fn().mockResolvedValue(rows[0] ?? null),
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
    createQueryBuilder: jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<T>);

const makeJwt = (): JwtService =>
  ({ sign: jest.fn().mockReturnValue('signed.access.token') } as unknown as JwtService);

const makeAudit = (): AuditService =>
  ({ record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService);

const makeNdi = (): NdiProviderService =>
  ({
    createProofRequest: jest.fn().mockResolvedValue({
      proofRequestThreadId: uuid(),
      proofRequestURL: 'https://ndi.gov.bt/proof',
      deepLinkURL: null,
    }),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  } as unknown as NdiProviderService);

const ctx = { requestId: 'req-1', ip: '127.0.0.1', userAgent: 'jest' };

const buildService = ({
  users,
  roles,
  sessions = makeRepo<SessionEntity>(),
  attempts = makeRepo<LoginAttemptEntity>(),
  ndiLogins = makeRepo<NdiLoginRequestEntity>(),
  ndi = makeNdi(),
  config = new ConfigService({ ALLOW_ADMIN_LOCAL_LOGIN: 'true' }),
}: {
  users?: Repository<UserEntity>;
  roles?: Repository<RoleEntity>;
  sessions?: Repository<SessionEntity>;
  attempts?: Repository<LoginAttemptEntity>;
  ndiLogins?: Repository<NdiLoginRequestEntity>;
  ndi?: NdiProviderService;
  config?: ConfigService;
} = {}): AuthService =>
  new AuthService(
    users ?? makeRepo<UserEntity>(),
    roles ?? makeRepo<RoleEntity>([makeRole(CanonicalRole.TestTaker)]),
    sessions,
    attempts,
    ndiLogins,
    makeJwt(),
    config,
    makeAudit(),
    ndi,
  );

// ─── local credential tests ───────────────────────────────────────────────────

describe('AuthService — Local credential login (BRD §2.9)', () => {
  const PLAIN = 'Password!123';
  let passwordHash: string;

  beforeAll(async () => { passwordHash = await bcrypt.hash(PLAIN, 12); });

  it('issues an access token with correct claims on valid credentials', async () => {
    const user = makeUser({ passwordHash });
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const sessions = makeRepo<SessionEntity>();
    (sessions.save as jest.Mock).mockImplementation(async (data: unknown) =>
      ({ ...(data as Record<string, unknown>), id: uuid(), user }));
    const service = buildService({ users: usersRepo, sessions });
    const result = await service.login({ identifier: user.email, password: PLAIN }, ctx);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('rejects an incorrect password (returns 401 DomainException)', async () => {
    const user = makeUser({ passwordHash });
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const service = buildService({ users: usersRepo });
    await expect(service.login({ identifier: user.email, password: 'WrongPassword!' }, ctx))
      .rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' }, status: 401 });
  });

  it('rejects an unknown user identifier', async () => {
    const usersRepo = makeRepo<UserEntity>([]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    const service = buildService({ users: usersRepo });
    await expect(service.login({ identifier: 'nobody@dsts.bt', password: 'Any!1234' }, ctx))
      .rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' } });
  });

  it('locks an account after 5 consecutive failed login attempts', async () => {
    const user = makeUser({ passwordHash, failedLoginCount: 4 });
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const config = new ConfigService({ ALLOW_ADMIN_LOCAL_LOGIN: 'true', LOCKOUT_MINUTES: 30 });
    const service = buildService({ users: usersRepo, config });
    await expect(service.login({ identifier: user.email, password: 'WrongPassword!' }, ctx))
      .rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' } });
    expect(user.status).toBe('LOCKED');
    expect(user.lockedUntil).toBeInstanceOf(Date);
  });

  it('rejects login for a disabled account', async () => {
    const user = makeUser({ passwordHash, status: 'DISABLED' });
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const service = buildService({ users: usersRepo });
    await expect(service.login({ identifier: user.email, password: PLAIN }, ctx))
      .rejects.toMatchObject({ response: { code: 'ACCOUNT_DISABLED' } });
  });

  it('requires NDI login for administrative roles when ALLOW_ADMIN_LOCAL_LOGIN is false', async () => {
    const adminRole = makeRole(CanonicalRole.SystemAdmin, true);
    const adminUser = makeUser({ passwordHash, roles: [adminRole] });
    const usersRepo = makeRepo<UserEntity>([adminUser]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(adminUser),
    });
    const config = new ConfigService({ ALLOW_ADMIN_LOCAL_LOGIN: 'false' });
    const service = buildService({ users: usersRepo, config });
    await expect(service.login({ identifier: adminUser.email, password: PLAIN }, ctx))
      .rejects.toMatchObject({ response: { code: 'ADMIN_NDI_REQUIRED' } });
  });

  it('never stores raw password in session or token claims', async () => {
    const user = makeUser({ passwordHash });
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const savedSessions: SessionEntity[] = [];
    const sessions = makeRepo<SessionEntity>();
    (sessions.save as jest.Mock).mockImplementation(async (data: unknown) => {
      savedSessions.push(data as SessionEntity);
      return { ...(data as Record<string, unknown>), id: uuid(), user };
    });
    const service = buildService({ users: usersRepo, sessions });
    const issued = await service.login({ identifier: user.email, password: PLAIN }, ctx);

    // `user` is a ManyToOne relation, so only its FK reaches the sessions table — assert on
    // the session's own persisted columns rather than the in-memory entity graph, which
    // legitimately carries the eagerly loaded user.
    const persistedColumns = savedSessions.map((session) => ({ ...session, user: undefined }));
    const sessionString = JSON.stringify(persistedColumns);
    expect(sessionString).not.toContain(PLAIN);
    expect(sessionString).not.toContain(passwordHash.slice(0, 10));

    // the half of this test its name promises but never checked: the issued token and the
    // public user projection must not carry the password or its hash either.
    const issuedString = JSON.stringify(issued);
    expect(issuedString).not.toContain(PLAIN);
    expect(issuedString).not.toContain(passwordHash.slice(0, 10));
  });
});

// ─── token / session tests ────────────────────────────────────────────────────

describe('AuthService — Token & session claims (BRD §2.9)', () => {
  it('produced access token contains sub, roles, permissions, and assurance claims', async () => {
    const PLAIN = 'Token!Test1';
    const passwordHash = await bcrypt.hash(PLAIN, 12);
    const user = makeUser({ passwordHash });
    const jwtSpy = makeJwt();
    const signSpy = jest.spyOn(jwtSpy, 'sign');
    const usersRepo = makeRepo<UserEntity>([user]);
    usersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    });
    const sessions = makeRepo<SessionEntity>();
    (sessions.save as jest.Mock).mockImplementation(async (data: unknown) =>
      ({ ...(data as Record<string, unknown>), id: uuid(), user }));
    const service = new AuthService(
      usersRepo, makeRepo([makeRole(CanonicalRole.TestTaker)]),
      sessions, makeRepo(), makeRepo(),
      jwtSpy, new ConfigService({ ALLOW_ADMIN_LOCAL_LOGIN: 'true' }),
      makeAudit(), makeNdi(),
    );
    await service.login({ identifier: user.email, password: PLAIN }, ctx);
    expect(signSpy).toHaveBeenCalledWith(expect.objectContaining({
      sub: user.id,
      roles: expect.any(Array),
      permissions: expect.any(Array),
      assurance: 'LOCAL',
    }));
  });
});

// ─── NDI webhook tests ────────────────────────────────────────────────────────

describe('AuthService — NDI webhook (BRD §2.9 + §3)', () => {
  const WEBHOOK_TOKEN = 'ndi-webhook-secret-token-42';
  const ndiConfig = new ConfigService({ NDI_WEBHOOK_BEARER_TOKEN: WEBHOOK_TOKEN, ALLOW_ADMIN_LOCAL_LOGIN: 'true' });

  it('rejects webhook calls with invalid bearer token', async () => {
    const service = buildService({ config: ndiConfig });
    await expect(service.ndiWebhook('Bearer wrong-token', { thid: uuid(), type: 'present-proof/presentation-result' }))
      .rejects.toMatchObject({ response: { code: 'NDI_WEBHOOK_UNAUTHORIZED' } });
  });

  it('marks login request REJECTED when NDI proof is rejected by the holder', async () => {
    const threadId = uuid();
    const pendingLogin = Object.assign(new NdiLoginRequestEntity(), {
      id: uuid(), threadId, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
    });
    const ndiLoginsRepo = makeRepo<NdiLoginRequestEntity>([pendingLogin]);
    (ndiLoginsRepo.findOneBy as jest.Mock).mockResolvedValue(pendingLogin);
    const service = buildService({ ndiLogins: ndiLoginsRepo, config: ndiConfig });
    await service.ndiWebhook(`Bearer ${WEBHOOK_TOKEN}`, { thid: threadId, type: 'present-proof/rejected' });
    expect(pendingLogin.status).toBe('REJECTED');
  });

  it('marks login VALIDATED and links user on successful proof presentation', async () => {
    const threadId = uuid();
    const cid = '10701000001';
    const existingUser = makeUser({ cid });
    const pendingLogin = Object.assign(new NdiLoginRequestEntity(), {
      id: uuid(), threadId, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
      verifiedIdentity: {}, user: null,
    });
    const ndiLoginsRepo = makeRepo<NdiLoginRequestEntity>([pendingLogin]);
    (ndiLoginsRepo.findOneBy as jest.Mock).mockResolvedValue(pendingLogin);
    (ndiLoginsRepo.save as jest.Mock).mockImplementation(async (data: unknown) => data);
    const usersRepo = makeRepo<UserEntity>([existingUser]);
    (usersRepo.findOneBy as jest.Mock).mockResolvedValue(existingUser);
    (usersRepo.save as jest.Mock).mockImplementation(async (data: unknown) => data);
    const service = buildService({ users: usersRepo, ndiLogins: ndiLoginsRepo, config: ndiConfig });
    await service.ndiWebhook(`Bearer ${WEBHOOK_TOKEN}`, {
      thid: threadId,
      type: 'present-proof/presentation-result',
      verification_result: 'ProofValidated',
      requested_presentation: {
        revealed_attrs: {
          'ID Number': [{ value: cid }],
          'Full Name': [{ value: 'Karma Wangchuk' }],
        },
      },
    });
    expect(pendingLogin.status).toBe('VALIDATED');
    expect(pendingLogin.user).toBe(existingUser);
  });

  it('marks login FAILED when revealed attributes are incomplete (no CID)', async () => {
    const threadId = uuid();
    const pendingLogin = Object.assign(new NdiLoginRequestEntity(), {
      id: uuid(), threadId, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
      verifiedIdentity: {}, user: null,
    });
    const ndiLoginsRepo = makeRepo<NdiLoginRequestEntity>([pendingLogin]);
    (ndiLoginsRepo.findOneBy as jest.Mock).mockResolvedValue(pendingLogin);
    (ndiLoginsRepo.save as jest.Mock).mockImplementation(async (data: unknown) => data);
    const service = buildService({ ndiLogins: ndiLoginsRepo, config: ndiConfig });
    await service.ndiWebhook(`Bearer ${WEBHOOK_TOKEN}`, {
      thid: threadId,
      type: 'present-proof/presentation-result',
      verification_result: 'ProofValidated',
      requested_presentation: { revealed_attrs: { 'Full Name': [{ value: 'Missing CID' }] } },
    });
    expect(pendingLogin.status).toBe('FAILED');
  });
});

// ─── NDI status poll tests ────────────────────────────────────────────────────
// `ndiStatus` was split into `expireOverdueNdiLogin`, `terminalNdiStatus` and
// `consumeValidatedNdiLogin` to bring its cyclomatic complexity under the
// project's ESLint limit. Every branch it dispatches to is pinned here.

describe('AuthService — NDI status poll (BRD §2.9)', () => {
  const login = (overrides: Partial<NdiLoginRequestEntity> = {}) => Object.assign(new NdiLoginRequestEntity(), {
    id: uuid(), threadId: uuid(), status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000), completedAt: null, consumedAt: null,
    verifiedIdentity: {}, user: null,
    ...overrides,
  });

  it('rejects an unknown poll token', async () => {
    const service = buildService();
    await expect(service.ndiStatus('unknown-token', ctx)).rejects.toMatchObject({ response: { code: 'NDI_LOGIN_NOT_FOUND' } });
  });

  it('fails an overdue pending request and reports EXPIRED', async () => {
    const overdue = login({ expiresAt: new Date(Date.now() - 1000) });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([overdue]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(overdue);
    (ndiLogins.save as jest.Mock).mockImplementation(async (data: unknown) => data);
    const ndi = makeNdi();
    const unsubscribeSpy = jest.spyOn(ndi, 'unsubscribe');
    const service = buildService({ ndiLogins, ndi });

    const result = await service.ndiStatus('token', ctx);

    expect(result).toEqual({ status: 'EXPIRED' });
    expect(overdue.status).toBe('FAILED');
    expect(unsubscribeSpy).toHaveBeenCalledWith(overdue.threadId);
  });

  it('does not expire a request whose deadline has not passed', async () => {
    const notOverdue = login({ expiresAt: new Date(Date.now() + 60_000) });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([notOverdue]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(notOverdue);
    const service = buildService({ ndiLogins });

    const result = await service.ndiStatus('token', ctx);

    expect(result).toMatchObject({ status: 'PENDING' });
    expect(notOverdue.status).toBe('PENDING');
  });

  it('reports PENDING with the expiry, unmodified', async () => {
    const pending = login();
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([pending]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(pending);
    const service = buildService({ ndiLogins });

    const result = await service.ndiStatus('token', ctx);

    expect(result).toEqual({ status: 'PENDING', expiresAt: pending.expiresAt.toISOString() });
  });

  it.each(['REJECTED', 'FAILED', 'CANCELLED'] as const)('reports terminal status %s as-is', async (status) => {
    const terminal = login({ status });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([terminal]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(terminal);
    const service = buildService({ ndiLogins });

    expect(await service.ndiStatus('token', ctx)).toEqual({ status });
  });

  it('rejects a request already consumed by a prior poll', async () => {
    const consumed = login({ status: 'CONSUMED', consumedAt: new Date() });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([consumed]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(consumed);
    const service = buildService({ ndiLogins });

    await expect(service.ndiStatus('token', ctx)).rejects.toMatchObject({ response: { code: 'NDI_LOGIN_CONSUMED' } });
  });

  it('rejects a validated request with no linked account', async () => {
    const orphaned = login({ status: 'VALIDATED', user: null });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([orphaned]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(orphaned);
    const service = buildService({ ndiLogins });

    await expect(service.ndiStatus('token', ctx)).rejects.toMatchObject({ response: { code: 'NDI_ACCOUNT_NOT_LINKED' } });
  });

  it('claims a validated request exactly once and opens a session with a refresh token', async () => {
    const user = makeUser();
    const validated = login({ status: 'VALIDATED', user });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([validated]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(validated);
    const updateMock = jest.fn().mockResolvedValue({ affected: 1 });
    ndiLogins.update = updateMock;
    const sessions = makeRepo<SessionEntity>();
    const ndi = makeNdi();
    const unsubscribeSpy = jest.spyOn(ndi, 'unsubscribe');
    const service = buildService({ ndiLogins, sessions, ndi });

    const result = await service.ndiStatus('token', ctx);

    expect(updateMock).toHaveBeenCalledWith(
      { id: validated.id, status: 'VALIDATED', consumedAt: IsNull() },
      expect.objectContaining({ status: 'CONSUMED' }),
    );
    expect(unsubscribeSpy).toHaveBeenCalledWith(validated.threadId);
    expect(result).toMatchObject({ status: 'VALIDATED', accessToken: 'signed.access.token' });
    expect(result).toHaveProperty('refreshToken');
  });

  it('rejects a validated request already claimed by a concurrent poll', async () => {
    const user = makeUser();
    const validated = login({ status: 'VALIDATED', user });
    const ndiLogins = makeRepo<NdiLoginRequestEntity>([validated]);
    (ndiLogins.findOneBy as jest.Mock).mockResolvedValue(validated);
    ndiLogins.update = jest.fn().mockResolvedValue({ affected: 0 }); // another poll already claimed it
    const service = buildService({ ndiLogins });

    await expect(service.ndiStatus('token', ctx)).rejects.toMatchObject({ response: { code: 'NDI_LOGIN_CONSUMED' } });
  });
});

// ─── registration tests ───────────────────────────────────────────────────────

describe('AuthService — User registration (BRD §2.9)', () => {
  it('blocks duplicate email or CID registration', async () => {
    const existing = makeUser();
    const usersRepo = makeRepo<UserEntity>([existing]);
    (usersRepo.findOne as jest.Mock).mockResolvedValue(existing);
    const rolesRepo = makeRepo<RoleEntity>([makeRole(CanonicalRole.TestTaker)]);
    (rolesRepo.findOneByOrFail as jest.Mock).mockResolvedValue(makeRole(CanonicalRole.TestTaker));
    const service = buildService({ users: usersRepo, roles: rolesRepo });
    await expect(service.register({ email: existing.email, cid: existing.cid!, fullName: 'Another', password: 'Pass!1234' }, ctx))
      .rejects.toMatchObject({ response: { code: 'USER_DUPLICATE' } });
  });
});
