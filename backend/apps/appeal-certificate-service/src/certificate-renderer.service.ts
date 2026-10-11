/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash, randomUUID } from 'crypto';

// @pdf-lib/fontkit's complex-script shaper cannot correctly shape multi-glyph
// Tibetan clusters (vowel signs get dropped or substituted incorrectly), so we
// never draw new Dzongkha *words* with it — those come pre-shaped from the
// approved background artwork below. Isolated single Tibetan digits (no
// clustering/mark-attachment involved) shape correctly and are used for the
// score/date grids. The runtime still needs the regenerator polyfill for the
// shaper's generator functions.
import 'regenerator-runtime/runtime';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as libre from 'libreoffice-convert';
import { convertToPdfLocal } from './local-pdf-converter';
import { CertificateTemplateEntity } from './entities';
import { transliterateName } from './name-transliteration';
import { DomainException } from '@dzongjuk/common';


interface RenderCertificate {
  certificateNumber: string; holderName: string; holderNameDz?: string | null; registrationNumber: string; cid: string;
  dateOfBirth: Date; examDate: Date; issuedAt: Date; validUntil: Date;
  scores: Record<string, number>; skillStandards?: Record<string, number>; photo?: string | null; overallScore: string; bandLabel: string; cefrLevel: string | null; verificationUrl: string;
}

