import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';

interface NDIEnvelope<T> { data?: T; access_token?: string; accessToken?: string }
interface ProofRequestResult { proofRequestURL: string; deepLinkURL?: string; proofRequestThreadId: string }

@Injectable()
export class NdiProviderService {
  constructor(private readonly config: ConfigService) {}

  async createProofRequest(): Promise<ProofRequestResult> {
    const token = await this.accessToken();
    const schema = this.required('NDI_FOUNDATIONAL_ID_SCHEMA_URL');
    const response = await this.request<NDIEnvelope<ProofRequestResult>>(
      `${this.config.get<string>('NDI_VERIFIER_URL', 'https://demo-client.bhutanndi.com/verifier').replace(/\/$/, '')}/v1/proof-request`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({
          proofName: this.config.get('NDI_PROOF_NAME', 'Dzongjuk Login - Verify Foundational ID'),
          proofAttributes: ['ID Number', 'Full Name'].map((name) => ({ name, restrictions: [{ schema_name: schema }] })),
        }),
      },
    );
    const proof = response.data;
    if (!proof?.proofRequestURL || !proof.proofRequestThreadId) {
      throw new DomainException('NDI_INVALID_RESPONSE', 'Bhutan NDI returned an incomplete proof request.', 502);
    }
    await this.subscribe(proof.proofRequestThreadId, token);
    return proof;
  }

  async unsubscribe(threadId: string): Promise<void> {
    try {
      const token = await this.accessToken();
      await this.request(
        `${this.config.get<string>('NDI_WEBHOOK_URL', 'https://demo-client.bhutanndi.com/webhook').replace(/\/$/, '')}/v1/unsubscribe`,
        { method: 'POST', headers: this.headers(token), body: JSON.stringify({ threadId }) },
      );
    } catch {
      // Login completion must not fail because cleanup could not be delivered.
    }
  }

  private async subscribe(threadId: string, token: string): Promise<void> {
    const webhookId = this.required('NDI_WEBHOOK_ID');
    await this.request(
      `${this.config.get<string>('NDI_WEBHOOK_URL', 'https://demo-client.bhutanndi.com/webhook').replace(/\/$/, '')}/v1/subscribe`,
      { method: 'POST', headers: this.headers(token), body: JSON.stringify({ webhookId, threadId }) },
    );
  }

  private async accessToken(): Promise<string> {
    const response = await this.request<NDIEnvelope<{ access_token?: string; accessToken?: string }>>(
      this.config.get('NDI_AUTHENTICATION_URL', 'https://staging.bhutanndi.com/authentication/v1/authenticate'),
      {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: this.required('NDI_CLIENT_ID'),
          client_secret: this.required('NDI_CLIENT_SECRET'),
          grant_type: 'client_credentials',
        }),
      },
    );
    const nested = response.data;
    const token = response.access_token ?? response.accessToken ?? nested?.access_token ?? nested?.accessToken;
    if (!token) throw new DomainException('NDI_AUTH_FAILED', 'Bhutan NDI did not return an access token.', 502);
    return token;
  }

  private headers(token: string) {
    return { accept: 'application/json', authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) throw new DomainException('NDI_NOT_CONFIGURED', `Required Bhutan NDI setting ${name} is missing.`, 503);
    return value;
  }

  private async request<T = unknown>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(this.config.get('NDI_HTTP_TIMEOUT_MS', 10_000)) });
    } catch {
      throw new DomainException('NDI_UNAVAILABLE', 'Bhutan NDI is currently unavailable. Please try again.', 503);
    }
    const text = await response.text();
    let body: unknown = {};
    try { body = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
    if (!response.ok) {
      throw new DomainException('NDI_REQUEST_FAILED', 'Bhutan NDI could not process the request.', 502, { status: response.status });
    }
    if (!body || typeof body !== 'object') throw new DomainException('NDI_INVALID_RESPONSE', 'Bhutan NDI returned an invalid response.', 502);
    return body as T;
  }
}
