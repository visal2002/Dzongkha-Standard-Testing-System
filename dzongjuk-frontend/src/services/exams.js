/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Exam Windows Service
 * CRUD operations for DSTS examination registration windows.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { examWindows } from '../data/mockData';

const normalizeExam = exam => ({
  ...exam,
  status: String(exam.status || 'DRAFT').toLowerCase(),
  maxCapacity: Number(exam.maxCapacity ?? exam.capacity ?? 0),
  currentRegistrations: Number(exam.currentRegistrations ?? 0),
  waitlistCount: Number(exam.waitlistCount ?? 0),
  paymentAmount: Number(exam.paymentAmount ?? exam.registrationFee ?? 0),
});

const unwrapList = payload => (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);

export const examService = {
  /** @returns {Promise<{data: import('../types').ExamWindow[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(examWindows); }
    const { data } = await apiClient.get('/exams');
    return { ...data, data: unwrapList(data).map(normalizeExam) };
  },

  /** @param {string} id @returns {Promise<{data: import('../types').ExamWindow}>} */
  getById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(examWindows.find(e => e.id === id) || null); }
    const { data } = await apiClient.get(`/exams/${id}`);
    const exam = data?.data ?? data;
    return { data: exam ? normalizeExam(exam) : null };
  },

  /** @param {Partial<import('../types').ExamWindow>} payload */
  create: async (payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...payload, id: `EXM-MOCK-${Date.now()}` }); }
    const request = {
      code: payload.code,
      title: payload.title,
      examDate: payload.examDate,
      registrationStart: payload.registrationStart,
      registrationEnd: payload.registrationEnd,
      capacity: Number(payload.capacity ?? payload.maxCapacity),
      venue: payload.venue,
      registrationFee: String(payload.registrationFee ?? payload.paymentAmount ?? 0),
    };
    const { data } = await apiClient.post('/exams', request);
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  /** @param {string} id @param {Partial<import('../types').ExamWindow>} payload */
  updateStatus: async (id, status) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...examWindows.find(e => e.id === id), status }); }
    const { data } = await apiClient.patch(`/exams/${id}/status`, { status: String(status).toUpperCase() });
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },
};
