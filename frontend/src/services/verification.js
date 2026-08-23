/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Verification Service
 * Handles DCDD application verification workflows.
 */
import apiClient from './api';

import { normalizeApplication } from './applications';

export const verificationService = {
  /** @returns {Promise<{data: import('@/constants/domain').Application[]}>} */
  getPendingApplications: async () => {

    const { data } = await apiClient.get('/verification/pending');
    const records = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return { ...data, data: records.map(normalizeApplication) };
  },

  /**
   * Verify a single application.
   * @param {string} id
   * @param {{ status: string, remarks: string, documentStatuses: Object }} payload
   */
  verify: async (id, payload) => {

    const { data } = await apiClient.post(`/applications/${id}/verify`, payload);
    return data;
  },

  /**
   * Mark application as under review.
   * @param {string} id
   */
  startReview: async (id) => {

    const { data } = await apiClient.post(`/applications/${id}/start-review`);
    return data;
  },

  /**
   * Return application to applicant for corrections.
   * @param {string} id
   * @param {string} remarks
   */
  returnApplication: async (id, remarks) => {

    const { data } = await apiClient.post(`/applications/${id}/return`, { remarks });
    return data;
  },
};
