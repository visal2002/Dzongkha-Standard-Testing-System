/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Auth Service
 * Handles login, logout, token refresh, and NDI authentication.
 */
import apiClient from './api';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const MOCK_NDI_DELAY_MS = 5000;
const MOCK_NDI_USER = {
  id: 'USR-LOCAL-ACCEPTANCE',
  email: 'local.acceptance@dzongjuk.test',
  cid: '11111111111',
  fullName: 'Local Acceptance User',
  roles: ['test_taker'],
  permissions: ['registration'],
};
const MOCK_NDI_TOKEN = 'mock-local-acceptance-token';
const MOCK_PASSWORD = 'LocalTestOnly!2026';
const mockAccounts = new Map([
  [MOCK_NDI_USER.email, { user: MOCK_NDI_USER, password: MOCK_PASSWORD }],
]);

const createMockNdiLogin = () => {
  const pollToken = `mock_ndi_${Date.now()}`;
  return {
    success: true,
    pollToken,
    proofRequestUrl: `mock:bhutan-ndi-login:${pollToken}`,
    deepLinkUrl: null,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
};

const createMockSession = (user) => ({
  success: true,
  user: normalizeUser(user, MOCK_NDI_TOKEN),
  token: MOCK_NDI_TOKEN,
  expiresIn: 900,
});

const findMockAccount = (identifier) => {
  const normalized = String(identifier || '').trim().toLowerCase();
  return [...mockAccounts.values()].find(({ user }) => (
    user.email.toLowerCase() === normalized || user.cid === normalized
  ));
};

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




export const authService = {
  /**
   * Login with CID and password.
   * @param {string} identifier - CID or email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: import('../types').AuthUser, token?: string, error?: string}>}
   */
  login: async (identifier, password) => {


    if (USE_MOCK_DATA) {
      const account = findMockAccount(identifier);
      if (account?.password === password) return createMockSession(account.user);
      return { success: false, error: 'The supplied credentials are invalid.' };
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
  register: async ({ fullName, cid, dateOfBirth, gender, fatherName, motherName, permanentAddress, email, password }) => {
    const derivedEmail = (email && email.trim()) || `${String(cid).trim()}@dsts.bt`;
    const normalized = {
      fullName: fullName.trim(),
      cid: cid.trim(),
      dateOfBirth,
      gender: (gender || '').trim(),
      fatherName: (fatherName || '').trim(),
      motherName: (motherName || '').trim(),
      permanentAddress: (permanentAddress || '').trim(),
      email: derivedEmail.toLowerCase(),
      password: password || 'Password!123',
    };



    if (USE_MOCK_DATA) {
      const duplicate = [...mockAccounts.values()].find(({ user }) => (
        user.email.toLowerCase() === normalized.email || user.cid === normalized.cid
      ));
      if (duplicate) {
        return { success: false, error: 'An account already exists for this email or CID.' };
      }

      const user = {
        id: `USR-MOCK-${mockAccounts.size + 1}`,
        email: normalized.email,
        cid: normalized.cid,
        fullName: normalized.fullName,
        roles: ['test_taker'],
        permissions: ['registration'],
      };
      mockAccounts.set(user.email.toLowerCase(), { user, password: normalized.password });
      return { success: true, user: normalizeUser(user, MOCK_NDI_TOKEN) };
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


    if (USE_MOCK_DATA) {
      return createMockNdiLogin();
    }

    try {
      const { data: envelope } = await apiClient.post('/auth/ndi/initiate');
      return { success: true, ...envelope.data };
    } catch (err) {
      if (err.code === 'NDI_NOT_CONFIGURED') {
        return createMockNdiLogin();
      }
      return { success: false, error: err.message || 'NDI service unavailable.' };
    }
  },

  checkNDILogin: async (pollToken) => {
    if (pollToken.startsWith('mock_ndi_')) {
      const startTime = parseInt(pollToken.split('_')[2], 10);
      if (Date.now() - startTime > MOCK_NDI_DELAY_MS) {
        return {
          status: 'VALIDATED',
          token: MOCK_NDI_TOKEN,
          user: normalizeUser(MOCK_NDI_USER, MOCK_NDI_TOKEN),
          expiresIn: 900,
        };
      }
      return { status: 'PENDING' };
    }

    const { data: envelope } = await apiClient.post('/auth/ndi/status', { pollToken });
    const result = envelope.data;
    if (result.status === 'VALIDATED') {
      const token = result.accessToken || result.token;
      return { ...result, token, user: normalizeUser(result.user, token), expiresIn: result.expiresIn || 900 };
    }
    return result;
  },

  cancelNDILogin: async (pollToken) => {
    if (pollToken?.startsWith('mock_ndi_')) return;
    try { await apiClient.post('/auth/ndi/cancel', { pollToken }); } catch { /* best-effort cleanup */ }
  },

  /**
   * Refresh the JWT token.
   * @returns {Promise<{token: string}|null>}
   */
  refreshToken: async () => {
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

      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Proceed with local logout even if server call fails
      }
    
    sessionStorage.removeItem('dsts_session');
  },

  /**
   * Update global system contact information.
   * @param {{email:string, phone:string, department:string}} fields
   */
  updateSystemInfo: async (fields) => {

    const { data } = await apiClient.put('/system/info', fields);
    return data;
  },

  /**
   * Upload profile picture (base64 data URL).
   * @param {string} dataUrl - Base64 image string.
   */
  uploadProfilePicture: async (dataUrl) => {

    const { data } = await apiClient.put('/auth/avatar', { avatar: dataUrl });
    return data;
  },

  /**
   * Change the current user's password.
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  changePassword: async (currentPassword, newPassword) => {

    const { data } = await apiClient.put('/auth/password', { currentPassword, newPassword });
    return data;
  },

  /**
   * Update the authenticated user's profile.
   * @param {Partial<import('../types').AuthUser>} fields
   */
  updateProfile: async (fields) => {

    const { data } = await apiClient.put('/auth/profile', fields);
    return data;
  },
};
