/**
 * @fileoverview Verification Service
 * Handles DCDD application verification workflows.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { applications } from '../data/mockData';

export const verificationService = {
  /** @returns {Promise<{data: import('../types').Application[]}>} */
  getPendingApplications: async () => {
    if (USE_MOCK) {
      await mockDelay();
      return mockResponse(applications.filter(a => ['submitted', 'under_review'].includes(a.status)));
    }
    const { data } = await apiClient.get('/verification/pending');
    return data;
  },

  /**
   * Verify a single application.
   * @param {string} id
   * @param {{ status: string, remarks: string, documentStatuses: Object }} payload
   */
  verify: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(700); return mockResponse({ id, ...payload }, 'Application verified.'); }
    const { data } = await apiClient.put(`/verification/${id}`, payload);
    return data;
  },

  /**
   * Mark application as under review.
   * @param {string} id
   */
  startReview: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, status: 'under_review' }); }
    const { data } = await apiClient.patch(`/verification/${id}/review`);
    return data;
  },

  /**
   * Return application to applicant for corrections.
   * @param {string} id
   * @param {string} remarks
   */
  returnApplication: async (id, remarks) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, status: 'returned', remarks }); }
    const { data } = await apiClient.patch(`/verification/${id}/return`, { remarks });
    return data;
  },
};
