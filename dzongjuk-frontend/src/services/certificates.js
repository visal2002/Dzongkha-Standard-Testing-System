/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Certificates Service
 * Certificate generation, listing, and QR verification.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { certificates, masterConfig } from '../data/mockData';

const pdfEscape = value => String(value ?? '').replace(/([\\()])/g, '\\$1').replace(/[^\x20-\x7E]/g, '?');

function createMockCertificatePdf(certificate) {
  const lines = [
    'Dzongkha Standard Testing System',
    `Certificate: ${certificate.certificateNumber}`,
    `Holder: ${certificate.holderName}`,
    `Registration: ${certificate.registrationNumber}`,
    `Band: ${certificate.bandLabel} (${certificate.cefrLevel})`,
    `Issued: ${String(certificate.issuedAt).slice(0, 10)}`,
    `Valid until: ${String(certificate.validUntil).slice(0, 10)}`,
    'LOCAL ACCEPTANCE CERTIFICATE - NOT AN OFFICIAL CERTIFICATE',
  ];
  const text = lines.map((line, index) => `${index === 0 ? '' : '0 -24 Td '}(${pdfEscape(line)}) Tj`).join('\n');
  const stream = `BT /F1 14 Tf 72 750 Td\n${text}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let content = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(content.length);
    content += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = content.length;
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  content += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([content], { type: 'application/pdf' });
}

export const certificateService = {
  /** @returns {Promise<{data: import('../types').Certificate[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(certificates); }
    const { data } = await apiClient.get('/certificates/my');
    return data;
  },

  /**
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(certificates); }
    const { data } = await apiClient.get('/certificates/my');
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(certificates.find(c => c.id === id) || null); }
    const { data } = await apiClient.get(`/certificates/${id}`);
    return data;
  },

  /**
   * Generate certificates for all eligible applicants of an exam.
   * @param {string} examId
   */
  generateBatch: async (examId) => {
    if (USE_MOCK) { await mockDelay(1200); return mockResponse({ examId, generated: 3 }, 'Certificates generated.'); }
    const { data } = await apiClient.post('/certificates/generate', { examId }, { headers: { 'Idempotency-Key': globalThis.crypto.randomUUID() } });
    return data;
  },

  /**
   * Verify a certificate via its QR token.
   * @param {string} token
   */
  verifyQr: async (token) => {
    if (USE_MOCK) {
      await mockDelay();
      const cert = certificates.find(c => c.verificationToken === token);
      return mockResponse(cert ? {
        valid: cert.status === 'ACTIVE' && new Date(cert.validUntil) > new Date(),
        certificateNumber: cert.certificateNumber,
        status: cert.status,
        issuedAt: cert.issuedAt,
        validUntil: cert.validUntil,
      } : { valid: false });
    }
    const { data } = await apiClient.get(`/public/certificates/verify/${encodeURIComponent(token)}`);
    return data;
  },

  verify: async (token) => certificateService.verifyQr(token),

  /**
   * Increment the download count for a certificate.
   * @param {string} id
   */
  download: async (id) => {
    if (USE_MOCK) {
      await mockDelay(200);
      const certificate = certificates.find(item => item.id === id);
      if (!certificate) throw new Error('Certificate not found.');
      return { data: createMockCertificatePdf(certificate) };
    }
    return apiClient.get(`/certificates/${id}/file`, { responseType: 'blob' });
  },

  recordDownload: async (id) => certificateService.download(id),

  /**
   * Get the master certificate template configuration.
   */
  getTemplateConfig: async () => {
    if (USE_MOCK) { await mockDelay(200); return mockResponse(masterConfig.certificateTemplate); }
    const { data } = await apiClient.get('/certificates/template');
    return data;
  },
};
