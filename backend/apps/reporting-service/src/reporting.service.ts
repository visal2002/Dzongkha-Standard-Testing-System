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

/** Optional narrowing applied to a projection read. */
interface ProjectionScope { examId?: string; ownerUserId?: string }

/** Per-status totals for one resource type, with the lookups the reports need. */
interface StatusCounts {
  total: number;
  /** Rows in exactly this status. */
  of(status: string): number;
  /** Rows in any of these statuses. */
  totalOf(statuses: string[]): number;
  /** Rows in any status other than these. */
  totalExcept(statuses: string[]): number;
}

/** Appeal statuses that are no longer active work. */
const CLOSED_APPEAL_STATUSES = ['COMPLETED', 'REJECTED', 'NO_CHANGE'];

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
      this.statusCounts(ReportResourceType.Application), this.statusCounts(ReportResourceType.Score),
      this.statusCounts(ReportResourceType.Appeal), this.statusCounts(ReportResourceType.Certificate),
    ]);
    return {
      totalApplications: applications.total,
      totalScores: scores.total,
      totalCertificates: certificates.total,
      activeAppeals: appeals.totalExcept(CLOSED_APPEAL_STATUSES),
    };
  }

  async registrationReport(examId?: string) {
    const counts = await this.statusCounts(ReportResourceType.Application, { examId });
    return {
      total: counts.total,
      submitted: counts.of('SUBMITTED'), underReview: counts.of('UNDER_REVIEW'),
      verified: counts.of('VERIFIED'), returned: counts.of('RETURNED'),
      cancelled: counts.of('CANCELLED'), waitlisted: counts.of('WAITLISTED'), absent: counts.of('ABSENT'),
    };
  }

  async scoreReport(examId?: string) {
    // Unlike the other reports this one histograms the per-skill scores held in
    // `dimensions`, so it does need the rows themselves - but only this exam's.
    const items = await this.byType(ReportResourceType.Score, { examId });
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
    const counts = await this.statusCounts(ReportResourceType.Appeal, { examId });
    return {
      total: counts.total, submitted: counts.of('SUBMITTED'), pendingCommittee: counts.of('PENDING_COMMITTEE'),
      revisionRequested: counts.of('REVISION_REQUESTED'), approved: counts.of('APPROVED_PENDING_SCORE_UPDATE'),
      rejected: counts.of('REJECTED'), completed: counts.of('COMPLETED'), noChange: counts.of('NO_CHANGE'),
    };
  }

  async dashboard(actor: AccessClaims) {
    const role = actor.roles[0] ?? 'test_taker';
    const configured = await this.dashboardConfigs.findOneBy({ roleCode: role });
    const allowed = configured?.metricKeys ?? this.defaultMetrics(role);
    const owner = role === 'test_taker' ? actor.sub : undefined;
    const [applications, scores, appeals, certificates, examinations, committees] = await Promise.all([
      this.statusCounts(ReportResourceType.Application, { ownerUserId: owner }),
      this.statusCounts(ReportResourceType.Score, { ownerUserId: owner }),
      this.statusCounts(ReportResourceType.Appeal, { ownerUserId: owner }),
      this.statusCounts(ReportResourceType.Certificate, { ownerUserId: owner }),
      this.statusCounts(ReportResourceType.Examination),
      this.statusCounts(ReportResourceType.Committee),
    ]);
    const metrics: Record<string, number> = {
      totalApplications: applications.total, pendingApplications: applications.totalOf(['SUBMITTED', 'UNDER_REVIEW']),
      verifiedApplications: applications.of('VERIFIED'), waitlistedApplications: applications.of('WAITLISTED'),
      totalScores: scores.total, publishedScores: scores.totalOf(['PUBLISHED', 'REVISED']),
      activeAppeals: appeals.totalExcept(CLOSED_APPEAL_STATUSES),
      totalCertificates: certificates.total, activeCertificates: certificates.of('ACTIVE'),
      scheduledExaminations: examinations.totalExcept(['ARCHIVED', 'CANCELLED']),
      configuredCommittees: committees.total,
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

  private byType(resourceType: ReportResourceType, scope: ProjectionScope = {}) {
    return this.resources.find({
      where: {
        resourceType,
        ...(scope.ownerUserId ? { ownerUserId: scope.ownerUserId } : {}),
        ...(scope.examId ? { examId: scope.examId } : {}),
      },
      order: { occurredAt: 'DESC' },
    });
  }

  /**
   * Per-status row counts for one resource type, as a single grouped aggregate.
   *
   * The dashboard and the summary reports only ever needed these totals, but used
   * to load every matching projection row - jsonb dimensions included - into memory
   * and count them in JavaScript, so response time and heap both grew with the
   * table. Postgres now does the counting behind `idx_reporting_resource_type_status`
   * and returns one small row per status.
   */
  private async statusCounts(resourceType: ReportResourceType, scope: ProjectionScope = {}): Promise<StatusCounts> {
    const query = this.resources.createQueryBuilder('projection')
      .select('projection.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .where('projection.resourceType = :resourceType', { resourceType })
      .groupBy('projection.status');
    if (scope.ownerUserId) query.andWhere('projection.ownerUserId = :ownerUserId', { ownerUserId: scope.ownerUserId });
    if (scope.examId) query.andWhere('projection.examId = :examId', { examId: scope.examId });

    const rows = await query.getRawMany<{ status: string; total: string }>();
    const byStatus = new Map<string, number>();
    let total = 0;
    for (const row of rows) {
      const count = Number(row.total);
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + count);
      total += count;
    }
    return {
      total,
      of: (status) => byStatus.get(status) ?? 0,
      totalOf: (statuses) => statuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0),
      totalExcept: (statuses) => {
        const excluded = new Set(statuses);
        let sum = 0;
        for (const [status, count] of byStatus) if (!excluded.has(status)) sum += count;
        return sum;
      },
    };
  }

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
