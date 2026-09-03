/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccessClaims, CertificateStatus, DomainEventTypes } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { CertificateTemplateAssetDto, CreateCertificateTemplateDto } from './dtos';
import {
  AppealAuditEntity, AppealIdempotencyEntity, AppealOutboxEntity, CertificateAccessEventEntity, CertificateAccessType,
  CertificateEntity, CertificateFileEntity, CertificateTemplateEntity, CertificateTemplateStatus,
} from './entities';
import { CertificateEncryptionService } from './certificate-encryption.service';
import { CertificateStorageService } from './certificate-storage.service';
import { CertificateRendererService } from './certificate-renderer.service';
import { CertificateResultSource, CertificateSourceClientService } from './certificate-source-client.service';

@Injectable()
export class CertificateService {
  private readonly verificationSecret: string;
  private readonly publicApiBaseUrl: string;
  private readonly production: boolean;
  private readonly privilegedAssurance: Set<string>;

  constructor(
    private readonly dataSource: DataSource,
    // Read into the fields below; not retained as an instance field itself.
    config: ConfigService,
    private readonly encryption: CertificateEncryptionService,
    private readonly storage: CertificateStorageService,
    private readonly renderer: CertificateRendererService,
    private readonly sources: CertificateSourceClientService,
    @InjectRepository(CertificateTemplateEntity) private readonly templates: Repository<CertificateTemplateEntity>,
    @InjectRepository(CertificateEntity) private readonly certificates: Repository<CertificateEntity>,
    @InjectRepository(CertificateFileEntity) private readonly files: Repository<CertificateFileEntity>,
  ) {
    this.verificationSecret = config.get<string>('CERTIFICATE_VERIFICATION_SECRET', '');
    this.publicApiBaseUrl = config.get<string>('PUBLIC_API_BASE_URL', 'http://localhost:8000/api/v1').replace(/\/$/, '');
    this.production = config.get<string>('NODE_ENV') === 'production';
    this.privilegedAssurance = new Set(config.get<string>('PRIVILEGED_ASSURANCE_LEVELS', 'MFA,NDI').split(',').map(value => value.trim()));
  }

  // Templates carry small logo/border/signature/seal images (§5.1/§5.7.2) but this is
  // not general-purpose file storage - a decoded ~2MB cap keeps a template row a
  // reasonable size for a document that is versioned indefinitely.
  private static readonly MAX_ASSET_BYTES = 2 * 1024 * 1024;

  private decodeAsset(asset: CertificateTemplateAssetDto | undefined, field: string) {
    if (!asset) return null;
    const data = Buffer.from(asset.dataBase64, 'base64');
    if (data.length === 0 || data.length > CertificateService.MAX_ASSET_BYTES) {
      throw new DomainException('CERTIFICATE_TEMPLATE_ASSET_INVALID', `${field} must be a non-empty image under 2MB.`, 400);
    }
    return { data, mimeType: asset.mimeType };
  }

  // Templates are a low-traffic admin config surface, not a file-download endpoint -
  // asset bytes are returned as data URIs the frontend can drop straight into an
  // <img src>, rather than a raw byte array or a separate download route.
  private serializeTemplate(template: CertificateTemplateEntity) {
    const asDataUri = (data: Buffer | null, mimeType: string | null) => (data && mimeType ? `data:${mimeType};base64,${data.toString('base64')}` : null);
    const { leftLogoData, leftLogoMimeType, rightLogoData, rightLogoMimeType, borderImageData, borderImageMimeType, signatureImageData, signatureImageMimeType, sealImageData, sealImageMimeType, ...fields } = template;
    return {
      ...fields,
      leftLogo: asDataUri(leftLogoData, leftLogoMimeType),
      rightLogo: asDataUri(rightLogoData, rightLogoMimeType),
      borderImage: asDataUri(borderImageData, borderImageMimeType),
      signatureImage: asDataUri(signatureImageData, signatureImageMimeType),
      sealImage: asDataUri(sealImageData, sealImageMimeType),
    };
  }

