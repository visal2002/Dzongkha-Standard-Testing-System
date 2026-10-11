import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { canAccess } from './accessMatrix';
import { canPerform } from './outOfMatrix';
import { navigationFor } from '@/layouts/Sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RouteGuard } from './RouteGuard';
import { writeSession, readSession, clearSession } from '@/lib/session';

const refreshToken = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/api', () => ({ authService: { refreshToken } }));
vi.mock('@/services/audit', () => ({ recordAuditEvent: vi.fn() }));
const account = permissions => ({ id: 'permission-test-user', name: 'Chief', role: 'exam_head', roles: ['exam_head'], permissions, permissionsAuthoritative: true });
const labels = user => navigationFor(user).map(item => item.label);

it('keeps the Chief sidebar focused on assigned-role work despite broad associations', () => {
  const user = account(['appeal.view', 'appeal.review', 'appeal.approve', 'appeal.submit', 'appeal.fee.manage']);
  expect(labels(user)).toContain('Revision Approvals Queue');
  for (const label of ['Revision Status Tracker', 'Submit Re-evaluation', 'Master Configuration']) expect(labels(user)).not.toContain(label);
  expect(canAccess(user, 'appeals', 'process')).toBe(true);
  expect(canAccess(user, 'appeals', 'approve')).toBe(true);
  expect(canPerform('examConfiguration', user)).toBe(true);
});

it('revokes matrix defaults when saved permissions are removed', () => {
  const user = account([]);
  expect(labels(user)).not.toContain('Question Bank');
  expect(labels(user)).not.toContain('Re-evaluation');
  expect(canAccess(user, 'questions', 'create')).toBe(false);
  expect(canAccess(user, 'appeals')).toBe(false);
});

it('keeps view, review, approval and own submission separate', () => {
  const user = account(['appeal.view']);
  expect(canAccess(user, 'appeals', 'read_all')).toBe(true);
  for (const action of ['process', 'approve', 'submit_own']) expect(canAccess(user, 'appeals', action)).toBe(false);
  expect(labels(user)).not.toContain('Submit Re-evaluation');
  expect(labels(user)).not.toContain('Revision Status Tracker');
});

it('uses combined token grants for multiple roles and new roles', () => {
  const user = { ...account(['admin.user.read', 'appeal.review']), role: 'custom_role', roles: ['custom_role', 'committee_member'] };
  expect(labels(user)).toEqual(expect.arrayContaining(['User Management', 'Re-evaluation']));
  expect(canAccess(user, 'roles')).toBe(false);
});

it('recognizes the wildcard while unknown actions still fail closed', () => {
  const user = account(['*']);
  expect(canAccess(user, 'appeals', 'approve')).toBe(true);
  expect(canPerform('committeeSetup', user)).toBe(false);
  expect(canAccess(user, 'unknown')).toBe(false);
  expect(canPerform('unknown', user)).toBe(false);
});

it('preserves the backend role gate on classified Question Bank content', () => {
  const user = { ...account(['*']), role: 'admin', roles: ['admin'] };
  expect(labels(user)).not.toContain('Question Bank');
  expect(canAccess(user, 'questions', 'secure_read')).toBe(false);
  expect(canAccess({ ...user, roles: ['admin', 'exam_head'] }, 'questions', 'secure_read')).toBe(true);
});

it('preserves mock reference menus', () => {
  expect(labels({ ...account([]), permissionsAuthoritative: false })).toEqual(navigationFor('exam_head').map(item => item.label));
});

function SessionView() {
  const { user } = useAuth();
  return <><div data-testid="menu">{labels(user).join(', ')}</div><Routes>
    <Route path="/appeals" element={<RouteGuard requiredAccess={{ module: 'appeals', action: 'read' }}><div>Appeals accessible</div></RouteGuard>} />
    <Route path="/dashboard" element={<div>Dashboard fallback</div>} />
  </Routes></>;
}

describe('Chief of Examination final approval', () => {
  it('allows final decisions but not committee review with approval-only grants', () => {
    const chief = { role: 'exam_head', roles: ['exam_head'], permissions: ['appeal.view', 'appeal.approve'] };
    expect(canAccess(chief, 'appeals', 'approve')).toBe(true);
    expect(labels(chief)).toContain('Revision Approvals Queue');
    expect(navigationFor('exam_head').map(item => item.label)).toContain('Revision Approvals Queue');
    expect(canAccess(chief, 'appeals', 'process')).toBe(false);
    expect(canAccess({ role: 'committee_member', permissions: ['appeal.review'] }, 'appeals', 'approve')).toBe(false);
  });
});

describe('saved permission propagation into an existing session', () => {
  beforeEach(() => { clearSession(); refreshToken.mockReset(); });
  afterEach(() => { clearSession(); });

  it('refreshes the token and removes both navigation and route access after a save', async () => {
    const granted = account(['appeal.view', 'appeal.approve']);
    writeSession({ user: granted, accessToken: 'old-token', expiresAt: Date.now() + 900000 });
    refreshToken.mockResolvedValueOnce({ user: granted, token: 'fresh-token', expiresIn: 900 });
    render(<AuthProvider><MemoryRouter initialEntries={['/appeals']}><SessionView /></MemoryRouter></AuthProvider>);
    await screen.findByText('Appeals accessible');
    await waitFor(() => expect(readSession().accessToken).toBe('fresh-token'));
    expect(screen.getByTestId('menu')).toHaveTextContent('Revision Approvals Queue');
    refreshToken.mockResolvedValueOnce({ user: account([]), token: 'revoked-token', expiresIn: 900 });
    await act(async () => { window.dispatchEvent(new Event('dsts:permissions-changed')); });
    await screen.findByText('Dashboard fallback');
    expect(screen.getByTestId('menu')).not.toHaveTextContent('Revision Approvals Queue');
    expect(readSession().accessToken).toBe('revoked-token');
  });

  it('shows a newly associated module when the user returns to the window', async () => {
    const initial = account([]);
    writeSession({ user: initial, accessToken: 'initial-token', expiresAt: Date.now() + 900000 });
    refreshToken.mockResolvedValueOnce({ user: initial, token: 'initial-token', expiresIn: 900 });
    render(<AuthProvider><MemoryRouter initialEntries={['/dashboard']}><SessionView /></MemoryRouter></AuthProvider>);
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1));
    refreshToken.mockResolvedValueOnce({ user: account(['appeal.approve']), token: 'updated-token', expiresIn: 900 });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(screen.getByTestId('menu')).toHaveTextContent('Revision Approvals Queue'));
    expect(readSession().accessToken).toBe('updated-token');
  });
});

it('keeps System Admin navigation administration-only despite wildcard or multiple roles', () => {
  const user = { ...account(['*']), role: 'admin', roles: ['admin', 'exam_head'] };
  expect(labels(user)).toEqual(['Admin Dashboard', 'User Management', 'Role Management', 'Permission & Association Management', 'Role Assignment', 'Committee Setup', 'System Audit Logs', 'Technical Settings']);
  expect(canAccess(user, 'appeals', 'approve')).toBe(true);
  expect(labels({ ...user, permissions: ['admin.user.read'] })).toEqual(['Admin Dashboard', 'User Management', 'Technical Settings']);
});

