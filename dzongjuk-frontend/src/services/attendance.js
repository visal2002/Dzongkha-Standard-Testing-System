/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Attendance Service
 * Manages exam-day attendance marking.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { applications } from '../data/mockData';

export const attendanceService = {
  /**
   * Get all applications eligible for attendance marking.
   */
  getEligible: async () => {
    if (USE_MOCK) {
      await mockDelay();
      return mockResponse(applications.filter(a => ['approved', 'verified'].includes(a.status)));
    }
    const { data } = await apiClient.get('/attendance/eligible');
    return data;
  },

  /**
   * Get approved applications for attendance marking for a given exam.
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK) {
      await mockDelay();
      return mockResponse(
        applications.filter(a => a.examId === examId && ['approved', 'verified'].includes(a.status))
      );
    }
    const { data } = await apiClient.get(`/attendance?examId=${examId}`);
    return data;
  },

  /**
   * Mark attendance for an applicant.
   * @param {string} applicationId
   * @param {{ present: boolean, absentSkills: string[] }} payload
   */
  markAttendance: async (applicationId, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ applicationId, ...payload }); }
    const { data } = await apiClient.patch(`/attendance/${applicationId}`, payload);
    return data;
  },

  /**
   * Mark an applicant absent for one or more tested skills.
   * @param {string} applicationId
   * @param {string[]} absentSkills
   */
  markAbsent: async (applicationId, absentSkills) => attendanceService.markAttendance(applicationId, {
    present: false,
    absentSkills,
  }),

  /**
   * Bulk mark attendance for multiple applicants.
   * @param {Array<{ applicationId: string, present: boolean, absentSkills: string[] }>} records
   */
  bulkMarkAttendance: async (records) => {
    if (USE_MOCK) { await mockDelay(800); return mockResponse(records, 'Attendance saved.'); }
    const { data } = await apiClient.post('/attendance/bulk', { records });
    return data;
  },
};
