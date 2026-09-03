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
import { USE_MOCK_DATA } from '@/lib/env';

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

// ─── Client-recorded events (mock mode only) ──────────────────────────────────
// A real deployment records audit events server-side in the reporting service. In
// mock mode there is no such service, so actions performed locally — sign-ins in
// particular — are captured here and merged with the seeded fixtures, otherwise the
// screen only ever shows the five sample rows.
const MOCK_STORE_KEY = 'dsts_mock_audit_events';
const MOCK_STORE_LIMIT = 200;

const readStoredEvents = () => {
  if (!USE_MOCK_DATA || typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredEvents = (events) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(events.slice(-MOCK_STORE_LIMIT)));
  } catch {
    // storage unavailable or over quota — the current session's list still updates
  }
};

/**
 * Append a client-side audit entry. No-ops outside mock mode.
 * @param {{action: string, actorUserId?: string|null, resourceId?: string|null,
 *          source?: string, role?: string|null, status?: string, ipAddress?: string|null}} entry
 */
export const recordAuditEvent = ({
  action,
  actorUserId = null,
  resourceId = null,
  source = 'identity-service',
  role = null,
  status = 'Success',
  ipAddress = 'local',
}) => {
  if (!USE_MOCK_DATA) return null;
  const stamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  const event = {
    id: `AUD-LOCAL-${stamp}-${suffix}`,
    eventId: `evt-local-${stamp}-${suffix}`,
    action,
    source,
    resourceId: resourceId ?? actorUserId,
    actorUserId,
    correlationId: `corr-local-${stamp}-${suffix}`,
    occurredAt: new Date(stamp).toISOString(),
    safeData: { role, ipAddress, status },
  };
  writeStoredEvents([...readStoredEvents(), event]);
  return event;
};

export const auditService = {
  /**
   * @param {{action?: string, actorUserId?: string, from?: string, to?: string, page?: number, pageSize?: number}} query
   * @returns {Promise<{items: object[], total: number, page: number, pageSize: number}>}
   */
  getEvents: async (query = {}) => {
    if (USE_MOCK_DATA) {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const all = [...readStoredEvents(), ...MOCK_EVENTS]
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
      const filtered = all.filter(event =>
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
