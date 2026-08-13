/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);
const SESSION_KEY = 'dsts_session';

const normalizeUserSession = (user) => {
  if (!user) return null;

  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles.filter(Boolean)
    : (user.role ? [user.role] : []);

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const primaryRole = roles[0] || user.role || 'test_taker';

  return {
    ...user,
    roles,
    role: primaryRole,
    roleName: user.roleName || primaryRole.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
    permissions,
  };
};

const readSession = () => {
  try {
    // In production, sessionStorage is the sole session store.
    // In dev, also check localStorage so developers can inject test sessions easily.
    const lsRaw = import.meta.env.DEV ? localStorage.getItem(SESSION_KEY) : null;
    const raw = sessionStorage.getItem(SESSION_KEY) ?? lsRaw;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      if (import.meta.env.DEV) localStorage.removeItem(SESSION_KEY);
      return null;
    }
    // Migrate legacy dev localStorage session into sessionStorage
    if (import.meta.env.DEV && lsRaw && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, raw);
    }
    return {
      user: normalizeUserSession(parsed.user),
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    if (import.meta.env.DEV) localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const saveSession = (user, accessToken, expiresIn = 900) => {
  const normalized = normalizeUserSession(user);
  const expiresAt = Date.now() + Number(expiresIn || 900) * 1000;
  const sessionPayload = JSON.stringify({ user: normalized, accessToken, expiresAt });
  sessionStorage.setItem(SESSION_KEY, sessionPayload);
  // Always clean up any leftover dev localStorage entry on login
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  return normalized;
};

const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  // Clear legacy dev localStorage entry if present
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession()?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    setUser(session?.user ?? null);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (identifier, password) => {
    setIsLoading(true);
    try {
      const result = await authService.login(identifier, password);
      if (result.success) {
        const normalizedUser = saveSession(result.user, result.token, result.expiresIn);
        setUser(normalizedUser);
        return { success: true, user: normalizedUser };
      }
      setUser(null);
      return { success: false, error: result.error || 'Login failed.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (registration) => {
    setIsLoading(true);
    try {
      return await authService.register(registration);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const normalizedUser = saveSession(result.user, result.token, result.expiresIn);
      setUser(normalizedUser);
    }
    return result;
  }, []);

  const cancelNDILogin = useCallback((pollToken) => authService.cancelNDILogin(pollToken), []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore server logout problems and clear the UI session
    }
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updatedFields) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updated = normalizeUserSession({ ...prevUser, ...updatedFields });
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: updated, expiresAt: Date.now() + 60 * 60 * 1000 }));
      return updated;
    });

    try {
      await authService.updateProfile(updatedFields);
    } catch {
      // profile update is best-effort for UI state
    }
  }, []);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    return roles.includes(role);
  }, [user]);

  const hasAnyRole = useCallback((roles = []) => {
    if (!user) return false;
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    return roles.some(role => userRoles.includes(role));
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (!Array.isArray(user.permissions)) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions = []) => {
    if (!user) return false;
    if (!Array.isArray(user.permissions)) return false;
    return user.permissions.includes('*') || permissions.some(permission => user.permissions.includes(permission));
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    loginWithNDI,
    checkNDILogin,
    cancelNDILogin,
    logout,
    updateProfile,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
