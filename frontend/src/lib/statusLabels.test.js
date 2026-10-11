import { describe, expect, it } from 'vitest';
import { humanizeStatus } from './statusLabels';
describe('Human-readable workflow labels', () => {
  it.each([
    ['PENDING_COMMITTEE', 'Awaiting committee review'],
    ['PENDING_CHIEF_APPROVAL', 'Awaiting Chief of Examination approval'],
    ['APPROVED_PENDING_SCORE_UPDATE', 'Approved — awaiting score update'],
    ['NO_CHANGE', 'Completed — scores unchanged'],
    ['WAIVED', 'Fee waived'],
    ['PAYMENT_COMPLETED', 'Payment completed'],
    ['COMPLETED', 'Completed'],
    ['REJECTED', 'Rejected'],
    ['RESULTS-DECLARED', 'Results Declared'],
    ['new_internal_status', 'New Internal Status'],
    [null, 'Not available'],
  ])('formats %s without exposing its backend code', (value, expected) => {
    expect(humanizeStatus(value)).toBe(expected);
  });
});
