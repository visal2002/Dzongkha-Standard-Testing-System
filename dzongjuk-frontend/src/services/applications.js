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
import { createUuid } from '../utils/uuid';

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
  };
};

const normalizeEnvelope = payload => ({
  ...payload,
  data: (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []).map(normalizeApplication),
});

export const applicationService = {
  /** @returns {Promise<{data: import('../types').Application[]}>} */
  getAll: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications); }
    const { data } = await apiClient.get('/applications');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific user.
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications.filter(a => a.testTakerId === userId)); }
    const { data } = await apiClient.get('/applications/my');
    return normalizeEnvelope(data);
  },

  /**
   * Get applications for a specific exam window.
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(applications.filter(a => a.examId === examId)); }
    const { data } = await apiClient.get(`/applications?examId=${examId}`);
    return normalizeEnvelope(data);
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
  create: async (examId, payload) => {
    if (USE_MOCK) {
      await mockDelay(1000);
      return mockResponse({ id: `APP-MOCK-${Date.now()}`, status: 'submitted' }, 'Application submitted successfully.');
    }
    const { data } = await apiClient.post(`/applications/exam/${examId}`, payload, {
      headers: { 'Idempotency-Key': createUuid() },
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
  startReview: async id => (await apiClient.post(`/applications/${id}/start-review`)).data,
  verify: async id => (await apiClient.post(`/applications/${id}/verify`)).data,
  returnForCorrection: async (id, remarks) => (await apiClient.post(`/applications/${id}/return`, { remarks })).data,
};
