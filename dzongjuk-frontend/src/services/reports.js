/**
 * @fileoverview Reports Service
 * Analytics and reporting data for dashboards and report pages.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { applications, bandScores, appeals, certificates, examWindows, dashboardStats } from '../data/mockData';

export const reportService = {
  /**
   * Get registration summary report.
   * @param {string} [examId] - Filter by exam window
   */
  getRegistrationReport: async (examId) => {
    if (USE_MOCK) {
      await mockDelay(500);
      const filtered = examId ? applications.filter(a => a.examId === examId) : applications;
      return mockResponse({
        total: filtered.length,
        approved: filtered.filter(a => a.status === 'approved').length,
        pending: filtered.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
        returned: filtered.filter(a => a.status === 'returned').length,
        cancelled: filtered.filter(a => a.status === 'cancelled').length,
        waitlisted: filtered.filter(a => a.status === 'waitlisted').length,
        byDzongkhag: [
          { name: 'Thimphu', count: 45 },
          { name: 'Paro', count: 22 },
          { name: 'Punakha', count: 18 },
          { name: 'Bumthang', count: 12 },
          { name: 'Wangdue Phodrang', count: 15 },
          { name: 'Others', count: 30 },
        ],
        byMonth: [
          { month: 'Jun', count: 85 },
          { month: 'Jul', count: 57 },
        ],
      });
    }
    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/registration${params}`);
    return data;
  },

  /**
   * Get score distribution report.
   * @param {string} [examId]
   */
  getScoreDistribution: async (examId) => {
    if (USE_MOCK) {
      await mockDelay(500);
      return mockResponse({
        writing:   [{ range: '1-2', count: 2 }, { range: '2.5-3.5', count: 8 }, { range: '4-5', count: 35 }, { range: '5.5-6.5', count: 45 }, { range: '7-8', count: 22 }, { range: '8.5-9', count: 6 }],
        reading:   [{ range: '1-2', count: 1 }, { range: '2.5-3.5', count: 5 }, { range: '4-5', count: 30 }, { range: '5.5-6.5', count: 48 }, { range: '7-8', count: 25 }, { range: '8.5-9', count: 9 }],
        listening: [{ range: '1-2', count: 3 }, { range: '2.5-3.5', count: 10 }, { range: '4-5', count: 38 }, { range: '5.5-6.5', count: 40 }, { range: '7-8', count: 20 }, { range: '8.5-9', count: 7 }],
        speaking:  [{ range: '1-2', count: 1 }, { range: '2.5-3.5', count: 6 }, { range: '4-5', count: 28 }, { range: '5.5-6.5', count: 50 }, { range: '7-8', count: 24 }, { range: '8.5-9', count: 9 }],
      });
    }
    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/scores${params}`);
    return data;
  },

  /**
   * Get appeals summary.
   * @param {string} [examId]
   */
  getAppealsReport: async (examId) => {
    if (USE_MOCK) {
      await mockDelay(400);
      const filtered = examId ? appeals.filter(a => a.examId === examId) : appeals;
      return mockResponse({
        total: filtered.length,
        pending: filtered.filter(a => a.status === 'pending_committee').length,
        approved: filtered.filter(a => a.status === 'approved').length,
        rejected: filtered.filter(a => a.status === 'rejected').length,
      });
    }
    const params = examId ? `?examId=${examId}` : '';
    const { data } = await apiClient.get(`/reports/appeals${params}`);
    return data;
  },

  /**
   * Get dashboard statistics for a role.
   * @param {string} role
   */
  getDashboardStats: async (role) => {
    if (USE_MOCK) { await mockDelay(300); return mockResponse(dashboardStats[role] || dashboardStats.dcdd); }
    const { data } = await apiClient.get(`/dashboard/stats?role=${role}`);
    return data;
  },
};
