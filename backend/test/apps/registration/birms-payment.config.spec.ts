/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * DSTS-05: BirmsPaymentService.baseUrl() used to fall back to
 * https://birmsstagging.drc.gov.bt/api-services whenever BIRMS_BASE_URL was unset,
 * so a deployment that forgot the variable would take live registration payments to
 * the staging gateway and appear to work.
 *
 * The BIRMS service is never contacted here: fetch is replaced for the whole suite,
 * and the assertions are about which URL the service would have called and whether
 * it refuses to call one at all.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { DomainException } from '@dzongjuk/common';
import { BirmsPaymentService } from '../../../apps/registration-service/src/birms-payment.service';
import { ApplicationEntity, RegistrationPaymentStatus } from '../../../apps/registration-service/src/entities';

const STAGING_HOST = 'birmsstagging.drc.gov.bt';

const settings = (overrides: Record<string, string | undefined>): Record<string, string | undefined> => ({
  BIRMS_USERNAME: 'dsts-service-account',
  BIRMS_PASSWORD: 'dsts-service-password',
  BIRMS_PLATFORM: 'DSTS',
  BIRMS_AGENCY_CODE: 'AG-001',
  BIRMS_SERVICE_CODE: 'SV-001',
  BIRMS_SERVICE_PATH: 'moha-service/api/v1',
  NODE_ENV: 'test',
  ...overrides,
});

const configFor = (overrides: Record<string, string | undefined>) => {
  const values = settings(overrides);
  return { get: (key: string) => values[key] } as unknown as ConfigService;
};

/** An application that is ready for a payment advice, so createAdvice() reaches the HTTP call. */
const payableApplication = () =>
  Object.assign(new ApplicationEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    examId: '22222222-2222-4222-8222-222222222222',
    testTakerUserId: 'user-1',
    identityKey: 'CID-10701000001',
    profileSnapshot: { fullName: 'Tenzin Dorji', cid: 'CID-10701000001', email: 'tenzin@example.bt' },
    status: 'VERIFIED',
    paymentStatus: RegistrationPaymentStatus.Initiated,
    paymentAmount: '500',
    paymentCurrency: 'BTN',
    paymentAdviceNo: null,
    paymentRedirectUrl: null,
    paymentReference: null,
    paymentProviderDetails: null,
  });

/** Records every URL requested and answers with a well-formed BIRMS payload. */
function stubFetch(redirectHost: string) {
  const calls: string[] = [];
  const respond = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  const fetchMock = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('logMeIn')) return respond({ content: { tokenDto: { accessToken: 'stub-token' } } });
    return respond({
      content: {
        paymentAdviceNo: 'ADV-1',
        redirectUrl: `https://${redirectHost}/pay/ADV-1`,
        paymentStatus: 'PENDING',
      },
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return calls;
}

function serviceFor(config: ConfigService) {
  const application = payableApplication();
  const applications = {
    findOneBy: jest.fn().mockResolvedValue(application),
  } as unknown as Repository<ApplicationEntity>;
  const dataSource = {
    transaction: jest.fn(async (runner: (manager: unknown) => Promise<unknown>) =>
      runner({
        findOne: jest.fn().mockResolvedValue(application),
        save: jest.fn(async (entity: unknown) => entity),
        create: jest.fn((_entity: unknown, fields: unknown) => fields),
      }),
    ),
  } as unknown as DataSource;
  return new BirmsPaymentService(config, dataSource, applications);
}

const createAdvice = (config: ConfigService) => serviceFor(config).createAdvice('11111111-1111-4111-8111-111111111111', 'user-1', 'req-1');

/**
 * DomainException carries its code in the HttpException response body rather than as
 * an own property, so assertions go through getResponse()/getStatus().
 */
async function rejectionOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const exception = error as DomainException;
    return { code: (exception.getResponse() as { code: string }).code, status: exception.getStatus() };
  }
  throw new Error('expected the call to reject, but it resolved');
}

describe('DSTS-05: BIRMS_BASE_URL has no staging fallback', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('calls the configured host when BIRMS_BASE_URL is a valid URL', async () => {
    const calls = stubFetch('birms.example.gov.bt');
    await createAdvice(configFor({ BIRMS_BASE_URL: 'https://birms.example.gov.bt/api-services' }));
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call.startsWith('https://birms.example.gov.bt/')).toBe(true);
  });

  it('tolerates a configured URL with a trailing slash', async () => {
    const calls = stubFetch('birms.example.gov.bt');
    await createAdvice(configFor({ BIRMS_BASE_URL: 'https://birms.example.gov.bt/api-services/' }));
    expect(calls.some((call) => call.includes('//api-services'))).toBe(false);
    expect(calls.every((call) => call.startsWith('https://birms.example.gov.bt/api-services/'))).toBe(true);
  });

  it('refuses the request when BIRMS_BASE_URL is missing, instead of falling back to staging', async () => {
    const calls = stubFetch(STAGING_HOST);
    expect(await rejectionOf(createAdvice(configFor({ BIRMS_BASE_URL: undefined })))).toEqual({
      code: 'BIRMS_NOT_CONFIGURED',
      status: 503,
    });
    // The decisive assertion: nothing was sent anywhere, least of all to staging.
    expect(calls).toHaveLength(0);
  });

  it('refuses an empty BIRMS_BASE_URL', async () => {
    const calls = stubFetch(STAGING_HOST);
    expect((await rejectionOf(createAdvice(configFor({ BIRMS_BASE_URL: '   ' })))).code).toBe('BIRMS_NOT_CONFIGURED');
    expect(calls).toHaveLength(0);
  });

  it('refuses a malformed BIRMS_BASE_URL', async () => {
    const calls = stubFetch(STAGING_HOST);
    expect((await rejectionOf(createAdvice(configFor({ BIRMS_BASE_URL: 'not-a-url' })))).code).toBe('BIRMS_NOT_CONFIGURED');
    expect(calls).toHaveLength(0);
  });

  it('refuses a non-http scheme', async () => {
    const calls = stubFetch(STAGING_HOST);
    expect((await rejectionOf(createAdvice(configFor({ BIRMS_BASE_URL: 'ftp://birms.example.gov.bt' })))).code).toBe('BIRMS_NOT_CONFIGURED');
    expect(calls).toHaveLength(0);
  });

  it('refuses a plain-http BIRMS endpoint when NODE_ENV is production', async () => {
    const calls = stubFetch(STAGING_HOST);
    const rejection = await rejectionOf(
      createAdvice(configFor({ BIRMS_BASE_URL: 'http://birms.example.gov.bt/api-services', NODE_ENV: 'production' })),
    );
    expect(rejection.code).toBe('BIRMS_NOT_CONFIGURED');
    expect(calls).toHaveLength(0);
  });

  it('still rejects a redirect URL that does not belong to the configured host', async () => {
    // assertRedirectUrl() anchors on baseUrl(), so removing the fallback must not
    // have weakened the existing open-redirect check.
    stubFetch('attacker.example.com');
    expect((await rejectionOf(createAdvice(configFor({ BIRMS_BASE_URL: 'https://birms.example.gov.bt/api-services' })))).code).toBe(
      'BIRMS_REDIRECT_INVALID',
    );
  });

  it('no longer contains the staging host anywhere in the service source', () => {
    const source = readFileSync(join(__dirname, '..', '..', '..', 'apps', 'registration-service', 'src', 'birms-payment.service.ts'), 'utf8');
    expect(source).not.toContain(STAGING_HOST);
  });
});
