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
import { authenticateMockAccount, readMockAccounts, saveMockAccount } from './mockAccountStore';

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
  const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || claims.roles?.[0] || 'test_taker'];
  const role = roles[0];

  return {
    ...user,
    name: user.fullName || user.name || 'User',
    roles,
    role,
    roleName: user.roleName || role.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()),
    permissions: user.permissions || claims.permissions || [],
  };
};

let mockNdiStartedAt = 0;

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

const createMockUser = (identifier, password) => {
  if (!identifier || !password || password.length < 8) {
    return null;
  }
  const role = identifier.toLowerCase().includes('admin') ? 'admin' : 'test_taker';
  const user = {
    id: `USR-MOCK-${Date.now()}`,
    fullName: role === 'admin' ? 'System Administrator' : 'Test User',
    name: role === 'admin' ? 'System Administrator' : 'Test User',
    email: identifier,
    cid: '00000000000',
    phone: '+97517123456',
    roles: [role],
    role,
    roleName: role === 'admin' ? 'System Administrator' : 'Test Taker',
    permissions: role === 'admin' ? ['*'] : ['registration', 'certificates', 'appeals', 'questions'],
  };
  return user;
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
      await mockDelay(200);
      const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
      
      const found = Object.values(MOCK_USERS).find(
        user => user.cid.toLowerCase() === normalizedIdentifier || user.email.toLowerCase() === normalizedIdentifier,
      );
      const expectedPassword = found ? MOCK_PASSWORDS[found.cid] || 'password' : null;
      if (found && password === expectedPassword) {
        const token = btoa(JSON.stringify({ userId: found.id, role: found.role, exp: Date.now() + 86400000 }));
        return { success: true, user: found, token };
      }

      const storedUser = await authenticateMockAccount(identifier, password);
      if (storedUser) {
        const token = btoa(JSON.stringify({ userId: storedUser.id, role: storedUser.role, exp: Date.now() + 86400000 }));
        return { success: true, user: storedUser, token };
      }

      const user = createMockUser(identifier, password);
      if (!user) {
        return { success: false, error: 'Invalid credentials.' };
      }
      return { success: true, user, token: 'mock-session-token' };
    }

    try {
      const { data: envelope } = await apiClient.post('/auth/login', { identifier, password });
      const { accessToken, expiresIn, user } = envelope.data;
      return { success: true, user: normalizeUser(user, accessToken), token: accessToken, expiresIn };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  },

  /** Register a test taker without Bhutan NDI. */
  register: async ({ fullName, cid, dateOfBirth, phone, email, password }) => {
    const normalized = {
      fullName: fullName.trim(),
      cid: cid.trim(),
      dateOfBirth,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
    };

    if (USE_MOCK) {
      await mockDelay(200);
      if (!/^\d{11}$/.test(normalized.cid)) {
        return { success: false, error: 'CID must contain exactly 11 digits.' };
      }
      if (normalized.password.length < 8) {
        return { success: false, error: 'Password must contain at least 8 characters.' };
      }

      const registrations = readMockAccounts();
      const existingUsers = [...Object.values(MOCK_USERS), ...registrations.map(record => record.user)];
      if (existingUsers.some(user => user.cid === normalized.cid || user.email.toLowerCase() === normalized.email)) {
        return { success: false, error: 'An account already exists for this email or CID.' };
      }

      const user = {
        id: `USR-MOCK-${Date.now()}`,
        name: normalized.fullName,
        fullName: normalized.fullName,
        email: normalized.email,
        cid: normalized.cid,
        dateOfBirth: normalized.dateOfBirth,
        phone: normalized.phone,
        password: normalized.password,
        roles: ['test_taker'],
        role: 'test_taker',
        roleName: 'Test Taker',
        avatar: null,
        department: null,
        permissions: ['registration', 'certificates', 'appeals', 'questions'],
      };
      await saveMockAccount(user, normalized.password);
      return { success: true, user };
    }

    try {
      const { data: envelope } = await apiClient.post('/auth/register', {
        fullName: normalized.fullName,
        cid: normalized.cid,
        email: normalized.email,
        password: normalized.password,
      });
      return { success: true, user: envelope.data };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  },

  /** Create a Bhutan NDI proof request for QR/deep-link login. */
  loginWithNDI: async () => {
    if (USE_MOCK) {
      await mockDelay(500);
      mockNdiStartedAt = Date.now();
      return {
        success: true,
        pollToken: 'mock-ndi-poll-token',
        proofRequestUrl: 'https://example.test/bhutan-ndi/mock-proof-request',
        deepLinkUrl: 'bhutanndi://data?url=https%3A%2F%2Fexample.test%2Fbhutan-ndi%2Fmock-proof-request',
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      };
    }

    try {
      const { data: envelope } = await apiClient.post('/auth/ndi/initiate');
      return { success: true, ...envelope.data };
    } catch (err) {
      return { success: false, error: err.message || 'NDI service unavailable.' };
    }
  },

  checkNDILogin: async (pollToken) => {
    if (USE_MOCK) {
      await mockDelay(200);
      if (Date.now() - mockNdiStartedAt < 3500) return { status: 'PENDING' };
      const user = {
        id: 'mock-ndi-user',
        fullName: 'NDI Test User',
        name: 'NDI Test User',
        email: 'ndi.user@dsts.test',
        cid: '00000000000',
        roles: ['test_taker'],
        role: 'test_taker',
        roleName: 'Test Taker',
        permissions: ['registration', 'certificates', 'appeals', 'questions'],
      };
      return { status: 'VALIDATED', user, token: 'ndi-mock-token' };
    }
    const { data: envelope } = await apiClient.post('/auth/ndi/status', { pollToken });
    const result = envelope.data;
    if (result.status === 'VALIDATED') {
      return { ...result, token: result.accessToken, user: normalizeUser(result.user, result.accessToken) };
    }
    return result;
  },

  cancelNDILogin: async (pollToken) => {
    if (USE_MOCK) return;
    try { await apiClient.post('/auth/ndi/cancel', { pollToken }); } catch { /* best-effort cleanup */ }
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
    sessionStorage.removeItem('dsts_session');
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
      const stored = sessionStorage.getItem('dsts_session');
      if (stored) {
        const session = JSON.parse(stored);
        session.user.avatar = dataUrl;
        sessionStorage.setItem('dsts_session', JSON.stringify(session));
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
