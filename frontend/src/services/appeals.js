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

  /**
   * Master Configuration — re-evaluation fee history (Draft/Approved/Retired).
   * @returns {Promise<{data: Array}>}
   */
  listFees: async () => {

    const { data } = await apiClient.get('/appeal-fees');
    return data;
  },

  /**
   * Create a new draft fee rule. Takes effect only once approved via approveFee.
   * @param {{ code: string, amountPerSkill: number, currency: string, effectiveFrom: string, effectiveTo?: string }} payload
   */
  createFee: async (payload) => {

    const { data } = await apiClient.post('/appeal-fees', payload);
    return data;
  },

  /** @param {string} id */
  approveFee: async (id) => {

    const { data } = await apiClient.post(`/appeal-fees/${id}/approve`);
    return data;
  },

  getHistory: async (id) => {

    const { data } = await apiClient.get(`/appeals/${id}/history`);
    return data;
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
   * Chief Executive approves or rejects a score revision, skill by skill.
   * @param {string} id
   * @param {Object.<string, 'APPROVED'|'REJECTED'>} skillDecisions
   * @param {string} [remarks]
   */
  decide: async (id, skillDecisions, remarks = '') => {

    const { data } = await apiClient.post(`/appeals/${id}/decision`, { skillDecisions, remarks });
    return data;
  },

  /**
   * Applies an already-approved revision (backend chains this automatically right
   * after `decide()` approves a request). Exposed as a manual retry for the rare case
   * that automatic application failed - the appeal stays at
   * APPROVED_PENDING_SCORE_UPDATE until this succeeds.
   * @param {string} id
   */
  applyRevision: async (id) => {

    const { data } = await apiClient.post(`/appeals/${id}/apply-revision`, null, {
      headers: { 'Idempotency-Key': createUuid() },
    });
    return data;
  },
};
