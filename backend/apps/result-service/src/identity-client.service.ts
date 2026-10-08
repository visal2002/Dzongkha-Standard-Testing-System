/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
}

@Injectable()
export class IdentityClientService {
  private readonly baseUrl: string;
  private readonly registrationBaseUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('IDENTITY_SERVICE_URL', 'http://identity-service:8001/api/v1');
    this.registrationBaseUrl = config.get<string>('REGISTRATION_SERVICE_URL', 'http://registration-service:8002/api/v1');
    this.internalKey = config.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  // Best-effort name resolution for display only - a committee roster entry or a
  // score sheet's "entered by" attribution (BRD §5.5.2 BR-3). Never throws: a missing
  // display name is a UI fallback concern (the caller already falls back to a
  // truncated user id), not something that should ever block a committee or score
  // sheet read.
  async nameFor(userId: string): Promise<string | null> {
    if (this.internalKey.length < 32) return null;
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/internal-contact`, {
        headers: { 'x-internal-service-key': this.internalKey },
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as ApiEnvelope<{ name?: string }>;
      return payload?.data?.name ?? null;
    } catch {
      return null;
    }
  }

  async namesFor(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    const entries = await Promise.all(unique.map(async (id) => [id, await this.nameFor(id)] as const));
    return new Map(entries.filter((entry): entry is [string, string] => entry[1] !== null));
  }

  async applicationProfilesFor(applicationIds: string[]): Promise<Map<string, { name: string; cid: string }>> {
    if (this.internalKey.length < 32) return new Map();
    const unique = [...new Set(applicationIds)];
    const entries = await Promise.all(unique.map(async (applicationId) => {
      try {
        const response = await fetch(`${this.registrationBaseUrl}/applications/internal/${applicationId}/certificate-profile`, {
          headers: { 'x-internal-service-key': this.internalKey },
        });
        if (!response.ok) return null;
        const payload = (await response.json()) as ApiEnvelope<{ fullName?: string; cid?: string }>;
        const name = payload?.data?.fullName?.trim();
        const cid = payload?.data?.cid?.trim();
        return name ? [applicationId, { name, cid: cid ?? '' }] as const : null;
      } catch {
        return null;
      }
    }));
    return new Map(entries.filter((entry): entry is readonly [string, { name: string; cid: string }] => entry !== null));
  }

  // Committee authority is derived from the user's active identity role, never from
  // whichever committee role a caller happens to put in the request body.
  async hasCommitteeRole(userId: string, committeeRole: 'HEAD' | 'MEMBER'): Promise<boolean> {
    if (this.internalKey.length < 32) return false;
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/internal-contact`, {
        headers: { 'x-internal-service-key': this.internalKey },
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as ApiEnvelope<{ roles?: string[]; status?: string }>;
      const requiredRole = committeeRole === 'HEAD' ? 'committee_head' : 'committee_member';
      return payload?.data?.status === 'ACTIVE' && Boolean(payload.data.roles?.includes(requiredRole));
    } catch {
      return false;
    }
  }
}
