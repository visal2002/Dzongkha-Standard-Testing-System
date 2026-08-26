/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
// @pdf-lib/fontkit's complex-script shaping (needed for Tibetan) relies on
// generator functions compiled against the regenerator runtime, which Node
// does not provide globally on its own.
import 'regenerator-runtime/runtime';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { CertificateOrientation, CertificatePaperSize, CertificateTemplateEntity } from './entities';

interface RenderCertificate {
  certificateNumber: string; holderName: string; registrationNumber: string; cid: string;
  dateOfBirth: Date; examDate: Date; issuedAt: Date; validUntil: Date;
  scores: Record<string, number>; overallScore: string; bandLabel: string; cefrLevel: string | null; verificationUrl: string;
}

const SKILL_ROWS = [
  { key: 'LISTENING', en: 'LISTENING', dz: 'ཉན་རྒྱུགས་གནས་ཚད།' },
  { key: 'READING', en: 'READING', dz: 'ལྷག་རྒྱུགས་གནས་ཚད།' },
  { key: 'WRITING', en: 'WRITING', dz: 'འབི་རྒྱུགས་གནས་ཚད།' },
  { key: 'SPEAKING', en: 'SPEAKING', dz: 'སླབ་རྒྱུགས་གནས་ཚད།' },
];

