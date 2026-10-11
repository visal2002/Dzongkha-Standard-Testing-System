import { transliterateName } from '../../../apps/appeal-certificate-service/src/name-transliteration';
describe('local name transliteration',()=>{
 it('uses conventional spellings with case-insensitive matching',()=>{expect(transliterateName(' Wangchuk Dema ').dzongkhaName).toBe('དབང་ཕྱུག་ སྒྲོལ་མ་');expect(transliterateName('TSHERING DORJI').method).toBe('dictionary');});
 it('generates a flagged approximation for unknown names without Latin letters',()=>{const result=transliterateName('Alex Smith');expect(result.method).toBe('phonetic');expect(result.isVerified).toBe(false);expect(result.requiresReview).toBe(true);expect(result.dzongkhaName).toMatch(/^[\u0F00-\u0FFF\s]+$/);});
 it('does not resolve inherited object properties as names',()=>expect(transliterateName('Constructor').dzongkhaName).toMatch(/^[\u0F00-\u0FFF\s]+$/));
 it('accepts a provided Dzongkha spelling unchanged',()=>expect(transliterateName('བཀྲ་ཤིས་').dzongkhaName).toBe('བཀྲ་ཤིས་'));
 it.each(['','123','---','<script>','x'.repeat(161)])('rejects invalid input %s',name=>expect(()=>transliterateName(name)).toThrow());
 it('supports hyphens, apostrophes and initials',()=>expect(transliterateName("T. O'Neil-Wangchuk").dzongkhaName).toMatch(/^[\u0F00-\u0FFF\s]+$/));
});
