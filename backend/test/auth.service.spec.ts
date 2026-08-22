/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CanonicalRole } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AuthService } from '../apps/identity-service/src/auth.service';
import { AuditService } from '../apps/identity-service/src/audit.service';
import { NdiProviderService } from '../apps/identity-service/src/ndi-provider.service';
import {
  LoginAttemptEntity,
  NdiLoginRequestEntity,
  RoleEntity,
  SessionEntity,
  UserEntity,
} from '../apps/identity-service/src/entities';

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

const makeRepo = <T>(rows: T[] = []): Repository<T> =>
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
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
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
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
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
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
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
      .rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' });
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
      .rejects.toMatchObject({ code: 'ADMIN_NDI_REQUIRED' });
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
    await service.login({ identifier: user.email, password: PLAIN }, ctx);
    const sessionString = JSON.stringify(savedSessions);
    expect(sessionString).not.toContain(PLAIN);
    expect(sessionString).not.toContain(passwordHash.slice(0, 10));
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
      .rejects.toMatchObject({ code: 'NDI_WEBHOOK_UNAUTHORIZED' });
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

// ─── registration tests ───────────────────────────────────────────────────────

describe('AuthService — User registration (BRD §2.9)', () => {
  it('blocks duplicate email or CID registration', async () => {
    const existing = makeUser();
    const usersRepo = makeRepo<UserEntity>([existing]);
    (usersRepo.findOne as jest.Mock).mockResolvedValue(existing);
    const rolesRepo = makeRepo<RoleEntity>([makeRole(CanonicalRole.TestTaker)]);
    (rolesRepo.findOneByOrFail as jest.Mock).mockResolvedValue(makeRole(CanonicalRole.TestTaker));
    const service = buildService({ users: usersRepo, roles: rolesRepo });
    await expect(service.register({ email: existing.email, cid: existing.cid, fullName: 'Another', password: 'Pass!1234' }, ctx))
      .rejects.toMatchObject({ code: 'USER_DUPLICATE' });
  });
});
