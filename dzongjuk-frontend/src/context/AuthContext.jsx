/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

// ─── localStorage helpers ──────────────────────────────────────────────────────
const readStorage = (key) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const writeStorage = (key, value) => {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
};
const removeStorage = (key) => {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
};
const readStoredUser = () => {
  const saved = readStorage('dsts_user');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { removeStorage('dsts_user'); return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Login with CID/email and password.
   * @param {string} identifier
   * @param {string} password
   */
  const login = useCallback(async (identifier, password) => {
    setIsLoading(true);
    try {
      const result = await authService.login(identifier, password);
      if (result.success) {
        writeStorage('dsts_token', result.token);
        writeStorage('dsts_user', JSON.stringify(result.user));
        setUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login via Bhutan National Digital Identity (NDI).
   */
  const loginWithNDI = useCallback(async () => {
    setIsLoading(true);
    try {
      return await authService.loginWithNDI();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkNDILogin = useCallback(async (pollToken) => {
    const result = await authService.checkNDILogin(pollToken);
    if (result.status === 'VALIDATED' && result.user) {
      writeStorage('dsts_token', result.token);
      writeStorage('dsts_user', JSON.stringify(result.user));
      setUser(result.user);
    }
    return result;
  }, []);

  const cancelNDILogin = useCallback((pollToken) => authService.cancelNDILogin(pollToken), []);

  /**
   * Log out the current user.
   */
  const logout = useCallback(async () => {
    await authService.logout();
    removeStorage('dsts_token');
    removeStorage('dsts_user');
    setUser(null);
  }, []);

  /**
   * Switch to a different demo role (authenticated users only, development aid).
   * @param {string} email - Email of the target demo user
   */
  const switchRole = useCallback((email) => {
    if (!user) return false;
    // Import mock users only in this scope (dev only)
    const DEMO_ROLES = {
      'system.admin@demo.com': { id: 'USR-001', name: 'Sonam Dorji', email: 'system.admin@demo.com', cid: '11101001001', role: 'admin', roleName: 'System Admin', avatar: null, department: 'GovTech', permissions: ['*'] },
      'dcdd.admin@demo.com': { id: 'USR-002', name: 'Karma Wangchuk', email: 'dcdd.admin@demo.com', cid: '11102002002', role: 'dcdd', roleName: 'DCDD Admin', avatar: null, department: 'Department of Culture and Dzongkha Development', permissions: ['registration', 'verification', 'attendance', 'masters', 'reports', 'notifications', 'customization'] },
      'exam.head@demo.com': { id: 'USR-003', name: 'Tshering Pem', email: 'exam.head@demo.com', cid: '11103003003', role: 'exam_head', roleName: 'Exam Head', avatar: null, department: 'DCDD - Examination Division', permissions: ['questions', 'scores', 'reports'] },
      'committee.head@demo.com': { id: 'USR-004', name: 'Ugyen Tenzin', email: 'committee.head@demo.com', cid: '11104004004', role: 'committee_head', roleName: 'Committee Head', avatar: null, department: 'Examination Committee', permissions: ['scores', 'appeals', 'reports'] },
      'chief.executive@demo.com': { id: 'USR-005', name: 'Dorji Wangmo', email: 'chief.executive@demo.com', cid: '11105005005', role: 'chief_executive', roleName: 'Chief Executive', avatar: null, department: 'DCDD', permissions: ['appeals', 'reports'] },
      'test.taker@demo.com': { id: 'USR-006', name: 'Pema Choden', email: 'test.taker@demo.com', cid: '11106006006', role: 'test_taker', roleName: 'Test Taker', avatar: null, department: null, permissions: ['registration', 'certificates', 'appeals', 'questions'] },
      'member@dsts.bt': { id: 'USR-007', name: 'Kinley Dorji', email: 'member@dsts.bt', cid: '11107007007', role: 'committee_member', roleName: 'Committee Member', avatar: null, department: 'Examination Committee', permissions: ['scores', 'appeals'] },
    };
    const found = DEMO_ROLES[email];
    if (found) {
      writeStorage('dsts_user', JSON.stringify(found));
      setUser(found);
      return true;
    }
    return false;
  }, [user]);

  /**
   * Update the authenticated user's local profile.
   * @param {Partial<import('../types').AuthUser>} updatedFields
   */
  const updateProfile = useCallback(async (updatedFields) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updated = { ...prevUser, ...updatedFields };
      writeStorage('dsts_user', JSON.stringify(updated));
      return updated;
    });
    // Persist to backend if not in mock mode
    try {
      await authService.updateProfile(updatedFields);
    } catch {
      // Profile update failure is non-fatal; local state is already updated
    }
  }, []);

  /**
   * Check if the current user has a specific permission.
   * @param {string} permission
   */
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithNDI,
    checkNDILogin,
    cancelNDILogin,
    logout,
    switchRole,
    updateProfile,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
