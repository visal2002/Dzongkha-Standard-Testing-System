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

export const adminService = {
  // ── Users ────────────────────────────────────────────────────────────────────

  /** @returns {Promise<{data: import('../types').SystemUser[]}>} */
  getUsers: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(systemUsers); }
    const { data } = await apiClient.get('/admin/users');
    return data;
  },

  /** @param {string} id */
  getUserById: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(systemUsers.find(u => u.id === id) || null); }
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data;
  },

  /** @param {Partial<import('../types').SystemUser>} payload */
  createUser: async (payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...payload, id: `USR-MOCK-${Date.now()}`, status: 'active' }); }
    const { data } = await apiClient.post('/admin/users', payload);
    return data;
  },

  /**
   * @param {string} id
   * @param {Partial<import('../types').SystemUser>} payload
   */
  updateUser: async (id, payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...systemUsers.find(u => u.id === id), ...payload }); }
    const { data } = await apiClient.put(`/admin/users/${id}`, payload);
    return data;
  },

  /**
   * @param {string} id
   * @param {'active'|'inactive'|'suspended'} status
   */
  setUserStatus: async (id, status) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ id, status }); }
    const { data } = await apiClient.patch(`/admin/users/${id}/status`, { status });
    return data;
  },

  /** @param {string} id */
  deleteUser: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(null, 'User deleted.'); }
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },

  // ── Roles ────────────────────────────────────────────────────────────────────

  /** @returns {Promise<{data: import('../types').SystemRole[]}>} */
  getRoles: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(systemRoles); }
    const { data } = await apiClient.get('/admin/roles');
    return data;
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
};
