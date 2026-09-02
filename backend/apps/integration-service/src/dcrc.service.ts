/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainException } from '@dzongjuk/common';
import { DcrcLookupAuditEntity, DcrcLookupStatus } from './dcrc.entity';

type JsonRecord = Record<string, unknown>;

export interface DcrcVerificationRequest {
  applicationId?: string;
  requestedByUserId?: string;
  profile?: JsonRecord;
}

export interface DcrcVerificationResult {
  lookupId: string;
  verified: boolean;
  matchedFields: string[];
  mismatchFields: string[];
}

export interface DcrcCitizenProfile {
  lookupId: string;
  cid: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  dzongkhag: string;
  gewog: string;
  source: 'DCRC';
}

@Injectable()
export class DcrcService {
  private readonly tokenUrl: string;
  private readonly citizenUrl: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly timeoutMs: number;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    config: ConfigService,
    @InjectRepository(DcrcLookupAuditEntity) private readonly audits: Repository<DcrcLookupAuditEntity>,
  ) {
    this.tokenUrl = config.get<string>('DCRC_TOKEN_URL', 'https://stg-sso.tech.gov.bt/oauth2/token');
    this.citizenUrl = config.get<string>('DCRC_CITIZEN_URL', 'https://staging-datahub-apim.tech.gov.bt/dcrc_citizen_details_api/1.0.0/citizendetails');
    this.consumerKey = config.get<string>('DCRC_CONSUMER_KEY', '');
    this.consumerSecret = config.get<string>('DCRC_CONSUMER_SECRET', '');
    this.timeoutMs = Math.max(1000, Number(config.get<string>('DCRC_HTTP_TIMEOUT_MS', '15000')) || 15000);
  }

  async verifyCitizenTrusted(cidInput: string, body: DcrcVerificationRequest, requestId: string): Promise<DcrcVerificationResult> {
    const cid = this.normalizeCid(cidInput);
    let providerHttpStatus: number | null = null;
    try {
      const response = await this.fetchCitizen(cid);
      providerHttpStatus = response.status;
      if (response.status === 404) return this.record(cid, body, requestId, 'NOT_FOUND', response.status, [], ['cid']);
      if (!response.ok) throw new DomainException('DCRC_PROVIDER_ERROR', 'DCRC citizen verification failed.', 503);
      const payload = await this.json(response);
      const citizen = findCitizenRecord(payload);
      if (!citizen) throw new DomainException('DCRC_RESPONSE_INVALID', 'DCRC returned an unreadable citizen record.', 503);

      const matchedFields: string[] = [];
      const mismatchFields: string[] = [];
      compare('cid', cid, value(citizen, ['cid', 'cidNo', 'citizenId', 'citizenID', 'citizenNo', 'citizenshipId']), normalizeCidLoose, matchedFields, mismatchFields);

      const profile = body.profile ?? {};
      const submittedName = value(profile, ['fullName', 'name']);
      if (submittedName) compare('fullName', submittedName, citizenName(citizen), normalizeText, matchedFields, mismatchFields);
      const submittedDob = value(profile, ['dateOfBirth', 'dob', 'birthDate']);
      if (submittedDob) compare('dateOfBirth', submittedDob, value(citizen, ['dateOfBirth', 'dob', 'birthDate']), normalizeDate, matchedFields, mismatchFields);

      const status: DcrcLookupStatus = mismatchFields.length ? 'MISMATCH' : 'MATCHED';
      return this.record(cid, body, requestId, status, response.status, matchedFields, mismatchFields);
    } catch (error) {
      if (error instanceof DomainException && ['DCRC_NOT_CONFIGURED', 'DCRC_CID_INVALID'].includes(String((error.getResponse() as JsonRecord).code))) throw error;
      await this.record(cid, body, requestId, 'FAILED', providerHttpStatus, [], []);
      if (error instanceof DomainException) throw error;
      throw new DomainException('DCRC_UNAVAILABLE', 'DCRC is currently unavailable. Please try again later.', 503);
    }
  }

  async lookupCitizenTrusted(cidInput: string, body: DcrcVerificationRequest, requestId: string): Promise<DcrcCitizenProfile> {
    const cid = this.normalizeCid(cidInput);
    let providerHttpStatus: number | null = null;
    try {
      const response = await this.fetchCitizen(cid);
      providerHttpStatus = response.status;
      if (response.status === 404) {
        await this.record(cid, body, requestId, 'NOT_FOUND', response.status, [], ['cid']);
        throw new DomainException('DCRC_CITIZEN_NOT_FOUND', 'No DCRC citizen record was found for this CID.', 404);
      }
      if (!response.ok) throw new DomainException('DCRC_PROVIDER_ERROR', 'DCRC citizen lookup failed.', 503);
      const payload = await this.json(response);
      const citizen = findCitizenRecord(payload);
      if (!citizen) throw new DomainException('DCRC_RESPONSE_INVALID', 'DCRC returned an unreadable citizen record.', 503);

      const profile = {
        cid,
        fullName: citizenName(citizen),
        dateOfBirth: normalizeDate(value(citizen, ['dateOfBirth', 'dob', 'birthDate'])),
        gender: value(citizen, ['gender', 'sex']),
        phone: value(citizen, ['mobileNumber', 'mobileNo', 'phone', 'contactNumber']),
        dzongkhag: value(citizen, ['dzongkhag', 'dzongkhagName', 'district', 'districtName']),
        gewog: value(citizen, ['gewog', 'gewogName', 'block', 'blockName']),
      };
      const fields = Object.entries(profile).filter(([, item]) => Boolean(item)).map(([field]) => field);
      const audit = await this.record(cid, body, requestId, 'MATCHED', response.status, fields, []);
      return { lookupId: audit.lookupId, ...profile, source: 'DCRC' };
    } catch (error) {
      if (domainCode(error) === 'DCRC_CITIZEN_NOT_FOUND') throw error;
      await this.record(cid, body, requestId, 'FAILED', providerHttpStatus, [], []);
      if (error instanceof DomainException) throw error;
      throw new DomainException('DCRC_UNAVAILABLE', 'DCRC is currently unavailable. Please try again later.', 503);
    }
  }

  private async fetchCitizen(cid: string) {
    const accessToken = await this.accessToken();
    return fetch(`${this.citizenUrl.replace(/\/$/, '')}/${encodeURIComponent(cid)}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  private async accessToken() {
    if (!this.consumerKey || !this.consumerSecret) throw new DomainException('DCRC_NOT_CONFIGURED', 'DCRC credentials are not configured.', 503);
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    let response: Response;
    try {
      response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new DomainException('DCRC_TOKEN_UNAVAILABLE', 'DCRC authentication is currently unavailable.', 503);
    }
    const payload = await this.json(response);
    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
    if (!response.ok || !accessToken) throw new DomainException('DCRC_TOKEN_REJECTED', 'DCRC rejected the configured system credentials.', 503);
    const expiresIn = Math.max(60, Number(payload.expires_in) || 3600);
    this.token = { value: accessToken, expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000 };
    return accessToken;
  }

  private async record(cid: string, body: DcrcVerificationRequest, requestId: string, status: DcrcLookupStatus, providerHttpStatus: number | null, matchedFields: string[], mismatchFields: string[]) {
    const audit = await this.audits.save(this.audits.create({
      cidHash: createHash('sha256').update(cid).digest('hex'),
      applicationId: body.applicationId ?? null,
      requestedByUserId: body.requestedByUserId ?? null,
      status, providerHttpStatus, matchedFields, mismatchFields, requestId,
    }));
    return { lookupId: audit.id, verified: status === 'MATCHED', matchedFields, mismatchFields };
  }

  private normalizeCid(input: string) {
    const cid = normalizeCidLoose(input);
    if (!/^\d{11}$/.test(cid)) throw new DomainException('DCRC_CID_INVALID', 'A valid 11-digit CID is required.', 400);
    return cid;
  }

  private async json(response: Response): Promise<JsonRecord> {
    try { return await response.json() as JsonRecord; } catch { return {}; }
  }
}

function normalizedKey(key: string) { return key.replace(/[^a-z0-9]/gi, '').toLowerCase(); }
function value(record: JsonRecord, aliases: string[]) {
  const keys = new Map(Object.keys(record).map(key => [normalizedKey(key), key]));
  for (const alias of aliases) {
    const actual = keys.get(normalizedKey(alias));
    const candidate = actual ? record[actual] : undefined;
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) return String(candidate).trim();
  }
  return '';
}
function findCitizenRecord(input: unknown): JsonRecord | null {
  if (Array.isArray(input)) {
    for (const item of input) { const found = findCitizenRecord(item); if (found) return found; }
    return null;
  }
  if (!input || typeof input !== 'object') return null;
  const record = input as JsonRecord;
  if (value(record, ['cid', 'cidNo', 'citizenId', 'citizenID', 'citizenNo', 'citizenshipId'])) return record;
  for (const child of Object.values(record)) { const found = findCitizenRecord(child); if (found) return found; }
  return null;
}
function citizenName(citizen: JsonRecord) {
  const direct = value(citizen, ['fullName', 'name', 'citizenName']);
  if (direct) return direct;
  return [value(citizen, ['firstName', 'givenName']), value(citizen, ['middleName']), value(citizen, ['lastName', 'surname'])].filter(Boolean).join(' ');
}
function normalizeCidLoose(input: string) { return input.replace(/\D/g, ''); }
function normalizeText(input: string) { return input.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'); }
function normalizeDate(input: string) {
  const match = input.trim().match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const dmy = input.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : normalizeText(input);
}
function compare(field: string, expected: string, actual: string, normalize: (input: string) => string, matched: string[], mismatched: string[]) {
  if (actual && normalize(expected) === normalize(actual)) matched.push(field); else mismatched.push(field);
}
function domainCode(error: unknown) {
  if (!(error instanceof DomainException)) return '';
  const response = error.getResponse();
  return typeof response === 'object' && response !== null ? String((response as JsonRecord).code ?? '') : '';
}
