/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Applications Service
 * Manages exam registration applications.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { applications } from '../data/mockData';

export const applicationService = {
  /** @returns {Promise<{data: import('../types').Application[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications); }
    const { data } = await apiClient.get('/applications');
    return data;
  },

  /**
   * Get applications for a specific user.
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications.filter(a => a.testTakerId === userId)); }
    const { data } = await apiClient.get('/applications/my');
    return data;
  },

  /**
   * Get applications for a specific exam window.
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications.filter(a => a.examId === examId)); }
    const { data } = await apiClient.get(`/applications?examId=${examId}`);
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications.find(a => a.id === id) || null); }
    const { data } = await apiClient.get(`/applications/${id}`);
    return data;
  },

  /**
   * Submit a new application (with document uploads).
   * @param {FormData} formData
   */
  create: async (formData) => {
    if (USE_MOCK) {
      await mockDelay(1000);
      return mockResponse({ id: `APP-MOCK-${Date.now()}`, status: 'submitted' }, 'Application submitted successfully.');
    }
    const { data } = await apiClient.post('/applications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * Update an existing application.
   * @param {string} id
   * @param {Partial<import('../types').Application>} payload
   */
  update: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...applications.find(a => a.id === id), ...payload }); }
    const { data } = await apiClient.put(`/applications/${id}`, payload);
    return data;
  },

  /**
   * Update only the status of an application.
   * @param {string} id
   * @param {string} status - ApplicationStatus value
   * @param {string} [remarks]
   */
  updateStatus: async (id, status, remarks = '') => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, status, remarks }); }
    const { data } = await apiClient.patch(`/applications/${id}/status`, { status, remarks });
    return data;
  },
};
