/** Local phonetic assistance only, never a verification of a person's official spelling. */
const COMMON_NAMES: Record<string, string> = {
 wangchuk:'དབང་ཕྱུག་', wangchuck:'དབང་ཕྱུག་', dema:'སྒྲོལ་མ་', dolma:'སྒྲོལ་མ་',
 dorji:'རྡོ་རྗེ་', dorje:'རྡོ་རྗེ་', tshering:'ཚེ་རིང་', tsering:'ཚེ་རིང་',
 tashi:'བཀྲ་ཤིས་', karma:'ཀརྨ་', sonam:'བསོད་ནམས་', pema:'པདྨ་', padma:'པདྨ་',
 kinley:'ཀུན་ལེགས་', kunley:'ཀུན་ལེགས་', namgay:'རྣམ་རྒྱལ་', namgyal:'རྣམ་རྒྱལ་',
 phurpa:'ཕུར་པ་', phurba:'ཕུར་པ་', wangmo:'དབང་མོ་', yangchen:'དབྱངས་ཅན་',
 jigme:'འཇིགས་མེད་', jigmi:'འཇིགས་མེད་', thinley:'ཕྲིན་ལས་', trinley:'ཕྲིན་ལས་',
 dechen:'བདེ་ཆེན་', sangay:'སངས་རྒྱས་', sangye:'སངས་རྒྱས་',
 ugyen:'ཨོ་རྒྱན་', druk:'འབྲུག་', chencho:'ཆེན་ཆོ་', choden:'ཆོས་ལྡན་',
 choeidon:'ཆོས་སྒྲོན་', choying:'ཆོས་དབྱིངས་', tshewang:'ཚེ་དབང་',
 choki:'ཆོས་སྐྱིད་', chogyal:'ཆོས་རྒྱལ་', zangmo:'བཟང་མོ་',
 lhamo:'ལྷ་མོ་', lhendup:'ལྷུན་གྲུབ་', lhndup:'ལྷུན་གྲུབ་',
 khandu:'མཁའ་འགྲོ་', khandro:'མཁའ་འགྲོ་', rinchen:'རིན་ཆེན་',
 tenzin:'བསྟན་འཛིན་', tenzing:'བསྟན་འཛིན་', kesang:'སྐལ་བཟང་',
 kelzang:'སྐལ་བཟང་', chime:'འཆི་མེད་', chimi:'འཆི་མེད་',
 yeshey:'ཡེ་ཤེས་', yeshe:'ཡེ་ཤེས་', yonten:'ཡོན་ཏན་',
 pem:'པདྨ་', norbu:'ནོར་བུ་', zangpo:'བཟང་པོ་', nima:'ཉི་མ་', nimaa:'ཉི་མ་',
 aakash:'ཨ་ཀཱཤ་', akash:'ཨ་ཀཱཤ་', pradhan:'པྲ་དྷཱན་',
};
const ONSETS: Record<string,string> = {tsh:'ཚ',chh:'ཆ',kh:'ཁ',gh:'ག',ch:'ཆ',sh:'ཤ',th:'ཐ',dh:'ད',ph:'ཕ',bh:'བ',ng:'ང',ny:'ཉ',ts:'ཙ',dz:'ཛ',k:'ཀ',g:'ག',c:'ཀ',q:'ཀ',j:'ཇ',t:'ཏ',d:'ད',n:'ན',p:'པ',b:'བ',m:'མ',y:'ཡ',r:'ར',l:'ལ',w:'ཝ',v:'ཝ',s:'ས',h:'ཧ',f:'ཕ',z:'ཟ',x:'ཀས'};
const VOWELS: Record<string,string> = {a:'',aa:'ཱ',i:'ི',ee:'ི',e:'ེ',ai:'ཻ',ay:'ེ',o:'ོ',oo:'ུ',u:'ུ',au:'ཽ',ou:'ཽ'};
const onsetKeys=Object.keys(ONSETS).sort((a,b)=>b.length-a.length);
const vowelKeys=Object.keys(VOWELS).sort((a,b)=>b.length-a.length);
function phonetic(word: string) {
 let pos=0;const syllables:string[]=[];
 while(pos<word.length){
  const onset=onsetKeys.find(key=>word.startsWith(key,pos));
  let syllable=onset?ONSETS[onset]:'ཨ';if(onset)pos+=onset.length;
  const vowel=vowelKeys.find(key=>word.startsWith(key,pos));
  if(vowel){syllable+=VOWELS[vowel];pos+=vowel.length;
   const coda=onsetKeys.find(key=>word.startsWith(key,pos));
   if(coda && (pos+coda.length===word.length || !vowelKeys.some(key=>word.startsWith(key,pos+coda.length)))){syllable+=ONSETS[coda];pos+=coda.length;}
  } else if(!onset){throw new Error('Unsupported name character.');}
  syllables.push(syllable+'་');
 }
 return syllables.join('');
}
export function transliterateName(name: string) {
 const original=name.trim().normalize('NFC');
 if(!original || original.length>160)throw new Error('Name must contain 1 to 160 characters.');
 if(/^[\u0F00-\u0FFF\s]+$/.test(original))return {englishName:original,dzongkhaName:original,method:'provided' as const,isVerified:false,requiresReview:false,approximateParts:[] as string[]};
 if(!/^[A-Za-z .’'\-]+$/.test(original))throw new Error('Use English letters, spaces, apostrophes, hyphens or periods.');
 const parts=original.toLowerCase().replace(/[’'.]/g,'').split(/[\s-]+/).filter(Boolean);
 if(!parts.length)throw new Error('Name must include letters.');
 const approximateParts=parts.filter(part=>!Object.hasOwn(COMMON_NAMES,part));
 return {englishName:original,dzongkhaName:parts.map(part=>Object.hasOwn(COMMON_NAMES,part)?COMMON_NAMES[part]:phonetic(part)).join(' '),method:approximateParts.length?'phonetic' as const:'dictionary' as const,isVerified:false,requiresReview:true,approximateParts};
}
