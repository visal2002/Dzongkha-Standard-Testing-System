/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { AccessClaims, CertificateStatus } from '@dzongjuk/contracts';
import { CertificateService } from '../../../apps/appeal-certificate-service/src/certificate.service';
import { CertificateEncryptionService } from '../../../apps/appeal-certificate-service/src/certificate-encryption.service';
import { CertificateStorageService } from '../../../apps/appeal-certificate-service/src/certificate-storage.service';
import { CertificateRendererService } from '../../../apps/appeal-certificate-service/src/certificate-renderer.service';
import { CertificateSourceClientService } from '../../../apps/appeal-certificate-service/src/certificate-source-client.service';
import {
  CertificateEntity,
  CertificateFileEntity,
  CertificateOrientation,
  CertificatePaperSize,
  CertificateTemplateEntity,
  CertificateTemplateStatus,
} from '../../../apps/appeal-certificate-service/src/entities';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const uuid = () => `40000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const verificationSecret = 'x'.repeat(32);

const mfaActor = (overrides: Partial<AccessClaims> = {}): AccessClaims => ({
  sub: uuid(),
  sessionId: uuid(),
  roles: ['exam_head'],
  permissions: ['certificate.manage'],
  assurance: 'MFA',
  ...overrides,
});

const makeTemplate = (): CertificateTemplateEntity =>
  Object.assign(new CertificateTemplateEntity(), {
    id: uuid(),
    code: 'DSTS-V1',
    versionNumber: 1,
    status: CertificateTemplateStatus.Approved,
    validityMonths: 24,
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
    testOnly: false,
    createdByUserId: uuid(),
    approvedByUserId: uuid(),
    approvedAt: new Date(),
  });

const makeCertificate = (overrides: Partial<CertificateEntity> = {}): CertificateEntity =>
  Object.assign(new CertificateEntity(), {
    id: uuid(),
    certificateNumber: `DSTS-2026-${uuid().slice(0, 12).toUpperCase()}`,
    examId: uuid(),
    applicationId: uuid(),
    testTakerUserId: uuid(),
    scoreSheetId: uuid(),
    scoreVersionNumber: 1,
    versionNumber: 1,
    templateId: uuid(),
    templateVersionNumber: 1,
    holderName: 'Karma Wangchuk',
    registrationNumber: 'DSTS-2026-ABCD1234',
    scoreSnapshot: { scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 }, overallScore: '7.0' },
    bandLabel: 'HIGH',
    cefrLevel: 'C1',
    verificationTokenHash: 'dummy-hash',
    fileId: uuid(),
    status: CertificateStatus.Active,
    issuedAt: new Date(),
    validUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    revocationReason: null,
    revokedByUserId: null,
    ...overrides,
  });

const makeManager = (overrides: Partial<EntityManager> = {}): EntityManager =>
  ({
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => ({
      ...((data ?? entityOrData) as Record<string, unknown>), id: uuid(),
    })),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    ...overrides,
  } as unknown as EntityManager);

const makeDataSource = (manager: EntityManager): DataSource =>
  ({
    transaction: jest.fn().mockImplementation(async (isolationOrFn: unknown, fn?: unknown) => {
      const transact = typeof isolationOrFn === 'function' ? isolationOrFn : fn!;
      return (transact as (m: EntityManager) => Promise<unknown>)(manager);
    }),
    manager,
    getRepository: jest.fn().mockImplementation(() => ({
      findOneBy: jest.fn().mockResolvedValue(null),
      findBy: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (data: unknown) => data),
    })),
  } as unknown as DataSource);

const makeRepo = <T extends ObjectLiteral>(rows: T[] = []): Repository<T> =>
  ({
    find: jest.fn().mockResolvedValue(rows),
    findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    findOneBy: jest.fn().mockResolvedValue(rows[0] ?? null),
    findBy: jest.fn().mockResolvedValue(rows),
    countBy: jest.fn().mockResolvedValue(rows.length),
    count: jest.fn().mockResolvedValue(rows.length),
    save: jest.fn().mockImplementation(async (data: unknown) => data),
    create: jest.fn().mockImplementation((data: unknown) => data),
  } as unknown as Repository<T>);

const makeEncryption = (): CertificateEncryptionService => {
  const key = Buffer.alloc(32, 7).toString('base64');
  return new CertificateEncryptionService(
    new ConfigService({ CERTIFICATE_MASTER_KEY_BASE64: key, CERTIFICATE_KEY_VERSION: 'cert-v1' }),
  );
};

const makeStorage = (): CertificateStorageService =>
  ({
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(Buffer.alloc(16)),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as CertificateStorageService);

const makeRenderer = (): CertificateRendererService =>
  ({ render: jest.fn().mockResolvedValue(Buffer.from('%PDF-certificate-content')) } as unknown as CertificateRendererService);

const makeSources = (examId: string, applicationId: string, testTakerUserId: string): CertificateSourceClientService =>
  ({
    exam: jest.fn().mockResolvedValue({ id: examId, examDate: new Date().toISOString() }),
    results: jest.fn().mockResolvedValue([{
      examId, applicationId, testTakerUserId,
      scoreSheetId: uuid(), scoreVersionNumber: 1,
      scores: { WRITING: 7, READING: 7, LISTENING: 7, SPEAKING: 7 },
      overallScore: '7.0', bandLabel: 'HIGH', cefrLevel: 'C1',
    }]),
    profile: jest.fn().mockResolvedValue({
      applicationId, examId, testTakerUserId,
      registrationNumber: 'DSTS-2026-ABCD1234',
      fullName: 'Karma Wangchuk',
    }),
  } as unknown as CertificateSourceClientService);

const buildService = ({
  manager = makeManager(),
  templates = makeRepo<CertificateTemplateEntity>([makeTemplate()]),
  certificates = makeRepo<CertificateEntity>(),
  files = makeRepo<CertificateFileEntity>(),
  sources,
}: {
  manager?: EntityManager;
  templates?: Repository<CertificateTemplateEntity>;
  certificates?: Repository<CertificateEntity>;
  files?: Repository<CertificateFileEntity>;
  sources?: CertificateSourceClientService;
} = {}): CertificateService => {
  const examId = uuid();
  const appId = uuid();
  const userId = uuid();
  return new CertificateService(
    makeDataSource(manager),
    new ConfigService({
      CERTIFICATE_VERIFICATION_SECRET: verificationSecret,
      PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI',
      PUBLIC_API_BASE_URL: 'http://localhost:8000/api/v1',
      NODE_ENV: 'test',
    }),
    makeEncryption(),
    makeStorage(),
    makeRenderer(),
    sources ?? makeSources(examId, appId, userId),
    templates,
    certificates,
    files,
  );
};

// ─── authorization tests ──────────────────────────────────────────────────────

describe('CertificateService — Authorization (BRD §2.7)', () => {
  it("blocks non-owner without elevated permission from viewing another user's certificate", async () => {
    const cert = makeCertificate({ testTakerUserId: uuid() });
    const certificates = makeRepo([cert]);
    const service = buildService({ certificates });
    const otherActor = mfaActor({ sub: uuid(), permissions: [] }); // different user, no manage permission
    await expect(service.getOne(cert.id, otherActor, 'req-1'))
      .rejects.toMatchObject({ response: { code: 'CERTIFICATE_FORBIDDEN' } });
  });

  it('allows owner to view their own certificate', async () => {
    const ownerId = uuid();
    const cert = makeCertificate({ testTakerUserId: ownerId });
    const certificates = makeRepo([cert]);
    const ds = makeDataSource(makeManager());
    const service = new CertificateService(
      ds,
      new ConfigService({ CERTIFICATE_VERIFICATION_SECRET: verificationSecret, PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI', NODE_ENV: 'test' }),
      makeEncryption(), makeStorage(), makeRenderer(),
      makeSources(cert.examId, cert.applicationId, ownerId),
      makeRepo([makeTemplate()]),
      certificates,
      makeRepo(),
    );
    const ownerActor = mfaActor({ sub: ownerId, assurance: 'LOCAL' });
    const result = await service.getOne(cert.id, ownerActor, 'req-2');
    expect(result.id).toBe(cert.id);
  });

  it('blocks non-privileged assurance from generating certificates', async () => {
    const service = buildService();
    const localActor = mfaActor({ assurance: 'LOCAL' });
    await expect(service.generate(uuid(), localActor, 'req-3', 'idem-cert-1'))
      .rejects.toMatchObject({ response: { code: 'PRIVILEGED_ASSURANCE_REQUIRED' } });
  });
});

// ─── validity date calculation tests ─────────────────────────────────────────

describe('CertificateService — Validity date calculation (BRD §2.7)', () => {
  it('sets validUntil = issuedAt + validityMonths from the template', async () => {
    const examId = uuid();
    const appId = uuid();
    const userId = uuid();
    const template = makeTemplate(); // validityMonths = 24
    let savedCert: CertificateEntity | undefined;
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(null), // no existing idempotency
      findOneBy: jest.fn().mockResolvedValue(null), // no existing cert for this version
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        const record = data as Record<string, unknown>;
        if (record?.validUntil) savedCert = record as unknown as CertificateEntity;
        return { ...record, id: uuid() };
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
      countBy: jest.fn().mockResolvedValue(0),
    });
    const ds = makeDataSource(manager);
    const service = new CertificateService(
      ds,
      new ConfigService({ CERTIFICATE_VERIFICATION_SECRET: verificationSecret, PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI', NODE_ENV: 'test' }),
      makeEncryption(), makeStorage(), makeRenderer(),
      makeSources(examId, appId, userId),
      makeRepo([template]),
      makeRepo<CertificateEntity>(),
      makeRepo<CertificateFileEntity>(),
    );
    const before = new Date();
    await service.generate(examId, mfaActor(), 'req-4', 'idem-cert-gen-1');
    const after = new Date();

    expect(savedCert).toBeDefined();
    const issuedAt = savedCert!.issuedAt;
    const validUntil = savedCert!.validUntil;
    expect(issuedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(issuedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    // validUntil should be ~24 months after issuedAt
    const expectedValidUntilMs = new Date(issuedAt);
    expectedValidUntilMs.setUTCMonth(expectedValidUntilMs.getUTCMonth() + template.validityMonths);
    expect(Math.abs(validUntil.getTime() - expectedValidUntilMs.getTime())).toBeLessThan(5000);
  });
});

// ─── multiple attempts / no overwrite tests ───────────────────────────────────

describe('CertificateService — Multiple exam attempts (BRD §2.7)', () => {
  it('issues a new certificate record per attempt without overwriting previous ones', async () => {
    const examId = uuid();
    const appId = uuid();
    const userId = uuid();
    const issuedCerts: CertificateEntity[] = [];
    const manager = makeManager({
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null), // no prior cert for this score version
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => {
        const record = { ...(data as Record<string, unknown>), id: uuid() };
        if ((record as CertificateEntity)?.certificateNumber) issuedCerts.push(record as unknown as CertificateEntity);
        return record;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const ds = makeDataSource(manager);
    // the version counter reads the injected repository, not the transaction manager
    const certificates = makeRepo<CertificateEntity>();
    (certificates.countBy as jest.Mock).mockResolvedValue(1); // one prior attempt already certified
    const service = new CertificateService(
      ds,
      new ConfigService({ CERTIFICATE_VERIFICATION_SECRET: verificationSecret, PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI', NODE_ENV: 'test' }),
      makeEncryption(), makeStorage(), makeRenderer(),
      makeSources(examId, appId, userId),
      makeRepo([makeTemplate()]),
      certificates,
      makeRepo<CertificateFileEntity>(),
    );
    await service.generate(examId, mfaActor(), 'req-5', 'idem-cert-attempt-2');
    // New certificate must have versionNumber = 2 (prior count was 1)
    expect(issuedCerts.some((c) => (c as unknown as Record<string, unknown>).versionNumber === 2)).toBe(true);
  });
});

// ─── supersession tests ───────────────────────────────────────────────────────

describe('CertificateService — Supersession on score revision (BRD §2.7)', () => {
  it('marks stale active certificates Superseded when a score revision increments the version', async () => {
    const scoreSheetId = uuid();
    const staleCert = makeCertificate({ scoreSheetId, scoreVersionNumber: 1, status: CertificateStatus.Active });
    const superseded: CertificateEntity[] = [];
    const manager = makeManager({
      find: jest.fn().mockResolvedValue([staleCert]),
      save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => {
        const row = (data ?? entityOrData) as CertificateEntity;
        if (row?.status === CertificateStatus.Superseded) superseded.push(row);
        return row;
      }),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
    });
    const service = buildService({ manager });
    const result = await service.supersedeForScoreRevision(scoreSheetId, 2, mfaActor(), 'req-6');
    expect(result.supersededCount).toBe(1);
    expect(superseded[0].id).toBe(staleCert.id);
  });

  it('does not supersede certificates that are already at the current version', async () => {
    const scoreSheetId = uuid();
    const currentCert = makeCertificate({ scoreSheetId, scoreVersionNumber: 2, status: CertificateStatus.Active });
    const superseded: CertificateEntity[] = [];
    const manager = makeManager({
      find: jest.fn().mockResolvedValue([currentCert]),
      save: jest.fn().mockImplementation(async (entityOrData: unknown, data?: unknown) => {
        const row = (data ?? entityOrData) as CertificateEntity;
        if (row?.status === CertificateStatus.Superseded) superseded.push(row);
        return row;
      }),
    });
    const service = buildService({ manager });
    const result = await service.supersedeForScoreRevision(scoreSheetId, 2, mfaActor(), 'req-7');
    expect(result.supersededCount).toBe(0);
  });
});

// ─── self-service download tests ──────────────────────────────────────────────

describe('CertificateService — Self-service download (downloadLatestOwn)', () => {
  it('renders the caller\'s most recent active certificate and names the file after the holder', async () => {
    const ownerId = uuid();
    const cert = makeCertificate({ testTakerUserId: ownerId, holderName: 'Karma Wangchuk' });
    const findMock = jest.fn().mockResolvedValue([cert]);
    const renderMock = jest.fn().mockResolvedValue(Buffer.from('%PDF-certificate-content'));
    const certificates = { ...makeRepo<CertificateEntity>(), find: findMock } as unknown as Repository<CertificateEntity>;
    const renderer = { render: renderMock } as unknown as CertificateRendererService;
    const service = new CertificateService(
      makeDataSource(makeManager()),
      new ConfigService({
        CERTIFICATE_VERIFICATION_SECRET: verificationSecret,
        PRIVILEGED_ASSURANCE_LEVELS: 'MFA,NDI',
        PUBLIC_API_BASE_URL: 'http://localhost:8000/api/v1',
        NODE_ENV: 'test',
      }),
      makeEncryption(), makeStorage(), renderer,
      makeSources(cert.examId, cert.applicationId, ownerId),
      makeRepo([makeTemplate()]),
      certificates,
      makeRepo(),
    );

    const result = await service.downloadLatestOwn(mfaActor({ sub: ownerId, assurance: 'LOCAL', permissions: [] }), 'req-dl-1');

    expect(result.filename).toBe('Karma_Wangchuk_Certificate.pdf');
    expect(result.buffer.toString()).toContain('%PDF');
    // Scoped strictly to the caller and to active rows.
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { testTakerUserId: ownerId, status: CertificateStatus.Active } }),
    );
    // Renderer gets the real holder name and a signed verification URL for the QR.
    const renderArgs = (renderMock.mock.calls[0] as unknown[])[1] as { holderName: string; verificationUrl: string };
    expect(renderArgs.holderName).toBe('Karma Wangchuk');
    expect(renderArgs.verificationUrl).toMatch(/\/public\/certificates\/verify\/[0-9a-f-]{36}\.[\w-]+$/i);
  });

  it('returns CERTIFICATE_NOT_FOUND when the caller has no active certificate', async () => {
    const service = buildService({ certificates: makeRepo<CertificateEntity>([]) });
    await expect(service.downloadLatestOwn(mfaActor({ assurance: 'LOCAL' }), 'req-dl-2'))
      .rejects.toMatchObject({ response: { code: 'CERTIFICATE_NOT_FOUND' } });
  });

  it('rejects a certificate that has passed its validity date', async () => {
    const ownerId = uuid();
    const expired = makeCertificate({
      testTakerUserId: ownerId,
      status: CertificateStatus.Active,
      validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const service = buildService({ certificates: makeRepo([expired]) });
    await expect(service.downloadLatestOwn(mfaActor({ sub: ownerId, assurance: 'LOCAL' }), 'req-dl-3'))
      .rejects.toMatchObject({ response: { code: 'CERTIFICATE_NOT_ACTIVE' } });
  });
});

// ─── template creation: asset column extraction ────────────────────────────────
// `createTemplate`'s per-asset `data`/`mimeType` fallback logic was extracted into
// `assetColumns()` to bring the transaction's cyclomatic complexity from 22 under
// the project's limit. These pin the two cases that logic actually branches on: an
// asset provided, and one omitted - for every one of the five asset slots.

describe('CertificateService.createTemplate - asset columns', () => {
  const baseDto = () => ({
    code: 'DSTS-V2',
    versionNumber: 2,
    title: 'Dzongkha Standard Testing System Certificate',
    declarationText: 'This is to certify that the holder has attained the level below.',
    signatoryName: 'Signatory Name',
    signatoryTitle: 'Registrar',
    chiefExecutiveName: 'Chief Executive Name',
    chiefExecutiveTitle: 'Chief Executive Officer',
    paperSize: CertificatePaperSize.A4,
    orientation: CertificateOrientation.Landscape,
    validityMonths: 24,
    effectiveFrom: new Date('2026-01-01').toISOString(),
  });

  const asset = (byte: number) => ({ dataBase64: Buffer.from([byte, byte, byte]).toString('base64'), mimeType: 'image/png' as const });

  it('decodes a provided asset into its Data/MimeType columns and leaves an omitted one null', async () => {
    let saved: Record<string, unknown> | null = null;
    const manager = makeManager({
      save: jest.fn().mockImplementation(async (entity: unknown, data: unknown) => {
        // `audit()` also calls `manager.save`, after the template itself; only the
        // template save is the one this test cares about.
        if (entity === CertificateTemplateEntity) saved = data as Record<string, unknown>;
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
    });
    const service = buildService({ manager });

    await service.createTemplate({ ...baseDto(), leftLogo: asset(9) }, mfaActor({ roles: ['identity_admin'], permissions: ['*'] }), 'req-tpl-1');

    expect(saved).not.toBeNull();
    const row = saved as unknown as Record<string, unknown>;
    // Provided asset: both columns populated from the decoded bytes/mimeType.
    expect((row.leftLogoData as Buffer).equals(Buffer.from([9, 9, 9]))).toBe(true);
    expect(row.leftLogoMimeType).toBe('image/png');
    // Every other asset was omitted: both of its columns are null, not undefined.
    for (const prefix of ['rightLogo', 'borderImage', 'signatureImage', 'sealImage']) {
      expect(row[`${prefix}Data`]).toBeNull();
      expect(row[`${prefix}MimeType`]).toBeNull();
    }
  });

  it('decodes all five assets independently when every one is provided', async () => {
    let saved: Record<string, unknown> | null = null;
    const manager = makeManager({
      save: jest.fn().mockImplementation(async (entity: unknown, data: unknown) => {
        if (entity === CertificateTemplateEntity) saved = data as Record<string, unknown>;
        return { ...(data as Record<string, unknown>), id: uuid() };
      }),
    });
    const service = buildService({ manager });

    await service.createTemplate({
      ...baseDto(),
      leftLogo: asset(1), rightLogo: asset(2), borderImage: asset(3), signatureImage: asset(4), sealImage: asset(5),
    }, mfaActor({ roles: ['identity_admin'], permissions: ['*'] }), 'req-tpl-2');

    const row = saved as unknown as Record<string, unknown>;
    expect((row.leftLogoData as Buffer).equals(Buffer.from([1, 1, 1]))).toBe(true);
    expect((row.rightLogoData as Buffer).equals(Buffer.from([2, 2, 2]))).toBe(true);
    expect((row.borderImageData as Buffer).equals(Buffer.from([3, 3, 3]))).toBe(true);
    expect((row.signatureImageData as Buffer).equals(Buffer.from([4, 4, 4]))).toBe(true);
    expect((row.sealImageData as Buffer).equals(Buffer.from([5, 5, 5]))).toBe(true);
  });

  it('still rejects an oversized asset before any column is built', async () => {
    const service = buildService();
    const oversized = { dataBase64: Buffer.alloc(3 * 1024 * 1024).toString('base64'), mimeType: 'image/png' as const };
    await expect(
      service.createTemplate({ ...baseDto(), leftLogo: oversized }, mfaActor({ roles: ['identity_admin'], permissions: ['*'] }), 'req-tpl-3'),
    ).rejects.toMatchObject({ response: { code: 'CERTIFICATE_TEMPLATE_ASSET_INVALID' } });
  });
});
