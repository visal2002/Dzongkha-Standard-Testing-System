/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { CertificateOrientation, CertificatePaperSize, CertificateTemplateEntity } from './entities';

interface RenderCertificate {
  certificateNumber: string; holderName: string; registrationNumber: string; issuedAt: Date; validUntil: Date;
  scores: Record<string, number>; overallScore: string; bandLabel: string; cefrLevel: string | null; verificationUrl: string;
}

@Injectable()
export class CertificateRendererService {
  async render(template: CertificateTemplateEntity, certificate: RenderCertificate) {
    const document = await PDFDocument.create();
    const dimensions = template.paperSize === CertificatePaperSize.Letter ? [612, 792] : [595.28, 841.89];
    const size = template.orientation === CertificateOrientation.Landscape ? [dimensions[1], dimensions[0]] : dimensions;
    const page = document.addPage(size as [number, number]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const center = (text: string, y: number, sizePx: number, font = regular) => {
      const safe = this.pdfSafe(text);
      page.drawText(safe, { x: (width - font.widthOfTextAtSize(safe, sizePx)) / 2, y, size: sizePx, font, color: rgb(0.08, 0.16, 0.22) });
    };
    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderWidth: 2, borderColor: rgb(0.72, 0.5, 0.12) });
    page.drawRectangle({ x: 36, y: 36, width: width - 72, height: height - 72, borderWidth: 0.5, borderColor: rgb(0.08, 0.16, 0.22) });
    center(template.title, height - 105, 26, bold);
    center(template.declarationText, height - 155, 12);
    center(certificate.holderName, height - 210, 22, bold);
    center(`Registration: ${certificate.registrationNumber}`, height - 238, 10);
    center(`Overall score: ${certificate.overallScore}   Band: ${certificate.bandLabel}${certificate.cefrLevel ? `   CEFR: ${certificate.cefrLevel}` : ''}`, height - 286, 12, bold);
    center(Object.entries(certificate.scores).map(([skill, score]) => `${skill}: ${score}`).join('   '), height - 318, 10);
    page.drawText(this.pdfSafe(`${template.signatoryName}\n${template.signatoryTitle}`), { x: 72, y: 92, size: 10, font: regular, lineHeight: 14 });
    page.drawText(this.pdfSafe(`Certificate: ${certificate.certificateNumber}\nIssued: ${certificate.issuedAt.toISOString().slice(0, 10)}\nValid until: ${certificate.validUntil.toISOString().slice(0, 10)}`), { x: width - 290, y: 78, size: 9, font: regular, lineHeight: 13 });
    const qrPng = await QRCode.toBuffer(certificate.verificationUrl, { type: 'png', width: 220, margin: 1, errorCorrectionLevel: 'M' });
    const qr = await document.embedPng(qrPng);
    page.drawImage(qr, { x: width - 145, y: 115, width: 74, height: 74 });
    if (template.testOnly) page.drawText('LOCAL TEST TEMPLATE - NOT AN OFFICIAL CERTIFICATE', { x: 48, y: 48, size: 8, font: bold, color: rgb(0.72, 0.1, 0.08) });
    document.setTitle(certificate.certificateNumber);
    document.setProducer('Dzongjuk DSTS');
    return Buffer.from(await document.save());
  }

  private pdfSafe(value: string) {
    return value.replace(/[^\x20-\x7E\n]/g, '?');
  }
}
