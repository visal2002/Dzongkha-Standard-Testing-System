/**
 * @fileoverview Exam Windows Service
 * CRUD operations for DSTS examination registration windows.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { examWindows } from '../data/mockData';

export const examService = {
  /** @returns {Promise<{data: import('../types').ExamWindow[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(examWindows); }
    const { data } = await apiClient.get('/exams');
    return data;
  },

  /** @param {string} id @returns {Promise<{data: import('../types').ExamWindow}>} */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(examWindows.find(e => e.id === id) || null); }
    const { data } = await apiClient.get(`/exams/${id}`);
    return data;
  },

  /** @param {Partial<import('../types').ExamWindow>} payload */
  create: async (payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...payload, id: `EXM-MOCK-${Date.now()}` }); }
    const { data } = await apiClient.post('/exams', payload);
    return data;
  },

  /** @param {string} id @param {Partial<import('../types').ExamWindow>} payload */
  update: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...examWindows.find(e => e.id === id), ...payload }); }
    const { data } = await apiClient.put(`/exams/${id}`, payload);
    return data;
  },

  /** @param {string} id */
  delete: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(null, 'Deleted'); }
    const { data } = await apiClient.delete(`/exams/${id}`);
    return data;
  },
};
