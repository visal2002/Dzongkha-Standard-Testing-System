/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Appeals Service
 * Re-evaluation request submission and management.
 */
import apiClient from './api';

import { createUuid } from '@/utils/uuid';

export const appealService = {
  /** @returns {Promise<{data: import('@/constants/domain').Appeal[]}>} */
  getAll: async () => {

    const { data } = await apiClient.get('/appeals');
    return data;
  },

  /**
   * @param {string} userId
   */
  getByUser: async (userId) => {

    const { data } = await apiClient.get('/appeals/my');
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {

    const { data } = await apiClient.get(`/appeals/${id}`);
    return data;
  },

  /**
   * Submit a new appeal.
   * @param {{ applicationId: string, examId: string, skills: string[], reason: string }} payload
   */
  submit: async (payload) => {

    const { data } = await apiClient.post('/appeals', payload, {
      headers: { 'Idempotency-Key': createUuid() },
    });
    return data;
  },

  create: async (payload) => appealService.submit(payload),

  getActiveFee: async () => {

    const { data } = await apiClient.get('/appeal-fees/active');
    return data;
  },

  getConfig: async () => appealService.getActiveFee(),

  getHistory: async (id) => {

    const { data } = await apiClient.get(`/appeals/${id}/history`);
    return data;
  },

  createPaymentAdvice: async id => {
    const { data } = await apiClient.post(`/appeals/${id}/payment-advice`);
    return data?.data ?? data;
  },

  refreshPayment: async id => {
    const { data } = await apiClient.post(`/appeals/${id}/payment-refresh`);
    return data?.data ?? data;
  },

  getPaymentReceipt: async id => {
    const { data } = await apiClient.get(`/appeals/${id}/payment-receipt`);
    return data?.data ?? data;
  },

  /**
   * Committee submits revised scores for an appeal.
   * @param {string} id
   * @param {{ revisedScores: Object, committeeRemarks: string }} payload
   */
  submitRevision: async (id, payload) => {

    const proposedScores = payload.proposedScores ?? payload.revisedScores;
    const { data } = await apiClient.post(`/appeals/${id}/committee-review`, {
      recommendation: payload.recommendation ?? (proposedScores ? 'REVISE' : 'NO_CHANGE'),
      remarks: payload.remarks ?? payload.committeeRemarks,
      ...(proposedScores ? { proposedScores } : {}),
    });
    return data;
  },

  /**
   * Chief Executive approves or rejects a score revision.
   * @param {string} id
   * @param {'approved'|'rejected'} decision
   * @param {string} [remarks]
   */
  decide: async (id, decision, remarks = '') => {

    const { data } = await apiClient.post(`/appeals/${id}/decision`, { decision: decision.toUpperCase(), remarks });
    return data;
  },
};
