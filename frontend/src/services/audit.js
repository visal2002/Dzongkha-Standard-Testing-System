/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Audit Service
 * Read access to the reporting service's immutable audit trail (BRD §7.3).
 */
import apiClient from './api';

const MOCK_DATA_ALLOWED = import.meta.env.DEV || import.meta.env.MODE === 'test';
const USE_MOCK_DATA = MOCK_DATA_ALLOWED && import.meta.env.VITE_USE_MOCK_DATA === 'true';

const MOCK_EVENTS = [
  { id: 'AUD-001', eventId: 'evt-001', action: 'Role Change', source: 'identity-service', resourceId: 'USR-003', actorUserId: 'USR-001', correlationId: 'corr-001', occurredAt: '2026-08-20T09:14:00Z', safeData: { role: 'System Administrator', ipAddress: '10.0.4.12', status: 'Success' } },
  { id: 'AUD-002', eventId: 'evt-002', action: 'Score Submitted', source: 'exam-service', resourceId: 'EXM-2026-07', actorUserId: 'USR-004', correlationId: 'corr-002', occurredAt: '2026-08-20T08:02:00Z', safeData: { role: 'Committee Head', ipAddress: '10.0.4.44', status: 'Success' } },
  { id: 'AUD-003', eventId: 'evt-003', action: 'Login Failed', source: 'identity-service', resourceId: 'USR-006', actorUserId: 'USR-006', correlationId: 'corr-003', occurredAt: '2026-08-19T21:47:00Z', safeData: { role: 'Test Taker', ipAddress: '203.0.113.7', status: 'Failure' } },
  { id: 'AUD-004', eventId: 'evt-004', action: 'Permission Updated', source: 'identity-service', resourceId: 'ROLE-002', actorUserId: 'USR-001', correlationId: 'corr-004', occurredAt: '2026-08-19T15:30:00Z', safeData: { role: 'System Administrator', ipAddress: '10.0.4.12', status: 'Success' } },
  { id: 'AUD-005', eventId: 'evt-005', action: 'Certificate Issued', source: 'certificate-service', resourceId: 'CERT-1123', actorUserId: 'USR-002', correlationId: 'corr-005', occurredAt: '2026-08-19T11:05:00Z', safeData: { role: 'DCDD Administrator', ipAddress: '10.0.4.9', status: 'Success' } },
];

const normalizeEvent = event => ({
  ...event,
  role: event.safeData?.role ?? null,
  ipAddress: event.safeData?.ipAddress ?? event.safeData?.ip ?? null,
  status: event.safeData?.status ?? null,
});

export const auditService = {
  /**
   * @param {{action?: string, actorUserId?: string, from?: string, to?: string, page?: number, pageSize?: number}} query
   * @returns {Promise<{items: object[], total: number, page: number, pageSize: number}>}
   */
  getEvents: async (query = {}) => {
    if (USE_MOCK_DATA) {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const filtered = MOCK_EVENTS.filter(event =>
        (!query.action || event.action.toLowerCase().includes(query.action.toLowerCase())) &&
        (!query.actorUserId || event.actorUserId === query.actorUserId) &&
        (!query.from || event.occurredAt >= query.from) &&
        (!query.to || event.occurredAt <= query.to)
      );
      return { items: filtered.map(normalizeEvent), total: filtered.length, page, pageSize };
    }

    const { data } = await apiClient.get('/audit/events', { params: query });
    return { ...data, items: (data?.items || []).map(normalizeEvent) };
  },

  /**
   * Fetches the CSV export as a blob so it can be saved via an authenticated request
   * (a plain link would carry no Bearer token).
   * @param {{action?: string, actorUserId?: string, from?: string, to?: string}} query
   * @returns {Promise<Blob>}
   */
  exportCsv: async (query = {}) => {
    const { data } = await apiClient.get('/audit/export', { params: query, responseType: 'blob' });
    return data;
  },
};
