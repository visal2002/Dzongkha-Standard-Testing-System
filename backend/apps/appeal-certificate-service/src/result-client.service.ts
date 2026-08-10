/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
}

export interface PublishedResult {
  id: string;
  examId: string;
  applicationId: string;
  currentVersion: number;
  score: { versionNumber: number; scores: Record<string, number> } | null;
}

@Injectable()
export class ResultClientService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('RESULT_SERVICE_URL', 'http://result-service:8004/api/v1');
  }

  async ownPublishedResult(authorization: string | undefined, applicationId: string) {
    const results = await this.request<PublishedResult[]>('/results/my', authorization, 'APPEAL_RESULT_NOT_ELIGIBLE');
    const result = results.find((item) => item.applicationId === applicationId && item.score);
    if (!result?.score) throw new DomainException('APPEAL_RESULT_NOT_ELIGIBLE', 'A published result owned by the Test Taker is required before appeal submission.', 409);
    return result;
  }

  async assertCommitteeAccess(authorization: string | undefined, examId: string) {
    await this.request(`/exams/${examId}/committee`, authorization, 'APPEAL_COMMITTEE_ACCESS_REQUIRED');
  }

  private async request<T>(path: string, authorization: string | undefined, code: string): Promise<T> {
    if (!authorization) throw new DomainException('AUTHENTICATION_REQUIRED', 'Authorization is required.', 401);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { headers: { authorization } });
    } catch {
      throw new DomainException('RESULT_SERVICE_UNAVAILABLE', 'Result service is currently unavailable.', 503);
    }
    const payload = await response.json() as ApiEnvelope<T>;
    if (!response.ok || !payload.success) {
      const status = response.status === 401 || response.status === 403 ? response.status : 409;
      throw new DomainException(code, payload.error?.message ?? 'Result validation failed.', status);
    }
    return payload.data;
  }
}
