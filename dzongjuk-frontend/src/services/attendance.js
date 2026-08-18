/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Attendance Service
 * Manages exam-day attendance marking.
 */
import apiClient from './api';

import { normalizeApplication } from './applications';

export const attendanceService = {
  /**
   * Get all applications eligible for attendance marking.
   */
  getEligible: async () => {

    const { data } = await apiClient.get('/attendance');
    const records = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return { ...data, data: records.map(normalizeApplication) };
  },

  /**
   * Get approved applications for attendance marking for a given exam.
   * @param {string} examId
   */
  getByExam: async (examId) => {

    const { data } = await apiClient.get(`/attendance?examId=${examId}`);
    const records = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return { ...data, data: records.map(normalizeApplication) };
  },

  /**
   * Mark attendance for an applicant.
   * @param {string} applicationId
   * @param {{ present: boolean, absentSkills: string[] }} payload
   */
  markAttendance: async (applicationId, payload) => {

    const { data } = await apiClient.patch(`/attendance/${applicationId}`, { absentSkills: payload.absentSkills || [] });
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

    const { data } = await apiClient.post('/attendance/bulk', { records });
    return data;
  },
};
