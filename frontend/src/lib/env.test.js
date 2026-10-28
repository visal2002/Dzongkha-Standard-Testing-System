import { describe, expect, it } from 'vitest';
import { isNdiDemoModeAllowed } from './env';

describe('NDI demo-mode guard', () => {
  it('cannot enable the demo proof flow in a production build', () => {
    expect(isNdiDemoModeAllowed(false, true)).toBe(false);
  });

  it('permits the demo proof flow only where mock data is explicitly allowed', () => {
    expect(isNdiDemoModeAllowed(true, true)).toBe(true);
    expect(isNdiDemoModeAllowed(true, false)).toBe(false);
  });
});
