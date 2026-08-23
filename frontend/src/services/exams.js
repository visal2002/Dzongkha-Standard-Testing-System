/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Exam Windows Service
 * CRUD operations for DSTS examination registration windows.
 */
import apiClient from './api';
import { examWindows as mockExamWindows } from '@/mocks/mockData';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const normalizeExam = exam => ({
  ...exam,
  status: String(exam.status || 'DRAFT').toLowerCase(),
  maxCapacity: Number(exam.maxCapacity ?? exam.capacity ?? 0),
  currentRegistrations: Number(exam.currentRegistrations ?? 0),
  waitlistCount: Number(exam.waitlistCount ?? 0),
  paymentAmount: Number(exam.paymentAmount ?? exam.registrationFee ?? 0),
});

const unwrapList = payload => (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
const toRequest = payload => ({
  ...(payload.code !== undefined ? { code: payload.code } : {}),
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.examDate !== undefined ? { examDate: new Date(payload.examDate).toISOString() } : {}),
  ...(payload.registrationStart !== undefined ? { registrationStart: new Date(payload.registrationStart).toISOString() } : {}),
  ...(payload.registrationEnd !== undefined ? { registrationEnd: new Date(payload.registrationEnd).toISOString() } : {}),
  ...(payload.capacity !== undefined || payload.maxCapacity !== undefined ? { capacity: Number(payload.capacity ?? payload.maxCapacity) } : {}),
  ...(payload.venue !== undefined ? { venue: payload.venue } : {}),
  ...(payload.registrationFee !== undefined || payload.paymentAmount !== undefined ? { registrationFee: String(payload.registrationFee ?? payload.paymentAmount) } : {}),
});

export const examService = {
  /** @returns {Promise<{data: import('@/constants/domain').ExamWindow[]}>} */
  getAll: async () => {
    // Without this branch the mock/CI build has no exam source at all, so every screen
    // that lists windows renders a network error instead of its real empty or open state.
    if (USE_MOCK_DATA) return { data: mockExamWindows.map(normalizeExam) };

    const { data } = await apiClient.get('/exams');
    return { ...data, data: unwrapList(data).map(normalizeExam) };
  },

  /** @param {string} id @returns {Promise<{data: import('@/constants/domain').ExamWindow}>} */
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      const found = mockExamWindows.find(exam => exam.id === id);
      return { data: found ? normalizeExam(found) : null };
    }

    const { data } = await apiClient.get(`/exams/${id}`);
    const exam = data?.data ?? data;
    return { data: exam ? normalizeExam(exam) : null };
  },

  /** @param {Partial<import('@/constants/domain').ExamWindow>} payload */
  create: async (payload) => {
    if (USE_MOCK_DATA) {
      const created = normalizeExam({ ...payload, id: `EXM-MOCK-${Date.now()}`, status: payload.status ?? 'DRAFT' });
      mockExamWindows.push(created);
      return { data: created };
    }

    const request = toRequest(payload);
    const { data } = await apiClient.post('/exams', request);
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  update: async (id, payload) => {
    if (USE_MOCK_DATA) return { data: normalizeExam({ ...mockExamWindows.find(exam => exam.id === id), ...payload }) };

    const { data } = await apiClient.patch(`/exams/${id}`, toRequest(payload));
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  /** @param {string} id @param {Partial<import('@/constants/domain').ExamWindow>} payload */
  updateStatus: async (id, status) => {
    if (USE_MOCK_DATA) return { data: normalizeExam({ ...mockExamWindows.find(exam => exam.id === id), status }) };

    const { data } = await apiClient.patch(`/exams/${id}/status`, { status: String(status).toUpperCase() });
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },
};
