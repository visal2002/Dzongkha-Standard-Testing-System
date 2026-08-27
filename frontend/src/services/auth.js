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

// Fixture-backed responses exist for the automated suites only. `DEV` is false in every
// built bundle and the mock build is the one Vite runs with `--mode test`, so a UAT or
// production build folds this to `false` and the fixtures drop out of the bundle
// entirely — VITE_USE_MOCK_DATA cannot switch them back on there.
const MOCK_DATA_ALLOWED = import.meta.env.DEV || import.meta.env.MODE === 'test';
const USE_MOCK_DATA = MOCK_DATA_ALLOWED && import.meta.env.VITE_USE_MOCK_DATA === 'true';
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
  // Demo accounts for E2E tests
  ['system.admin@demo.com',     { user: { id: 'USR-001', email: 'system.admin@demo.com',     cid: '1001', fullName: 'Sonam Dorji',    roles: ['admin'],            permissions: [] }, password: MOCK_PASSWORD }],
  ['dcdd.admin@demo.com',       { user: { id: 'USR-002', email: 'dcdd.admin@demo.com',       cid: '1002', fullName: 'Karma Wangchuk', roles: ['dcdd'],             permissions: [] }, password: MOCK_PASSWORD }],
  ['exam.head@demo.com',        { user: { id: 'USR-003', email: 'exam.head@demo.com',        cid: '1003', fullName: 'Tshering Pem',   roles: ['exam_head'],        permissions: [] }, password: MOCK_PASSWORD }],
  ['committee.head@demo.com',   { user: { id: 'USR-004', email: 'committee.head@demo.com',   cid: '1004', fullName: 'Ugyen Tenzin',   roles: ['committee_head'],   permissions: [] }, password: MOCK_PASSWORD }],
  ['chief.executive@demo.com',  { user: { id: 'USR-005', email: 'chief.executive@demo.com',  cid: '1005', fullName: 'Dorji Wangmo',   roles: ['chief_executive'],  permissions: [] }, password: MOCK_PASSWORD }],
  ['test.taker@demo.com',       { user: { id: 'USR-006', email: 'test.taker@demo.com',       cid: '1006', fullName: 'Pema Choden',    roles: ['test_taker'],       permissions: ['registration'] }, password: MOCK_PASSWORD }],
  ['member@dsts.bt',            { user: { id: 'USR-007', email: 'member@dsts.bt',            cid: '1007', fullName: 'Kinley Dorji',   roles: ['committee_member'], permissions: [] }, password: MOCK_PASSWORD }],
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

/**
 * Add an account to the in-memory mock directory so it can sign in afterwards.
 * Used by adminService.createUser when the app runs on mock data, so a user
 * created through the admin screens behaves like a real one for the rest of
 * the session.
 * @returns {object|null} the stored user, or null when the email is missing
 */
export const registerMockAccount = ({ email, cid, fullName, roles = ['test_taker'], permissions = [], password = MOCK_PASSWORD }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  const user = {
    id: `USR-MOCK-${mockAccounts.size + 1}`,
    email: normalizedEmail,
    cid: String(cid || '').trim(),
    fullName: String(fullName || '').trim(),
    roles: roles.length ? roles : ['test_taker'],
    permissions,
  };
  mockAccounts.set(normalizedEmail, { user, password });
  return user;
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
   * Login with User ID or email and password.
   * @param {string} identifier - 4-digit User ID or email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: import('@/constants/domain').AuthUser, token?: string, error?: string}>}
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
  register: async ({ fullName, cid, dateOfBirth, gender, contactNumber, email, password }) => {
    const derivedEmail = (email && email.trim()) || `${String(cid).trim()}@dsts.bt`;
    const normalized = {
      fullName: fullName.trim(),
      cid: cid.trim(),
      dateOfBirth,
      gender: (gender || '').trim(),
      contactNumber: (contactNumber || '').trim(),
      email: derivedEmail.toLowerCase(),
      password: password || 'Password!123',
    };



    if (USE_MOCK_DATA) {
      const duplicate = [...mockAccounts.values()].find(({ user }) => (
        user.email.toLowerCase() === normalized.email || user.cid === normalized.cid
      ));
      if (duplicate) {
        return { success: false, error: 'An account already exists for this email or User ID.' };
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
      // A backend without NDI credentials stands in with a local proof request so the
      // developer and CI suites can walk the flow. A deployed build must surface the
      // failure instead — silently issuing a session for an unconfigured verifier
      // would be an authentication bypass.
      if (MOCK_DATA_ALLOWED && err.code === 'NDI_NOT_CONFIGURED') {
        return createMockNdiLogin();
      }
      return { success: false, error: err.message || 'NDI service unavailable.' };
    }
  },

  checkNDILogin: async (pollToken) => {
    if (MOCK_DATA_ALLOWED && pollToken.startsWith('mock_ndi_')) {
      const startTime = parseInt(pollToken.split('_')[2], 10);
      if (Date.now() - startTime > MOCK_NDI_DELAY_MS) {
        if (!USE_MOCK_DATA) {
          const loginResult = await authService.login(MOCK_NDI_USER.email, MOCK_PASSWORD);
          if (loginResult.success) {
            return {
              status: 'VALIDATED',
              token: loginResult.token,
              user: loginResult.user,
              expiresIn: loginResult.expiresIn,
            };
          }
        }
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
    if (MOCK_DATA_ALLOWED && pollToken?.startsWith('mock_ndi_')) return;
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
   * @param {Partial<import('@/constants/domain').AuthUser>} fields
   */
  updateProfile: async (fields) => {

    const { data } = await apiClient.put('/auth/profile', fields);
    return data;
  },
};
