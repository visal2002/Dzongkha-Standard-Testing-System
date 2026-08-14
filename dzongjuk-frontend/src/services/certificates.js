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
import { createMockPdf } from '../utils/mockPdf';
import { createUuid } from '../utils/uuid';

function createMockCertificatePdf(certificate) {
  return createMockPdf([
    'Dzongkha Standard Testing System',
    `Certificate: ${certificate.certificateNumber}`,
    `Holder: ${certificate.holderName}`,
    `Registration: ${certificate.registrationNumber}`,
    `Band: ${certificate.bandLabel} (${certificate.cefrLevel})`,
    `Issued: ${String(certificate.issuedAt).slice(0, 10)}`,
    `Valid until: ${String(certificate.validUntil).slice(0, 10)}`,
    'LOCAL ACCEPTANCE CERTIFICATE - NOT AN OFFICIAL CERTIFICATE',
  ]);
}

export const certificateService = {
  /** @returns {Promise<{data: import('../types').Certificate[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(certificates); }
    const { data } = await apiClient.get('/certificates');
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
    const { data } = await apiClient.post('/certificates/generate', { examId }, { headers: { 'Idempotency-Key': createUuid() } });
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
