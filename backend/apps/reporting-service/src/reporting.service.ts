/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AccessClaims } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { CreateReportJobDto, DashboardConfigDto, ReportFilterOperator, ReportQueryDto, SaveReportDto } from './dtos';
import {
  DashboardConfigEntity, ReportDataset, ReportJobEntity, ReportJobStatus, ReportResourceProjectionEntity,
  ReportResourceType, ReportingAuditEventEntity, SavedReportEntity,
} from './entities';
import { DASHBOARD_METRICS, REPORT_CATALOG } from './report-catalog';

export interface ReportQueryResult {
  dataset: ReportDataset;
  fields: string[];
  rows: Record<string, unknown>[];
  total: number;
  grouped?: Array<{ value: unknown; count: number }>;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(ReportResourceProjectionEntity) private readonly resources: Repository<ReportResourceProjectionEntity>,
    @InjectRepository(SavedReportEntity) private readonly savedReports: Repository<SavedReportEntity>,
    @InjectRepository(ReportJobEntity) private readonly jobs: Repository<ReportJobEntity>,
    @InjectRepository(DashboardConfigEntity) private readonly dashboardConfigs: Repository<DashboardConfigEntity>,
    @InjectRepository(ReportingAuditEventEntity) private readonly auditEvents: Repository<ReportingAuditEventEntity>,
  ) {}

  catalog() {
    return Object.entries(REPORT_CATALOG).map(([dataset, definition]) => ({ dataset, fields: definition.fields, defaultFields: definition.defaultFields }));
  }

  async query(dto: ReportQueryDto): Promise<ReportQueryResult> {
    const definition = REPORT_CATALOG[dto.dataset];
    if (!definition) throw new DomainException('REPORT_DATASET_INVALID', 'The requested report dataset is not available.');
    const fields = dto.fields?.length ? [...new Set(dto.fields)] : definition.defaultFields;
    this.assertFields(fields, definition.fields);
    if (dto.groupBy) this.assertFields([dto.groupBy], definition.fields);
    for (const filter of dto.filters ?? []) this.assertFields([filter.field], definition.fields);

    const projections = await this.resources.find({
      where: { resourceType: definition.resourceType }, order: { occurredAt: 'DESC' }, take: 10000,
    });
    const allRows = projections.map((item) => this.row(item)).filter((row) => this.matches(row, dto));
    const rows = allRows.slice(0, dto.limit ?? 1000).map((row) => Object.fromEntries(fields.map((field) => [field, row[field] ?? null])));
    const grouped = dto.groupBy ? this.group(allRows, dto.groupBy) : undefined;
    return { dataset: dto.dataset, fields, rows, total: allRows.length, grouped };
  }

  async summary() {
    const [applications, scores, appeals, certificates] = await Promise.all([
      this.byType(ReportResourceType.Application), this.byType(ReportResourceType.Score),
      this.byType(ReportResourceType.Appeal), this.byType(ReportResourceType.Certificate),
    ]);
    return {
      totalApplications: applications.length,
      totalScores: scores.length,
      totalCertificates: certificates.length,
      activeAppeals: appeals.filter((item) => !['COMPLETED', 'REJECTED', 'NO_CHANGE'].includes(item.status)).length,
    };
  }

  async registrationReport(examId?: string) {
    const items = (await this.byType(ReportResourceType.Application)).filter((item) => !examId || item.examId === examId);
    return {
      total: items.length,
      submitted: this.count(items, 'SUBMITTED'), underReview: this.count(items, 'UNDER_REVIEW'),
      verified: this.count(items, 'VERIFIED'), returned: this.count(items, 'RETURNED'),
      cancelled: this.count(items, 'CANCELLED'), waitlisted: this.count(items, 'WAITLISTED'), absent: this.count(items, 'ABSENT'),
    };
  }

  async scoreReport(examId?: string) {
    const items = (await this.byType(ReportResourceType.Score)).filter((item) => !examId || item.examId === examId);
    const histogram = (field: string) => {
      const counts = new Map<number, number>();
      for (const item of items) {
        const value = Number(item.dimensions[field]);
        if (Number.isFinite(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()].sort(([left], [right]) => left - right).map(([score, count]) => ({ score, count }));
    };
    const bandCounts = new Map<string, number>();
    for (const item of items) {
      const band = String(item.dimensions.bandLabel ?? 'UNASSIGNED');
      bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
    }
    return {
      total: items.length, writing: histogram('writing'), reading: histogram('reading'),
      listening: histogram('listening'), speaking: histogram('speaking'),
      bands: [...bandCounts.entries()].map(([band, count]) => ({ band, count })),
    };
  }

  async appealsReport(examId?: string) {
    const items = (await this.byType(ReportResourceType.Appeal)).filter((item) => !examId || item.examId === examId);
    return {
      total: items.length, submitted: this.count(items, 'SUBMITTED'), pendingCommittee: this.count(items, 'PENDING_COMMITTEE'),
      revisionRequested: this.count(items, 'REVISION_REQUESTED'), approved: this.count(items, 'APPROVED_PENDING_SCORE_UPDATE'),
      rejected: this.count(items, 'REJECTED'), completed: this.count(items, 'COMPLETED'), noChange: this.count(items, 'NO_CHANGE'),
    };
  }

  async dashboard(actor: AccessClaims) {
    const role = actor.roles[0] ?? 'test_taker';
    const configured = await this.dashboardConfigs.findOneBy({ roleCode: role });
    const allowed = configured?.metricKeys ?? this.defaultMetrics(role);
    const owner = role === 'test_taker' ? actor.sub : undefined;
    const [applications, scores, appeals, certificates, examinations, committees] = await Promise.all([
      this.byType(ReportResourceType.Application, owner), this.byType(ReportResourceType.Score, owner),
      this.byType(ReportResourceType.Appeal, owner), this.byType(ReportResourceType.Certificate, owner),
      this.byType(ReportResourceType.Examination), this.byType(ReportResourceType.Committee),
    ]);
    const metrics: Record<string, number> = {
      totalApplications: applications.length, pendingApplications: applications.filter((item) => ['SUBMITTED', 'UNDER_REVIEW'].includes(item.status)).length,
      verifiedApplications: this.count(applications, 'VERIFIED'), waitlistedApplications: this.count(applications, 'WAITLISTED'),
      totalScores: scores.length, publishedScores: scores.filter((item) => ['PUBLISHED', 'REVISED'].includes(item.status)).length,
      activeAppeals: appeals.filter((item) => !['COMPLETED', 'REJECTED', 'NO_CHANGE'].includes(item.status)).length,
      totalCertificates: certificates.length, activeCertificates: this.count(certificates, 'ACTIVE'),
      scheduledExaminations: examinations.filter((item) => !['ARCHIVED', 'CANCELLED'].includes(item.status)).length,
      configuredCommittees: committees.length,
    };
    return { role, metrics: Object.fromEntries(allowed.filter((key) => key in metrics).map((key) => [key, metrics[key]])), projectedAt: new Date() };
  }

  async configureDashboard(roleCode: string, dto: DashboardConfigDto, actorId: string) {
    const metricKeys = [...new Set(dto.metricKeys)];
    this.assertFields(metricKeys, DASHBOARD_METRICS);
    let config = await this.dashboardConfigs.findOneBy({ roleCode });
    config = this.dashboardConfigs.create({ ...config, roleCode, metricKeys, updatedByUserId: actorId });
    return this.dashboardConfigs.save(config);
  }

  async save(dto: SaveReportDto, ownerUserId: string) {
    await this.query(dto.query);
    return this.savedReports.save(this.savedReports.create({ ownerUserId, name: dto.name, dataset: dto.query.dataset, definition: dto.query as unknown as Record<string, unknown> }));
  }

  listSaved(ownerUserId: string) { return this.savedReports.find({ where: { ownerUserId }, order: { updatedAt: 'DESC' } }); }

  async createJob(dto: CreateReportJobDto, ownerUserId: string) {
    await this.query(dto.query);
    return this.jobs.save(this.jobs.create({
      ownerUserId, format: dto.format, status: ReportJobStatus.Queued,
      definition: dto.query as unknown as Record<string, unknown>, expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    }));
  }

  async getJob(id: string, ownerUserId: string) {
    const job = await this.jobs.findOneBy({ id });
    if (!job) throw new DomainException('REPORT_JOB_NOT_FOUND', 'Report job not found.', 404);
    if (job.ownerUserId !== ownerUserId) throw new DomainException('REPORT_JOB_FORBIDDEN', 'You may only access your own report jobs.', 403);
    return job;
  }

  async downloadJob(id: string, ownerUserId: string) {
    const job = await this.jobs.createQueryBuilder('job').addSelect('job.artifact').where('job.id = :id', { id }).getOne();
    if (!job) throw new DomainException('REPORT_JOB_NOT_FOUND', 'Report job not found.', 404);
    if (job.ownerUserId !== ownerUserId) throw new DomainException('REPORT_JOB_FORBIDDEN', 'You may only access your own report jobs.', 403);
    if (job.expiresAt <= new Date()) throw new DomainException('REPORT_JOB_EXPIRED', 'The report artifact has expired.', 410);
    if (job.status !== ReportJobStatus.Completed || !job.artifact) throw new DomainException('REPORT_JOB_NOT_READY', 'The report artifact is not ready.', 409);
    return job;
  }

  async audit(query: { action?: string; source?: string; actorUserId?: string; correlationId?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 100);
    const where: FindOptionsWhere<ReportingAuditEventEntity> = {};
    if (query.action) where.action = query.action;
    if (query.source) where.source = query.source;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.correlationId) where.correlationId = query.correlationId;
    if (query.from && query.to) where.occurredAt = Between(new Date(query.from), new Date(query.to));
    else if (query.from) where.occurredAt = MoreThanOrEqual(new Date(query.from));
    else if (query.to) where.occurredAt = LessThanOrEqual(new Date(query.to));
    const [items, total] = await this.auditEvents.findAndCount({ where, order: { occurredAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize });
    return { items, total, page, pageSize };
  }

  async auditOne(id: string) {
    const event = await this.auditEvents.findOneBy({ id });
    if (!event) throw new DomainException('AUDIT_EVENT_NOT_FOUND', 'Audit event not found.', 404);
    return event;
  }

  private byType(resourceType: ReportResourceType, ownerUserId?: string) {
    return this.resources.find({ where: ownerUserId ? { resourceType, ownerUserId } : { resourceType }, order: { occurredAt: 'DESC' } });
  }

  private count(items: ReportResourceProjectionEntity[], status: string) { return items.filter((item) => item.status === status).length; }

  private row(item: ReportResourceProjectionEntity): Record<string, unknown> {
    return { resourceId: item.resourceId, examId: item.examId, status: item.status, occurredAt: item.occurredAt, ...item.dimensions };
  }

  private matches(row: Record<string, unknown>, dto: ReportQueryDto) {
    return (dto.filters ?? []).every((filter) => {
      const actual = row[filter.field];
      if (filter.operator === ReportFilterOperator.Equals) return String(actual ?? '') === String(filter.value ?? '');
      if (filter.operator === ReportFilterOperator.In) return Array.isArray(filter.value) && filter.value.map(String).includes(String(actual));
      if (filter.operator === ReportFilterOperator.From) return String(actual ?? '') >= String(filter.value ?? '');
      if (filter.operator === ReportFilterOperator.To) return String(actual ?? '') <= String(filter.value ?? '');
      return false;
    });
  }

  private group(rows: Record<string, unknown>[], field: string) {
    const counts = new Map<string, { value: unknown; count: number }>();
    for (const row of rows) {
      const key = JSON.stringify(row[field] ?? null);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { value: row[field] ?? null, count: 1 });
    }
    return [...counts.values()];
  }

  private assertFields(fields: string[], allowed: string[]) {
    const invalid = fields.filter((field) => !allowed.includes(field));
    if (invalid.length) throw new DomainException('REPORT_FIELD_INVALID', `Unsupported report field(s): ${invalid.join(', ')}.`);
  }

  private defaultMetrics(role: string) {
    if (role === 'test_taker') return ['totalApplications', 'verifiedApplications', 'totalScores', 'activeAppeals', 'activeCertificates'];
    if (role === 'exam_head') return ['scheduledExaminations', 'totalApplications', 'totalScores'];
    if (role.startsWith('committee_')) return ['configuredCommittees', 'totalScores', 'publishedScores', 'activeAppeals'];
    if (role === 'chief_executive') return ['activeAppeals', 'publishedScores', 'activeCertificates'];
    return DASHBOARD_METRICS;
  }
}
