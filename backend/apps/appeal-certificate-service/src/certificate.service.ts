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
import { CreateCertificateTemplateDto } from './dtos';
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

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
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
  }

  listTemplates() { return this.templates.find({ order: { code: 'ASC', versionNumber: 'DESC' } }); }

  async createTemplate(dto: CreateCertificateTemplateDto, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    if (dto.testOnly && this.production) throw new DomainException('TEST_TEMPLATE_FORBIDDEN', 'Test-only certificate templates cannot be created in production.', 403);
    const from = new Date(dto.effectiveFrom);
    const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (to && to <= from) throw new DomainException('CERTIFICATE_TEMPLATE_PERIOD_INVALID', 'Template effectiveTo must be after effectiveFrom.');
    return this.dataSource.transaction(async (manager) => {
      const template = await manager.save(CertificateTemplateEntity, manager.create(CertificateTemplateEntity, {
        ...dto, effectiveFrom: from, effectiveTo: to, testOnly: dto.testOnly ?? false,
        status: CertificateTemplateStatus.Draft, createdByUserId: actor.sub,
      }));
      await this.audit(manager, 'CERTIFICATE_TEMPLATE_CREATED', template.id, actor.sub, requestId, { code: template.code, versionNumber: template.versionNumber, testOnly: template.testOnly }, 'CertificateTemplate');
      return template;
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
      return template;
    });
  }

  async generate(examId: string, actor: AccessClaims, requestId: string, idempotencyKey: string) {
    this.assertPrivileged(actor);
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    const scope = `certificate.generate:${examId}`;
    const replay = await this.dataSource.getRepository(AppealIdempotencyEntity).findOneBy({ scope, key: idempotencyKey });
    if (replay) return replay.response;
    const template = await this.activeTemplate();
    const results = await this.sources.results(examId);
    const issued: Array<Record<string, unknown>> = [];
    for (const result of results) issued.push(await this.issueOne(result, template, actor, requestId));
    const response = { examId, templateId: template.id, issuedCount: issued.filter((item) => !item.alreadyIssued).length, certificates: issued };
    await this.dataSource.getRepository(AppealIdempotencyEntity).save({ scope, key: idempotencyKey, response });
    return response;
  }

  async listMine(userId: string) {
    const rows = await this.certificates.find({ where: { testTakerUserId: userId }, order: { issuedAt: 'DESC' } });
    return rows.map((row) => this.ownerView(this.refreshExpiry(row)));
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
      await this.outbox(manager, DomainEventTypes.CertificateRevoked, id, requestId, { certificateId: id, testTakerUserId: certificate.testTakerUserId, certificateNumber: certificate.certificateNumber });
      return this.ownerView(certificate);
    });
  }

  private async issueOne(result: CertificateResultSource, template: CertificateTemplateEntity, actor: AccessClaims, requestId: string) {
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
    const pdf = await this.renderer.render(template, {
      certificateNumber, holderName: profile.fullName, registrationNumber: profile.registrationNumber,
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
        registrationNumber: profile.registrationNumber, scoreSnapshot: { scores: result.scores, overallScore: result.overallScore },
        bandLabel: result.bandLabel, cefrLevel: result.cefrLevel, verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        fileId, status: CertificateStatus.Active, issuedAt, validUntil,
      }));
      await this.audit(manager, 'CERTIFICATE_ISSUED', id, actor.sub, requestId, { examId: result.examId, applicationId: result.applicationId, templateVersionNumber: template.versionNumber });
      await this.outbox(manager, DomainEventTypes.CertificateIssued, id, requestId, { certificateId: id, testTakerUserId: result.testTakerUserId, certificateNumber, issuedAt });
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
  private assertPrivileged(actor: AccessClaims) { if (!['MFA', 'NDI'].includes(actor.assurance)) throw new DomainException('PRIVILEGED_ASSURANCE_REQUIRED', 'Certificate administration requires approved MFA or NDI assurance.', 403); }
  private periodsOverlap(a: CertificateTemplateEntity, b: CertificateTemplateEntity) { return a.effectiveFrom < (b.effectiveTo ?? new Date(8640000000000000)) && b.effectiveFrom < (a.effectiveTo ?? new Date(8640000000000000)); }
  private access(certificateId: string, accessType: CertificateAccessType, actorUserId: string | null, requestId: string) { return this.dataSource.getRepository(CertificateAccessEventEntity).save({ certificateId, accessType, actorUserId, requestId, safeData: {} }); }
  private audit(manager: EntityManager, action: string, resourceId: string, actorUserId: string | null, requestId: string, safeData: Record<string, unknown>, resourceType = 'Certificate') { return manager.save(AppealAuditEntity, manager.create(AppealAuditEntity, { action, resourceType, resourceId, actorUserId, requestId, safeData })); }
  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) { return manager.save(AppealOutboxEntity, manager.create(AppealOutboxEntity, { eventType, aggregateId, correlationId, payload })); }
}
