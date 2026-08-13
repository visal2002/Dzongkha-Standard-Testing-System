/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Admin Service
 * System administration — users and roles.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { systemUsers, systemRoles } from '../data/mockData';

let mockUsers = systemUsers.map(user => ({ ...user }));
let mockRoles = systemRoles.map(role => ({ ...role }));

const normalizeRole = role => ({
  ...role,
  permissions: Array.isArray(role.permissions) ? role.permissions.map(permission => permission.name) : role.permissions,
  userCount: role.userCount || 0,
});

const normalizeUser = user => {
  if (!user) return null;
  const roleObjects = Array.isArray(user.roles) ? user.roles : [];
  const roleCodes = roleObjects.map(role => typeof role === 'string' ? role : role.code);
  const roleNames = roleObjects.map(role => typeof role === 'string' ? role : role.name);
  return {
    ...user,
    name: user.name || user.fullName,
    fullName: user.fullName || user.name,
    roles: roleCodes.length ? roleCodes : (user.roleCode ? [user.roleCode] : []),
    roleCode: roleCodes[0] || user.roleCode,
    role: roleNames.length ? roleNames.join(', ') : user.role,
    status: String(user.status || 'ACTIVE').toLowerCase().replace('disabled', 'inactive'),
  };
};

export const adminService = {
  // ── Users ────────────────────────────────────────────────────────────────────

  /** @returns {Promise<{data: import('../types').SystemUser[]}>} */
  getUsers: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(mockUsers.map(normalizeUser)); }
    const { data } = await apiClient.get('/admin/users');
    const value = data?.data || data;
    return Array.isArray(value) ? value.map(normalizeUser) : value;
  },

  /** @param {string} id */
  getUserById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(normalizeUser(mockUsers.find(u => u.id === id) || null)); }
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data;
  },

  /** @param {Partial<import('../types').SystemUser>} payload */
  createUser: async (payload) => {
    if (USE_MOCK) {
      await mockDelay();
      const roles = payload.roleCodes.map(code => mockRoles.find(role => role.code === code)).filter(Boolean);
      const created = normalizeUser({ ...payload, id: `USR-MOCK-${Date.now()}`, roles, status: 'ACTIVE', createdAt: new Date().toISOString() });
      mockUsers = [created, ...mockUsers];
      return mockResponse(created);
    }
    const { data } = await apiClient.post('/admin/users', payload);
    return normalizeUser(data?.data || data);
  },

  /**
   * @param {string} id
   * @param {Partial<import('../types').SystemUser>} payload
   */
  updateUser: async (id, payload) => {
    if (USE_MOCK) {
      await mockDelay();
      const roles = payload.roleCodes.map(code => mockRoles.find(role => role.code === code)).filter(Boolean);
      const updated = normalizeUser({ ...mockUsers.find(user => user.id === id), ...payload, roles });
      mockUsers = mockUsers.map(user => user.id === id ? updated : user);
      return mockResponse(updated);
    }
    const { data } = await apiClient.put(`/admin/users/${id}`, payload);
    return normalizeUser(data?.data || data);
  },

  /**
   * @param {string} id
   * @param {'active'|'inactive'|'suspended'} status
   */
  setUserStatus: async (id, status) => {
    if (USE_MOCK) { await mockDelay(); mockUsers = mockUsers.map(user => user.id === id ? { ...user, status } : user); return mockResponse({ id, status }); }
    const { data } = await apiClient.patch(`/admin/users/${id}/status`, { status: status === 'active' ? 'ACTIVE' : 'DISABLED' });
    return data;
  },

  /** @param {string} id */
  deleteUser: async (id) => {
    if (USE_MOCK) { await mockDelay(); mockUsers = mockUsers.filter(user => user.id !== id); return mockResponse(null, 'User deleted.'); }
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },

  // ── Roles ────────────────────────────────────────────────────────────────────

  /** @returns {Promise<{data: import('../types').SystemRole[]}>} */
  getRoles: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(mockRoles.map(normalizeRole)); }
    const { data } = await apiClient.get('/admin/roles');
    const value = data?.data || data;
    return Array.isArray(value) ? value.map(normalizeRole) : value;
  },

  /**
   * @param {string} id
   * @param {import('../types').SystemRole['permissions']} permissions
   */
  updateRolePermissions: async (id, permissions) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, permissions }); }
    const { data } = await apiClient.put(`/admin/roles/${id}/permissions`, { permissions });
    return data;
  },

  /**
   * Create a new system role.
   * @param {Partial<import('../types').SystemRole>} payload
   */
  createRole: async (payload) => {
    if (USE_MOCK) { await mockDelay(); const role = normalizeRole({ ...payload, id: `ROLE-MOCK-${Date.now()}`, userCount: 0 }); mockRoles = [...mockRoles, role]; return mockResponse(role); }
    const { data } = await apiClient.post('/admin/roles', payload);
    return normalizeRole(data?.data || data);
  },

  /**
   * Update a role's metadata (name, description, code).
   * @param {string} id
   * @param {Partial<import('../types').SystemRole>} payload
   */
  updateRole: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...systemRoles.find(r => r.id === id), ...payload }); }
    const { data } = await apiClient.put(`/admin/roles/${id}`, payload);
    return data;
  },

  /**
   * Delete a system role by ID.
   * @param {string} id
   */
  deleteRole: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(null, 'Role deleted.'); }
    const { data } = await apiClient.delete(`/admin/roles/${id}`);
    return data;
  },
};
