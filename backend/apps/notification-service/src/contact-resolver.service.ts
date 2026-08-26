/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Envelope<T> { success: boolean; data: T; error?: { code?: string; message?: string } }

/**
 * Resolves the address a delivery needs, by calling the internal-service-key guarded
 * lookup routes on the services that actually hold the data - the notification
 * service itself stores neither an email (identity-service owns the account) nor a
 * phone number (registration-service captures it on the applicant's profile at
 * submission time). Mirrors CertificateSourceClientService's internal-call pattern in
 * appeal-certificate-service.
 */
@Injectable()
export class ContactResolverService {
  private readonly identityUrl: string;
  private readonly registrationUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.identityUrl = config.get<string>('IDENTITY_SERVICE_URL', 'http://identity-service:8001/api/v1');
    this.registrationUrl = config.get<string>('REGISTRATION_SERVICE_URL', 'http://registration-service:8002/api/v1');
    this.internalKey = config.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  async email(userId: string): Promise<string | null> {
    const data = await this.get<{ email: string }>(`${this.identityUrl}/admin/users/${userId}/internal-contact`);
    return data?.email ?? null;
  }

  async phone(applicationId: string): Promise<string | null> {
    const data = await this.get<{ phone: string | null }>(`${this.registrationUrl}/applications/internal/${applicationId}/contact`);
    return data?.phone ?? null;
  }

  private async get<T>(url: string): Promise<T | null> {
    if (this.internalKey.length < 32) return null;
    let response: Response;
    try { response = await fetch(url, { headers: { 'x-internal-service-key': this.internalKey } }); }
    catch { return null; }
    if (!response.ok) return null;
    const payload = await response.json() as Envelope<T>;
    return payload.success ? payload.data : null;
  }
}