  async listTemplates() {
    const templates = await this.templates.find({ order: { code: 'ASC', versionNumber: 'DESC' } });
    return templates.map((template) => this.serializeTemplate(template));
  }

  async createTemplate(dto: CreateCertificateTemplateDto, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    if (dto.testOnly && this.production) throw new DomainException('TEST_TEMPLATE_FORBIDDEN', 'Test-only certificate templates cannot be created in production.', 403);
    const from = new Date(dto.effectiveFrom);
    const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (to && to <= from) throw new DomainException('CERTIFICATE_TEMPLATE_PERIOD_INVALID', 'Template effectiveTo must be after effectiveFrom.');
    const { leftLogo, rightLogo, borderImage, signatureImage, sealImage, ...fields } = dto;
    const leftLogoAsset = this.decodeAsset(leftLogo, 'leftLogo');
    const rightLogoAsset = this.decodeAsset(rightLogo, 'rightLogo');
    const borderImageAsset = this.decodeAsset(borderImage, 'borderImage');
    const signatureImageAsset = this.decodeAsset(signatureImage, 'signatureImage');
    const sealImageAsset = this.decodeAsset(sealImage, 'sealImage');
    return this.dataSource.transaction(async (manager) => {
      const template = await manager.save(CertificateTemplateEntity, manager.create(CertificateTemplateEntity, {
        ...fields, effectiveFrom: from, effectiveTo: to, testOnly: dto.testOnly ?? false,
        status: CertificateTemplateStatus.Draft, createdByUserId: actor.sub,
        leftLogoData: leftLogoAsset?.data ?? null, leftLogoMimeType: leftLogoAsset?.mimeType ?? null,
        rightLogoData: rightLogoAsset?.data ?? null, rightLogoMimeType: rightLogoAsset?.mimeType ?? null,
        borderImageData: borderImageAsset?.data ?? null, borderImageMimeType: borderImageAsset?.mimeType ?? null,
        signatureImageData: signatureImageAsset?.data ?? null, signatureImageMimeType: signatureImageAsset?.mimeType ?? null,
        sealImageData: sealImageAsset?.data ?? null, sealImageMimeType: sealImageAsset?.mimeType ?? null,
      }));
      await this.audit(manager, 'CERTIFICATE_TEMPLATE_CREATED', template.id, actor.sub, requestId, { code: template.code, versionNumber: template.versionNumber, testOnly: template.testOnly }, 'CertificateTemplate');
      return this.serializeTemplate(template);
    });
  }

