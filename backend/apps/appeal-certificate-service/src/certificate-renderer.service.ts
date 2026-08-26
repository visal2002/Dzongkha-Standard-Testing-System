/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
// @pdf-lib/fontkit's complex-script shaper cannot correctly shape multi-glyph
// Tibetan clusters (vowel signs get dropped or substituted incorrectly), so we
// never draw new Dzongkha *words* with it — those come pre-shaped from the
// approved background artwork below. Isolated single Tibetan digits (no
// clustering/mark-attachment involved) shape correctly and are used for the
// score/date grids. The runtime still needs the regenerator polyfill for the
// shaper's generator functions.
import 'regenerator-runtime/runtime';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { CertificateTemplateEntity } from './entities';

interface RenderCertificate {
  certificateNumber: string; holderName: string; registrationNumber: string; cid: string;
  dateOfBirth: Date; examDate: Date; issuedAt: Date; validUntil: Date;
  scores: Record<string, number>; overallScore: string; bandLabel: string; cefrLevel: string | null; verificationUrl: string;
}

const TIBETAN_DIGITS = ['༠', '༡', '༢', '༣', '༤', '༥', '༦', '༧', '༨', '༩'];
const toTibetanDigits = (value: string) => value.replace(/[0-9]/g, (digit) => TIBETAN_DIGITS[Number(digit)]);
const asDdMmYyyy = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${date.getUTCFullYear()}`;

// Cell boundaries below are read directly off the approved DSTS certificate
// artwork (backend/apps/appeal-certificate-service/assets/certificate-background.pdf,
// a fixed 540x779.76pt page) so new value boxes line up exactly with the
// pre-printed bilingual labels baked into that background.
const PAGE_WIDTH = 540;
const PAGE_HEIGHT = 779.76;

interface Cell { x: number; w: number; }
const DOB_CELLS: Cell[] = [{ x: 105.57, w: 27.36 }, { x: 132.93, w: 33.84 }, { x: 166.77, w: 33.12 }, { x: 199.89, w: 28.08 }, { x: 227.97, w: 33.84 }, { x: 261.81, w: 30.96 }, { x: 292.77, w: 30.96 }, { x: 323.73, w: 30.96 }];
const DOB_Y = 440.5; const DOB_H = 29.5;
const EXAM_DATE_CELLS: Cell[] = [{ x: 150.93, w: 23.04 }, { x: 173.97, w: 28.08 }, { x: 202.05, w: 25.92 }, { x: 227.97, w: 25.2 }, { x: 253.17, w: 28.08 }, { x: 281.25, w: 23.04 }, { x: 304.29, w: 28.08 }, { x: 332.37, w: 22.32 }];
const EXAM_DATE_Y = 357.2; const EXAM_DATE_H = 31;
const VALIDITY_CELLS: Cell[] = [{ x: 326.7, w: 18.72 }, { x: 345.42, w: 23.04 }, { x: 368.46, w: 22.32 }, { x: 390.78, w: 23.04 }, { x: 413.82, w: 19.44 }, { x: 433.26, w: 20.88 }, { x: 454.14, w: 21.6 }, { x: 475.74, w: 20.88 }];
const VALIDITY_Y = 154.3; const VALIDITY_H = 33.6;

const NAME_BOX = { x: 98, y: 525, w: 285, h: 30 };
const CID_BOX = { x: 98, y: 472, w: 285, h: 28 };
const DSTS_NO_BOX = { x: 105.57, y: 400.5, w: 323.73 + 30.96 - 105.57, h: 29.5 };
const SCORE_BOXES: Record<string, { x: number; y: number; w: number; h: number }> = {
  LISTENING: { x: 179.64, y: 277.71, w: 36.72, h: 26.63 },
  READING: { x: 180.36, y: 236.69, w: 36.72, h: 26.63 },
  WRITING: { x: 179.64, y: 198.54, w: 36.72, h: 26.63 },
  SPEAKING: { x: 179.64, y: 160.39, w: 36.72, h: 26.63 },
};
const OVERALL_TIBETAN_BOX = { x: 414.36, y: 290.67, w: 34.56, h: 26.63 };
const OVERALL_ARABIC_BOX = { x: 414.36, y: 254.68, w: 36, h: 26.63 };

const WHITE = rgb(1, 1, 1);
const INK = rgb(0.12, 0.12, 0.12);
const BLUE_BORDER = rgb(79 / 255, 129 / 255, 189 / 255);
const TAN = rgb(0.93, 0.87, 0.72);
const PEACH = rgb(253 / 255, 234 / 255, 218 / 255);
const GREEN_BORDER = rgb(0, 176 / 255, 80 / 255);

@Injectable()
export class CertificateRendererService {
  private assetCache = new Map<string, Buffer>();

  private asset(name: string) {
    const cached = this.assetCache.get(name);
    if (cached) return cached;
    const bytes = readFileSync(join(__dirname, '..', 'assets', name));
    this.assetCache.set(name, bytes);
    return bytes;
  }

  async render(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    const document = await PDFDocument.create();
    document.registerFontkit(fontkit);
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const background = await PDFDocument.load(this.asset('certificate-background.pdf'));
    const [backgroundPage] = await document.embedPdf(background, [0]);
    page.drawPage(backgroundPage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

    const helvetica = await document.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await document.embedFont(StandardFonts.HelveticaBold);
    // subset:false — pdf-lib's subsetter drops glyphs that are only reached via
    // GSUB substitution, which silently blanked out several Tibetan digits
    // (0, 1, 3, 5) when subsetting was enabled. The full font is ~1.4MB heavier
    // per certificate but renders every digit correctly.
    const tibetan = await document.embedFont(this.asset('NotoSerifTibetan-Regular.ttf'), { subset: false });
    const tibetanBold = await document.embedFont(this.asset('NotoSerifTibetan-Bold.ttf'), { subset: false });

    const box = (x: number, y: number, w: number, h: number, fill: RGB, border: RGB, lineWidth = 1) => {
      page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: lineWidth });
    };
    const textIn = (text: string, x: number, y: number, w: number, h: number, font: PDFFont, sizePx: number, color: RGB = INK) => {
      const textWidth = font.widthOfTextAtSize(text, sizePx);
      const drawSize = textWidth > w - 8 ? Math.max(6, sizePx * (w - 8) / textWidth) : sizePx;
      const finalWidth = font.widthOfTextAtSize(text, drawSize);
      page.drawText(text, { x: x + (w - finalWidth) / 2, y: y + (h - drawSize) / 2 + drawSize * 0.1, size: drawSize, font, color });
    };
    const digitCells = (cells: Cell[], y: number, h: number, digits: string, fill: RGB, border: RGB) => {
      const tibetanDigits = toTibetanDigits(digits).split('');
      cells.forEach((cellDef, index) => {
        box(cellDef.x, y, cellDef.w, h, fill, border);
        if (tibetanDigits[index]) textIn(tibetanDigits[index], cellDef.x, y, cellDef.w, h, tibetan, h * 0.55, INK);
      });
    };

    // Name — the background also carries a Dzongkha transliteration of the sample
    // holder's name directly above the value box; we cannot generate that for an
    // arbitrary Latin name, so it is blanked out rather than left showing the
    // sample person's name on every certificate.
    page.drawRectangle({ x: 95, y: 566, width: 200, height: 22, color: WHITE });
    box(NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h, WHITE, BLUE_BORDER);
    textIn(certificate.holderName, NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h, helveticaBold, 13);

    // ID No. (CID) — the background shows the sample CID once as Tibetan numerals
    // and once as Arabic numerals; unlike the name this is pure digits, so both
    // representations can be regenerated correctly for the real CID.
    page.drawRectangle({ x: 100, y: 500, width: 200, height: 22, color: WHITE });
    page.drawText(toTibetanDigits(certificate.cid), { x: 106.91, y: 503.95, size: 13, font: tibetan, color: INK });
    box(CID_BOX.x, CID_BOX.y, CID_BOX.w, CID_BOX.h, WHITE, BLUE_BORDER);
    textIn(certificate.cid, CID_BOX.x, CID_BOX.y, CID_BOX.w, CID_BOX.h, helvetica, 12);

    // Date of Birth — 8 cell Tibetan-numeral grid, aligned to the artwork's own cells
    digitCells(DOB_CELLS, DOB_Y, DOB_H, asDdMmYyyy(certificate.dateOfBirth), TAN, INK);

    // DSTS No. — the artwork's own field is an 8-cell grid sized for a short sample
    // code; our real certificate numbers ("DSTS-2025-XXXXXXXXXXXX") don't fit eight
    // cells, so this is rendered as one bordered value box spanning the same row.
    box(DSTS_NO_BOX.x, DSTS_NO_BOX.y, DSTS_NO_BOX.w, DSTS_NO_BOX.h, TAN, INK);
    textIn(certificate.certificateNumber, DSTS_NO_BOX.x, DSTS_NO_BOX.y, DSTS_NO_BOX.w, DSTS_NO_BOX.h, helveticaBold, 11.5);

    // Date of Examination — 8 cell grid
    digitCells(EXAM_DATE_CELLS, EXAM_DATE_Y, EXAM_DATE_H, asDdMmYyyy(certificate.examDate), TAN, INK);

    // Four skills — single Tibetan-numeral cell each, matching the artwork's own boxes
    for (const [skill, position] of Object.entries(SCORE_BOXES)) {
      box(position.x, position.y, position.w, position.h, PEACH, INK);
      const rawScore = certificate.scores[skill];
      const digit = Number.isFinite(rawScore) ? String(Math.max(0, Math.min(9, Math.round(rawScore)))) : '-';
      textIn(toTibetanDigits(digit), position.x, position.y, position.w, position.h, tibetan, position.h * 0.55, INK);
    }

    // Overall Level — Tibetan numeral (green-bordered) + Arabic numeral
    const overallDigit = String(Math.max(0, Math.min(9, Math.round(Number(certificate.overallScore) || 0))));
    box(OVERALL_TIBETAN_BOX.x, OVERALL_TIBETAN_BOX.y, OVERALL_TIBETAN_BOX.w, OVERALL_TIBETAN_BOX.h, PEACH, GREEN_BORDER, 1.5);
    textIn(toTibetanDigits(overallDigit), OVERALL_TIBETAN_BOX.x, OVERALL_TIBETAN_BOX.y, OVERALL_TIBETAN_BOX.w, OVERALL_TIBETAN_BOX.h, tibetanBold, OVERALL_TIBETAN_BOX.h * 0.55, INK);
    box(OVERALL_ARABIC_BOX.x, OVERALL_ARABIC_BOX.y, OVERALL_ARABIC_BOX.w, OVERALL_ARABIC_BOX.h, WHITE, GREEN_BORDER, 1.5);
    textIn(overallDigit, OVERALL_ARABIC_BOX.x, OVERALL_ARABIC_BOX.y, OVERALL_ARABIC_BOX.w, OVERALL_ARABIC_BOX.h, helveticaBold, OVERALL_ARABIC_BOX.h * 0.55, INK);

    // Validity date — 8 cell grid
    digitCells(VALIDITY_CELLS, VALIDITY_Y, VALIDITY_H, asDdMmYyyy(certificate.validUntil), TAN, INK);

    // Signatory names, printed above the artwork's own blank signature rules. The
    // authorized signature image (if the template carries one) is drawn into the
    // narrow blank band directly above that same rule - the only genuinely empty
    // space on this fixed artwork near the signature, between the printed name and
    // the QR/issuance text above it.
    const drawSignatory = async (name: string, ruleX: number, ruleWidth: number, signatureImage?: { data: Buffer; mimeType: string } | null) => {
      page.drawLine({ start: { x: ruleX, y: 68 }, end: { x: ruleX + ruleWidth, y: 68 }, thickness: 0.75, color: INK });
      const textWidth = helveticaBold.widthOfTextAtSize(name, 9);
      page.drawText(name, { x: ruleX + (ruleWidth - textWidth) / 2, y: 72, size: 9, font: helveticaBold, color: INK });
      if (!signatureImage) return;
      const embedded = signatureImage.mimeType === 'image/png' ? await document.embedPng(signatureImage.data) : await document.embedJpg(signatureImage.data);
      const height = 15;
      const width = Math.min(ruleWidth - 10, (embedded.width / embedded.height) * height);
      page.drawImage(embedded, { x: ruleX + (ruleWidth - width) / 2, y: 82, width, height });
    };
    // The template's one authorized-signature image is the DCDD/Chief Executive
    // signatory - "authorized signature" in the master-configuration sense (§5.7.2)
    // reads as the DCDD-side signer, not the committee-side Chief of Examination.
    await drawSignatory(template.signatoryName, 60, 130, null);
    await drawSignatory(
      template.chiefExecutiveName, 335, 140,
      template.signatureImageData && template.signatureImageMimeType ? { data: template.signatureImageData, mimeType: template.signatureImageMimeType } : null,
    );

    // Official seal - the only other genuinely blank area on this fixed artwork is
    // the gap between the two signature blocks, below the validity grid and above
    // both printed job-title captions.
    if (template.sealImageData && template.sealImageMimeType) {
      const seal = template.sealImageMimeType === 'image/png' ? await document.embedPng(template.sealImageData) : await document.embedJpg(template.sealImageData);
      const sealHeight = 46;
      const sealWidth = (seal.width / seal.height) * sealHeight;
      page.drawImage(seal, { x: 262 - sealWidth / 2, y: 58, width: sealWidth, height: sealHeight, opacity: 0.9 });
    }

    // Verification QR + issuance dates, placed in the artwork's empty band above the signatures
    page.drawText(`Issued ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 60, y: 112, size: 7.5, font: helvetica, color: INK });
    page.drawText(`Certificate ${certificate.certificateNumber}`, { x: 60, y: 100, size: 7.5, font: helvetica, color: INK });
    const qrPng = await QRCode.toBuffer(certificate.verificationUrl, { type: 'png', width: 160, margin: 0, errorCorrectionLevel: 'M' });
    const qr = await document.embedPng(qrPng);
    page.drawImage(qr, { x: 465, y: 88, width: 44, height: 44 });

    if (template.testOnly) page.drawText('LOCAL TEST TEMPLATE - NOT AN OFFICIAL CERTIFICATE', { x: 40, y: PAGE_HEIGHT - 14, size: 7.5, font: helveticaBold, color: rgb(0.72, 0.1, 0.08) });
    document.setTitle(certificate.certificateNumber);
    document.setProducer('Dzongjuk DSTS');
    return Buffer.from(await document.save());
  }
}