const TIBETAN_DIGITS = ['༠', '༡', '༢', '༣', '༤', '༥', '༦', '༧', '༨', '༩'];
const toTibetanDigits = (value: string) => value.replace(/[0-9]/g, (digit) => TIBETAN_DIGITS[Number(digit)]);
const asDdMmYyyy = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${date.getUTCFullYear()}`;

const GOLD = rgb(0.72, 0.5, 0.12);
const INK = rgb(0.1, 0.16, 0.2);
const MUTED = rgb(0.4, 0.4, 0.4);
const CREAM = rgb(0.98, 0.96, 0.9);
const TAN = rgb(0.91, 0.85, 0.66);
const PEACH = rgb(0.98, 0.82, 0.65);
const GREEN_BG = rgb(0.82, 0.92, 0.81);
const GREEN_BORDER = rgb(0.13, 0.42, 0.24);
const WHITE = rgb(1, 1, 1);

@Injectable()
export class CertificateRendererService {
  private assetPath(name: string) { return join(__dirname, '..', 'assets', name); }

  async render(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    const document = await PDFDocument.create();
    document.registerFontkit(fontkit);
    const dimensions = template.paperSize === CertificatePaperSize.Letter ? [612, 792] : [595.28, 841.89];
    const size = template.orientation === CertificateOrientation.Landscape ? [dimensions[1], dimensions[0]] : dimensions;
    const page = document.addPage(size as [number, number]);
    const { width, height } = page.getSize();

    const helvetica = await document.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await document.embedFont(StandardFonts.HelveticaBold);
    const tibetan = await document.embedFont(readFileSync(this.assetPath('NotoSerifTibetan-Regular.ttf')), { subset: false });
    const tibetanBold = await document.embedFont(readFileSync(this.assetPath('NotoSerifTibetan-Bold.ttf')), { subset: false });
    const logo = await document.embedPng(readFileSync(this.assetPath('dcdd-logo.png')));

    const centerText = (text: string, y: number, sizePx: number, font: PDFFont, color: RGB = INK) => {
      const textWidth = font.widthOfTextAtSize(text, sizePx);
      page.drawText(text, { x: (width - textWidth) / 2, y, size: sizePx, font, color });
    };
    const cell = (text: string, x: number, y: number, w: number, h: number, font: PDFFont, sizePx: number, fill: RGB, border: RGB = INK, textColor: RGB = INK) => {
      page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: 1 });
      const textWidth = font.widthOfTextAtSize(text, sizePx);
      page.drawText(text, { x: x + (w - textWidth) / 2, y: y + (h - sizePx) / 2 + sizePx * 0.08, size: sizePx, font, color: textColor });
    };
    const digitGrid = (digits: string, x: number, y: number, cellW: number, cellH: number, gap: number, fill: RGB) => {
      toTibetanDigits(digits).split('').forEach((digit, index) => cell(digit, x + index * (cellW + gap), y, cellW, cellH, tibetan, cellH * 0.52, fill));
    };
    const labelPair = (dz: string, en: string, x: number, y: number, dzSize: number, enSize: number) => {
      page.drawText(dz, { x, y: y + enSize + 3, size: dzSize, font: tibetan, color: INK });
      page.drawText(en, { x, y, size: enSize, font: helveticaBold, color: MUTED });
    };
    const wrapLines = (text: string, font: PDFFont, sizePx: number, maxWidth: number, maxLines: number) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const attempt = current ? `${current} ${word}` : word;
        if (current && font.widthOfTextAtSize(attempt, sizePx) > maxWidth) { lines.push(current); current = word; if (lines.length === maxLines) break; }
        else current = attempt;
      }
      if (current && lines.length < maxLines) lines.push(current);
      return lines;
    };

    // Outer double border
    page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderWidth: 2.4, borderColor: GOLD });
    page.drawRectangle({ x: 31, y: 31, width: width - 62, height: height - 62, borderWidth: 0.75, borderColor: INK });

    // Header: logo, bilingual system name, certificate title
    const logoHeight = 46;
    const logoDims = logo.scale(logoHeight / logo.height);
    page.drawImage(logo, { x: 46, y: height - 46 - logoDims.height, width: logoDims.width, height: logoDims.height });
    centerText('རྫོང་ཁ་ཚད་ལྡན་ཡིག་རྒྱུགས་རིམ་ལུགས།', height - 58, 14, tibetanBold);
    centerText('DZONGKHA STANDARD TESTING SYSTEM', height - 76, 12.5, helveticaBold, GOLD);
    page.drawLine({ start: { x: 100, y: height - 87 }, end: { x: width - 100, y: height - 87 }, thickness: 0.75, color: GOLD });
    centerText('རྫོང་རྒྱུགས་ལག་ཁྱེར།', height - 105, 13, tibetanBold);
    centerText(template.title.toUpperCase(), height - 123, 14.5, helveticaBold);
    wrapLines(template.declarationText, helvetica, 8.5, width - 180, 2).forEach((line, index) => centerText(line, height - 139 - index * 11, 8.5, helvetica, MUTED));
    page.drawLine({ start: { x: 60, y: height - 165 }, end: { x: width - 60, y: height - 165 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

    // Body layout — dynamically sized so it always fits regardless of paper size/orientation
    const headerBottom = height - 178;
    const footerTop = 148;
    const bodyHeight = headerBottom - footerTop;
    const rowCount = 11; // Name, ID No, DOB, DSTS No, Exam Date, 4 skills, Overall Level, Validity
    const gap = Math.min(18, bodyHeight * 0.018);
    const rowH = (bodyHeight - gap * 2) / rowCount;
    const labelX = 54;
    const valueX = 208;
    const rightEdge = width - 54;

    const photoW = Math.min(100, width * 0.16);
    const photoH = rowH * 2.05;
    const photoX = rightEdge - photoW;
    const photoY = headerBottom - photoH;
    page.drawRectangle({ x: photoX, y: photoY, width: photoW, height: photoH, borderWidth: 1, borderColor: INK, color: WHITE });
    centerTextIn(page, 'PHOTO', photoX, photoY, photoW, photoH, helvetica, 9, MUTED);

    let rowTop = headerBottom;
    const nextRow = () => { rowTop -= rowH; return rowTop; };

    const identityRightEdge = (overlapsPhoto: boolean) => (overlapsPhoto ? photoX - 14 : rightEdge);
    const valueBoxH = rowH * 0.74;

    // Name
    let y = nextRow();
    labelPair('མིང་།', 'NAME', labelX, y + rowH * 0.28, 9, 7.5);
    cell(certificate.holderName, valueX, y, identityRightEdge(true) - valueX, valueBoxH, helveticaBold, 11, WHITE, INK, INK);

    // ID No. (CID)
    y = nextRow();
    labelPair('ངྫོ་སྫོད་ཨང་།', 'ID NO.', labelX, y + rowH * 0.28, 9, 7.5);
    cell(certificate.cid, valueX, y, identityRightEdge(true) - valueX, valueBoxH, helvetica, 10.5, WHITE, INK, INK);

    // Date of Birth — 8 cell Tibetan-numeral grid
    y = nextRow();
    labelPair('སྱེས་ཚེས།', 'DATE OF BIRTH', labelX, y + rowH * 0.28, 9, 7.5);
    { const cellW = Math.min(30, (identityRightEdge(false) - valueX - 7 * 3) / 8); digitGrid(asDdMmYyyy(certificate.dateOfBirth), valueX, y, cellW, valueBoxH, 3, TAN); }

    // DSTS No. (certificate number)
    y = nextRow();
    labelPair('རྫོང་རྒྱུགས་ཨང་།', 'DSTS NO.', labelX, y + rowH * 0.28, 9, 7.5);
    cell(certificate.certificateNumber, valueX, y, identityRightEdge(false) - valueX, valueBoxH, helveticaBold, 10.5, TAN, INK, INK);

    // Date of Examination — 8 cell grid
    y = nextRow();
    labelPair('རྫོང་རྒྱུགས་ཕུལ་བའི་ཟླ་ཚེས།', 'DATE OF EXAMINATION', labelX, y + rowH * 0.28, 9, 7.5);
    { const cellW = Math.min(30, (identityRightEdge(false) - valueX - 7 * 3) / 8); digitGrid(asDdMmYyyy(certificate.examDate), valueX, y, cellW, valueBoxH, 3, TAN); }

    // Section divider
    rowTop -= gap;
    page.drawLine({ start: { x: labelX, y: rowTop + gap / 2 }, end: { x: rightEdge, y: rowTop + gap / 2 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });

    // Four skills
    const scoreBoxW = rowH * 0.9;
    for (const skill of SKILL_ROWS) {
      y = nextRow();
      labelPair(skill.dz, skill.en, labelX, y + rowH * 0.28, 9, 7.5);
      const rawScore = certificate.scores[skill.key];
      const digit = Number.isFinite(rawScore) ? String(Math.max(0, Math.min(9, Math.round(rawScore)))) : '-';
      cell(toTibetanDigits(digit), valueX, y, scoreBoxW, valueBoxH, tibetan, valueBoxH * 0.55, PEACH, INK, INK);
    }

    // Overall Level — Tibetan numeral (green) + Arabic numeral (white)
    y = nextRow();
    labelPair('སི་བྡོྫོམས་གནས་ཚད།', 'OVERALL LEVEL', labelX, y + rowH * 0.28, 9, 7.5);
    const overallDigit = String(Math.max(0, Math.min(9, Math.round(Number(certificate.overallScore) || 0))));
    cell(toTibetanDigits(overallDigit), valueX, y, scoreBoxW, valueBoxH, tibetanBold, valueBoxH * 0.55, GREEN_BG, GREEN_BORDER, GREEN_BORDER);
    cell(overallDigit, valueX + scoreBoxW + 8, y, scoreBoxW, valueBoxH, helveticaBold, valueBoxH * 0.55, WHITE, INK, INK);

    // Section divider
    rowTop -= gap;
    page.drawLine({ start: { x: labelX, y: rowTop + gap / 2 }, end: { x: rightEdge, y: rowTop + gap / 2 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });

    // Validity date — 8 cell grid
    y = nextRow();
    labelPair('རྫོང་རྒྱུགས་ལག་ཁྱེར་འདི་གི་གནས་ཡུན།', 'VALID UNTIL', labelX, y + rowH * 0.28, 8.5, 7.5);
    { const cellW = Math.min(30, (identityRightEdge(false) - valueX - 7 * 3) / 8); digitGrid(asDdMmYyyy(certificate.validUntil), valueX, y, cellW, valueBoxH, 3, TAN); }

    // Footer: two signature blocks
    const blockW = (width - 108 - 24) / 2;
    const leftBlockX = 54;
    const rightBlockX = width - 54 - blockW;
    const ruleY = 96;
    const drawSignature = (name: string, title: string, dzCaption: string, blockX: number) => {
      centerTextIn(page, name, blockX, ruleY + 4, blockW, 14, helveticaBold, 9.5, INK);
      page.drawLine({ start: { x: blockX, y: ruleY }, end: { x: blockX + blockW, y: ruleY }, thickness: 0.75, color: INK });
      centerTextIn(page, dzCaption, blockX, ruleY - 15, blockW, 12, tibetan, 8.5, INK);
      centerTextIn(page, title, blockX, ruleY - 27, blockW, 10, helvetica, 7.5, MUTED);
    };
    drawSignature(template.signatoryName, template.signatoryTitle, 'ཆྫོས་རྒྱུགས་སི་ཁབ།', leftBlockX);
    drawSignature(template.chiefExecutiveName, template.chiefExecutiveTitle, 'རྫོང་རྒྱུགས་བཀྫོད་ཁབ་གཙོ་འཛིན།', rightBlockX);

    // Bottom strip: certificate number / dates + verification QR
    page.drawText(`Certificate: ${certificate.certificateNumber}`, { x: 46, y: 50, size: 8, font: helvetica, color: MUTED });
    page.drawText(`Issued: ${certificate.issuedAt.toISOString().slice(0, 10)}    Valid until: ${certificate.validUntil.toISOString().slice(0, 10)}`, { x: 46, y: 38, size: 8, font: helvetica, color: MUTED });
    const qrPng = await QRCode.toBuffer(certificate.verificationUrl, { type: 'png', width: 160, margin: 1, errorCorrectionLevel: 'M' });
    const qr = await document.embedPng(qrPng);
    page.drawImage(qr, { x: width - 46 - 52, y: 34, width: 52, height: 52 });

    if (template.testOnly) page.drawText('LOCAL TEST TEMPLATE - NOT AN OFFICIAL CERTIFICATE', { x: 48, y: height - 12, size: 7.5, font: helveticaBold, color: rgb(0.72, 0.1, 0.08) });
    document.setTitle(certificate.certificateNumber);
    document.setProducer('Dzongjuk DSTS');
    return Buffer.from(await document.save());
  }
}

function centerTextIn(page: import('pdf-lib').PDFPage, text: string, x: number, y: number, w: number, _h: number, font: PDFFont, sizePx: number, color: RGB) {
  const textWidth = font.widthOfTextAtSize(text, sizePx);
  page.drawText(text, { x: x + Math.max(0, (w - textWidth) / 2), y, size: sizePx, font, color });
}
