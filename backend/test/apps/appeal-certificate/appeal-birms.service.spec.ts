import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AppealStatus } from '@dzongjuk/contracts';
import { AppealBirmsService } from '../../../apps/appeal-certificate-service/src/appeal-birms.service';
import { AppealService } from '../../../apps/appeal-certificate-service/src/appeal.service';
import { CertificateSourceClientService } from '../../../apps/appeal-certificate-service/src/certificate-source-client.service';
import { AppealEntity, PaymentEntity, PaymentEventEntity, PaymentStatus, ReconciliationStatus } from '../../../apps/appeal-certificate-service/src/entities';

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
}) as unknown as Response;

describe('AppealBirmsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates appeal payment advice with the active DCDD service from the supplied BIRMS record', async () => {
    const appeal = Object.assign(new AppealEntity(), {
      id: '20000000-0000-4000-8000-000000000001',
      applicationId: '20000000-0000-4000-8000-000000000002',
      testTakerUserId: '20000000-0000-4000-8000-000000000003',
      paymentId: '20000000-0000-4000-8000-000000000004',
      status: AppealStatus.Submitted,
    });
    const payment = Object.assign(new PaymentEntity(), {
      id: appeal.paymentId,
      referenceId: appeal.id,
      amount: '500.00',
      currency: 'BTN',
      status: PaymentStatus.Initiated,
      reconciliationStatus: ReconciliationStatus.Pending,
      paymentAdviceNo: null,
      paymentRedirectUrl: null,
    });
    const appeals = { findOneBy: jest.fn().mockResolvedValue(appeal) } as unknown as Repository<AppealEntity>;
    const payments = {
      findOneBy: jest.fn().mockResolvedValue(payment),
      save: jest.fn().mockImplementation(async (value: PaymentEntity) => value),
    } as unknown as Repository<PaymentEntity>;
    const events = {
      create: jest.fn().mockImplementation((value: PaymentEventEntity) => value),
      save: jest.fn().mockImplementation(async (value: PaymentEventEntity) => value),
    } as unknown as Repository<PaymentEventEntity>;
    const sources = {
      profile: jest.fn().mockResolvedValue({
        cid: '10000000000', fullName: 'Test User', email: 'test@example.com', phone: '17000000',
      }),
    } as unknown as CertificateSourceClientService;
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ content: { tokenDto: { accessToken: 'test-token' } } }))
      .mockResolvedValueOnce(response({ content: {
        paymentAdviceNo: 'PA-100', redirectUrl: 'https://birmsstagging.drc.gov.bt/pay/PA-100', paymentStatus: 'PENDING',
      } }));
    const service = new AppealBirmsService(
      new ConfigService({
        BIRMS_BASE_URL: 'https://birmsstagging.drc.gov.bt/api-services',
        BIRMS_SERVICE_PATH: 'moha-service/api/v1', BIRMS_PLATFORM: 'Dzongjuk',
        BIRMS_USERNAME: 'configured-user', BIRMS_PASSWORD: 'configured-password',
        BIRMS_AGENCY_CODE: '1212', BIRMS_SERVICE_CODE: '100621',
        BIRMS_SERVICE_DESCRIPTION: 'Re-evaluation/Appeal for recheck of Exam Paper',
      }),
      sources,
      {} as AppealService,
      appeals,
      payments,
      events,
    );

    const result = await service.createAdvice(appeal.id, appeal.testTakerUserId, 'request-1');
    const createRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const payload = JSON.parse(String(createRequest.body)) as {
      agencyCode: string;
      paymentLists: Array<{ serviceCode: string; description: string; payableAmount: string }>;
    };

    expect(payload.agencyCode).toBe('1212');
    expect(payload.paymentLists).toEqual([{
      serviceCode: '100621',
      description: 'Re-evaluation/Appeal for recheck of Exam Paper',
      payableAmount: '500.00',
    }]);
    expect(result).toMatchObject({ adviceNumber: 'PA-100', status: PaymentStatus.Initiated });
  });
});
