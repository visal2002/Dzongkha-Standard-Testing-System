/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Exam window selection helpers.
 * Every screen that needs "the exam currently accepting registrations" goes through
 * here, so the status vocabulary is asserted in one place rather than restated as a
 * string literal per dashboard.
 */
import { ExamWindowStatus } from '../types';

/**
 * The exam window currently accepting registrations, or null.
 * @param {Array<{status?: string}>} windows
 */
export const findOpenExamWindow = (windows) =>
  (windows || []).find(window => window?.status === ExamWindowStatus.REGISTRATION_OPEN) || null;

/**
 * Whether a window is open for applications right now: status says so *and* the
 * configured registration period covers the current moment.
 * @param {{status?: string, registrationStart?: string, registrationEnd?: string}} window
 * @param {number} [now]
 */
export const isRegistrationOpen = (window, now = Date.now()) => {
  if (window?.status !== ExamWindowStatus.REGISTRATION_OPEN) return false;
  const start = new Date(window.registrationStart).getTime();
  const end = new Date(window.registrationEnd).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return now >= start && now <= end;
};
