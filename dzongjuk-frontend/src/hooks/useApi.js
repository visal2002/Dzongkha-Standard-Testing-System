/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage asynchronous API calls with loading and error states.
 * 
 * @param {Function} apiFunc - The service function to call (e.g., adminService.getUsers).
 * @param {boolean} [immediate=true] - Whether to execute the function immediately on mount.
 * @param {Array} [args=[]] - Arguments to pass to the apiFunc.
 * 
 * @returns {{
 *  data: any,
 *  loading: boolean,
 *  error: string | null,
 *  execute: Function,
 *  setData: Function
 * }}
 */
export function useApi(apiFunc, immediate = true, args = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Memoize the execute function so it doesn't change on every render
  const execute = useCallback(
    async (...executeArgs) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFunc(...(executeArgs.length ? executeArgs : args));
        // If the service returns an object with a 'data' envelope (like mockResponse does), unwrap it.
        // Otherwise, return the raw response.
        const result = response?.data !== undefined ? response.data : response;
        setData(result);
        return result;
      } catch (err) {
        const errorMessage = err?.message || 'An unexpected error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, ...args]
  );

  useEffect(() => {
    if (immediate) {
      execute().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate]); // args are already in execute's dependency array

  return { data, loading, error, execute, setData };
}
