/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview DZONGJUK (DSTS) — Axios API Client
 *
 * Centralized HTTP client with:
 * - Base URL from environment variables
 * - JWT Bearer token injection
 * - Unified error normalization
 * - Request/response logging (dev only)
 * - 401 → automatic logout
 *
 * Usage:
 *   import apiClient from './api';
 *   const res = await apiClient.get('/exams');
 */
import axios from 'axios';

// ─── Environment Config ────────────────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;


const DEBUG = import.meta.env.VITE_API_DEBUG === 'true';
const SESSION_KEY = 'dsts_session';

const clearClientSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
};

const readAccessToken = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}').accessToken || null;
  } catch {
    return null;
  }
};

// ─── Axios Instance ────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = readAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (DEBUG) {
      console.info(`[API] → ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.info(`[API] ← ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const apiError = error?.response?.data?.error;
    const message =
      apiError?.message ||
      error?.response?.data?.message ||
      (typeof apiError === 'string' ? apiError : null) ||
      error?.message ||
      'Network error. Please check your connection.';

    if (status === 401) {
      // When running with mock auth, the mock token won't be valid on the
      // real backend so data-endpoint 401s are expected.  Don't nuke the
      // session or redirect in that case — only do it for real tokens.
      const currentToken = readAccessToken();
      const isMockToken = !currentToken || currentToken.startsWith('mock-');
      if (!isMockToken) {
        clearClientSession();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    if (DEBUG) {
      console.error(`[API] ✕ ${status ?? 'ERR'} ${error?.config?.url}`, message);
    }

    return Promise.reject({ status, code: apiError?.code, message, raw: error });
  },
);
export default apiClient;

