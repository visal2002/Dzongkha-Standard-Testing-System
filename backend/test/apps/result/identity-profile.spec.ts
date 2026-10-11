import { ConfigService } from '@nestjs/config';
import { IdentityClientService } from '../../../apps/result-service/src/identity-client.service';
describe('score display profiles',()=>{
 const client=()=>new IdentityClientService(new ConfigService({INTERNAL_SERVICE_SECRET:'a'.repeat(32),REGISTRATION_SERVICE_URL:'http://registration/api/v1'}));
 afterEach(()=>jest.restoreAllMocks());
 it('retains the actual registration number and deduplicates application lookups',async()=>{
  const fetch=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({data:{fullName:'QA Name',cid:'11200000000',registrationNumber:'ཀ-༢༦-༠༠༡'}})} as Response);
  expect((await client().applicationProfilesFor(['app','app'])).get('app')).toEqual({name:'QA Name',cid:'11200000000',registrationNumber:'ཀ-༢༦-༠༠༡'});
  expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not invent a registration number when the source is unavailable',async()=>{
  jest.spyOn(global,'fetch').mockResolvedValue({ok:false} as Response);
  expect((await client().applicationProfilesFor(['app'])).size).toBe(0);
 });
});
