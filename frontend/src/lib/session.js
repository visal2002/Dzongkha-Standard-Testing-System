/**
 * @fileoverview The browser-side session store.
 *
 * The signed-in session lives in `sessionStorage` under a single key. Before this
 * module the key literal and its parse/guard logic were repeated in the auth context,
 * the axios client and three service modules, so a change to the storage shape had to
 * be made in five places and a `try/catch` omitted in any one of them threw on
 * corrupted storage. Everything that touches the session now goes through here.
 *
 * `sessionStorage` is deliberate: the session must not outlive the browser tab.
 */

export const SESSION_KEY = 'dsts_session';

/** Development-only convenience: allow a session to be injected via localStorage. */
const devMirrorEnabled = () => import.meta.env.DEV;

const parse = raw => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const readRaw = () => {
  try {
    const devRaw = devMirrorEnabled() ? localStorage.getItem(SESSION_KEY) : null;
    return sessionStorage.getItem(SESSION_KEY) ?? devRaw;
  } catch {
    // Storage can be unavailable entirely (private mode, blocked cookies).
    return null;
  }
};

/** The stored session envelope `{ user, accessToken, expiresAt }`, or null. */
export const readSession = () => parse(readRaw());

/** The signed-in user, or null. */
export const readSessionUser = () => readSession()?.user ?? null;

/** The bearer token for the current session, or null. */
export const readAccessToken = () => readSession()?.accessToken ?? null;

/** Persist the whole session envelope. */
export const writeSession = (session) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // A dev-injected localStorage session would otherwise shadow this one on reload.
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable or over quota - the session still lives in memory.
  }
};

/**
 * Merge fields into the stored session without disturbing the rest of it.
 * No-op when there is no session to patch.
 */
export const patchSession = (patch) => {
  const current = readSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeSession(next);
  return next;
};

/** Remove the session from every store it may live in. */
export const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
};

/** Copy a dev-injected localStorage session into sessionStorage, once. */
export const adoptDevSession = () => {
  if (!devMirrorEnabled()) return;
  try {
    const devRaw = localStorage.getItem(SESSION_KEY);
    if (devRaw && !sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, devRaw);
  } catch {
    // ignore storage failures
  }
};
