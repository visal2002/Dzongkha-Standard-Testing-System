/**
 * @fileoverview Certificates Service
 * Certificate generation, listing, and QR verification.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { certificates, masterConfig } from '../data/mockData';

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
    const { data } = await apiClient.post('/certificates/generate', { examId });
    return data;
  },

  /**
   * Verify a certificate via its QR token.
   * @param {string} token
   */
  verifyQr: async (token) => {
    if (USE_MOCK) {
      await mockDelay();
      const cert = certificates.find(c => c.qrCode === token);
      return mockResponse(cert ? { valid: true, certificate: cert } : { valid: false });
    }
    const { data } = await apiClient.get(`/certificates/verify/${token}`);
    return data;
  },

  /**
   * Increment the download count for a certificate.
   * @param {string} id
   */
  recordDownload: async (id) => {
    if (USE_MOCK) { await mockDelay(200); return mockResponse({ id }); }
    const { data } = await apiClient.post(`/certificates/${id}/download`);
    return data;
  },

  /**
   * Get the master certificate template configuration.
   */
  getTemplateConfig: async () => {
    if (USE_MOCK) { await mockDelay(200); return mockResponse(masterConfig.certificateTemplate); }
    const { data } = await apiClient.get('/certificates/template');
    return data;
  },
};
