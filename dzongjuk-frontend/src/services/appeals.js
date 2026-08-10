/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Appeals Service
 * Re-evaluation request submission and management.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { appeals } from '../data/mockData';

export const appealService = {
  /** @returns {Promise<{data: import('../types').Appeal[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(appeals); }
    const { data } = await apiClient.get('/appeals');
    return data;
  },

  /**
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(appeals.filter(a => a.testTakerId === userId)); }
    const { data } = await apiClient.get('/appeals/my');
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(appeals.find(a => a.id === id) || null); }
    const { data } = await apiClient.get(`/appeals/${id}`);
    return data;
  },

  /**
   * Submit a new appeal.
   * @param {{ applicationId: string, examId: string, skills: string[], reason: string }} payload
   */
  submit: async (payload) => {
    if (USE_MOCK) {
      await mockDelay(800);
      return mockResponse({ id: `APL-MOCK-${Date.now()}`, status: 'submitted', ...payload }, 'Appeal submitted.');
    }
    const { data } = await apiClient.post('/appeals', payload, {
      headers: { 'Idempotency-Key': globalThis.crypto.randomUUID() },
    });
    return data;
  },

  create: async (payload) => appealService.submit(payload),

  getActiveFee: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ amountPerSkill: '500.00', currency: 'BTN' }); }
    const { data } = await apiClient.get('/appeal-fees/active');
    return data;
  },

  getConfig: async () => appealService.getActiveFee(),

  getHistory: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse([]); }
    const { data } = await apiClient.get(`/appeals/${id}/history`);
    return data;
  },

  /**
   * Committee submits revised scores for an appeal.
   * @param {string} id
   * @param {{ revisedScores: Object, committeeRemarks: string }} payload
   */
  submitRevision: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, ...payload, status: 'pending_chief_approval' }); }
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
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, chiefApproval: decision, chiefRemarks: remarks, status: decision }); }
    const { data } = await apiClient.post(`/appeals/${id}/decision`, { decision: decision.toUpperCase(), remarks });
    return data;
  },
};