  async approveTemplate(id: string, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const template = await manager.findOne(CertificateTemplateEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!template) throw new DomainException('CERTIFICATE_TEMPLATE_NOT_FOUND', 'Certificate template not found.', 404);
      if (template.status !== CertificateTemplateStatus.Draft) throw new DomainException('CERTIFICATE_TEMPLATE_NOT_DRAFT', 'Only draft templates may be approved.', 409);
      const approved = await manager.findBy(CertificateTemplateEntity, { code: template.code, status: CertificateTemplateStatus.Approved });
      if (approved.some((other) => this.periodsOverlap(template, other))) throw new DomainException('CERTIFICATE_TEMPLATE_PERIOD_OVERLAP', 'An approved template already covers this effective period.', 409);
      template.status = CertificateTemplateStatus.Approved;
      template.approvedByUserId = actor.sub;
      template.approvedAt = new Date();
      await manager.save(template);
      await this.audit(manager, 'CERTIFICATE_TEMPLATE_APPROVED', template.id, actor.sub, requestId, { code: template.code, versionNumber: template.versionNumber, testOnly: template.testOnly }, 'CertificateTemplate');
      return this.serializeTemplate(template);
    });
  }

  async generate(examId: string, actor: AccessClaims, requestId: string, idempotencyKey: string) {
    this.assertPrivileged(actor);
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    const scope = `certificate.generate:${examId}`;
    const replay = await this.dataSource.getRepository(AppealIdempotencyEntity).findOneBy({ scope, key: idempotencyKey });
    if (replay) return replay.response;
    const template = await this.activeTemplate();
    const exam = await this.sources.exam(examId);
    const results = await this.sources.results(examId);
    const issued: Array<Record<string, unknown>> = [];
    for (const result of results) issued.push(await this.issueOne(result, template, new Date(exam.examDate), actor, requestId));
    const response = { examId, templateId: template.id, issuedCount: issued.filter((item) => !item.alreadyIssued).length, certificates: issued };
    await this.dataSource.getRepository(AppealIdempotencyEntity).save({ scope, key: idempotencyKey, response });
    return response;
  }

  async listMine(userId: string) {
    const rows = await this.certificates.find({ where: { testTakerUserId: userId }, order: { issuedAt: 'DESC' } });
    return rows.map((row) => this.ownerView(this.refreshExpiry(row)));
  }

  async listAll() {
    const rows = await this.certificates.find({ order: { issuedAt: 'DESC' }, take: 500 });
    return rows.map(row => this.ownerView(this.refreshExpiry(row)));
  }

  async getOne(id: string, actor: AccessClaims, requestId: string) {
    const certificate = await this.getAuthorized(id, actor);
    await this.access(certificate.id, CertificateAccessType.View, actor.sub, requestId);
    return this.ownerView(this.refreshExpiry(certificate));
  }

  async history(id: string, actor: AccessClaims) {
    const certificate = await this.getAuthorized(id, actor);
    const rows = await this.certificates.find({ where: { applicationId: certificate.applicationId }, order: { versionNumber: 'DESC' } });
    return rows.map((row) => this.ownerView(this.refreshExpiry(row)));
  }

  async download(id: string, actor: AccessClaims, requestId: string) {
    const certificate = this.refreshExpiry(await this.getAuthorized(id, actor));
    if (certificate.status !== CertificateStatus.Active) throw new DomainException('CERTIFICATE_NOT_ACTIVE', 'Only active certificates may be downloaded.', 409);
    const file = await this.files.findOneBy({ id: certificate.fileId });
    if (!file) throw new DomainException('CERTIFICATE_FILE_NOT_FOUND', 'Certificate file metadata is unavailable.', 503);
    const ciphertext = await this.storage.get(file.objectKey);
    const buffer = this.encryption.decrypt(ciphertext, file);
    if (createHash('sha256').update(buffer).digest('hex') !== file.sha256) throw new DomainException('CERTIFICATE_INTEGRITY_FAILED', 'Certificate integrity verification failed.', 503);
    await this.access(certificate.id, CertificateAccessType.Download, actor.sub, requestId);
    return { buffer, filename: `${certificate.certificateNumber}.pdf` };
  }

  // Self-service variant used by the "Download my certificate" button: the caller
  // has no certificate id, so we resolve their most recently issued one. Unlike
  // download(id) this re-renders the PDF on the fly from the stored result
  // snapshot + its template (rather than decrypting the archived file), so the
  // holder always gets a copy that reflects the current name spelling and a live
  // verification QR. Only the caller's own rows are ever considered.
  async downloadLatestOwn(actor: AccessClaims, requestId: string) {
    const [certificate] = await this.certificates.find({
      where: { testTakerUserId: actor.sub, status: CertificateStatus.Active },
      order: { issuedAt: 'DESC' },
      take: 1,
    });
    if (!certificate) throw new DomainException('CERTIFICATE_NOT_FOUND', 'You do not have an active certificate to download.', 404);
    const refreshed = this.refreshExpiry(certificate);
    if (refreshed.status !== CertificateStatus.Active) throw new DomainException('CERTIFICATE_NOT_ACTIVE', 'Your certificate has expired and can no longer be downloaded.', 409);
    const buffer = await this.renderOwnerCopy(refreshed);
    await this.access(refreshed.id, CertificateAccessType.Download, actor.sub, requestId);
    const safeName = (refreshed.holderName || 'DSTS').normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'DSTS';
    return { buffer, filename: `${safeName}_Certificate.pdf` };
  }

  // Rebuilds the renderer's input DTO from a persisted certificate row and its
  // template, then draws the name + verification QR over the approved artwork.
  // The verification URL uses the same HMAC-signed token as issuance, so the
  // regenerated QR resolves through /public/certificates/verify/:token unchanged.
  private async renderOwnerCopy(certificate: CertificateEntity) {
    const template = await this.templates.findOneBy({ id: certificate.templateId });
    if (!template) throw new DomainException('CERTIFICATE_TEMPLATE_NOT_FOUND', 'The certificate template is unavailable.', 503);
    const snapshot = (certificate.scoreSnapshot ?? {}) as { scores?: Record<string, number>; overallScore?: string | number };
    const token = this.tokenFor(certificate.id);
    return this.renderer.render(template, {
      certificateNumber: certificate.certificateNumber,
      holderName: certificate.holderName,
      registrationNumber: certificate.registrationNumber,
      cid: certificate.cid ?? '',
      dateOfBirth: certificate.dateOfBirth ?? new Date(0),
      examDate: certificate.examDate ?? certificate.issuedAt,
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil,
      scores: snapshot.scores ?? {},
      overallScore: String(snapshot.overallScore ?? ''),
      bandLabel: certificate.bandLabel,
      cefrLevel: certificate.cefrLevel,
      verificationUrl: `${this.publicApiBaseUrl}/public/certificates/verify/${token}`,
    });
  }

  async verify(token: string, requestId: string) {
    const certificate = await this.certificateForToken(token);
    const refreshed = this.refreshExpiry(certificate);
    await this.access(certificate.id, CertificateAccessType.Verify, null, requestId);
    return {
      valid: refreshed.status === CertificateStatus.Active, certificateNumber: refreshed.certificateNumber,
      status: refreshed.status, issuedAt: refreshed.issuedAt, validUntil: refreshed.validUntil,
      templateVersionNumber: refreshed.templateVersionNumber,
    };
  }

  async revoke(id: string, reason: string, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    return this.dataSource.transaction(async (manager) => {
      const certificate = await manager.findOne(CertificateEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!certificate) throw new DomainException('CERTIFICATE_NOT_FOUND', 'Certificate not found.', 404);
      if (certificate.status !== CertificateStatus.Active) throw new DomainException('CERTIFICATE_NOT_ACTIVE', 'Only active certificates may be revoked.', 409);
      certificate.status = CertificateStatus.Revoked;
      certificate.revokedAt = new Date(); certificate.revocationReason = reason; certificate.revokedByUserId = actor.sub;
      await manager.save(certificate);
      await this.audit(manager, 'CERTIFICATE_REVOKED', id, actor.sub, requestId, { reason });
      await this.outbox(manager, DomainEventTypes.CertificateRevoked, id, requestId, {
        certificateId: id, examId: certificate.examId, testTakerUserId: certificate.testTakerUserId,
        certificateNumber: certificate.certificateNumber, version: certificate.versionNumber, actorId: actor.sub,
      });
      return this.ownerView(certificate);
    });
  }

  async supersedeForScoreRevision(scoreSheetId: string, currentScoreVersion: number, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    return this.dataSource.transaction(async (manager) => {
      const active = await manager.find(CertificateEntity, {
        where: { scoreSheetId, status: CertificateStatus.Active },
        lock: { mode: 'pessimistic_write' },
      });
      const stale = active.filter((certificate) => certificate.scoreVersionNumber < currentScoreVersion);
      for (const certificate of stale) {
        certificate.status = CertificateStatus.Superseded;
        await manager.save(certificate);
        await this.audit(manager, 'CERTIFICATE_SUPERSEDED', certificate.id, actor.sub, requestId, {
          scoreSheetId, previousScoreVersion: certificate.scoreVersionNumber, currentScoreVersion,
        });
      }
      return { supersededCount: stale.length, certificateIds: stale.map((certificate) => certificate.id) };
    });
  }

  private async issueOne(result: CertificateResultSource, template: CertificateTemplateEntity, examDate: Date, actor: AccessClaims, requestId: string) {
    const existing = await this.certificates.findOneBy({ scoreSheetId: result.scoreSheetId, scoreVersionNumber: result.scoreVersionNumber });
    if (existing) return { ...this.ownerView(existing), alreadyIssued: true };
    const profile = await this.sources.profile(result.applicationId);
    if (profile.examId !== result.examId || profile.testTakerUserId !== result.testTakerUserId) throw new DomainException('CERTIFICATE_SOURCE_MISMATCH', 'Result and registration ownership do not match.', 409);
    this.assertVerificationSecret();
    const id = randomUUID();
    const token = this.tokenFor(id);
    const issuedAt = new Date();
    const validUntil = new Date(issuedAt);
    validUntil.setUTCMonth(validUntil.getUTCMonth() + template.validityMonths);
    const priorCount = await this.certificates.countBy({ applicationId: result.applicationId });
    const certificateNumber = `DSTS-${issuedAt.getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`;
    const dateOfBirth = new Date(profile.dateOfBirth);
    const pdf = await this.renderer.render(template, {
      certificateNumber, holderName: profile.fullName, registrationNumber: profile.registrationNumber,
      cid: profile.cid, dateOfBirth, examDate,
      issuedAt, validUntil, scores: result.scores, overallScore: result.overallScore,
      bandLabel: result.bandLabel, cefrLevel: result.cefrLevel,
      verificationUrl: `${this.publicApiBaseUrl}/public/certificates/verify/${token}`,
    });
    const encrypted = this.encryption.encrypt(pdf);
    const fileId = randomUUID();
    const objectKey = `certificates/${result.examId}/${id}.pdf.enc`;
    await this.storage.put(objectKey, encrypted.ciphertext);
    const certificate = await this.dataSource.transaction(async (manager) => {
      await manager.save(CertificateFileEntity, manager.create(CertificateFileEntity, {
        id: fileId, objectKey, sha256: createHash('sha256').update(pdf).digest('hex'), byteSize: String(pdf.length), ...encrypted,
      }));
      const saved = await manager.save(CertificateEntity, manager.create(CertificateEntity, {
        id, certificateNumber, examId: result.examId, applicationId: result.applicationId, testTakerUserId: result.testTakerUserId,
        scoreSheetId: result.scoreSheetId, scoreVersionNumber: result.scoreVersionNumber, versionNumber: priorCount + 1,
        templateId: template.id, templateVersionNumber: template.versionNumber, holderName: profile.fullName,
        registrationNumber: profile.registrationNumber, cid: profile.cid, dateOfBirth, examDate,
        scoreSnapshot: { scores: result.scores, overallScore: result.overallScore },
        bandLabel: result.bandLabel, cefrLevel: result.cefrLevel, verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        fileId, status: CertificateStatus.Active, issuedAt, validUntil,
      }));
      const stale = await manager.find(CertificateEntity, {
        where: { scoreSheetId: result.scoreSheetId, status: CertificateStatus.Active },
        lock: { mode: 'pessimistic_write' },
      });
      for (const previous of stale.filter((item) => item.id !== saved.id && item.scoreVersionNumber < result.scoreVersionNumber)) {
        previous.status = CertificateStatus.Superseded;
        await manager.save(previous);
        await this.audit(manager, 'CERTIFICATE_SUPERSEDED', previous.id, actor.sub, requestId, {
          scoreSheetId: result.scoreSheetId, previousScoreVersion: previous.scoreVersionNumber,
          currentScoreVersion: result.scoreVersionNumber,
        });
      }
      await this.audit(manager, 'CERTIFICATE_ISSUED', id, actor.sub, requestId, { examId: result.examId, applicationId: result.applicationId, templateVersionNumber: template.versionNumber });
      await this.outbox(manager, DomainEventTypes.CertificateIssued, id, requestId, {
        certificateId: id, examId: result.examId, applicationId: result.applicationId, testTakerUserId: result.testTakerUserId,
        certificateNumber, issuedAt, validUntil, version: saved.versionNumber, actorId: actor.sub,
      });
      return saved;
    });
    return this.ownerView(certificate);
  }

  private async activeTemplate() {
    const now = new Date();
    const templates = await this.templates.findBy({ status: CertificateTemplateStatus.Approved });
    const active = templates.filter((item) => item.effectiveFrom <= now && (!item.effectiveTo || item.effectiveTo > now));
    if (active.length !== 1) throw new DomainException('CERTIFICATE_TEMPLATE_UNAVAILABLE', 'Exactly one approved certificate template must be effective.', 409);
    return active[0];
  }

  private async getAuthorized(id: string, actor: AccessClaims) {
    const certificate = await this.certificates.findOneBy({ id });
    if (!certificate) throw new DomainException('CERTIFICATE_NOT_FOUND', 'Certificate not found.', 404);
    if (certificate.testTakerUserId !== actor.sub && !actor.permissions.includes('*') && !actor.permissions.includes('certificate.manage')) {
      throw new DomainException('CERTIFICATE_FORBIDDEN', 'You may only access your own certificate.', 403);
    }
    return certificate;
  }

  private async certificateForToken(token: string) {
    this.assertVerificationSecret();
    const [id, signature, extra] = token.split('.');
    if (!id || !signature || extra || !/^[0-9a-f-]{36}$/i.test(id)) throw new DomainException('CERTIFICATE_TOKEN_INVALID', 'Certificate verification token is invalid.', 404);
    const expected = this.signatureFor(id);
    const a = Buffer.from(expected); const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new DomainException('CERTIFICATE_TOKEN_INVALID', 'Certificate verification token is invalid.', 404);
    const certificate = await this.certificates.findOneBy({ id });
    if (!certificate || createHash('sha256').update(token).digest('hex') !== certificate.verificationTokenHash) throw new DomainException('CERTIFICATE_TOKEN_INVALID', 'Certificate verification token is invalid.', 404);
    return certificate;
  }

  private ownerView(certificate: CertificateEntity) {
    return { ...certificate, verificationTokenHash: undefined, fileId: undefined, verificationToken: this.tokenFor(certificate.id) };
  }

  private refreshExpiry(certificate: CertificateEntity) {
    if (certificate.status === CertificateStatus.Active && certificate.validUntil <= new Date()) certificate.status = CertificateStatus.Expired;
    return certificate;
  }

  private tokenFor(id: string) { this.assertVerificationSecret(); return `${id}.${this.signatureFor(id)}`; }
  private signatureFor(id: string) { return createHmac('sha256', this.verificationSecret).update(id).digest('base64url'); }
  private assertVerificationSecret() { if (this.verificationSecret.length < 32) throw new DomainException('CERTIFICATE_VERIFICATION_UNAVAILABLE', 'Certificate verification is not configured.', 503); }
  private assertPrivileged(actor: AccessClaims) { if (!this.privilegedAssurance.has(actor.assurance)) throw new DomainException('PRIVILEGED_ASSURANCE_REQUIRED', 'Certificate administration requires an approved privileged assurance level.', 403); }
  private periodsOverlap(a: CertificateTemplateEntity, b: CertificateTemplateEntity) { return a.effectiveFrom < (b.effectiveTo ?? new Date(8640000000000000)) && b.effectiveFrom < (a.effectiveTo ?? new Date(8640000000000000)); }
  private access(certificateId: string, accessType: CertificateAccessType, actorUserId: string | null, requestId: string) { return this.dataSource.getRepository(CertificateAccessEventEntity).save({ certificateId, accessType, actorUserId, requestId, safeData: {} }); }
  private audit(manager: EntityManager, action: string, resourceId: string, actorUserId: string | null, requestId: string, safeData: Record<string, unknown>, resourceType = 'Certificate') { return manager.save(AppealAuditEntity, manager.create(AppealAuditEntity, { action, resourceType, resourceId, actorUserId, requestId, safeData })); }
  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) { return manager.save(AppealOutboxEntity, manager.create(AppealOutboxEntity, { eventType, aggregateId, correlationId, payload })); }
}
