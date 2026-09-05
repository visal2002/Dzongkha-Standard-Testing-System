/**
 * @fileoverview Build-time environment flags.
 *
 * Single source of truth for the mock-data switch. Every service module used to
 * redeclare this pair of constants; keeping one copy means the mock branch cannot
 * drift between modules and there is exactly one place to audit before a release.
 *
 * `DEV` is false in every built bundle and the mock build is the one Vite runs with
 * `--mode test`, so a UAT or production build folds `USE_MOCK_DATA` to `false` and
 * the fixtures drop out of the bundle entirely — VITE_USE_MOCK_DATA cannot switch
 * them back on there.
 */

/** True only where fixture-backed responses are permitted at all (dev + test builds). */
export const MOCK_DATA_ALLOWED = import.meta.env.DEV || import.meta.env.MODE === 'test';

/** True when fixture-backed responses should actually be served. */
export const USE_MOCK_DATA = MOCK_DATA_ALLOWED && import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;
export const API_DEBUG = import.meta.env.VITE_API_DEBUG === 'true';
