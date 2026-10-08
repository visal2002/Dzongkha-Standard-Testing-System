/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

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

const convertAsync = promisify(libre.convert);

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
const PAGE_HEIGHT = 779.76;

// Verification QR placement, in PDF points measured from the page's bottom-left
// corner. It sits in the empty band above the signatures, hard against the right
// margin. Tweak these four numbers to move or resize the code:
//   X      distance from the left edge to the QR's left side
//   Y      distance from the bottom edge to the QR's bottom side
//   WIDTH  rendered QR width  (keep == HEIGHT so it stays square)
//   HEIGHT rendered QR height
const QR_BOX = { x: 465, y: 88, width: 44, height: 44 };

const INK = rgb(0.12, 0.12, 0.12);

@Injectable()
export class CertificateRendererService {
  private readonly logger = new Logger(CertificateRendererService.name);
  private assetCache = new Map<string, Buffer>();

  private asset(name: string) {
    const cached = this.assetCache.get(name);
    if (cached) return cached;
    const bytes = readFileSync(join(__dirname, '..', 'assets', name));
    this.assetCache.set(name, bytes);
    return bytes;
  }

  async render(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    // 1. Prepare data for docxtemplater
    const dob = asDdMmYyyy(certificate.dateOfBirth);
    const dobTib = toTibetanDigits(dob);
    const examDate = asDdMmYyyy(certificate.examDate);
    const examDateTib = toTibetanDigits(examDate);
    const validUntil = asDdMmYyyy(certificate.validUntil);
    const validUntilTib = toTibetanDigits(validUntil);
    
    // Convert DSTS No. format (e.g. DSTS-2025-ABCD12) to Tibetan digits
    const dstsNoDigits = certificate.certificateNumber.replace(/[^0-9]/g, '');
    const dstsNoTib = toTibetanDigits(dstsNoDigits);

    const scores = {
      LISTENING: certificate.scores['LISTENING'],
      READING: certificate.scores['READING'],
      WRITING: certificate.scores['WRITING'],
      SPEAKING: certificate.scores['SPEAKING'],
    };

    const getScoreDigit = (score: number | undefined) => Number.isFinite(score) ? String(Math.max(0, Math.min(9, Math.round(score!)))) : '-';
    const overallDigit = String(Math.max(0, Math.min(9, Math.round(Number(certificate.overallScore) || 0))));

    // Build the data object with all 37 placeholders expected by the DOCX template
    const docxData: Record<string, string> = {
      holderName: certificate.holderName,
      // For Dzongkha name we fallback to English if not provided, since our DB doesn't store Dzongkha name separately yet
      holderNameDz: certificate.holderName,
      cid: certificate.cid,
      cidDz: toTibetanDigits(certificate.cid),
      
      listeningScore: toTibetanDigits(getScoreDigit(scores.LISTENING)),
      readingScore: toTibetanDigits(getScoreDigit(scores.READING)),
      writingScore: toTibetanDigits(getScoreDigit(scores.WRITING)),
      speakingScore: toTibetanDigits(getScoreDigit(scores.SPEAKING)),
      
      overallScore: overallDigit,
      overallScoreDz: toTibetanDigits(overallDigit),
    };

    // Add array-like individual digit placeholders {dob1}..{dob8}
    for (let i = 0; i < 8; i++) docxData[`dob${i+1}`] = dobTib[i] || ' ';
    for (let i = 0; i < 8; i++) docxData[`examDate${i+1}`] = examDateTib[i] || ' ';
    for (let i = 0; i < 8; i++) docxData[`validity${i+1}`] = validUntilTib[i] || ' ';
    for (let i = 0; i < 4; i++) docxData[`dstsNo${i+1}`] = dstsNoTib[i] || ' ';

    // 2. Render DOCX using docxtemplater
    const templateBuf = this.asset('DSTS_Certificate_Template.docx');
    const zip = new PizZip(templateBuf);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(docxData);
    const renderedDocx = doc.getZip().generate({ type: 'nodebuffer' });

    // 3. Convert DOCX to PDF
    let pdfBuf: Buffer;
    try {
      // First try libreoffice-convert (standard in docker)
      pdfBuf = await convertAsync(renderedDocx, '.pdf', undefined);
    } catch (err) {
      this.logger.warn(`libreoffice-convert failed, falling back to local MS Word conversion: ${err}`);
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

    // Signatory names, printed above the artwork's own blank signature rules.
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
    await drawSignatory(template.signatoryName, 60, 130, null);
    await drawSignatory(
      template.chiefExecutiveName, 335, 140,
      template.signatureImageData && template.signatureImageMimeType ? { data: template.signatureImageData, mimeType: template.signatureImageMimeType } : null,
    );

    // Official seal
    if (template.sealImageData && template.sealImageMimeType) {
      const seal = template.sealImageMimeType === 'image/png' ? await document.embedPng(template.sealImageData) : await document.embedJpg(template.sealImageData);
      const sealHeight = 46;
      const sealWidth = (seal.width / seal.height) * sealHeight;
      page.drawImage(seal, { x: 262 - sealWidth / 2, y: 58, width: sealWidth, height: sealHeight, opacity: 0.9 });
    }

    // Verification QR + issuance dates
    page.drawText(`Issued ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 60, y: 112, size: 7.5, font: helvetica, color: INK });
    page.drawText(`Certificate ${certificate.certificateNumber}`, { x: 60, y: 100, size: 7.5, font: helvetica, color: INK });
    const qrPng = await QRCode.toBuffer(certificate.verificationUrl, { type: 'png', width: 160, margin: 0, errorCorrectionLevel: 'M' });
    const qr = await document.embedPng(qrPng);
    page.drawImage(qr, QR_BOX);

    if (template.testOnly) page.drawText('LOCAL TEST TEMPLATE - NOT AN OFFICIAL CERTIFICATE', { x: 40, y: PAGE_HEIGHT - 14, size: 7.5, font: helveticaBold, color: rgb(0.72, 0.1, 0.08) });
    document.setTitle(certificate.certificateNumber);
    document.setProducer('Dzongjuk DSTS');
    
    return Buffer.from(await document.save());
  }
}
