/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Attendance Service
 * Manages exam-day attendance marking.
 */
import apiClient from '@/services/api';
import { unwrapList } from '@/lib/http';

import { normalizeApplication } from '@/features/registration/api';

export const attendanceService = {
  /**
   * Get all applications eligible for attendance marking.
   */
  getEligible: async () => {
    const { data } = await apiClient.get('/attendance');
    return { ...data, data: unwrapList(data).map(normalizeApplication) };
  },

  /**
   * Get approved applications for attendance marking for a given exam.
   * @param {string} examId
   */
  getByExam: async (examId) => {
    const { data } = await apiClient.get(`/attendance?examId=${examId}`);
    return { ...data, data: unwrapList(data).map(normalizeApplication) };
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
};
