/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Reports Service
 * Analytics and reporting data for dashboards and report pages.
 */
import apiClient from '@/services/api';


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

  /** Download a completed report artifact */
  downloadExport: async (jobId, filename = 'export') => {
    const response = await apiClient.get(`/reports/jobs/${jobId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const contentDisposition = response.headers['content-disposition'];
    let downloadName = filename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        downloadName = match[1];
      }
    }
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
