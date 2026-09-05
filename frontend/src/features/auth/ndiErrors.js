/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Presentation helpers for Bhutan NDI failure states.
 */

// ─── NDI Sub-components ───────────────────────────────────────────────────────

/**
 * Turns a raw error string into a human explanation of *why* NDI is not working,
 * so the failure state can keep the normal scanner layout and simply say what broke.
 */
export function describeNdiError(error) {
  const raw = typeof error === 'string' ? error.trim() : '';
  const hints = [
    {
      match: /network|failed to fetch|err_network|econnrefused|connection|offline/i,
      title: "Can't reach the Bhutan NDI service",
      detail: 'Your device could not connect to the server. Check your internet connection, then try again.',
    },
    {
      match: /timeout|timed out|etimedout/i,
      title: 'The Bhutan NDI service took too long to respond',
      detail: 'The request timed out before a QR code was issued. Please try again in a moment.',
    },
    {
      match: /expired/i,
      title: 'This QR code has expired',
      detail: 'QR codes stay valid for a few minutes only. Generate a new one to continue.',
    },
    {
      match: /declined|rejected/i,
      title: 'The request was declined in your wallet',
      detail: 'Open Bhutan NDI Wallet again and approve the request to continue.',
    },
    {
      match: /cancel/i,
      title: 'This Bhutan NDI request was cancelled',
      detail: 'Nothing was shared. You can start a new request whenever you are ready.',
    },
    {
      match: /unavailable|not configured|maintenance|503|502|500/i,
      title: 'Bhutan NDI is not responding right now',
      detail: 'The identity service is temporarily unavailable. Please try again shortly.',
    },
    {
      match: /validate|verify|identity/i,
      title: 'Bhutan NDI could not verify this identity',
      detail: 'The credential in your wallet could not be validated for this account.',
    },
  ];

  const hint = hints.find(h => h.match.test(raw));
  if (hint) {
    return { title: hint.title, detail: hint.detail, raw: raw && raw !== hint.detail ? raw : null };
  }
  return {
    title: 'Bhutan NDI login could not be completed',
    detail: raw || 'An unexpected error stopped the request.',
    raw: null,
  };
}

export const NDI_RETRY_BTN_STYLE = {
  border: '1px solid #5AC994',
  borderRadius: '999px',
  padding: '6px 18px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#38ad78',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background .15s',
};
