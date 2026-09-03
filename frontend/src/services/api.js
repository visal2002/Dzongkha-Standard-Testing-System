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
import { API_BASE_URL, API_DEBUG, API_TIMEOUT, USE_MOCK_DATA } from '@/lib/env';
import { clearSession, readAccessToken } from '@/lib/session';

export { API_BASE_URL, API_TIMEOUT };

// In mock-data mode the app runs without a real auth backend. Only a subset of
// services have mock branches; any endpoint that still reaches the API is sent the
// fixture bearer token and answers 401. That 401 must not tear down the mock
// session, so the automatic logout below is skipped whenever mock data is active.
// A real build folds USE_MOCK_DATA to `false` and the logout behaves as before.

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
    if (config.data instanceof FormData) {
      // This instance's default Content-Type is application/json. Left in place,
      // axios JSON-stringifies FormData bodies instead of sending them as multipart
      // (see axios's transformRequest: isFormData + hasJSONContentType branch), which
      // silently turns every file upload into a plain JSON field the backend DTO
      // doesn't declare - the file never reaches Multer. Clearing it here lets the
      // browser set the correct multipart boundary.
      config.headers.delete('Content-Type');
    }
    if (API_DEBUG) {
      console.info(`[API] → ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    if (API_DEBUG) {
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

    if (status === 401 && !USE_MOCK_DATA) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (API_DEBUG) {
      console.error(`[API] ✕ ${status ?? 'ERR'} ${error?.config?.url}`, message);
    }

    return Promise.reject({ status, code: apiError?.code, message, raw: error });
  },
);
export default apiClient;

