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

    const { data } = await apiClient.get('/applications');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific user.
   * @param {string} userId
   */
  getByUser: async (userId) => {

    const { data } = await apiClient.get('/applications/my');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific exam window.
   * @param {string} examId
   */
  getByExam: async (examId) => {

    const { data } = await apiClient.get(`/applications?examId=${examId}`);
    return normalizeEnvelope(data);
  },

  /** @param {string} id */
  getById: async (id) => {

    const { data } = await apiClient.get(`/applications/${id}`);
    return data;
  },

  /**
   * Submit a new application (with document uploads).
   * @param {FormData} formData
   */
  create: async (examId, payload) => {

    const { data } = await apiClient.post(`/applications/exam/${examId}`, payload, {
      headers: { 'Idempotency-Key': createUuid() },
    });
    return data;
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
  cancel: async id => (await apiClient.post(`/applications/${id}/cancel`)).data,
};
