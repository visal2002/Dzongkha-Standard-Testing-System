/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { DataSource, Repository } from 'typeorm';
import { ReportQueryDto } from './dtos';
import { ReportFormat, ReportJobEntity, ReportJobStatus } from './entities';
import { ReportingService } from './reporting.service';

@Injectable()
export class ReportJobWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ReportJobWorker.name);
  private timer?: NodeJS.Timeout;
  private working = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly reporting: ReportingService,
    @InjectRepository(ReportJobEntity) private readonly jobs: Repository<ReportJobEntity>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processNext(), 1000);
    this.timer.unref();
  }

  onApplicationShutdown() { if (this.timer) clearInterval(this.timer); }

  private async processNext() {
    if (this.working) return;
    this.working = true;
    try {
      const job = await this.claim();
      if (!job) return;
      try {
        const result = await this.reporting.query(job.definition as unknown as ReportQueryDto);
        const artifact = await this.render(job.format, result.fields, result.rows);
        job.artifact = artifact.bytes;
        job.fileName = `dzongjuk-${result.dataset}-${job.id}.${artifact.extension}`;
        job.mimeType = artifact.mimeType;
        job.rowCount = result.rows.length;
        job.status = ReportJobStatus.Completed;
        job.completedAt = new Date();
        await this.jobs.save(job);
      } catch (error) {
        job.status = ReportJobStatus.Failed;
        job.failureCode = 'REPORT_GENERATION_FAILED';
        job.completedAt = new Date();
        await this.jobs.save(job);
        this.logger.error(`Report job ${job.id} failed.`, error);
      }
      await this.jobs.createQueryBuilder().update().set({ status: ReportJobStatus.Expired, artifact: null })
        .where('status = :status AND "expiresAt" <= now()', { status: ReportJobStatus.Completed }).execute();
    } finally { this.working = false; }
  }

  private claim() {
    return this.dataSource.transaction(async (manager) => {
      const job = await manager.findOne(ReportJobEntity, {
        where: { status: ReportJobStatus.Queued }, order: { createdAt: 'ASC' }, lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });
      if (!job) return null;
      job.status = ReportJobStatus.Running;
      job.startedAt = new Date();
      return manager.save(job);
    });
  }

  private async render(format: ReportFormat, fields: string[], rows: Record<string, unknown>[]) {
    if (format === ReportFormat.Csv) return { bytes: Buffer.from(this.csv(fields, rows), 'utf8'), extension: 'csv', mimeType: 'text/csv; charset=utf-8' };
    if (format === ReportFormat.Excel) {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dzongjuk DSTS';
      const sheet = workbook.addWorksheet('Report');
      sheet.columns = fields.map((field) => ({ header: field, key: field, width: 22 }));
      rows.forEach((row) => sheet.addRow(Object.fromEntries(fields.map((field) => [field, this.cell(row[field])]))));
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: 'A1', to: `${this.columnName(fields.length)}1` };
      const output = await workbook.xlsx.writeBuffer();
      return { bytes: Buffer.from(output), extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return { bytes: await this.pdf(fields, rows), extension: 'pdf', mimeType: 'application/pdf' };
  }

  private csv(fields: string[], rows: Record<string, unknown>[]) {
    const escape = (value: unknown) => `"${String(this.cell(value)).replace(/"/g, '""')}"`;
    return `\uFEFF${fields.map(escape).join(',')}\r\n${rows.map((row) => fields.map((field) => escape(row[field])).join(',')).join('\r\n')}`;
  }

  private async pdf(fields: string[], rows: Record<string, unknown>[]) {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [842, 595];
    let page = document.addPage(pageSize);
    let y = 565;
    const write = (text: string, x: number, size = 7, header = false) => page.drawText(text.slice(0, 34), { x, y, size, font: header ? bold : font });
    const widths = Math.max(Math.floor(790 / Math.max(fields.length, 1)), 50);
    const header = () => { fields.forEach((field, index) => write(field, 25 + index * widths, 7, true)); y -= 15; };
    page.drawText('Dzongjuk DSTS governed report', { x: 25, y, size: 14, font: bold });
    y -= 24;
    header();
    for (const row of rows) {
      if (y < 25) { page = document.addPage(pageSize); y = 565; header(); }
      fields.forEach((field, index) => write(String(this.cell(row[field])), 25 + index * widths));
      y -= 12;
    }
    return Buffer.from(await document.save());
  }

  private cell(value: unknown): string | number | boolean {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    return JSON.stringify(value);
  }

  private columnName(count: number) {
    let value = Math.max(count, 1);
    let name = '';
    while (value > 0) { value -= 1; name = String.fromCharCode(65 + (value % 26)) + name; value = Math.floor(value / 26); }
    return name;
  }
}
