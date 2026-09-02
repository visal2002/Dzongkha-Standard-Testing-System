/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppealStatus } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { AppealEntity, PaymentEntity, PaymentEventEntity, PaymentStatus, ReconciliationStatus } from './entities';
import { CertificateSourceClientService } from './certificate-source-client.service';
import { AppealService } from './appeal.service';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class AppealBirmsService {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly sources: CertificateSourceClientService,
    private readonly appealsService: AppealService,
    @InjectRepository(AppealEntity) private readonly appeals: Repository<AppealEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(PaymentEventEntity) private readonly events: Repository<PaymentEventEntity>,
  ) {}

  async createAdvice(appealId: string, userId: string, requestId: string) {
    const { appeal, payment } = await this.ownedPayment(appealId, userId);
    if (appeal.status !== AppealStatus.Submitted || ![PaymentStatus.Initiated, PaymentStatus.Failed].includes(payment.status)) {
      throw new DomainException('APPEAL_PAYMENT_NOT_READY', 'This appeal is not awaiting payment.', 409);
    }
    if (payment.paymentAdviceNo && payment.paymentRedirectUrl) return this.publicPayment(payment);

    const profile = await this.sources.profile(appeal.applicationId);
    if (!profile.email && !profile.phone) throw new DomainException('PAYER_CONTACT_REQUIRED', 'An email address or mobile number is required to create a BIRMS payment advice.', 400);
    const reference = this.referenceFor(appeal.id);
    const response = await this.birmsRequest('POST', '/paymentdetails/create', {
      platform: this.required('BIRMS_PLATFORM'),
      refNo: reference,
      taxPayerDocumentNo: profile.cid,
      paymentRequestDate: new Date().toISOString().slice(0, 10),
      agencyCode: this.required('BIRMS_AGENCY_CODE'),
      payerEmail: profile.email || undefined,
      mobileNo: profile.phone || undefined,
      totalPayableAmount: Number(payment.amount).toFixed(2),
      paymentDueDate: null,
      taxPayerName: profile.fullName,
      paymentLists: [{
        serviceCode: this.required('BIRMS_SERVICE_CODE'),
        description: this.required('BIRMS_SERVICE_DESCRIPTION'),
        payableAmount: Number(payment.amount).toFixed(2),
      }],
    });
    const content = this.content(response);
    const adviceNo = this.text(content.paymentAdviceNo ?? content.paymentAdviceno);
    const redirectUrl = this.text(content.redirectUrl);
    if (!adviceNo || !redirectUrl) throw new DomainException('BIRMS_RESPONSE_INVALID', 'BIRMS did not return a payment advice number and redirect URL.', 502);
    this.assertRedirectUrl(redirectUrl);

    payment.providerReference = reference;
    payment.paymentAdviceNo = adviceNo;
    payment.paymentRedirectUrl = redirectUrl;
    payment.gateway = 'BIRMS';
    payment.status = this.mapStatus(content.paymentStatus);
    payment.providerDetails = this.safeProviderDetails(content);
    payment.providerUpdatedAt = new Date();
    await this.payments.save(payment);
    await this.events.save(this.events.create({
      paymentId: payment.id,
      eventType: 'BIRMS_ADVICE_CREATED',
      externalTransactionId: null,
      safeData: { requestId, reference, adviceNo, serviceCode: this.required('BIRMS_SERVICE_CODE') },
    }));
    return this.publicPayment(payment);
  }

  async refresh(appealId: string, userId: string, requestId: string) {
    const { payment } = await this.ownedPayment(appealId, userId);
    if (!payment.providerReference) throw new DomainException('PAYMENT_ADVICE_MISSING', 'Create a BIRMS payment advice first.', 409);
    return this.synchronize(payment, requestId);
  }

  async receipt(appealId: string, userId: string) {
    const { payment } = await this.ownedPayment(appealId, userId);
    if (payment.status !== PaymentStatus.Paid || !payment.paymentReceiptNo) {
      throw new DomainException('PAYMENT_RECEIPT_UNAVAILABLE', 'A receipt is available after BIRMS confirms payment.', 409);
    }
    const response = await this.birmsRequest('GET', `/paymentdetails/receipt-encoded-pdf/${encodeURIComponent(payment.paymentReceiptNo)}`);
    return { receiptNumber: payment.paymentReceiptNo, base64Pdf: this.text(response.base64pdf ?? this.content(response).base64pdf) };
  }

  async receiveCallback(payload: JsonRecord, requestId: string) {
    const reference = this.text(payload.refNo);
    if (!reference) throw new DomainException('BIRMS_REFERENCE_REQUIRED', 'refNo is required.', 400);
    const payment = await this.payments.findOneBy({ providerReference: reference });
    if (!payment) throw new DomainException('PAYMENT_REFERENCE_NOT_FOUND', 'The BIRMS reference is not recognized.', 404);
    await this.synchronize(payment, requestId);
    return { statusCode: '200', statusDescription: 'Payment Details received successfully' };
  }

  private async synchronize(payment: PaymentEntity, requestId: string) {
    const response = await this.birmsRequest('GET', `/paymentdetails/referenceNumber/${encodeURIComponent(payment.providerReference!)}`);
    const content = this.content(response);
    const status = this.mapStatus(content.paymentStatus);
    const receiptNo = this.text(content.receiptNo) || this.receiptFrom(content);
    const transactionId = receiptNo || this.text(content.paymentAdviceNo ?? content.paymentAdviceno) || payment.providerReference!;

    if (status === PaymentStatus.Paid) {
      await this.appealsService.confirmPayment(payment.referenceId, {
        gateway: 'BIRMS', externalTransactionId: transactionId, amount: Number(payment.amount), currency: payment.currency, paidAt: new Date().toISOString(),
      }, this.required('INTERNAL_SERVICE_SECRET'), requestId);
    }

    const refreshed = await this.payments.findOneByOrFail({ id: payment.id });
    refreshed.gateway = 'BIRMS';
    refreshed.status = status;
    refreshed.paymentAdviceNo = this.text(content.paymentAdviceNo ?? content.paymentAdviceno) || refreshed.paymentAdviceNo;
    refreshed.paymentReceiptNo = receiptNo || refreshed.paymentReceiptNo;
    refreshed.paymentRedirectUrl = status === PaymentStatus.Paid ? null : (this.text(content.redirectUrl) || refreshed.paymentRedirectUrl);
    refreshed.providerDetails = this.safeProviderDetails(content);
    refreshed.providerUpdatedAt = new Date();
    refreshed.reconciliationStatus = status === PaymentStatus.Paid ? ReconciliationStatus.Matched : ReconciliationStatus.Pending;
    if (status === PaymentStatus.Failed) refreshed.failedAt = new Date();
    await this.payments.save(refreshed);
    return this.publicPayment(refreshed);
  }

  private async ownedPayment(appealId: string, userId: string) {
    const appeal = await this.appeals.findOneBy({ id: appealId });
    if (!appeal || !appeal.paymentId) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal payment was not found.', 404);
    if (appeal.testTakerUserId !== userId) throw new DomainException('APPEAL_FORBIDDEN', 'You may only pay for your own appeal.', 403);
    const payment = await this.payments.findOneBy({ id: appeal.paymentId });
    if (!payment) throw new DomainException('APPEAL_PAYMENT_NOT_FOUND', 'Appeal payment was not found.', 404);
    return { appeal, payment };
  }

  private async birmsRequest(method: 'GET' | 'POST', path: string, body?: JsonRecord) {
    const response = await fetch(`${this.baseUrl()}/${this.servicePath()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await this.token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await this.json(response);
    if (!response.ok) throw new DomainException('BIRMS_REQUEST_FAILED', this.text(data.message) || `BIRMS returned HTTP ${response.status}.`, 502);
    return data;
  }

  private async token() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    const response = await fetch(`${this.baseUrl()}/core-module/api/v1/auth/external-users/logMeIn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.required('BIRMS_USERNAME'), password: this.required('BIRMS_PASSWORD') }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await this.json(response);
    if (!response.ok) throw new DomainException('BIRMS_AUTHENTICATION_FAILED', this.text(data.message) || 'Unable to authenticate with BIRMS.', 502);
    const content = this.content(data);
    const tokenDto = content.tokenDto && typeof content.tokenDto === 'object' ? content.tokenDto as JsonRecord : content;
    const token = this.text(tokenDto.accessToken);
    if (!token) throw new DomainException('BIRMS_AUTHENTICATION_INVALID', 'BIRMS did not return an access token.', 502);
    this.accessToken = token;
    this.accessTokenExpiresAt = Date.now() + 25 * 60 * 1000;
    return token;
  }

  private publicPayment(payment: PaymentEntity) {
    return {
      appealId: payment.referenceId, status: payment.status, amount: payment.amount, currency: payment.currency,
      reference: payment.providerReference, adviceNumber: payment.paymentAdviceNo, redirectUrl: payment.paymentRedirectUrl,
      receiptNumber: payment.paymentReceiptNo, updatedAt: payment.providerUpdatedAt,
    };
  }

  private safeProviderDetails(content: JsonRecord) {
    return {
      paymentStatus: this.text(content.paymentStatus), paymentAdviceNo: this.text(content.paymentAdviceNo ?? content.paymentAdviceno),
      receiptNo: this.text(content.receiptNo) || this.receiptFrom(content),
    };
  }

  private receiptFrom(content: JsonRecord) {
    const list = content.receiptList ?? content.receiptLists;
    return Array.isArray(list) && list[0] && typeof list[0] === 'object' ? this.text((list[0] as JsonRecord).receiptNo) : null;
  }
  private baseUrl() { return this.required('BIRMS_BASE_URL').replace(/\/$/, ''); }
  private servicePath() { return this.required('BIRMS_SERVICE_PATH').replace(/^\/+|\/+$/g, ''); }
  private referenceFor(id: string) { return `DSTS-APPEAL-${id.replace(/-/g, '').toUpperCase()}`; }
  private required(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value) throw new DomainException('BIRMS_NOT_CONFIGURED', `Required BIRMS setting ${key} is missing.`, 503);
    return value;
  }
  private content(payload: JsonRecord) { return payload.content && typeof payload.content === 'object' ? payload.content as JsonRecord : payload; }
  private text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  private mapStatus(value: unknown) {
    const status = String(value || 'PENDING').toUpperCase().replace(/\s+/g, '_');
    if (['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(status)) return PaymentStatus.Paid;
    if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'REVERSED'].includes(status)) return PaymentStatus.Failed;
    return PaymentStatus.Initiated;
  }
  private assertRedirectUrl(value: string) {
    let url: URL;
    try { url = new URL(value); } catch { throw new DomainException('BIRMS_REDIRECT_INVALID', 'BIRMS returned an invalid redirect URL.', 502); }
    if (url.protocol !== 'https:' || url.hostname !== new URL(this.baseUrl()).hostname) {
      throw new DomainException('BIRMS_REDIRECT_INVALID', 'BIRMS returned an untrusted redirect URL.', 502);
    }
  }
  private async json(response: Response): Promise<JsonRecord> {
    try { return await response.json() as JsonRecord; } catch { throw new DomainException('BIRMS_RESPONSE_INVALID', 'BIRMS returned an unreadable response.', 502); }
  }
}
