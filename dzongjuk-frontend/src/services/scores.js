/**
 * @fileoverview Scores Service
 * Band score entry and retrieval for examination committees.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { bandScores, applications, committeeMembers, examWindows, dashboardStats } from '../data/mockData';

export const scoreService = {
  /** @returns {Promise<{data: import('../types').BandScore[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(bandScores); }
    const { data } = await apiClient.get('/scores');
    return data;
  },

  /**
   * @param {string} examId
   * @returns {Promise<{data: import('../types').BandScore[]}>}
   */
  getByExam: async (examId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(bandScores.filter(s => s.examId === examId)); }
    const { data } = await apiClient.get(`/scores?examId=${examId}`);
    return data;
  },

  /**
   * Get scores for the current test taker.
   * @param {string} userId
   */
  getMyScores: async (userId) => {
    if (USE_MOCK) {
      await mockDelay();
      const userApps = applications.filter(a => a.testTakerId === userId);
      const userScores = bandScores.filter(s => userApps.some(a => a.id === s.applicationId));
      return mockResponse(userScores);
    }
    const { data } = await apiClient.get('/scores/my');
    return data;
  },

  /**
   * Submit band scores for a batch of applicants.
   * @param {string} examId
   * @param {Array<{applicationId: string, writing: number, reading: number, listening: number, speaking: number}>} scores
   */
  submit: async (examId, scores) => {
    if (USE_MOCK) { await mockDelay(800); return mockResponse(scores, 'Scores submitted.'); }
    const { data } = await apiClient.post('/scores', { examId, scores });
    return data;
  },

  /**
   * Update a specific score entry.
   * @param {string} id
   * @param {Partial<import('../types').BandScore>} payload
   */
  update: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...bandScores.find(s => s.id === id), ...payload }); }
    const { data } = await apiClient.put(`/scores/${id}`, payload);
    return data;
  },

  /**
   * Publish scores for an exam (makes them visible to test takers).
   * @param {string} examId
   */
  publish: async (examId) => {
    if (USE_MOCK) { await mockDelay(600); return mockResponse({ examId }, 'Scores published.'); }
    const { data } = await apiClient.post(`/scores/${examId}/publish`);
    return data;
  },

  /**
   * Get committee setup for an exam.
   * @param {string} examId
   */
  getCommittee: async (examId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(committeeMembers.filter(m => m.examId === examId)); }
    const { data } = await apiClient.get(`/scores/${examId}/committee`);
    return data;
  },

  /**
   * Save committee member assignments for an exam.
   * @param {string} examId
   * @param {string[]} userIds
   */
  saveCommittee: async (examId, userIds) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ examId, userIds }); }
    const { data } = await apiClient.put(`/scores/${examId}/committee`, { userIds });
    return data;
  },

  /**
   * Get dashboard statistics for a role.
   * @param {string} role
   */
  getDashboardStats: async (role) => {
    if (USE_MOCK) { await mockDelay(300); return mockResponse(dashboardStats[role] || dashboardStats.dcdd); }
    const { data } = await apiClient.get(`/dashboard/stats?role=${role}`);
    return data;
  },
};
