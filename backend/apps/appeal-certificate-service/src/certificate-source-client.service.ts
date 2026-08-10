/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';

interface Envelope<T> { success: boolean; data: T; error?: { code?: string; message?: string } }
export interface CertificateResultSource {
  examId: string; applicationId: string; testTakerUserId: string; scoreSheetId: string; scoreVersionNumber: number;
  scores: Record<string, number>; overallScore: string; bandLabel: string; cefrLevel: string | null;
}
export interface CertificateProfileSource {
  applicationId: string; examId: string; testTakerUserId: string; registrationNumber: string; fullName: string;
}

@Injectable()
export class CertificateSourceClientService {
  private readonly resultUrl: string;
  private readonly registrationUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.resultUrl = config.get<string>('RESULT_SERVICE_URL', 'http://result-service:8004/api/v1');
    this.registrationUrl = config.get<string>('REGISTRATION_SERVICE_URL', 'http://registration-service:8002/api/v1');
    this.internalKey = config.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  results(examId: string) {
    return this.get<CertificateResultSource[]>(`${this.resultUrl}/internal/exams/${examId}/certificate-results`);
  }

  profile(applicationId: string) {
    return this.get<CertificateProfileSource>(`${this.registrationUrl}/applications/internal/${applicationId}/certificate-profile`);
  }

  private async get<T>(url: string): Promise<T> {
    if (this.internalKey.length < 32) throw new DomainException('CERTIFICATE_SOURCE_UNAVAILABLE', 'Certificate source integration is not configured.', 503);
    let response: Response;
    try { response = await fetch(url, { headers: { 'x-internal-service-key': this.internalKey } }); }
    catch { throw new DomainException('CERTIFICATE_SOURCE_UNAVAILABLE', 'Certificate source service is unavailable.', 503); }
    const payload = await response.json() as Envelope<T>;
    if (!response.ok || !payload.success) {
      throw new DomainException(payload.error?.code ?? 'CERTIFICATE_SOURCE_REJECTED', payload.error?.message ?? 'Certificate source data was rejected.', response.status);
    }
    return payload.data;
  }
}
