import { ConfigService } from '@nestjs/config';
import { CertificateSourceClientService } from '../../../apps/appeal-certificate-service/src/certificate-source-client.service';

describe('optional certificate holder photo', () => {
 afterEach(() => jest.restoreAllMocks());
 const service = () => new CertificateSourceClientService(new ConfigService({INTERNAL_SERVICE_SECRET:'a'.repeat(32)}));
 it('preserves archived certificate downloads when only the optional profile photo is missing', async () => {
  jest.spyOn(global,'fetch').mockResolvedValue({ok:false,status:404,json:async()=>({success:false,error:{code:'USER_NOT_FOUND'}})} as Response);
  await expect(service().photo('archived-holder')).resolves.toEqual({photo:null});
 });
 it('does not hide authentication failures', async () => {
  jest.spyOn(global,'fetch').mockResolvedValue({ok:false,status:401,json:async()=>({success:false,error:{code:'INTERNAL_SERVICE_UNAUTHORIZED'}})} as Response);
  await expect(service().photo('holder')).rejects.toMatchObject({response:{code:'INTERNAL_SERVICE_UNAUTHORIZED'}});
 });
});
