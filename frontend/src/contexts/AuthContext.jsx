/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';
import { recordAuditEvent } from '@/services/audit';

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
        recordAuditEvent({
          action: 'Login',
          actorUserId: normalizedUser.id,
          role: normalizedUser.roleName,
          status: 'Success',
        });
        return { success: true, user: normalizedUser };
      }
      setUser(null);
      recordAuditEvent({
        action: 'Login Failed',
        actorUserId: String(identifier || '').trim() || null,
        status: 'Failure',
      });
      return { success: false, error: result.error || 'Login failed.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (registration) => {
    setIsLoading(true);
    try {
      const result = await authService.register(registration);
      if (result.success && result.user) {
        recordAuditEvent({
          action: 'User Registered',
          actorUserId: result.user.userId || result.user.id,
          role: result.user.roleName || 'Test Taker',
          status: 'Success',
        });
      }
      // When the service hands back a session token, sign the new account in
      // immediately so the caller can go straight into the app.
      if (result.success && result.token) {
        const normalizedUser = saveSession(result.user, result.token, result.expiresIn);
        setUser(normalizedUser);
        recordAuditEvent({
          action: 'Login',
          actorUserId: normalizedUser.id,
          role: normalizedUser.roleName,
          status: 'Success',
        });
        return { ...result, user: normalizedUser };
      }
      return result;
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
      recordAuditEvent({
        action: 'Login',
        actorUserId: normalizedUser.id,
        role: normalizedUser.roleName,
        source: 'identity-service',
        status: 'Success',
      });
    }
    return result;
  }, []);

  const cancelNDILogin = useCallback((pollToken) => authService.cancelNDILogin(pollToken), []);

  const logout = useCallback(async () => {
    const departing = readSession()?.user ?? null;
    try {
      await authService.logout();
    } catch {
      // ignore server logout problems and clear the UI session
    }
    clearSession();
    setUser(null);
    if (departing) {
      recordAuditEvent({
        action: 'Logout',
        actorUserId: departing.id,
        role: departing.roleName,
        status: 'Success',
      });
    }
  }, []);

  // Session auto-expiry & inactivity tracker (15 minutes)
  useEffect(() => {
    if (!user) return;
    
    const ACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let lastActivity = Date.now();
    let activityInterval;
    
    const bumpActivity = () => { lastActivity = Date.now(); };
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, bumpActivity, { passive: true }));
    
    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity >= ACTIVITY_TIMEOUT_MS) {
        logout();
        toast.error('Session expired due to inactivity.', { id: 'session-timeout' });
      } else {
        // Extend session storage expiration quietly
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (now > parsed.expiresAt) {
              logout();
            } else {
              parsed.expiresAt = now + ACTIVITY_TIMEOUT_MS;
              sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
            }
          } catch {}
        }
      }
    };
    
    activityInterval = setInterval(checkInactivity, 60 * 1000); // Check every minute
    
    return () => {
      events.forEach(e => document.removeEventListener(e, bumpActivity));
      clearInterval(activityInterval);
    };
  }, [user, logout]);

  // The API call runs first and its failure propagates to the caller - local state
  // and the session are only rewritten once the backend has actually persisted the
  // change, so a rejected save never reports success to the user.
  const updateProfile = useCallback(async (updatedFields) => {
    const response = await authService.updateProfile(updatedFields);
    // The service may return extra derived fields (e.g. `emailSet: true` once a valid
    // address is entered) - merge those in too, not just what the caller passed.
    const applied = { ...updatedFields, ...(response?.data && typeof response.data === 'object' ? response.data : {}) };
    setUser(prevUser => {
      if (!prevUser) return null;
      const updated = normalizeUserSession({ ...prevUser, ...applied });
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: updated, expiresAt: Date.now() + 60 * 60 * 1000 }));
      return updated;
    });
  }, []);

  // Set an initial password (no current password required). On success the local
  // session is marked `passwordSet` so the profile gate releases.
  const setPassword = useCallback(async (newPassword) => {
    const result = await authService.setPassword(newPassword);
    if (result && result.success === false) {
      throw new Error(result.error || 'Failed to set the password.');
    }
    setUser(prevUser => {
      if (!prevUser) return null;
      const updated = normalizeUserSession({ ...prevUser, passwordSet: true });
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: updated, expiresAt: Date.now() + 60 * 60 * 1000 }));
      return updated;
    });
    recordAuditEvent({ action: 'Password Created', actorUserId: user?.userId || user?.id, role: user?.roleName, status: 'Success' });
    return result;
  }, [user]);

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
    setPassword,
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
