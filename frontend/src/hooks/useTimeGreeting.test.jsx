import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useTimeGreeting, { getTimeGreeting } from './useTimeGreeting';

afterEach(() => vi.useRealTimers());

describe('Bhutan time greeting', () => {
  it.each([
    ['2026-10-10T00:00:00+06:00', 'Good morning'],
    ['2026-10-10T11:59:59+06:00', 'Good morning'],
    ['2026-10-10T12:00:00+06:00', 'Good afternoon'],
    ['2026-10-10T16:59:59+06:00', 'Good afternoon'],
    ['2026-10-10T17:00:00+06:00', 'Good evening'],
    ['2026-10-10T23:59:59+06:00', 'Good evening'],
    ['2026-10-10T06:00:00Z', 'Good afternoon'],
  ])('greets correctly at %s', (date, expected) => {
    expect(getTimeGreeting(new Date(date))).toBe(expected);
  });

  it('updates while the dashboard stays open and clears its timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T11:59:50+06:00'));
    const { result, unmount } = renderHook(useTimeGreeting);
    expect(result.current).toBe('Good morning');
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current).toBe('Good afternoon');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('updates immediately when returning to the tab', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T16:00:00+06:00'));
    const { result } = renderHook(useTimeGreeting);
    vi.setSystemTime(new Date('2026-10-10T18:00:00+06:00'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(result.current).toBe('Good evening');
  });
});
