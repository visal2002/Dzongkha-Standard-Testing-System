/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Reports Service
 * Analytics and reporting data for dashboards and report pages.
 */
import apiClient from './api';


export const reportService = {
  /** Get the cross-module reporting KPI summary. */
  getSummary: async () => {

    const { data } = await apiClient.get('/reports/summary');
    return data;
  },

  /**
   * Get registration summary report.
   * @param {string} [examId] - Filter by exam window
   */
  getRegistrationReport: async (examId) => {

    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/registration${params}`);
    return data;
  },

  /**
   * Get score distribution report.
   * @param {string} [examId]
   */
  getScoreDistribution: async (examId) => {

    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/scores${params}`);
    return data;
  },

  /**
   * Get appeals summary.
   * @param {string} [examId]
   */
  getAppealsReport: async (examId) => {

    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/appeals${params}`);
    return data;
  },

  /**
   * Get dashboard statistics for a role.
   * @param {string} role
   */
  getDashboardStats: async (role) => {

    const { data } = await apiClient.get(`/dashboard/stats?role=${role}`);
    return data;
  },

  /** Queue a governed report artifact in CSV, XLSX, or PDF format. */
  createExport: async (format, query) => {
    const { data } = await apiClient.post('/reports/jobs', { format, query });
    return data;
  },

  getExport: async (jobId) => {
    const { data } = await apiClient.get(`/reports/jobs/${jobId}`);
    return data;
  },
};
