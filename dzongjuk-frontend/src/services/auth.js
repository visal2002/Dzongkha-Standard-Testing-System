/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Auth Service
 * Handles login, logout, token refresh, and NDI authentication.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';

const decodeClaims = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
};

const normalizeUser = (user, token) => {
  const claims = decodeClaims(token);
  const role = user.roles?.[0] || claims.roles?.[0] || 'test_taker';
  return {
    ...user,
    name: user.fullName,
    role,
    roleName: role.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()),
    permissions: claims.permissions || [],
  };
};

// Mock user data (preserved as fallback)
const MOCK_USERS = {
  '11101001001': { id: 'USR-001', name: 'Sonam Dorji', email: 'system.admin@demo.com', cid: '11101001001', role: 'admin', roleName: 'System Admin', avatar: null, department: 'GovTech', permissions: ['*'] },
  '11102002002': { id: 'USR-002', name: 'Karma Wangchuk', email: 'dcdd.admin@demo.com', cid: '11102002002', role: 'dcdd', roleName: 'DCDD Admin', avatar: null, department: 'Department of Culture and Dzongkha Development', permissions: ['registration', 'verification', 'attendance', 'masters', 'reports', 'notifications'] },
  '11103003003': { id: 'USR-003', name: 'Tshering Pem', email: 'exam.head@demo.com', cid: '11103003003', role: 'exam_head', roleName: 'Exam Head', avatar: null, department: 'DCDD - Examination Division', permissions: ['questions', 'scores', 'reports'] },
  '11104004004': { id: 'USR-004', name: 'Ugyen Tenzin', email: 'committee.head@demo.com', cid: '11104004004', role: 'committee_head', roleName: 'Committee Head', avatar: null, department: 'Examination Committee', permissions: ['scores', 'appeals', 'reports'] },
  '11105005005': { id: 'USR-005', name: 'Dorji Wangmo', email: 'chief.executive@demo.com', cid: '11105005005', role: 'chief_executive', roleName: 'Chief Executive', avatar: null, department: 'DCDD', permissions: ['appeals', 'reports'] },
  '11106006006': { id: 'USR-006', name: 'Pema Choden', email: 'test.taker@demo.com', cid: '11106006006', role: 'test_taker', roleName: 'Test Taker', avatar: null, department: null, permissions: ['registration', 'certificates', 'appeals', 'questions'] },
  '11107007007': { id: 'USR-007', name: 'Kinley Dorji', email: 'member@dsts.bt', cid: '11107007007', role: 'committee_member', roleName: 'Committee Member', avatar: null, department: 'Examination Committee', permissions: ['scores', 'appeals'] },
  'LOCALCID2026': { id: 'USR-LOCAL-ACCEPTANCE', name: 'Local Acceptance Test Taker', email: 'local.acceptance@dzongjuk.test', cid: 'LOCALCID2026', role: 'test_taker', roleName: 'Test Taker', avatar: null, department: null, permissions: ['registration', 'certificates', 'appeals', 'questions'] },
};

const MOCK_PASSWORDS = {
  LOCALCID2026: 'LocalTestOnly!2026',
};

export const authService = {
  /**
   * Login with CID and password.
   * @param {string} identifier - CID or email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: import('../types').AuthUser, token?: string, error?: string}>}
   */
  login: async (identifier, password) => {
    if (USE_MOCK) {
      await mockDelay(800);
      const found = Object.values(MOCK_USERS).find(u => u.cid === identifier || u.email === identifier);
      const expectedPassword = found ? MOCK_PASSWORDS[found.cid] || 'password' : null;
      if (found && password === expectedPassword) {
        const token = btoa(JSON.stringify({ userId: found.id, role: found.role, exp: Date.now() + 86400000 }));
        return { success: true, user: found, token };
      }
      return { success: false, error: 'Invalid demonstration credentials.' };
    }

    try {
      const { data: envelope } = await apiClient.post('/auth/login', { identifier, password });
      const { accessToken, user } = envelope.data;
      return { success: true, user: normalizeUser(user, accessToken), token: accessToken };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  },

  /**
   * Initiate NDI OAuth login flow.
   * @returns {Promise<{success: boolean, user?: import('../types').AuthUser, token?: string, error?: string}>}
   */
  loginWithNDI: async () => {
    if (USE_MOCK) {
      await mockDelay(1500);
      const defaultUser = MOCK_USERS['11106006006'];
      return { success: true, user: defaultUser, token: 'ndi-mock-token' };
    }

    try {
      // In production: redirect to NDI authorization URL
      // The real flow requires a backend-initiated PKCE exchange
      const { data: envelope } = await apiClient.post('/auth/ndi/initiate');
      window.location.href = envelope.data.authorizationUrl;
      return { success: true }; // Will not reach here due to redirect
    } catch (err) {
      return { success: false, error: err.message || 'NDI service unavailable.' };
    }
  },

  /**
   * Refresh the JWT token.
   * @returns {Promise<{token: string}|null>}
   */
  refreshToken: async () => {
    if (USE_MOCK) return null;
    try {
      const { data: envelope } = await apiClient.post('/auth/refresh');
      return { token: envelope.data.accessToken };
    } catch {
      return null;
    }
  },

  /**
   * Log out the current user.
   */
  logout: async () => {
    if (!USE_MOCK) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Proceed with local logout even if server call fails
      }
    }
    localStorage.removeItem('dsts_token');
    localStorage.removeItem('dsts_user');
  },

  /**
   * Update global system contact information.
   * @param {{email:string, phone:string, department:string}} fields
   */
  updateSystemInfo: async (fields) => {
    if (USE_MOCK) {
      await mockDelay(500);
      // In a real implementation, this would call a backend endpoint.
      // Here we simply return the fields as confirmation.
      return mockResponse(fields, 'System contact information updated.');
    }
    const { data } = await apiClient.put('/system/info', fields);
    return data;
  },

  /**
   * Upload profile picture (base64 data URL).
   * @param {string} dataUrl - Base64 image string.
   */
  uploadProfilePicture: async (dataUrl) => {
    if (USE_MOCK) {
      await mockDelay(500);
      // Update stored user avatar in local storage for mock mode.
      const stored = localStorage.getItem('dsts_user');
      if (stored) {
        const userObj = JSON.parse(stored);
        userObj.avatar = dataUrl;
        localStorage.setItem('dsts_user', JSON.stringify(userObj));
      }
      return mockResponse({ avatar: dataUrl }, 'Profile picture uploaded');
    }
    const { data } = await apiClient.put('/auth/avatar', { avatar: dataUrl });
    return data;
  },

  /**
   * Change the current user's password.
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  changePassword: async (currentPassword, newPassword) => {
    if (USE_MOCK) {
      await mockDelay(600);
      return mockResponse(null, 'Password changed successfully.');
    }
    const { data } = await apiClient.put('/auth/password', { currentPassword, newPassword });
    return data;
  },

  /**
   * Update the authenticated user's profile.
   * @param {Partial<import('../types').AuthUser>} fields
   */
  updateProfile: async (fields) => {
    if (USE_MOCK) {
      await mockDelay(500);
      return mockResponse(fields, 'Profile updated.');
    }
    const { data } = await apiClient.put('/auth/profile', fields);
    return data;
  },
};
