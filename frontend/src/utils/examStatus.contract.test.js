/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { describe, expect, it } from 'vitest';
import { examWindows } from '@/mocks/mockData';
import { ExamWindowStatus } from '@/constants/domain';
import { findOpenExamWindow, isRegistrationOpen } from './examWindows';

// The backend ExamStatus enum (backend/libs/contracts/src/index.ts) is the contract.
// examService.normalizeExam lowercases whatever the API returns, so the frontend sees
// these forms. Duplicated here deliberately: if the backend enum changes, this list has
// to be updated by hand, and that is the point — the change becomes visible.
const CANONICAL = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'results_declared',
  'archived',
  'cancelled',
];

describe('exam window status vocabulary', () => {
  it('ExamWindowStatus matches the backend ExamStatus enum, lowercased', () => {
    expect(Object.values(ExamWindowStatus).sort()).toEqual([...CANONICAL].sort());
  });

  it('every mock exam window uses a status the real API can actually return', () => {
    // Mock fixtures previously used 'open', 'upcoming' and 'completed', which no backend
    // response ever contains. Screens selecting on those matched in demo mode and matched
    // nothing in production.
    for (const window of examWindows) {
      expect(CANONICAL).toContain(window.status);
    }
  });

  it('finds the open window in the mock fixture through the shared selector', () => {
    const open = findOpenExamWindow(examWindows);
    expect(open).not.toBeNull();
    expect(open.status).toBe(ExamWindowStatus.REGISTRATION_OPEN);
  });

  it('finds nothing when windows carry the old pre-contract vocabulary', () => {
    // The exact regression: DCDDDashboard and TestTakerDashboard selected on 'open',
    // which demo fixtures returned and the API never does, so both dashboards found an
    // active exam in mock mode and none in production.
    expect(findOpenExamWindow([{ status: 'open' }, { status: 'upcoming' }])).toBeNull();
  });

  it('requires the registration period to cover now, not just the status', () => {
    const base = { status: ExamWindowStatus.REGISTRATION_OPEN };
    const now = Date.parse('2026-08-22T00:00:00Z');
    expect(isRegistrationOpen({ ...base, registrationStart: '2026-08-01', registrationEnd: '2026-09-01' }, now)).toBe(true);
    expect(isRegistrationOpen({ ...base, registrationStart: '2026-06-01', registrationEnd: '2026-07-15' }, now)).toBe(false);
    expect(isRegistrationOpen({ status: ExamWindowStatus.PUBLISHED, registrationStart: '2026-08-01', registrationEnd: '2026-09-01' }, now)).toBe(false);
  });
});
