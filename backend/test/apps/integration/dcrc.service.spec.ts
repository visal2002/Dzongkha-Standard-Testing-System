/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { DcrcLookupAuditEntity } from '../../../apps/integration-service/src/dcrc.entity';
import { DcrcService } from '../../../apps/integration-service/src/dcrc.service';

const cid = '10701000001';
const auditId = '00000000-0000-4000-8000-000000000010';

function build() {
  const saved: Partial<DcrcLookupAuditEntity>[] = [];
  const audits = {
    create: jest.fn((input: Partial<DcrcLookupAuditEntity>) => ({ ...input, id: auditId })),
    save: jest.fn(async (input: Partial<DcrcLookupAuditEntity>) => { saved.push(input); return input; }),
  } as unknown as Repository<DcrcLookupAuditEntity>;
  const config = new ConfigService({
    DCRC_TOKEN_URL: 'https://sso.test/token',
    DCRC_CITIZEN_URL: 'https://data.test/citizens',
    DCRC_CONSUMER_KEY: 'consumer-key',
    DCRC_CONSUMER_SECRET: 'consumer-secret',
    DCRC_HTTP_TIMEOUT_MS: '5000',
  });
  return { service: new DcrcService(config, audits), saved };
}

describe('DcrcService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('matches a nested citizen record and stores only a CID hash in the audit', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ citizenDetailsResponse: { citizenDetail: [{
        cid, firstName: 'Karma', lastName: 'Dorji', dateOfBirth: '1990-05-07',
      }] } }), { status: 200 }));
    const { service, saved } = build();

    const result = await service.verifyCitizenTrusted(cid, {
      applicationId: '00000000-0000-4000-8000-000000000011',
      requestedByUserId: '00000000-0000-4000-8000-000000000012',
      profile: { fullName: '  KARMA   DORJI ', dob: '07/05/1990' },
    }, 'request-1');

    expect(result).toEqual({ lookupId: auditId, verified: true, matchedFields: ['cid', 'fullName', 'dateOfBirth'], mismatchFields: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(saved[0]).toMatchObject({ status: 'MATCHED', providerHttpStatus: 200 });
    expect(saved[0].cidHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(saved[0])).not.toContain(cid);
  });

  it('returns a privacy-safe mismatch result when submitted details differ', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cid, fullName: 'Pema Choden' }), { status: 200 }));
    const { service, saved } = build();

    const result = await service.verifyCitizenTrusted(cid, { profile: { fullName: 'Different Person' } }, 'request-2');

    expect(result.verified).toBe(false);
    expect(result.mismatchFields).toEqual(['fullName']);
    expect(saved[0]).toMatchObject({ status: 'MISMATCH', matchedFields: ['cid'], mismatchFields: ['fullName'] });
  });

  it('returns only approved registration fields for automatic form population', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        cidNo: cid, firstName: 'Karma', middleName: 'P.', lastName: 'Dorji', dob: '19900507',
        sex: 'Male', mobileNumber: '17123456', dzongkhagName: 'Thimphu', gewogName: 'Chang', fatherName: 'Not returned',
      } }), { status: 200 }));
    const { service, saved } = build();

    const result = await service.lookupCitizenTrusted(cid, {}, 'request-lookup');

    expect(result).toEqual({
      lookupId: auditId, cid, fullName: 'Karma P. Dorji', dateOfBirth: '1990-05-07',
      gender: 'Male', phone: '17123456', dzongkhag: 'Thimphu', gewog: 'Chang', source: 'DCRC',
    });
    expect(result).not.toHaveProperty('fatherName');
    expect(saved[0]).toMatchObject({ status: 'MATCHED', providerHttpStatus: 200 });
  });

  it('audits a rejected OAuth client without storing credentials or raw CID', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 }));
    const { service, saved } = build();

    await expect(service.verifyCitizenTrusted(cid, {}, 'request-3'))
      .rejects.toMatchObject({ response: { code: 'DCRC_TOKEN_REJECTED' } });
    expect(saved[0]).toMatchObject({ status: 'FAILED', providerHttpStatus: null });
    const serialized = JSON.stringify(saved[0]);
    expect(serialized).not.toContain(cid);
    expect(serialized).not.toContain('consumer-secret');
  });
});
