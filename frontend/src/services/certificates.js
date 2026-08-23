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
   * Get the master certificate template configuration.
   */
  getTemplateConfig: async () => {

    const { data } = await apiClient.get('/certificates/template');
    return data;
  },
};
