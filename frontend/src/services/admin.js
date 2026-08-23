/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Admin Service
 * System administration — users and roles.
 */
import apiClient from './api';
import { registerMockAccount } from './auth';
import { ACCESS_MODULES, ROLE_LABELS } from '../config/accessMatrix';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// The admin screens are the only place a role list is offered for selection,
// so without these fixtures every mock/CI run renders an empty role picker.
const MOCK_ROLES = Object.entries(ROLE_LABELS).map(([code, name], index) => ({
  id: `ROLE-${String(index + 1).padStart(3, '0')}`,
  code,
  name,
  description: `${name} access as defined by the approved DSTS access matrix.`,
  permissions: [],
}));

const MOCK_PERMISSIONS = ACCESS_MODULES.map(({ key, label }, index) => ({
  id: `PERM-${String(index + 1).padStart(3, '0')}`,
  name: key,
  description: label,
}));

const mockRole = code => ({ code, name: ROLE_LABELS[code] || code });

// Mirrors the demo accounts in auth.js so the directory and the sign-in
// credentials stay in step.
let mockUsers = [
  { id: 'USR-001', fullName: 'Sonam Dorji',    email: 'system.admin@demo.com',    cid: '11101001001', roles: [mockRole('admin')],            status: 'ACTIVE', lastLogin: null },
  { id: 'USR-002', fullName: 'Karma Wangchuk', email: 'dcdd.admin@demo.com',      cid: '11102002002', roles: [mockRole('dcdd')],             status: 'ACTIVE', lastLogin: null },
  { id: 'USR-003', fullName: 'Tshering Pem',   email: 'exam.head@demo.com',       cid: '11103003003', roles: [mockRole('exam_head')],        status: 'ACTIVE', lastLogin: null },
  { id: 'USR-004', fullName: 'Ugyen Tenzin',   email: 'committee.head@demo.com',  cid: '11104004004', roles: [mockRole('committee_head')],   status: 'ACTIVE', lastLogin: null },
  { id: 'USR-005', fullName: 'Dorji Wangmo',   email: 'chief.executive@demo.com', cid: '11105005005', roles: [mockRole('chief_executive')],  status: 'ACTIVE', lastLogin: null },
  { id: 'USR-006', fullName: 'Pema Choden',    email: 'test.taker@demo.com',      cid: '11106006006', roles: [mockRole('test_taker')],       status: 'ACTIVE', lastLogin: null },
  { id: 'USR-007', fullName: 'Kinley Dorji',   email: 'member@dsts.bt',           cid: '11107007007', roles: [mockRole('committee_member')], status: 'ACTIVE', lastLogin: null },
];



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
    if (USE_MOCK_DATA) return mockUsers.map(normalizeUser);

    const { data } = await apiClient.get('/admin/users');
    const value = data?.data || data;
    return Array.isArray(value) ? value.map(normalizeUser) : value;
  },

  /** @param {string} id */
  getUserById: async (id) => {
    if (USE_MOCK_DATA) return normalizeUser(mockUsers.find(user => user.id === id) || null);

    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data;
  },

  /** @param {Partial<import('../types').SystemUser>} payload */
  createUser: async (payload) => {
    if (USE_MOCK_DATA) {
      const roleCodes = payload.roleCodes?.length ? payload.roleCodes : ['test_taker'];
      const created = {
        id: `USR-${String(mockUsers.length + 1).padStart(3, '0')}`,
        fullName: payload.fullName,
        email: payload.email,
        cid: payload.cid,
        roles: roleCodes.map(mockRole),
        status: 'ACTIVE',
        lastLogin: null,
      };
      mockUsers = [created, ...mockUsers];
      // Let the new account sign in for the rest of the session.
      registerMockAccount({ ...created, roles: roleCodes, password: payload.password });
      return normalizeUser(created);
    }

    const { data } = await apiClient.post('/admin/users', payload);
    return normalizeUser(data?.data || data);
  },

  /**
   * @param {string} id
   * @param {Partial<import('../types').SystemUser>} payload
   */
  updateUser: async (id, payload) => {
    if (USE_MOCK_DATA) {
      const roleCodes = payload.roleCodes?.length ? payload.roleCodes : null;
      let updated = null;
      mockUsers = mockUsers.map(user => {
        if (user.id !== id) return user;
        updated = { ...user, ...payload, roles: roleCodes ? roleCodes.map(mockRole) : user.roles };
        return updated;
      });
      return normalizeUser(updated);
    }

    const { data } = await apiClient.put(`/admin/users/${id}`, payload);
    return normalizeUser(data?.data || data);
  },

  /**
   * @param {string} id
   * @param {'active'|'inactive'|'suspended'} status
   */
  setUserStatus: async (id, status) => {
    if (USE_MOCK_DATA) {
      mockUsers = mockUsers.map(user => user.id === id ? { ...user, status: status === 'active' ? 'ACTIVE' : 'DISABLED' } : user);
      return { success: true };
    }

    const { data } = await apiClient.patch(`/admin/users/${id}/status`, { status: status === 'active' ? 'ACTIVE' : 'DISABLED' });
    return data;
  },

  /** @param {string} id */
  deleteUser: async (id) => {
    if (USE_MOCK_DATA) {
      mockUsers = mockUsers.filter(user => user.id !== id);
      return { success: true };
    }

    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },

  // ── Roles ────────────────────────────────────────────────────────────────────

  /** @returns {Promise<{data: import('../types').SystemRole[]}>} */
  getRoles: async () => {
    if (USE_MOCK_DATA) {
      return MOCK_ROLES.map(role => normalizeRole({
        ...role,
        userCount: mockUsers.filter(user => user.roles.some(assigned => (typeof assigned === 'string' ? assigned : assigned.code) === role.code)).length,
      }));
    }

    const { data } = await apiClient.get('/admin/roles');
    const value = data?.data || data;
    return Array.isArray(value) ? value.map(normalizeRole) : value;
  },

  /** @returns {Promise<Array<{id:string,name:string,description:string}>>} */
  getPermissions: async () => {
    if (USE_MOCK_DATA) return MOCK_PERMISSIONS;

    const { data } = await apiClient.get('/admin/permissions');
    return data?.data || data;
  },

  /**
   * @param {string} id
   * @param {import('../types').SystemRole['permissions']} permissions
   */
  updateRolePermissions: async (id, permissions) => {

    const { data } = await apiClient.put(`/admin/roles/${id}/permissions`, { permissions });
    return data;
  },

  /**
   * Create a new system role.
   * @param {Partial<import('../types').SystemRole>} payload
   */
  createRole: async (payload) => {

    const { data } = await apiClient.post('/admin/roles', payload);
    return normalizeRole(data?.data || data);
  },

  /**
   * Update a role's metadata (name, description, code).
   * @param {string} id
   * @param {Partial<import('../types').SystemRole>} payload
   */
  updateRole: async (id, payload) => {

    const { data } = await apiClient.put(`/admin/roles/${id}`, payload);
    return data;
  },

  /**
   * Delete a system role by ID.
   * @param {string} id
   */
  deleteRole: async (id) => {

    const { data } = await apiClient.delete(`/admin/roles/${id}`);
    return data;
  },
};
