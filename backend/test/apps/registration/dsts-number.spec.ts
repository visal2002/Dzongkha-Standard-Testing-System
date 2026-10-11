import { EntityManager } from 'typeorm';
import { allocateDstsNumber, formatDstsNumber, registrationYear, releaseDstsNumber } from '../../../apps/registration-service/src/dsts-number';

describe('Dzongkha DSTS number allocation', () => {
  it.each([[1, 'ཀ-༢༦-༠༠༡'], [100, 'ཀ-༢༦-༡༠༠'], [101, 'ཁ-༢༦-༡༠༡'], [201, 'ག-༢༦-༢༠༡'], [999, 'ཐ-༢༦-༩༩༩']])('formats sequence %s', (sequence, expected) => expect(formatDstsNumber(2026, Number(sequence))).toBe(expected));
  it('caps each year at 999 and uses Bhutan calendar boundaries', () => {
    expect(() => formatDstsNumber(2026, 1000)).toThrow();
    expect(() => formatDstsNumber(2026, 0)).toThrow();
    expect(registrationYear(new Date('2026-12-31T17:59:59Z'))).toBe(2026);
    expect(registrationYear(new Date('2026-12-31T18:00:00Z'))).toBe(2027);
    expect(formatDstsNumber(2027, 1)).toBe('ཀ-༢༧-༠༠༡');
  });
  it('reuses a same-year released number even after the fresh sequence reaches 999', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT next_sequence')) return [{ next_sequence: 1000 }];
      if (sql.startsWith('SELECT sequence,number')) return [{ sequence: 2, number: 'ཀ-༢༦-༠༠༢' }];
      return [];
    });
    expect(await allocateDstsNumber({ query } as unknown as EntityManager, 'new-app', new Date('2026-10-10'), 'actor', 'req')).toBe('ཀ-༢༦-༠༠༢');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE year=$1 AND application_id IS NULL'), [2026]);
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE registration.dsts_number_counters'))).toBe(false);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('dsts_number_history'), [2026, 2, 'ཀ-༢༦-༠༠༢', 'new-app', 'ASSIGNED', 'actor', 'req']);
  });
  it('rejects exhaustion before advancing the counter', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => sql.startsWith('SELECT next_sequence') ? [{ next_sequence: 1000 }] : []);
    await expect(allocateDstsNumber({ query } as unknown as EntityManager, 'app', new Date('2026-10-10'), 'actor', 'req')).rejects.toMatchObject({ response: { code: 'DSTS_ANNUAL_LIMIT' } });
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE registration.dsts_number_counters'))).toBe(false);
  });
  it('records the previous owner on release and never changes candidate scores', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ year: 2026, sequence: 1, number: 'ཀ-༢༦-༠༠༡' }]).mockResolvedValue([]);
    expect(await releaseDstsNumber({ query } as unknown as EntityManager, 'old-app', 'actor', 'req')).toBe('ཀ-༢༦-༠༠༡');
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('dsts_number_history'), [2026, 1, 'ཀ-༢༦-༠༠༡', 'old-app', 'RELEASED', 'actor', 'req']);
    expect(query.mock.calls.some(([sql]) => /score|certificate/i.test(sql))).toBe(false);
  });
});
