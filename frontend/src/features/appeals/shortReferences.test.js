import { it, expect } from 'vitest';
import { shortReferences, addAppealReferences } from './shortReferences';
it('shortens UUIDs without changing stored identifiers',()=>{
 const id='8b089453-461e-4ef7-a9a1-d00e54ebc62c', applicationId='53d74291-1aa3-4953-8524-d6114d43499c';
 const [item]=addAppealReferences([{id,applicationId}]);
 expect(item).toEqual({id,applicationId,requestReference:'RE-8B089453',applicationReference:'APP-53D74291'});
});
it('keeps repeated applications consistent and references independent of row order',()=>{
 const data=[{id:'12345678-aaaa',applicationId:'abcdef12-aaaa'},{id:'23456789-bbbb',applicationId:'abcdef12-aaaa'}];
 expect(addAppealReferences(data)[0].applicationReference).toBe(addAppealReferences(data)[1].applicationReference);
 expect(addAppealReferences([...data].reverse()).map(item=>item.requestReference)).toEqual(addAppealReferences(data).map(item=>item.requestReference).reverse());
});
it('extends colliding prefixes so different records remain distinguishable',()=>{
 const a='12345678-aaaa-4000-8000-000000000001', b='12345678-bbbb-4000-8000-000000000002';
 const refs=shortReferences([a,b],'RE');
 expect(refs[a]).toBe('RE-12345678AA');expect(refs[b]).toBe('RE-12345678BB');
});
