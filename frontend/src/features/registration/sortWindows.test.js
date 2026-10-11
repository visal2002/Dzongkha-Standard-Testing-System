import { describe, expect, it } from 'vitest';
import { sortWindowsLatestFirst } from './sortWindows';

describe('examination windows latest first', () => {
  it('sorts by exam date descending without changing API state', () => {
    const windows = Object.freeze([
      { id: 'august', examDate: '2026-08-16' },
      { id: 'october', examDate: '2026-10-09' },
      { id: 'september', examDate: '2026-09-15' },
    ]);
    expect(sortWindowsLatestFirst(windows).map(w => w.id)).toEqual(['october', 'september', 'august']);
    expect(windows[0].id).toBe('august');
  });
  it('re-sorts newly created and rescheduled windows', () => {
    const windows = [{ id: 'old', examDate: '2026-08-16' }, { id: 'new', examDate: '2026-10-09' }];
    expect(sortWindowsLatestFirst(windows).map(w => w.id)).toEqual(['new', 'old']);
    expect(sortWindowsLatestFirst(windows.map(w => w.id === 'old' ? { ...w, examDate: '2026-11-01' } : w))[0].id).toBe('old');
  });
  it('uses creation time to break ties and puts missing/invalid dates last', () => {
    const windows = [
      { id: 'missing' }, { id: 'invalid', examDate: 'invalid' },
      { id: 'earlier', examDate: '2026-10-09', createdAt: '2026-09-01' },
      { id: 'later', examDate: '2026-10-09', createdAt: '2026-10-01' },
    ];
    expect(sortWindowsLatestFirst(windows).map(w => w.id)).toEqual(['later', 'earlier', 'invalid', 'missing']);
    expect(sortWindowsLatestFirst()).toEqual([]);
  });
});
