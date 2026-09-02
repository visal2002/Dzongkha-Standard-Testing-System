/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';
import { ApplicationEntity } from './entities';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
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
export class DcrcClientService {
  private readonly baseUrl: string;
  private readonly internalKey: string;
  private readonly required: boolean;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('INTEGRATION_SERVICE_URL', 'http://integration-service:8008/api/v1');
    this.internalKey = config.get<string>('INTERNAL_SERVICE_SECRET', '');
    this.required = config.get<string>('DCRC_VERIFICATION_REQUIRED', 'false').toLowerCase() === 'true';
    this.timeoutMs = Math.max(1000, Number(config.get<string>('DCRC_HTTP_TIMEOUT_MS', '15000')) || 15000);
  }

  isRequired() { return this.required; }

  async lookup(cid: string, actorId: string | undefined, requestId: string): Promise<DcrcCitizenProfile> {
    if (!/^\d{11}$/.test(cid)) throw new DomainException('DCRC_CID_INVALID', 'A valid 11-digit CID is required.', 400);
    return this.request<DcrcCitizenProfile>('/internal/dcrc/citizens/lookup', {
      cid,
      ...(actorId ? { requestedByUserId: actorId } : {}),
    }, requestId);
  }

  async verify(application: ApplicationEntity, actorId: string, requestId: string): Promise<DcrcVerificationResult> {
    const cid = cidFrom(application);
    const result = await this.request<DcrcVerificationResult>(`/internal/dcrc/citizens/${encodeURIComponent(cid)}/verify`, {
      applicationId: application.id, requestedByUserId: actorId, profile: application.profileSnapshot,
    }, requestId);
    if (!result.verified) {
      throw new DomainException('DCRC_PROFILE_MISMATCH', `DCRC did not match: ${result.mismatchFields.join(', ') || 'citizen record'}.`, 409);
    }
    return result;
  }

  private async request<T>(path: string, body: Record<string, unknown>, requestId: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-key': this.internalKey,
          'x-request-id': requestId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new DomainException('DCRC_UNAVAILABLE', 'DCRC is currently unavailable. Please try again later.', 503);
    }
    const payload = await response.json().catch(() => ({})) as ApiEnvelope<T>;
    if (!response.ok || !payload.success) {
      throw new DomainException(payload.error?.code ?? 'DCRC_VERIFICATION_FAILED', payload.error?.message ?? 'DCRC verification failed.', response.status >= 500 ? 503 : response.status);
    }
    return payload.data;
  }
}

function cidFrom(application: ApplicationEntity) {
  const profileCid = application.profileSnapshot.cid;
  const source = typeof profileCid === 'string' && profileCid.trim() ? profileCid : application.identityKey;
  const cid = source.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cid)) throw new DomainException('DCRC_CID_INVALID', 'The application does not contain a valid 11-digit CID.', 400);
  return cid;
}