const TIBETAN_DIGITS = ['༠', '༡', '༢', '༣', '༤', '༥', '༦', '༧', '༨', '༩'];
const toTibetanDigits = (value: string) => value.replace(/[0-9]/g, (digit) => TIBETAN_DIGITS[Number(digit)]);
const asDdMmYyyy = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${date.getUTCFullYear()}`;

// Cell boundaries below are read directly off the approved DSTS certificate
// artwork (backend/apps/appeal-certificate-service/assets/certificate-background.pdf,
// a fixed 540x779.76pt page) so new value boxes line up exactly with the
// pre-printed bilingual labels baked into that background.
const PAGE_HEIGHT = 779.76;

// Verification QR placement, in PDF points measured from the page's bottom-left
// corner. It sits in the empty band above the signatures, hard against the right
// margin. Tweak these four numbers to move or resize the code:
//   X      distance from the left edge to the QR's left side
//   Y      distance from the bottom edge to the QR's bottom side
//   WIDTH  rendered QR width  (keep == HEIGHT so it stays square)
//   HEIGHT rendered QR height
const QR_BOX = { x: 448, y: 87, width: 66, height: 66 };

const INK = rgb(0.12, 0.12, 0.12);

@Injectable()
export class CertificateRendererService {
  private readonly logger = new Logger(CertificateRendererService.name);
  private assetCache = new Map<string, Buffer>();
  private pdfCache = new Map<string, { expiresAt: number; pdf: Promise<Buffer> }>();

  private asset(name: string) {
    const cached = this.assetCache.get(name);
    if (cached) return cached;
    const bytes = readFileSync(join(__dirname, '..', 'assets', name));
    this.assetCache.set(name, bytes);
    return bytes;
  }

  async render(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    // Authorization and live status checks happen in CertificateService first.
    // Include every render input so profile/template/score changes invalidate copies.
    const key = createHash('sha256').update(JSON.stringify({ template, certificate })).digest('hex');
    const cached = this.pdfCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.pdf;
    const pdf = this.renderFresh(template, certificate);
    const entry = { expiresAt: Date.now() + 5 * 60_000, pdf };
    this.pdfCache.set(key, entry);
    while (this.pdfCache.size > 16) this.pdfCache.delete(this.pdfCache.keys().next().value!);
    try { return await pdf; }
    catch (error) { if (this.pdfCache.get(key) === entry) this.pdfCache.delete(key); throw error; }
  }

  private async renderFresh(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    // 1. Prepare data for docxtemplater
    const dob = asDdMmYyyy(certificate.dateOfBirth);
    const dobTib = toTibetanDigits(dob);
    const examDate = asDdMmYyyy(certificate.examDate);
    const examDateTib = toTibetanDigits(examDate);
    const validUntil = asDdMmYyyy(certificate.validUntil);
    const validUntilTib = toTibetanDigits(validUntil);
    
    // Convert DSTS No. format (e.g. DSTS-2025-ABCD12) to Tibetan digits
    const dstsNoDigits = certificate.certificateNumber.replace(/[^0-9]/g, '');
    const canonicalDstsNumber = /^[ཀཁགངཅཆཇཉཏཐ]-[༠-༩]{2}-[༠-༩]{3}$/.test(certificate.registrationNumber);
    const dstsNoTib = canonicalDstsNumber ? certificate.registrationNumber : toTibetanDigits(dstsNoDigits);

    const scores = {
      LISTENING: (certificate.skillStandards ?? certificate.scores)['LISTENING'],
      READING: (certificate.skillStandards ?? certificate.scores)['READING'],
      WRITING: (certificate.skillStandards ?? certificate.scores)['WRITING'],
      SPEAKING: (certificate.skillStandards ?? certificate.scores)['SPEAKING'],
    };

    const overallDigit = String(certificate.overallScore);
    const dzScore = (value: number | string | undefined) => value !== undefined && String(value).trim() && Number.isFinite(Number(value)) ? toTibetanDigits(Number(value).toFixed(2)) : '-';

    // Build the data object with all 37 placeholders expected by the DOCX template
    const docxData: Record<string, string> = {
      holderName: certificate.holderName,
      // Saved spellings take precedence; generated fallback is never persisted as verified identity data.
      holderNameDz: certificate.holderNameDz?.trim() || transliterateName(certificate.holderName).dzongkhaName,
      cid: certificate.cid,
      cidDz: toTibetanDigits(certificate.cid),
      
      listeningScore: dzScore(scores.LISTENING),
      readingScore: dzScore(scores.READING),
      writingScore: dzScore(scores.WRITING),
      speakingScore: dzScore(scores.SPEAKING),
      
      overallScore: overallDigit,
      overallLabelDz: 'སྤྱིའི་གནས་ཚད།',
      overallScoreDz: dzScore(overallDigit),
    };

    // Add array-like individual digit placeholders {dob1}..{dob8}
    for (let i = 0; i < 8; i++) docxData[`dob${i+1}`] = dobTib[i] || ' ';
    for (let i = 0; i < 8; i++) docxData[`examDate${i+1}`] = examDateTib[i] || ' ';
    for (let i = 0; i < 8; i++) docxData[`validity${i+1}`] = validUntilTib[i] || ' ';
    for (let i = 0; i < 8; i++) docxData[`dstsNo${i+1}`] = (canonicalDstsNumber || i < 4) ? dstsNoTib[i] || ' ' : ' ';

    // 2. Render DOCX using docxtemplater
    const templateBuf = this.asset('DSTS_Certificate_Template.docx');
    const zip = new PizZip(templateBuf);
    // These independently positioned labels had different x coordinates in the
    // source template. Keep one left edge without moving values or date grids.
    const identityLabels = new Set(['Name', 'ID No.', 'Date of Birth', 'DSTS No.', 'Date of Examination']);
    zip.file('word/document.xml', zip.file('word/document.xml')!.asText().replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraph => {
      const text = [...paragraph.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map(match => match[1]).join('').trim();
      if (!identityLabels.has(text)) return paragraph;
      return paragraph.replace(/<w:framePr\b[^>]*\/>/, frame => frame.replace(/w:x="\d+"/, 'w:x="540"'));
    }));
    // The artwork already has eight DSTS cells; older DOCX versions filled only
    // four. Use all eight for letter, hyphens, two year digits and three digits.
    const extraDstsCells = [5, 6, 7, 8].map(index => `<w:r><w:tab/></w:r><w:r><w:rPr><w:rFonts w:ascii="Microsoft Himalaya" w:hAnsi="Microsoft Himalaya" w:cs="Microsoft Himalaya"/><w:color w:val="3F78B5"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>{dstsNo${index}}</w:t></w:r>`).join('');
    zip.file('word/document.xml', zip.file('word/document.xml')!.asText().replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraph => paragraph.includes('{dstsNo1}') && !paragraph.includes('{dstsNo5}') ? paragraph.replace('</w:p>', extraDstsCells + '</w:p>') : paragraph));
    // Replace the small baked-in overall label with a shaped, 14pt green label.
    // Paragraph shading masks only that label's area, preserving the surrounding artwork.
    const overallLabelParagraph = '<w:p><w:pPr><w:framePr w:w="2400" w:h="560" w:hRule="exact" w:wrap="none" w:vAnchor="page" w:hAnchor="page" w:x="5762" w:y="9360"/><w:shd w:val="clear" w:fill="FFFFFF"/><w:spacing w:line="560" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Microsoft Himalaya" w:hAnsi="Microsoft Himalaya" w:cs="Microsoft Himalaya"/><w:b/><w:bCs/><w:color w:val="00B050"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>{overallLabelDz}</w:t></w:r></w:p>';
    zip.file('word/document.xml', zip.file('word/document.xml')!.asText().replace('<w:sectPr', overallLabelParagraph + '<w:sectPr'));
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(docxData);
    const dzongkhaFont = template.dzongkhaFont ?? 'DDC Uchen';
    if (!['DDC Uchen', 'DDC Joyig'].includes(dzongkhaFont)) throw new DomainException('CERTIFICATE_FONT_INVALID', 'Unsupported certificate font.', 409);
    // Apply the selected family to the DOCX before LibreOffice shapes Dzongkha.
    for (const name of Object.keys(zip.files).filter(name => name.startsWith('word/') && name.endsWith('.xml'))) {
      const fontTag = '<w:rFonts w:ascii="' + dzongkhaFont + '" w:hAnsi="' + dzongkhaFont + '" w:eastAsia="' + dzongkhaFont + '" w:cs="' + dzongkhaFont + '"/>';
      const xml = zip.file(name)!.asText().replace(/Microsoft Himalaya/g, dzongkhaFont).replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, run => {
        if (!/[\u0F00-\u0FFF]/.test(run)) return run;
        if (/<w:rFonts\b/.test(run)) return run.replace(/<w:rFonts\b[^>]*\/>/g, fontTag);
        if (/<w:rPr\b/.test(run)) return run.replace(/<w:rPr\b[^>]*>/, match => match + fontTag);
        return run.replace(/<w:r\b[^>]*>/, match => match + '<w:rPr>' + fontTag + '</w:rPr>');
      });
      zip.file(name, xml);
    }

    const renderedDocx = doc.getZip().generate({ type: 'nodebuffer' });

    // 3. Convert DOCX to PDF
    let pdfBuf: Buffer;
    try {
      // First try libreoffice-convert (standard in docker)
      pdfBuf = await new Promise<Buffer>((resolve, reject) => {
        const conversionOptions = { fileName: 'certificate.docx', execOptions: { timeout: 30000 } };
        libre.convertWithOptions(renderedDocx, 'pdf', undefined, conversionOptions, (error, bytes) => error ? reject(error) : resolve(bytes));
      });
    } catch (err) {
      this.logger.warn(`libreoffice-convert failed, falling back to local MS Word conversion: ${err}`);
      if (process.platform !== 'win32') throw new DomainException('CERTIFICATE_RENDERER_UNAVAILABLE', 'Certificate PDF conversion is temporarily unavailable. Please retry or contact the administrator.', 503);
      const tempId = randomUUID();
      const tempDocx = join(tmpdir(), `temp-${tempId}.docx`);
      const tempPdf = join(tmpdir(), `temp-${tempId}.pdf`);
      writeFileSync(tempDocx, renderedDocx);
      try {
        convertToPdfLocal(tempDocx, tempPdf);
        pdfBuf = readFileSync(tempPdf);
      } finally {
        try { unlinkSync(tempDocx); } catch { /* ignore */ }
        try { unlinkSync(tempPdf); } catch { /* ignore */ }
      }
    }

    // 4. Overlay QR code, Signatures, and Seal using pdf-lib
    const document = await PDFDocument.load(pdfBuf);
    document.registerFontkit(fontkit);
    const pages = document.getPages();
    const page = pages[0]; // DOCX template converts to a single page

    const helvetica = await document.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await document.embedFont(StandardFonts.HelveticaBold);

    // Cover the pre-printed logos only, then fit the template assets into the header.
    const embeddedAssets = new Map<string, Awaited<ReturnType<typeof document.embedPng>>>();
    const drawAsset = async (data: Buffer, mimeType: string, box: {x: number; y: number; width: number; height: number}, opacity = 1) => {
      const key = mimeType + createHash('sha256').update(data).digest('hex');
      let image = embeddedAssets.get(key);
      if (!image) { image = mimeType === 'image/png' ? await document.embedPng(data) : await document.embedJpg(data); embeddedAssets.set(key, image); }
      const scale = Math.min(box.width / image.width, box.height / image.height);
      const width = image.width * scale, height = image.height * scale;
      page.drawImage(image, { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height, opacity });
    };
    // Join the two existing name fields into one bilingual box, like the CID field.
    // Erase only the internal border strokes; keep both names and the background intact.
    for (const y of [562.36, 554.36]) page.drawLine({start: {x: 100, y}, end: {x: 356, y}, thickness: 2, color: rgb(1, 1, 1)});
    for (const x of [100.2, 355.8]) page.drawLine({start: {x, y: 553.8}, end: {x, y: 563}, thickness: 0.7, color: rgb(0.4, 0.6, 0.75)});
    const logoBoxes = [{x: 55, y: 686, width: 60, height: 60}, {x: 414, y: 680, width: 84, height: 77}];
    for (const [index, asset] of [{data: template.leftLogoData, mimeType: template.leftLogoMimeType}, {data: template.rightLogoData, mimeType: template.rightLogoMimeType}].entries()) {
      // Keep the original government emblem in the artwork unless explicitly overridden.
      if (index === 1 && !asset.data) continue;
      const cover = index === 1 ? {x: 409, y: 668, width: 106, height: 91} : {x: 48, y: 679, width: 74, height: 77};
      page.drawRectangle({...cover, color: rgb(1, 1, 1)});
      await drawAsset(asset.data ?? this.asset('dzongjuk-default.png'), asset.mimeType ?? 'image/png', logoBoxes[index]);
    }

    // Preserve signature images and rules; role labels are printed by the template.
    const drawSignatory = async (ruleX: number, ruleWidth: number, signatureImage?: { data: Buffer; mimeType: string } | null) => {
      page.drawLine({ start: { x: ruleX, y: 68 }, end: { x: ruleX + ruleWidth, y: 68 }, thickness: 0.75, color: INK });
      if (!signatureImage) return;
      await drawAsset(signatureImage.data, signatureImage.mimeType, {x: ruleX + 5, y: 73, width: ruleWidth - 10, height: 21});
    };
    
    // The template's one authorized-signature image is the DCDD/Chief Executive
    await drawSignatory(60, 130, template.examinationSignatureImageData && template.examinationSignatureImageMimeType ? {data: template.examinationSignatureImageData, mimeType: template.examinationSignatureImageMimeType} : null);
    await drawSignatory(
      335, 140,
      template.signatureImageData && template.signatureImageMimeType ? { data: template.signatureImageData, mimeType: template.signatureImageMimeType } : null,
    );

    // A transparent Dzongjuk seal is the default between the signing authorities.
    await drawAsset(template.sealImageData ?? this.asset('dzongjuk-seal-transparent.png'), template.sealImageMimeType ?? 'image/png', {x: 239, y: 58, width: 46, height: 46}, 0.9);

    if (certificate.photo) {
      const match = /^data:image[/](png|jpeg);base64,(.+)$/s.exec(certificate.photo);
      if (match) {
        const bytes = Buffer.from(match[2], 'base64');
        const image = match[1] === 'png' ? await document.embedPng(bytes) : await document.embedJpg(bytes);
        const box = { x: 411, y: 548, width: 78, height: 100 };
        page.drawRectangle({ ...box, color: rgb(1, 1, 1) });
        const scale = Math.min(box.width / image.width, box.height / image.height);
        page.drawImage(image, { x: box.x + (box.width - image.width * scale) / 2, y: box.y + (box.height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      }
    }

    // Verification QR + issuance dates
    page.drawText(`Issued ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 60, y: 112, size: 7.5, font: helvetica, color: INK });
    page.drawText(`Certificate ${certificate.certificateNumber}`, { x: 60, y: 100, size: 7.5, font: helvetica, color: INK });
    const qrPng = await QRCode.toBuffer(certificate.verificationUrl, { type: 'png', width: 512, margin: 4, errorCorrectionLevel: 'M' });
    const qr = await document.embedPng(qrPng);
    page.drawImage(qr, QR_BOX);

    if (template.testOnly) page.drawText('LOCAL TEST TEMPLATE - NOT AN OFFICIAL CERTIFICATE', { x: 40, y: PAGE_HEIGHT - 14, size: 7.5, font: helveticaBold, color: rgb(0.72, 0.1, 0.08) });
    document.setTitle(certificate.certificateNumber);
    document.setProducer('Dzongjuk DSTS');
    
    return Buffer.from(await document.save());
  }
}
