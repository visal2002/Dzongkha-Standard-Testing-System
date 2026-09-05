import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ApplicationStatus } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { ApplicationEntity, OutboxEventEntity, RegistrationPaymentStatus } from './entities';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class BirmsPaymentService {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(ApplicationEntity) private readonly applications: Repository<ApplicationEntity>,
  ) {}

  async createAdvice(applicationId: string, userId: string, requestId: string) {
    const application = await this.ownedApplication(applicationId, userId);
    if (Number(application.paymentAmount) === 0 || application.paymentStatus === RegistrationPaymentStatus.Waived) {
      throw new DomainException('PAYMENT_NOT_REQUIRED', 'No payment is required for this application.', 409);
    }
    if (application.status !== ApplicationStatus.Verified) {
      throw new DomainException('PAYMENT_NOT_READY', 'The application must be verified before payment.', 409);
    }
    if (application.paymentStatus === RegistrationPaymentStatus.Paid) {
      throw new DomainException('PAYMENT_ALREADY_COMPLETED', 'This application is already paid.', 409);
    }
    if (application.paymentAdviceNo && application.paymentRedirectUrl
      && [RegistrationPaymentStatus.Initiated, RegistrationPaymentStatus.Failed, RegistrationPaymentStatus.Reversed].includes(application.paymentStatus)) {
      return this.publicPayment(application);
    }

    const profile = application.profileSnapshot;
    const refNo = this.referenceFor(application.id);
    const payload = {
      platform: this.required('BIRMS_PLATFORM'),
      refNo,
      taxPayerDocumentNo: this.profileString(profile, ['cid', 'identityKey']) || application.identityKey,
      paymentRequestDate: new Date().toISOString().slice(0, 10),
      agencyCode: this.required('BIRMS_AGENCY_CODE'),
      payerEmail: this.profileString(profile, ['email']) || undefined,
      mobileNo: this.profileString(profile, ['phone', 'contactNo', 'mobileNo']) || undefined,
      totalPayableAmount: Number(application.paymentAmount).toFixed(2),
      paymentDueDate: null,
      taxPayerName: this.profileString(profile, ['fullName', 'name']) || 'DSTS applicant',
      paymentLists: [{
        serviceCode: this.required('BIRMS_SERVICE_CODE'),
        description: this.config.get<string>('BIRMS_SERVICE_DESCRIPTION') || 'DSTS EXAMINATION REGISTRATION',
        payableAmount: Number(application.paymentAmount).toFixed(2),
      }],
    };
    if (!payload.payerEmail && !payload.mobileNo) {
      throw new DomainException('PAYER_CONTACT_REQUIRED', 'An email address or mobile number is required to create a BIRMS payment advice.', 400);
    }

    const response = await this.birmsRequest('POST', '/paymentdetails/create', payload);
    const content = this.content(response);
    const adviceNo = this.stringValue(content.paymentAdviceNo ?? content.paymentAdviceno);
    const redirectUrl = this.stringValue(content.redirectUrl);
    if (!adviceNo || !redirectUrl) throw new DomainException('BIRMS_RESPONSE_INVALID', 'BIRMS did not return a payment advice number and redirect URL.', 502);
    this.assertRedirectUrl(redirectUrl);

    return this.dataSource.transaction(async manager => {
      const locked = await manager.findOne(ApplicationEntity, { where: { id: application.id }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      locked.paymentStatus = this.mapStatus(content.paymentStatus);
      locked.paymentReference = refNo;
      locked.paymentAdviceNo = adviceNo;
      locked.paymentRedirectUrl = redirectUrl;
      locked.paymentProviderDetails = content;
      locked.paymentUpdatedAt = new Date();
      await manager.save(locked);
      await this.event(manager, locked, 'BIRMS_PAYMENT_ADVICE_CREATED', requestId, { refNo, adviceNo });
      return this.publicPayment(locked);
    });
  }

  async refresh(applicationId: string, userId: string, requestId: string) {
    const application = await this.ownedApplication(applicationId, userId);
    if (!application.paymentReference) throw new DomainException('PAYMENT_ADVICE_MISSING', 'Create a payment advice first.', 409);
    return this.synchronize(application, requestId);
  }

  async cancel(applicationId: string, reason: string, userId: string, requestId: string) {
    const application = await this.ownedApplication(applicationId, userId);
    if (!application.paymentAdviceNo) throw new DomainException('PAYMENT_ADVICE_MISSING', 'There is no payment advice to cancel.', 409);
    if (application.paymentStatus !== RegistrationPaymentStatus.Initiated) {
      throw new DomainException('PAYMENT_CANCELLATION_BLOCKED', 'Only a pending payment advice can be cancelled.', 409);
    }
    await this.birmsRequest('POST', '/paymentdetails/cancel', {
      paymentAdviceNumber: application.paymentAdviceNo,
      reason: reason.trim(),
      cancelledBy: this.profileString(application.profileSnapshot, ['fullName', 'name']) || userId,
    });
    application.paymentStatus = RegistrationPaymentStatus.Cancelled;
    application.paymentRedirectUrl = null;
    application.paymentUpdatedAt = new Date();
    await this.dataSource.transaction(async manager => {
      await manager.save(application);
      await this.event(manager, application, 'BIRMS_PAYMENT_ADVICE_CANCELLED', requestId, { adviceNo: application.paymentAdviceNo, reason: reason.trim() });
    });
    return this.publicPayment(application);
  }

  async receipt(applicationId: string, userId: string) {
    const application = await this.ownedApplication(applicationId, userId);
    if (application.paymentStatus !== RegistrationPaymentStatus.Paid || !application.paymentReceiptNo) {
      throw new DomainException('PAYMENT_RECEIPT_UNAVAILABLE', 'A receipt is available after BIRMS confirms payment.', 409);
    }
    const response = await this.birmsRequest('GET', `/paymentdetails/receipt-encoded-pdf/${encodeURIComponent(application.paymentReceiptNo)}`);
    return { receiptNumber: application.paymentReceiptNo, base64Pdf: this.stringValue(response.base64pdf ?? this.content(response).base64pdf) };
  }

  async receiveCallback(payload: JsonRecord, requestId: string) {
    const refNo = this.stringValue(payload.refNo);
    if (!refNo) throw new DomainException('BIRMS_REFERENCE_REQUIRED', 'refNo is required.', 400);
    const application = await this.applications.findOneBy({ paymentReference: refNo });
    if (!application) throw new DomainException('PAYMENT_REFERENCE_NOT_FOUND', 'The payment reference is not recognized.', 404);
    const verified = await this.synchronize(application, requestId);
    if (verified.status === RegistrationPaymentStatus.Paid) {
      const receiptNo = this.receiptNumber(payload);
      await this.applications.update(application.id, {
        paymentReceiptNo: receiptNo || application.paymentReceiptNo,
        paymentMethod: this.stringValue(payload.paymentMethod) || application.paymentMethod,
        paymentProviderDetails: { ...(application.paymentProviderDetails || {}), callback: payload },
        paymentUpdatedAt: new Date(),
      });
    }
    return { statusCode: '200', statusDescription: 'Payment Details received successfully' };
  }

  async receiveReversal(payload: JsonRecord, requestId: string) {
    const receiptNo = this.stringValue(payload.receiptNo);
    if (!receiptNo) throw new DomainException('BIRMS_RECEIPT_REQUIRED', 'receiptNo is required.', 400);
    const application = await this.applications.findOneBy({ paymentReceiptNo: receiptNo });
    if (!application) throw new DomainException('PAYMENT_RECEIPT_NOT_FOUND', 'The payment receipt is not recognized.', 404);
    const verified = await this.synchronize(application, requestId);
    if (![RegistrationPaymentStatus.Reversed, RegistrationPaymentStatus.Cancelled].includes(verified.status)) {
      throw new DomainException('BIRMS_REVERSAL_NOT_VERIFIED', 'BIRMS still reports this payment as paid.', 409);
    }
    await this.dataSource.transaction(async manager => {
      const locked = await manager.findOneByOrFail(ApplicationEntity, { id: application.id });
      locked.paymentProviderDetails = { ...(locked.paymentProviderDetails || {}), reversal: payload };
      locked.paymentUpdatedAt = new Date();
      await manager.save(locked);
      await this.event(manager, locked, 'BIRMS_PAYMENT_REVERSED', requestId, { receiptNo, reason: payload.cancelledReason });
    });
    return { statusCode: '200', statusDescription: 'Payment Details received successfully' };
  }

  private async synchronize(application: ApplicationEntity, requestId: string) {
    const response = await this.birmsRequest('GET', `/paymentdetails/referenceNumber/${encodeURIComponent(application.paymentReference!)}`);
    const content = this.content(response);
    const providerStatus = this.mapStatus(content.paymentStatus);
    return this.dataSource.transaction(async manager => {
      const locked = await manager.findOneByOrFail(ApplicationEntity, { id: application.id });
      const previous = locked.paymentStatus;
      const status = previous === RegistrationPaymentStatus.Paid && providerStatus === RegistrationPaymentStatus.Initiated
        ? RegistrationPaymentStatus.Reversed
        : providerStatus;
      locked.paymentStatus = status;
      locked.paymentMethod = this.stringValue(content.paymentMethod) || locked.paymentMethod;
      locked.paymentAdviceNo = this.stringValue(content.paymentAdviceNo ?? content.paymentAdviceno) || locked.paymentAdviceNo;
      locked.paymentReceiptNo = this.receiptNumber(content) || locked.paymentReceiptNo;
      locked.paymentProviderDetails = content;
      locked.paymentUpdatedAt = new Date();
      if (status === RegistrationPaymentStatus.Paid && previous !== RegistrationPaymentStatus.Paid) locked.paidAt = new Date();
      await manager.save(locked);
      if (previous !== status) await this.event(manager, locked, 'BIRMS_PAYMENT_STATUS_CHANGED', requestId, { previous, status });
      return this.publicPayment(locked);
    });
  }

  private async birmsRequest(method: 'GET' | 'POST', path: string, body?: JsonRecord) {
    const token = await this.token();
    const response = await fetch(`${this.baseUrl()}/${this.servicePath()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await this.json(response);
    if (!response.ok) throw new DomainException('BIRMS_REQUEST_FAILED', this.providerMessage(data, `BIRMS returned HTTP ${response.status}.`), 502);
    return data;
  }

  private async token() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    const response = await fetch(`${this.baseUrl()}/core-module/api/v1/auth/external-users/logMeIn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.required('BIRMS_USERNAME'), password: this.required('BIRMS_PASSWORD') }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await this.json(response);
    if (!response.ok) throw new DomainException('BIRMS_AUTHENTICATION_FAILED', this.providerMessage(data, 'Unable to authenticate with BIRMS.'), 502);
    const content = this.content(data);
    const tokenDto = (content.tokenDto && typeof content.tokenDto === 'object' ? content.tokenDto : content) as JsonRecord;
    const token = this.stringValue(tokenDto.accessToken);
    if (!token) throw new DomainException('BIRMS_AUTHENTICATION_INVALID', 'BIRMS did not return an access token.', 502);
    this.accessToken = token;
    this.accessTokenExpiresAt = Date.now() + 25 * 60 * 1000;
    return token;
  }

  /**
   * BIRMS is a live payment gateway, so this deliberately has no default. It used to
   * fall back to the staging host, which meant a deployment that simply forgot to
   * set BIRMS_BASE_URL would take real registration payments to a test system and
   * look like it was working. An unset or malformed value now fails the request the
   * same way a missing BIRMS_AGENCY_CODE already did, and the startup check in
   * main.ts refuses to boot a production service without it at all.
   *
   * assertRedirectUrl() pins the redirect BIRMS returns to this hostname, so the
   * value is also the trust anchor for where a payer's browser is sent.
   */
  private baseUrl() {
    const configured = this.required('BIRMS_BASE_URL');
    let url: URL;
    try { url = new URL(configured); } catch { throw new DomainException('BIRMS_NOT_CONFIGURED', 'BIRMS setting BIRMS_BASE_URL is not a valid absolute URL.', 503); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new DomainException('BIRMS_NOT_CONFIGURED', 'BIRMS setting BIRMS_BASE_URL must use http or https.', 503);
    }
    if (url.protocol !== 'https:' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new DomainException('BIRMS_NOT_CONFIGURED', 'BIRMS setting BIRMS_BASE_URL must use https in production.', 503);
    }
    return configured.replace(/\/$/, '');
  }
  private servicePath() { return (this.config.get<string>('BIRMS_SERVICE_PATH') || 'moha-service/api/v1').replace(/^\/+|\/+$/g, ''); }
  private required(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value) throw new DomainException('BIRMS_NOT_CONFIGURED', `Required BIRMS setting ${key} is missing.`, 503);
    return value;
  }
  private referenceFor(id: string) { return `DSTS-${id.replace(/-/g, '').toUpperCase()}`; }
  private content(payload: JsonRecord): JsonRecord { return payload.content && typeof payload.content === 'object' ? payload.content as JsonRecord : payload; }
  private stringValue(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  private providerMessage(payload: JsonRecord, fallback: string) { return this.stringValue(payload.message) || fallback; }
  private profileString(profile: JsonRecord, keys: string[]) { for (const key of keys) { const value = this.stringValue(profile[key]); if (value) return value; } return null; }
  private receiptNumber(content: JsonRecord) {
    const direct = this.stringValue(content.receiptNo);
    if (direct) return direct;
    const list = content.receiptList ?? content.receiptLists;
    return Array.isArray(list) && list[0] && typeof list[0] === 'object' ? this.stringValue((list[0] as JsonRecord).receiptNo) : null;
  }
  private mapStatus(value: unknown) {
    const status = String(value || 'PENDING').toUpperCase().replace(/\s+/g, '_');
    if (['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(status)) return RegistrationPaymentStatus.Paid;
    if (['CANCELLED', 'CANCELED'].includes(status)) return RegistrationPaymentStatus.Cancelled;
    if (['REVERSED', 'BOUNCED', 'CHEQUE_BOUNCED'].includes(status)) return RegistrationPaymentStatus.Reversed;
    if (['FAILED', 'FAILURE'].includes(status)) return RegistrationPaymentStatus.Failed;
    return RegistrationPaymentStatus.Initiated;
  }
  private assertRedirectUrl(value: string) {
    let url: URL;
    try { url = new URL(value); } catch { throw new DomainException('BIRMS_REDIRECT_INVALID', 'BIRMS returned an invalid redirect URL.', 502); }
    const allowedHost = new URL(this.baseUrl()).hostname;
    if (url.protocol !== 'https:' || url.hostname !== allowedHost) throw new DomainException('BIRMS_REDIRECT_INVALID', 'BIRMS returned an untrusted redirect URL.', 502);
  }
  private async json(response: Response): Promise<JsonRecord> {
    try { return await response.json() as JsonRecord; } catch { throw new DomainException('BIRMS_RESPONSE_INVALID', 'BIRMS returned an unreadable response.', 502); }
  }
  private ownedApplication(id: string, userId: string) {
    return this.applications.findOneBy({ id }).then(application => {
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (application.testTakerUserId !== userId) throw new DomainException('APPLICATION_FORBIDDEN', 'You may only pay for your own application.', 403);
      return application;
    });
  }
  private publicPayment(application: ApplicationEntity) {
    return {
      applicationId: application.id, status: application.paymentStatus, amount: application.paymentAmount,
      currency: application.paymentCurrency, reference: application.paymentReference, adviceNumber: application.paymentAdviceNo,
      redirectUrl: application.paymentRedirectUrl, receiptNumber: application.paymentReceiptNo, method: application.paymentMethod,
      paidAt: application.paidAt, updatedAt: application.paymentUpdatedAt,
    };
  }
  private event(manager: EntityManager, application: ApplicationEntity, eventType: string, correlationId: string, payload: JsonRecord) {
    return manager.save(OutboxEventEntity, manager.create(OutboxEventEntity, {
      eventType, aggregateId: application.id, correlationId,
      payload: { applicationId: application.id, examId: application.examId, testTakerUserId: application.testTakerUserId, ...payload },
    }));
  }
}
