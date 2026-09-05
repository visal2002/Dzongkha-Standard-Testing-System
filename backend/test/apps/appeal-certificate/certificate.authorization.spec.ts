/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * DSTS-03: authorization on GET /certificates/:id, /:id/history and /:id/file.
 *
 * The audit reported these three routes as lacking permission enforcement. They were
 * never unauthenticated - JwtAccessGuard is registered globally in SecurityModule and
 * none of the three is marked @Public() - and ownership was already enforced inside
 * CertificateService.getAuthorized(). What was missing was an explicit declaration at
 * the routing layer, so the tests below cover both halves:
 *
 *   - the guard chain rejects an anonymous caller and a caller with no certificate
 *     permission, and
 *   - the service still admits the holder and a certificate administrator, and still
 *     refuses one test taker reading another's certificate.
 */

import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { AccessClaims, CertificateStatus } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { JwtAccessGuard, PermissionGuard } from '../../../libs/security/src/security.guards';
import { IS_PUBLIC, REQUIRED_ANY_PERMISSIONS, REQUIRED_PERMISSIONS } from '../../../libs/security/src/security.decorators';
import { CertificatesController } from '../../../apps/appeal-certificate-service/src/certificate.controller';
import { CertificateService } from '../../../apps/appeal-certificate-service/src/certificate.service';
import { CertificateEntity } from '../../../apps/appeal-certificate-service/src/entities';

// ─── identities ──────────────────────────────────────────────────────────────

const HOLDER_ID = '00000000-0000-4000-8000-00000000ho1d';
const OTHER_TAKER_ID = '00000000-0000-4000-8000-000000000oth';
const CERTIFICATE_ID = '11111111-1111-4111-8111-111111111111';

const claims = (sub: string, permissions: string[]): AccessClaims =>
  ({ sub, sessionId: 'session-1', roles: [], permissions, assurance: 'LOCAL' } as unknown as AccessClaims);

/** Mirrors the seeded role grants in database/migrations (0001, 0015). */
const holder = claims(HOLDER_ID, ['certificate.view_own']);
const otherTaker = claims(OTHER_TAKER_ID, ['certificate.view_own']);
const certificateAdministrator = claims('00000000-0000-4000-8000-0000000adm1', ['certificate.manage']);
const systemAdministrator = claims('00000000-0000-4000-8000-0000000adm2', ['*']);
const committeeMember = claims('00000000-0000-4000-8000-0000000cmt1', ['score.view', 'appeal.view', 'report.run']);

// ─── route metadata ──────────────────────────────────────────────────────────

const ROUTES = ['get', 'history', 'file'] as const;

const handlerFor = (name: (typeof ROUTES)[number]) =>
  Reflect.get(CertificatesController.prototype, name) as (...args: unknown[]) => unknown;

/** An ExecutionContext carrying the real decorator metadata for one controller route. */
const contextFor = (name: (typeof ROUTES)[number], user: AccessClaims | undefined, authorization?: string): ExecutionContext =>
  ({
    getHandler: () => handlerFor(name),
    getClass: () => CertificatesController,
    switchToHttp: () => ({
      getRequest: () => ({ user, header: (key: string) => (key === 'authorization' ? authorization : undefined) }),
    }),
  } as unknown as ExecutionContext);

const permissionGuard = new PermissionGuard(new Reflector());

// ─── service harness ─────────────────────────────────────────────────────────

const certificateRow = () =>
  Object.assign(new CertificateEntity(), {
    id: CERTIFICATE_ID,
    certificateNumber: 'DSTS-2026-ABCDEF',
    applicationId: '22222222-2222-4222-8222-222222222222',
    testTakerUserId: HOLDER_ID,
    status: CertificateStatus.Active,
    issuedAt: new Date('2026-01-01T00:00:00Z'),
    validUntil: new Date('2099-01-01T00:00:00Z'),
    versionNumber: 1,
    templateVersionNumber: 1,
    scoreSnapshot: { scores: {}, overallScore: '5' },
  });

function serviceHarness() {
  const row = certificateRow();
  const certificates = {
    findOneBy: jest.fn().mockResolvedValue(row),
    find: jest.fn().mockResolvedValue([row]),
  } as unknown as Repository<CertificateEntity>;
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({ save: jest.fn().mockResolvedValue({}) }),
  } as unknown as DataSource;
  const config = {
    get: (key: string, fallback?: string) =>
      ({
        CERTIFICATE_VERIFICATION_SECRET: 'a-verification-secret-of-at-least-32-chars',
        PUBLIC_API_BASE_URL: 'http://localhost:8000/api/v1',
        NODE_ENV: 'test',
        PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI',
      }[key] ?? fallback),
  } as unknown as ConfigService;

  const service = new CertificateService(
    dataSource,
    config,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    certificates,
    {} as never,
  );
  return { service, row };
}

const forbiddenCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as DomainException).getResponse() as { code: string };
  }
  throw new Error('expected the call to reject, but it resolved');
};

// ─── the routes are not, and never were, public ──────────────────────────────

describe('DSTS-03: the certificate read routes require authentication', () => {
  it.each(ROUTES)('GET /certificates/:id variant "%s" is not marked @Public()', (name) => {
    expect(Reflect.getMetadata(IS_PUBLIC, handlerFor(name))).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, CertificatesController)).not.toBe(true);
  });

  it.each(ROUTES)('JwtAccessGuard rejects an anonymous request to "%s"', async (name) => {
    const jwt = { verifyAsync: jest.fn() };
    const guard = new JwtAccessGuard(jwt as never, new Reflector());
    await expect(guard.canActivate(contextFor(name, undefined, undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it.each(ROUTES)('JwtAccessGuard rejects an invalid bearer token on "%s"', async (name) => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad signature')) };
    const guard = new JwtAccessGuard(jwt as never, new Reflector());
    await expect(guard.canActivate(contextFor(name, undefined, 'Bearer tampered.token.value'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

// ─── the explicit permission declarations added for this finding ─────────────

describe('DSTS-03: the certificate read routes declare their permissions explicitly', () => {
  it.each(ROUTES)('"%s" declares certificate.view_own or certificate.manage', (name) => {
    expect(Reflect.getMetadata(REQUIRED_ANY_PERMISSIONS, handlerFor(name))).toEqual([
      'certificate.view_own',
      'certificate.manage',
    ]);
    // Declared as alternatives, never as a conjunctive pair: no seeded role holds
    // both, so @Permissions('certificate.view_own', 'certificate.manage') would make
    // the route unreachable for everyone except the admin wildcard.
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS, handlerFor(name))).toBeUndefined();
  });

  it.each(ROUTES)('a certificate holder passes the permission guard on "%s"', (name) => {
    expect(permissionGuard.canActivate(contextFor(name, holder))).toBe(true);
  });

  it.each(ROUTES)('a certificate administrator passes the permission guard on "%s"', (name) => {
    expect(permissionGuard.canActivate(contextFor(name, certificateAdministrator))).toBe(true);
  });

  it.each(ROUTES)('a system administrator passes the permission guard on "%s"', (name) => {
    expect(permissionGuard.canActivate(contextFor(name, systemAdministrator))).toBe(true);
  });

  it.each(ROUTES)('a signed-in user with no certificate permission is refused at "%s"', (name) => {
    expect(() => permissionGuard.canActivate(contextFor(name, committeeMember))).toThrow(ForbiddenException);
  });

  it.each(ROUTES)('a user with an empty permission set is refused at "%s"', (name) => {
    expect(() => permissionGuard.canActivate(contextFor(name, claims('someone', [])))).toThrow(ForbiddenException);
  });
});

// ─── ownership, which the service has always enforced ────────────────────────

describe('DSTS-03: ownership is still enforced below the guard', () => {
  it('returns the certificate to its holder', async () => {
    const { service } = serviceHarness();
    await expect(service.getOne(CERTIFICATE_ID, holder, 'req-1')).resolves.toMatchObject({ id: CERTIFICATE_ID });
  });

  it('returns the certificate to a certificate administrator', async () => {
    const { service } = serviceHarness();
    await expect(service.getOne(CERTIFICATE_ID, certificateAdministrator, 'req-1')).resolves.toMatchObject({ id: CERTIFICATE_ID });
  });

  it('returns the certificate to the admin wildcard', async () => {
    const { service } = serviceHarness();
    await expect(service.getOne(CERTIFICATE_ID, systemAdministrator, 'req-1')).resolves.toMatchObject({ id: CERTIFICATE_ID });
  });

  // The case the permission guard cannot catch: another test taker holds
  // certificate.view_own legitimately, so only the ownership check stops them.
  it('refuses one test taker reading another test taker\'s certificate', async () => {
    const { service } = serviceHarness();
    expect(await forbiddenCode(service.getOne(CERTIFICATE_ID, otherTaker, 'req-1'))).toMatchObject({
      code: 'CERTIFICATE_FORBIDDEN',
    });
  });

  it('refuses another test taker reading the version history', async () => {
    const { service } = serviceHarness();
    expect(await forbiddenCode(service.history(CERTIFICATE_ID, otherTaker))).toMatchObject({ code: 'CERTIFICATE_FORBIDDEN' });
  });

  it('gives the holder their own version history', async () => {
    const { service } = serviceHarness();
    await expect(service.history(CERTIFICATE_ID, holder)).resolves.toHaveLength(1);
  });
});
