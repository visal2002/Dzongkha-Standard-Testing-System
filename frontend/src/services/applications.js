/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Applications Service
 * Manages exam registration applications.
 */
import apiClient from './api';
import { createUuid } from '@/utils/uuid';
import { applications as mockApplications, examWindows as mockExamWindows } from '@/mocks/mockData';
import { recordAuditEvent } from './audit';

// Fixture-backed responses for the mock/CI build only - a real bundle folds this to
// false and the fixtures drop out entirely.
const MOCK_DATA_ALLOWED = import.meta.env.DEV || import.meta.env.MODE === 'test';
const USE_MOCK_DATA = MOCK_DATA_ALLOWED && import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Applications submitted at runtime are mirrored to localStorage so they survive a
// page refresh.
const MOCK_STORE_KEY = 'dsts_mock_applications';

const readMockStore = () => {
  if (!USE_MOCK_DATA || typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeMockStore = (list) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable - the application still lives for this session
  }
};

const sessionUser = () => {
  try {
    const raw = sessionStorage.getItem('dsts_session');
    return raw ? JSON.parse(raw)?.user ?? null : null;
  } catch {
    return null;
  }
};

/** Fixtures + runtime-created applications. */
const allMockApplications = () => [...readMockStore(), ...mockApplications];

/** Next registration number for an exam, continuing the existing series. */
const nextRegistrationNumber = (examId) => {
  const exam = mockExamWindows.find(e => e.id === examId);
  const series = (exam?.examDate ? new Date(exam.examDate) : new Date());
  const prefix = `DSTS-${series.getFullYear()}-${String(series.getMonth() + 1).padStart(2, '0')}`;
  const taken = allMockApplications()
    .filter(a => a.examId === examId && typeof a.registrationNumber === 'string' && a.registrationNumber.startsWith(prefix))
    .map(a => Number(a.registrationNumber.split('-').pop()))
    .filter(Number.isFinite);
  const next = (taken.length ? Math.max(...taken) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
};

export const normalizeApplication = application => {
  const profile = application.profileSnapshot || {};
  const attendance = application.attendance || {};
  return {
    ...application,
    testTakerId: application.testTakerId ?? application.testTakerUserId,
    testTakerName: application.testTakerName ?? profile.fullName ?? 'Unknown applicant',
    cid: application.cid ?? profile.cid ?? application.identityKey ?? '',
    email: application.email ?? profile.email ?? '',
    phone: application.phone ?? profile.phone ?? profile.contactNo ?? '',
    dob: application.dob ?? profile.dateOfBirth ?? null,
    gender: application.gender ?? profile.gender ?? '—',
    dzongkhag: application.dzongkhag ?? profile.dzongkhag ?? '—',
    gewog: application.gewog ?? profile.gewog ?? '—',
    education: application.education ?? profile.education ?? '—',
    institution: application.institution ?? profile.institution ?? '—',
    employmentStatus: application.employmentStatus ?? profile.employmentStatus ?? '—',
    organization: application.organization ?? profile.organization ?? '',
    documents: Array.isArray(application.documents) ? application.documents : [],
    status: String(application.status || '').toLowerCase(),
    absentSkills: application.absentSkills ?? attendance.absentSkills ?? [],
    attendanceStatus: attendance.overallStatus?.toLowerCase() ?? null,
    paymentStatus: String(application.paymentStatus || (Number(application.paymentAmount || 0) === 0 ? 'WAIVED' : 'INITIATED')).toLowerCase(),
    paymentAmount: Number(application.paymentAmount || 0),
    paymentCurrency: application.paymentCurrency || 'BTN',
    paymentReference: application.paymentReference || null,
    paymentAdviceNo: application.paymentAdviceNo || null,
    paymentRedirectUrl: application.paymentRedirectUrl || null,
    paymentReceiptNo: application.paymentReceiptNo || null,
    paymentMethod: application.paymentMethod || null,
    paidAt: application.paidAt || null,
  };
};

const normalizeEnvelope = payload => ({
  ...payload,
  data: (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []).map(normalizeApplication),
});

export const applicationService = {
  /** @returns {Promise<{data: import('@/constants/domain').Application[]}>} */
  getAll: async () => {
    if (USE_MOCK_DATA) return normalizeEnvelope({ data: allMockApplications() });

    const { data } = await apiClient.get('/applications');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific user.
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK_DATA) {
      const me = sessionUser();
      const id = userId || me?.id;
      const cid = me?.cid;
      const mine = allMockApplications().filter(a =>
        (id && (a.testTakerId === id || a.testTakerUserId === id))
        || (cid && (a.cid === cid || a.identityKey === cid)),
      );
      return normalizeEnvelope({ data: mine });
    }

    const { data } = await apiClient.get('/applications/my');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific exam window.
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK_DATA) return normalizeEnvelope({ data: allMockApplications().filter(a => a.examId === examId) });

    const { data } = await apiClient.get(`/applications?examId=${examId}`);
    return normalizeEnvelope(data);
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      const found = allMockApplications().find(a => a.id === id);
      return { data: found ? normalizeApplication(found) : null };
    }

    const { data } = await apiClient.get(`/applications/${id}`);
    return data;
  },

  /**
   * Submit a new application (with document uploads).
   * @param {FormData} formData
   */
  create: async (examId, payload) => {
    if (USE_MOCK_DATA) {
      const me = sessionUser();
      const profile = payload?.profileSnapshot || {};
      const exam = mockExamWindows.find(e => e.id === examId);
      const fee = Number(exam?.paymentAmount ?? exam?.registrationFee ?? 0);
      const now = new Date().toISOString();
      const application = {
        id: `APP-MOCK-${Date.now()}`,
        examId,
        testTakerId: me?.id ?? null,
        testTakerUserId: me?.id ?? null,
        testTakerName: profile.fullName || me?.name || 'Applicant',
        identityKey: payload?.identityKey || profile.cid || me?.cid || '',
        cid: payload?.identityKey || profile.cid || me?.cid || '',
        email: profile.email || me?.email || '',
        phone: profile.phone || me?.phone || me?.contactNumber || '',
        profileSnapshot: profile,
        registrationNumber: nextRegistrationNumber(examId),
        status: 'submitted',
        paymentStatus: fee > 0 ? 'initiated' : 'waived',
        paymentAmount: fee,
        paymentCurrency: 'BTN',
        submittedAt: now,
        remarks: '',
        documents: [],
        statusHistory: [
          { status: 'submitted', timestamp: now, by: profile.fullName || me?.name || 'Applicant' },
        ],
      };
      writeMockStore([application, ...readMockStore()]);
      recordAuditEvent({
        action: 'Exam Registration',
        source: 'registration-service',
        resourceId: application.id,
        actorUserId: me?.userId || me?.id || application.cid,
        role: me?.roleName || 'Test Taker',
        status: 'Success',
      });
      return { data: { applicationId: application.id, status: application.status, registrationNumber: application.registrationNumber } };
    }

    const { data } = await apiClient.post(`/applications/exam/${examId}`, payload, {
      headers: { 'Idempotency-Key': createUuid() },
    });
    return data;
  },

  lookupCitizen: async cid => {
    const { data } = await apiClient.post('/applications/citizen-lookup', { cid });
    return data?.data ?? data;
  },

  /**
   * Update an existing application.
   * @param {string} id
   * @param {Partial<import('@/constants/domain').Application>} payload
   */
  update: async (id, payload) => {

    const { data } = await apiClient.put(`/applications/${id}`, payload);
    return data;
  },

  /**
   * Update only the status of an application.
   * @param {string} id
   * @param {string} status - ApplicationStatus value
   * @param {string} [remarks]
   */
  startReview: async id => (await apiClient.post(`/applications/${id}/start-review`)).data,
  verify: async id => (await apiClient.post(`/applications/${id}/verify`)).data,
  returnForCorrection: async (id, remarks) => (await apiClient.post(`/applications/${id}/return`, { remarks })).data,
  /**
   * BRD §5.2.2 item 3: re-sends the verification notification (registration number,
   * exam time, venue) any time after verification - not only once at the moment of
   * verifying. Rejected with 409 unless the application is currently Verified.
   * @param {string} id
   */
  notify: async id => (await apiClient.post(`/applications/${id}/notify`)).data,
  recordPayment: async (id, payload) => {
    const { data } = await apiClient.post(`/applications/${id}/payment`, {
      status: String(payload.status).toUpperCase(),
      method: payload.method,
      ...(payload.reference ? { reference: payload.reference } : {}),
    });
    return { data: normalizeApplication(data?.data ?? data) };
  },
  createPaymentAdvice: async id => (await apiClient.post(`/applications/${id}/payment-advice`)).data,
  refreshPayment: async id => (await apiClient.post(`/applications/${id}/payment-refresh`)).data,
  cancelPayment: async (id, reason) => (await apiClient.post(`/applications/${id}/payment-cancel`, { reason })).data,
  getPaymentReceipt: async id => (await apiClient.get(`/applications/${id}/payment-receipt`)).data,

  /**
   * Cancel an own application. Only allowed while it is still Submitted or Waitlisted -
   * the backend rejects with 409 once DCDD review has started.
   * @param {string} id
   */
  cancel: async id => {
    if (USE_MOCK_DATA) {
      writeMockStore(readMockStore().map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      return { data: { id, status: 'cancelled' } };
    }
    return (await apiClient.post(`/applications/${id}/cancel`)).data;
  },

  /**
   * Resubmit a Returned application with a corrected profile snapshot. Only allowed
   * while the application is Returned - the backend rejects any other status.
   * @param {string} id
   * @param {Record<string, unknown>} profileSnapshot
   */
  resubmit: async (id, profileSnapshot) => (await apiClient.post(`/applications/${id}/resubmit`, { profileSnapshot })).data,
};
