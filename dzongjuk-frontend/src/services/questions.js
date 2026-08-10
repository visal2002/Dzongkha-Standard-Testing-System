/**
 * @fileoverview Questions Service
 * Question paper upload and retrieval.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { questionPapers, examWindows } from '../data/mockData';

export const questionService = {
  /** @returns {Promise<{data: import('../types').QuestionPaper[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(questionPapers); }
    const { data } = await apiClient.get('/questions');
    return data;
  },

  /**
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(questionPapers.filter(q => q.examId === examId)); }
    const { data } = await apiClient.get(`/questions?examId=${examId}`);
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(questionPapers.find(q => q.id === id) || null); }
    const { data } = await apiClient.get(`/questions/${id}`);
    return data;
  },

  /**
   * Get sample papers (publicly available).
   */
  getSamples: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(questionPapers.filter(q => q.status === 'published')); }
    const { data } = await apiClient.get('/questions/samples');
    return data;
  },

  /**
   * Upload a new question paper.
   * @param {FormData} formData - Must include: file, examId, skill, title, isEncrypted
   */
  upload: async (formData) => {
    if (USE_MOCK) {
      await mockDelay(1200);
      return mockResponse({ id: `QP-MOCK-${Date.now()}`, status: 'draft' }, 'Paper uploaded successfully.');
    }
    const { data } = await apiClient.post('/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * Publish a question paper (makes it accessible on exam day).
   * @param {string} id
   */
  publish: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, status: 'published' }); }
    const { data } = await apiClient.patch(`/questions/${id}/publish`);
    return data;
  },

  /** @param {string} id */
  delete: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(null, 'Deleted.'); }
    const { data } = await apiClient.delete(`/questions/${id}`);
    return data;
  },
};
