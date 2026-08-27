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
import { recordAuditEvent } from './audit';
import { examWindows as mockExamWindows } from '@/mocks/mockData';

// Fixture-backed responses exist for the automated suites only. `DEV` is false in every
// built bundle and the mock build is the one Vite runs with `--mode test`, so a UAT or
// production build folds this to `false` and the fixtures drop out of the bundle
// entirely — VITE_USE_MOCK_DATA cannot switch them back on there.
const MOCK_DATA_ALLOWED = import.meta.env.DEV || import.meta.env.MODE === 'test';
const USE_MOCK_DATA = MOCK_DATA_ALLOWED && import.meta.env.VITE_USE_MOCK_DATA === 'true';

const normalizeExam = exam => ({
  ...exam,
  status: String(exam.status || 'DRAFT').toLowerCase(),
  maxCapacity: Number(exam.maxCapacity ?? exam.capacity ?? 0),
  currentRegistrations: Number(exam.currentRegistrations ?? 0),
  waitlistCount: Number(exam.waitlistCount ?? 0),
  paymentAmount: Number(exam.paymentAmount ?? exam.registrationFee ?? 0),
});

// ─── Mock persistence ──────────────────────────────────────────────────────────
// The imported fixture array is reset to its literal contents every time the module
// is re-evaluated, i.e. on every browser refresh. Pushing a newly created window
// onto it therefore only survives client-side navigation. To make DCDD's changes
// stick across a refresh — and be visible to Test Takers — mock-mode writes are
// mirrored into localStorage and merged back on every read.
const MOCK_STORE_KEY = 'dsts_mock_exam_windows';
const emptyMockStore = () => ({ created: [], patches: {} });

const readMockStore = () => {
  if (!USE_MOCK_DATA || typeof localStorage === 'undefined') return emptyMockStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyMockStore();
    return {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      patches: parsed.patches && typeof parsed.patches === 'object' ? parsed.patches : {},
    };
  } catch {
    return emptyMockStore();
  }
};

const writeMockStore = (store) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable or over quota — the window still shows for this session
  }
};

/** Fixtures + locally created windows, with any saved edits/status changes applied. */
const mockWindowList = () => {
  const { created, patches } = readMockStore();
  return [...mockExamWindows, ...created].map(exam => normalizeExam({ ...exam, ...(patches[exam.id] || {}) }));
};

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
    if (USE_MOCK_DATA) return { data: mockWindowList() };

    const { data } = await apiClient.get('/exams');
    return { ...data, data: unwrapList(data).map(normalizeExam) };
  },

  /** @param {string} id @returns {Promise<{data: import('@/constants/domain').ExamWindow}>} */
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      return { data: mockWindowList().find(exam => exam.id === id) || null };
    }

    const { data } = await apiClient.get(`/exams/${id}`);
    const exam = data?.data ?? data;
    return { data: exam ? normalizeExam(exam) : null };
  },

  /** @param {Partial<import('@/constants/domain').ExamWindow>} payload */
  create: async (payload) => {
    if (USE_MOCK_DATA) {
      const created = normalizeExam({ ...payload, id: `EXM-MOCK-${Date.now()}`, status: payload.status ?? 'DRAFT' });
      const store = readMockStore();
      store.created.push(created);
      writeMockStore(store);
      recordAuditEvent({ action: 'Exam Window Created', source: 'exam-service', resourceId: created.id, actorUserId: created.code || created.id, status: 'Success' });
      return { data: created };
    }

    const request = toRequest(payload);
    const { data } = await apiClient.post('/exams', request);
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  update: async (id, payload) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.patches[id] = { ...(store.patches[id] || {}), ...payload };
      writeMockStore(store);
      recordAuditEvent({ action: 'Exam Window Updated', source: 'exam-service', resourceId: id, actorUserId: id, status: 'Success' });
      return { data: mockWindowList().find(exam => exam.id === id) || null };
    }

    const { data } = await apiClient.patch(`/exams/${id}`, toRequest(payload));
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  /** @param {string} id @param {Partial<import('@/constants/domain').ExamWindow>} payload */
  updateStatus: async (id, status) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.patches[id] = { ...(store.patches[id] || {}), status };
      writeMockStore(store);
      recordAuditEvent({ action: 'Exam Status Changed', source: 'exam-service', resourceId: id, actorUserId: id, status: 'Success', role: String(status).replace(/_/g, ' ') });
      return { data: mockWindowList().find(exam => exam.id === id) || null };
    }

    const { data } = await apiClient.patch(`/exams/${id}/status`, { status: String(status).toUpperCase() });
    const exam = data?.data ?? data;
    return { data: normalizeExam(exam) };
  },

  /**
   * Move a window all the way to "registration open" in one action. The backend only
   * allows Draft → Published → Registration Open one step at a time, so a Draft window
   * is published first and then opened; a Published window just opens.
   * @param {string} id
   * @param {string} [fromStatus] current lower-case status
   */
  openRegistration: async (id, fromStatus) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.patches[id] = { ...(store.patches[id] || {}), status: 'registration_open' };
      writeMockStore(store);
      recordAuditEvent({ action: 'Registration Opened', source: 'exam-service', resourceId: id, actorUserId: id, status: 'Success' });
      return { data: mockWindowList().find(exam => exam.id === id) || null };
    }

    const chain = fromStatus === 'draft' ? ['PUBLISHED', 'REGISTRATION_OPEN'] : ['REGISTRATION_OPEN'];
    let exam = null;
    for (const step of chain) {
      const { data } = await apiClient.patch(`/exams/${id}/status`, { status: step });
      exam = data?.data ?? data;
    }
    return { data: exam ? normalizeExam(exam) : null };
  },
};
