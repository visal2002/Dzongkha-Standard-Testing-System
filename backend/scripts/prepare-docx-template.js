/**
 * Replaces sample/hardcoded values in the DSTS Certificate DOCX template
 * with docxtemplater {placeholder} tags so the renderer can inject real data.
 *
 * Run once:  node scripts/prepare-docx-template.js
 *
 * Input:  apps/appeal-certificate-service/assets/DSTS_Certificate_Template.docx
 * Output: apps/appeal-certificate-service/assets/DSTS_Certificate_Template.docx (overwritten)
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  'apps',
  'appeal-certificate-service',
  'assets',
  'DSTS_Certificate_Template.docx',
);

const content = fs.readFileSync(TEMPLATE_PATH);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// ── Name fields ───────────────────────────────────────────────────────────────
// Dzongkha name (Tibetan script transliteration) — replace བསོད་ནམས་རིན་ཆེན། with placeholder
xml = xml.replace(
  /བསོད་ནམས་རིན་ཆེན<\/w:t><\/w:r><w:proofErr w:type="spellEnd"\/><w:r><w:rPr>[^<]*<w:rFonts[^/]*\/><\/w:rPr><w:t>།/,
  '{holderNameDz}</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Microsoft Himalaya" w:eastAsia="Microsoft Himalaya" w:hAnsi="Microsoft Himalaya" w:cs="Microsoft Himalaya"/></w:rPr><w:t> ',
);
// Fallback simpler replacement if proofErr is not present
xml = xml.replace('བསོད་ནམས་རིན་ཆེན།', '{holderNameDz}');

// English name "Sonam Rinchen" — split across two runs with a proofErr in between.
// The exact XML structure is: <w:t xml:space="preserve">Sonam </w:t></w:r><w:proofErr .../><w:r><w:rPr>...</w:rPr><w:t>Rinchen</w:t></w:r><w:proofErr .../>
// Replace both runs + proofErr markers with a single run containing the placeholder.
xml = xml.replace(
  '<w:t xml:space="preserve">Sonam </w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>Rinchen</w:t></w:r><w:proofErr w:type="spellEnd"/>',
  '<w:t>{holderName}</w:t>',
);
// Fallback
xml = xml.replace('Sonam Rinchen', '{holderName}');

// ── CID fields ────────────────────────────────────────────────────────────────
// Tibetan CID digits ༡༡༦༠༤༠༠༠༩༣༣
xml = xml.replace('༡༡༦༠༤༠༠༠༩༣༣', '{cidDz}');
// Arabic CID digits
xml = xml.replace('11604000933', '{cid}');

// ── Date of Birth digits (8 Tibetan digits in tab-separated cells) ────────────
// The DOB frame at y=6352 has 8 Tibetan digits: ༠༡༡༡༡༩༩༨ (01/11/1998)
// Each digit is in its own <w:t> tag with blue color, separated by tabs.
// We need to replace each digit with a placeholder.
// DOB digits are: ༠ ༡ ༡ ༡ ༡ ༩ ༩ ༨
// We'll replace the whole frame content with placeholders {dob1} through {dob8}

const DOB_TIBETAN_DIGITS = ['༠', '༡', '༡', '༡', '༡', '༩', '༩', '༨'];
const DSTS_NO_TIBETAN = ['ཀ', '༠', '༤', '༠'];
const EXAM_DATE_TIBETAN = ['༣', '༡', '༡', '༢', '༢', '༠', '༢', '༥'];
const VALIDITY_TIBETAN = ['༢', '༣', '༠', '༡', '༢', '༠', '༢', '༩'];

// Individual score digits
const LISTENING_DIGIT = '༦';  // at y=9646
const READING_DIGIT = '༥';   // at y=10466
const WRITING_DIGIT = '༦';   // at y=11234
const SPEAKING_DIGIT = '༦';  // at y=11996

// Overall level
const OVERALL_TIBETAN_DIGIT = '༦'; // at y=9386
const OVERALL_ARABIC_DIGIT = '6';  // at y=10054

// Replace individual score cells - these are single-digit frames
// The frames have unique x,y positions we can use to identify them

// LISTENING score (x=3598, y=9646)
xml = xml.replace(
  /(<w:framePr[^>]*w:x="3598"[^>]*w:y="9646"[^>]*\/>)/,
  '$1'
);
// Find the Tibetan digit in LISTENING frame and replace
xml = xml.replace(
  /(w:y="9646"[^]*?<w:t>)༦(<\/w:t>)/,
  '$1{listeningScore}$2',
);

// READING score (x=3610, y=10466)
xml = xml.replace(
  /(w:y="10466"[^]*?<w:t>)༥(<\/w:t>)/,
  '$1{readingScore}$2',
);

// WRITING score (x=3598, y=11234)
xml = xml.replace(
  /(w:y="11234"[^]*?<w:t>)༦(<\/w:t>)/,
  '$1{writingScore}$2',
);

// SPEAKING score (x=3598, y=11996)
xml = xml.replace(
  /(w:y="11996"[^]*?<w:t>)༦(<\/w:t>)/,
  '$1{speakingScore}$2',
);

// OVERALL Tibetan (x=8278, y=9386)
xml = xml.replace(
  /(w:y="9386"[^]*?<w:t>)༦(<\/w:t>)/,
  '$1{overallScoreDz}$2',
);

// OVERALL Arabic (x=8280, y=10054)
xml = xml.replace(
  /(w:y="10054"[^]*?<w:t>)6(<\/w:t>)/,
  '$1{overallScore}$2',
);

// ── Replace DOB digit cells (y=6352 frame) ─────────────────────────────────
// Strategy: Replace each Tibetan digit in the DOB frame with {dobN}
// The frame at y=6352 contains tab-separated digits with color
function replaceDigitFrame(xmlStr, yPos, digits, prefix) {
  // Find the frame paragraph by its y position
  const frameRegex = new RegExp(
    `(w:y="${yPos}"[^]*?)(</w:p>)`,
    '',
  );
  const match = xmlStr.match(frameRegex);
  if (!match) {
    console.warn(`Frame at y=${yPos} not found`);
    return xmlStr;
  }

  let frameContent = match[1];
  let digitIndex = 0;

  // Replace each Tibetan digit with its placeholder
  // Digits are in <w:t>DIGIT</w:t> tags with blue color
  frameContent = frameContent.replace(
    /(<w:color w:val="3F78B5"\/>(?:[^<]*<[^>]*>)*?<w:t>)([^<]+)(<\/w:t>)/g,
    (m, before, digit, after) => {
      if (digitIndex < digits.length) {
        const placeholder = `{${prefix}${digitIndex + 1}}`;
        digitIndex++;
        return `${before}${placeholder}${after}`;
      }
      return m;
    },
  );

  return xmlStr.replace(match[1], frameContent);
}

xml = replaceDigitFrame(xml, '6352', DOB_TIBETAN_DIGITS, 'dob');
xml = replaceDigitFrame(xml, '7154', DSTS_NO_TIBETAN, 'dstsNo');
xml = replaceDigitFrame(xml, '7990', EXAM_DATE_TIBETAN, 'examDate');
xml = replaceDigitFrame(xml, '12040', VALIDITY_TIBETAN, 'validity');

// ── PHOTO placeholder ───────────────────────────────────────────────────────
// The PHOTO text at (8000, 4068) stays as-is — the renderer will replace the
// whole frame with an actual image when available.

// Save the modified template
zip.file('word/document.xml', xml);
const output = zip.generate({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
fs.writeFileSync(TEMPLATE_PATH, output);

console.log('Template prepared successfully with placeholders:');
console.log('  {holderName}, {holderNameDz}');
console.log('  {cid}, {cidDz}');
console.log('  {dob1}-{dob8}');
console.log('  {dstsNo1}-{dstsNo4} (or more)');
console.log('  {examDate1}-{examDate8}');
console.log('  {listeningScore}, {readingScore}, {writingScore}, {speakingScore}');
console.log('  {overallScore}, {overallScoreDz}');
console.log('  {validity1}-{validity8}');
