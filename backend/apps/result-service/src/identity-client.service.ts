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
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('IDENTITY_SERVICE_URL', 'http://identity-service:8001/api/v1');
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
}
