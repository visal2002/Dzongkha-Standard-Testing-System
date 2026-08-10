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

/** When true, service functions return mock data instead of making HTTP calls. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const DEBUG = import.meta.env.VITE_API_DEBUG === 'true';

// ─── Axios Instance ────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor — attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dsts_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (DEBUG) {
      console.info(`[API] → ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — normalize errors ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.info(`[API] ← ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Network error. Please check your connection.';

    if (status === 401) {
      // Clear stored credentials and redirect to login
      localStorage.removeItem('dsts_token');
      localStorage.removeItem('dsts_user');
      window.location.href = '/login';
    }

    if (DEBUG) {
      console.error(`[API] ✕ ${status ?? 'ERR'} ${error?.config?.url}`, message);
    }

    return Promise.reject({ status, message, raw: error });
  },
);

export default apiClient;

// ─── Shared Utilities ─────────────────────────────────────────────────────────

/**
 * Simulate a network delay (used when USE_MOCK is true).
 * @param {number} [ms=400]
 */
export const mockDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrap mock data in a standard API envelope.
 * @template T
 * @param {T} data
 * @param {string} [message]
 * @returns {{ data: T, success: true, message: string }}
 */
export const mockResponse = (data, message = 'OK') => ({ data, success: true, message });
