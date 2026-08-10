/**
 * @fileoverview useAsync — Generic async operation hook
 *
 * Provides loading, error, and data state management for any
 * async function. Simplifies data-fetching in components.
 *
 * @example
 * const { data, loading, error, execute } = useAsync(applicationService.getAll);
 * useEffect(() => { execute(examId); }, [examId]);
 */
import { useState, useCallback } from 'react';

/**
 * @template T
 * @param {(...args: any[]) => Promise<T>} asyncFn - Async function to wrap
 * @param {T|null} [initialData=null] - Initial data value
 * @returns {{ data: T|null, loading: boolean, error: string|null, execute: (...args: any[]) => Promise<void> }}
 */
export function useAsync(asyncFn, initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn(...args);
      // Handle both { data: ... } envelope and raw response
      setData(result?.data !== undefined ? result.data : result);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  return { data, loading, error, execute, setData };
}

export default useAsync;
