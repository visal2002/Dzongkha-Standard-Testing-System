/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview One Bhutan NDI proof request, from QR issue to final outcome.
 *
 * The login modal, /ndi-login and /ndi-register each used to carry their own copy
 * of this state machine and its two-second poll loop - three near-identical bodies
 * that differed only in their success toast and their per-status wording. They now
 * share this hook, so a change to the polling contract is made once.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const POLL_INTERVAL_MS = 2000;

/**
 * @param {object} options
 * @param {string} options.successMessageKey i18n key for the toast on validation
 * @param {Record<string, string>} options.statusMessages copy per terminal status
 * @param {string} options.unavailableMessage shown when no QR could be issued
 * @param {boolean} [options.autoStart] issue a request as soon as the hook mounts
 * @param {boolean} [options.keepPanelOnFailure] hold a placeholder request so the
 *   scanner layout stays on screen after a failure instead of collapsing
 */
export function useNdiProofSession({
  successMessageKey,
  statusMessages,
  unavailableMessage,
  autoStart = false,
  keepPanelOnFailure = false,
}) {
  const [request, setRequest] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollInFlight = useRef(false);

  const { loginWithNDI, checkNDILogin, cancelNDILogin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fail = useCallback((message) => {
    setError(message);
    setStatus('FAILED');
    // The standalone screens collapse to an empty panel without a request object;
    // the modal keeps its frame by holding an unusable placeholder URL.
    if (keepPanelOnFailure) setRequest({ proofRequestUrl: 'https://invalid.local', deepLinkUrl: null });
  }, [keepPanelOnFailure]);

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!keepPanelOnFailure) {
      setRequest(null);
      setStatus('IDLE');
    }
    try {
      const result = await loginWithNDI();
      if (!result.success) {
        fail(result.error || unavailableMessage);
        return;
      }
      setRequest(result);
      setStatus('PENDING');
    } catch (caught) {
      fail(caught.message || unavailableMessage);
    } finally {
      setIsLoading(false);
    }
  }, [loginWithNDI, fail, unavailableMessage, keepPanelOnFailure]);

  useEffect(() => {
    if (autoStart) void start();
  }, [autoStart, start]);

  useEffect(() => {
    if (!request?.pollToken || status !== 'PENDING') return undefined;
    let stopped = false;

    const poll = async () => {
      if (pollInFlight.current || stopped) return;
      pollInFlight.current = true;
      try {
        const result = await checkNDILogin(request.pollToken);
        if (stopped) return;
        if (result.status === 'VALIDATED') {
          setStatus('VALIDATED');
          toast.success(t(successMessageKey, { name: result.user.name }));
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setStatus(result.status);
          setError(statusMessages[result.status] || unavailableMessage);
        }
      } catch (caught) {
        if (!stopped) {
          setStatus('FAILED');
          setError(caught.message || unavailableMessage);
        }
      } finally {
        pollInFlight.current = false;
      }
    };

    void poll();
    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [request, status, checkNDILogin, navigate, t, successMessageKey, statusMessages, unavailableMessage]);

  /** Abandon an in-flight request so the wallet stops waiting on it. */
  const cancel = useCallback(() => {
    if (request?.pollToken && status === 'PENDING') void cancelNDILogin(request.pollToken);
  }, [request, status, cancelNDILogin]);

  /** Cancel and return to the idle state (used when the modal is dismissed). */
  const reset = useCallback(() => {
    cancel();
    setRequest(null);
    setStatus('IDLE');
    setError(null);
  }, [cancel]);

  return { request, status, error, isLoading, start, cancel, reset };
}
