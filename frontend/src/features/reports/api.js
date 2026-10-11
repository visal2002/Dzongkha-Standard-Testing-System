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


const REPORT_DATASETS = {
  summary: 'summary', registration: 'applications', 'reg-summary': 'applications',
  verification: 'applications', 'band-dist': 'scores', 'appeal-track': 'appeals',
  'cert-validity': 'certificates', 'exam-schedule': 'examinations',
};
export function getReportQuery(reportId, examId) {
  const dataset = REPORT_DATASETS[reportId];
  if (!dataset) throw new Error('This report is not available.');
  return { dataset, fields: [], ...(examId ? { filters: [{ field: 'examId', operator: 'eq', value: examId }] } : {}) };
}

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
    const { data } = await apiClient.post('/reports/jobs', { format: String(format).toUpperCase(), query });
    return data?.data ?? data;
  },

  getExport: async (jobId) => {
    const { data } = await apiClient.get(`/reports/jobs/${jobId}`);
    return data?.data ?? data;
  },

  /** Poll the worker; never try downloading a queued or failed job. */
  waitForExport: async (jobId, { timeoutMs = 120000, pollIntervalMs = 1000 } = {}) => {
    if (!jobId) throw new Error('The server did not return a report job ID.');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const job = await reportService.getExport(jobId);
      if (job.status === 'COMPLETED') return job;
      if (job.status === 'FAILED') throw new Error('Report generation failed. Please retry or contact the administrator.');
      if (job.status === 'EXPIRED') throw new Error('The report has expired. Generate it again.');
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error('The report is taking longer than expected. Please try again shortly.');
  },

  /** Download a completed report artifact */
  downloadExport: async (jobId, filename = 'export') => {
    const response = await apiClient.get(`/reports/jobs/${jobId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
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
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },
};
