/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Certificates Service
 * Certificate generation, listing, and QR verification.
 */
import apiClient from './api';

import { createUuid } from '@/utils/uuid';


export const certificateService = {
  /** @returns {Promise<{data: import('@/constants/domain').Certificate[]}>} */
  getAll: async () => {

    const { data } = await apiClient.get('/certificates');
    return data;
  },

  /**
   * @param {string} userId
   */
  getByUser: async (userId) => {

    const { data } = await apiClient.get('/certificates/my');
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {

    const { data } = await apiClient.get(`/certificates/${id}`);
    return data;
  },

  /**
   * Generate certificates for all eligible applicants of an exam.
   * @param {string} examId
   */
  generateBatch: async (examId) => {

    const { data } = await apiClient.post('/certificates/generate', { examId }, { headers: { 'Idempotency-Key': createUuid() } });
    return data;
  },

  /**
   * Verify a certificate via its QR token.
   * @param {string} token
   */
  verifyQr: async (token) => {

    const { data } = await apiClient.get(`/public/certificates/verify/${encodeURIComponent(token)}`);
    return data;
  },

  verify: async (token) => certificateService.verifyQr(token),

  /**
   * Increment the download count for a certificate.
   * @param {string} id
   */
  download: async (id) => {

    return apiClient.get(`/certificates/${id}/file`, { responseType: 'blob' });
  },

  recordDownload: async (id) => certificateService.download(id),

  /**
   * Master Configuration — every certificate template version (Draft/Approved/Retired),
   * newest version first per code. Image fields (leftLogo/rightLogo/borderImage/
   * signatureImage/sealImage) come back as data: URIs, ready for an <img src>.
   * @returns {Promise<{data: Array}>}
   */
  listTemplates: async () => {

    const { data } = await apiClient.get('/certificate-templates');
    return data;
  },

  /**
   * Create a new draft template version. Takes effect only once approved via
   * approveTemplate - certificate generation always reads the active Approved version.
   * @param {Object} payload
   */
  createTemplate: async (payload) => {

    const { data } = await apiClient.post('/certificate-templates', payload);
    return data;
  },

  /** @param {string} id */
  approveTemplate: async (id) => {

    const { data } = await apiClient.post(`/certificate-templates/${id}/approve`);
    return data;
  },
};
