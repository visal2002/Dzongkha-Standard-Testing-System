/**
 * @fileoverview Helpers for the backend's standard response envelope.
 *
 * Every service returns `{ success, data, message, requestId }` (see the backend's
 * ApiEnvelopeInterceptor), but a few endpoints answer with a bare payload. These two
 * helpers absorb that difference in one place instead of repeating the same nested
 * ternary in each service module.
 */

/** Rows out of an envelope, a bare array, or anything else (→ []). */
export const unwrapList = payload => (
  Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
);

/** The single record out of an envelope, or the payload itself when unwrapped. */
export const unwrapOne = payload => payload?.data ?? payload ?? null;

/**
 * Re-wrap a list response, keeping the envelope's other fields and mapping each row.
 * @param {unknown} payload raw response body
 * @param {(row: any) => any} normalize per-row normalizer
 */
export const mapListEnvelope = (payload, normalize) => ({
  ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
  data: unwrapList(payload).map(normalize),
});
