import { describe, expect, it } from 'vitest';
import { DSTS_STANDARD_RANGES, dstsOverallStandard, dstsStandardForTotal } from './scoringStandard';

describe('DSTS scoring standard', () => {
  it('maps every supplied lower and upper boundary', () => {
    DSTS_STANDARD_RANGES.forEach(({ min, max, standard }) => {
      expect(dstsStandardForTotal(min)).toBe(standard);
      expect(dstsStandardForTotal(max)).toBe(standard);
    });
  });

  it('averages the standards converted from all four skill totals', () => {
    expect(dstsOverallStandard([50, 48, 45, 41])).toBe(8.5);
  });

  it('rejects totals outside the supplied table', () => {
    expect(dstsStandardForTotal(0.5)).toBeNull();
    expect(dstsStandardForTotal(50.5)).toBeNull();
  });
});
