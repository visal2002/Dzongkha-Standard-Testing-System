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
    const { data } = await apiClient.post('/appeals', payload);
    return data;
  },

  /**
   * Committee submits revised scores for an appeal.
   * @param {string} id
   * @param {{ revisedScores: Object, committeeRemarks: string }} payload
   */
  submitRevision: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, ...payload, status: 'pending_chief_approval' }); }
    const { data } = await apiClient.put(`/appeals/${id}/revision`, payload);
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
    const { data } = await apiClient.put(`/appeals/${id}/decision`, { decision, remarks });
    return data;
  },
};
