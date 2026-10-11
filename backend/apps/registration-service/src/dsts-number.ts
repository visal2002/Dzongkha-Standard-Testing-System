import { EntityManager } from 'typeorm';
import { DomainException } from '@dzongjuk/common';

// The annual 999 limit uses the first ten letters, 100 numbers per letter.
export const DSTS_LETTERS = ['ཀ', 'ཁ', 'ག', 'ང', 'ཅ', 'ཆ', 'ཇ', 'ཉ', 'ཏ', 'ཐ'];
const digits = '༠༡༢༣༤༥༦༧༨༩';
export const registrationYear = (date: Date) => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Thimphu' }).format(date));
export function formatDstsNumber(year: number, sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) throw new DomainException('DSTS_ANNUAL_LIMIT', 'All 999 DSTS numbers for this year are allocated. A released number must become available before another registration.', 409);
  const numeric = `${String(year).slice(-2)}-${String(sequence).padStart(3, '0')}`.replace(/\d/g, d => digits[Number(d)]);
  return `${DSTS_LETTERS[Math.floor((sequence - 1) / 100)]}-${numeric}`;
}

export async function allocateDstsNumber(manager: EntityManager, applicationId: string, now: Date, actorId: string, requestId: string) {
  const year = registrationYear(now);
  await manager.query('INSERT INTO registration.dsts_number_counters(year) VALUES ($1) ON CONFLICT DO NOTHING', [year]);
  // Serializes new allocation and pool reuse across every examination in the year.
  const [counter] = await manager.query('SELECT next_sequence FROM registration.dsts_number_counters WHERE year=$1 FOR UPDATE', [year]);
  const [existing] = await manager.query('SELECT number FROM registration.dsts_number_slots WHERE application_id=$1', [applicationId]);
  if (existing) return existing.number as string;
  let [slot] = await manager.query('SELECT sequence,number FROM registration.dsts_number_slots WHERE year=$1 AND application_id IS NULL ORDER BY sequence LIMIT 1 FOR UPDATE', [year]);
  if (slot) {
    await manager.query('UPDATE registration.dsts_number_slots SET application_id=$1,released_at=NULL WHERE year=$2 AND sequence=$3', [applicationId, year, slot.sequence]);
  } else {
    const sequence = Number(counter.next_sequence);
    const number = formatDstsNumber(year, sequence);
    await manager.query('UPDATE registration.dsts_number_counters SET next_sequence=next_sequence+1 WHERE year=$1', [year]);
    await manager.query('INSERT INTO registration.dsts_number_slots(year,sequence,number,application_id) VALUES ($1,$2,$3,$4)', [year, sequence, number, applicationId]);
    slot = { sequence, number };
  }
  await manager.query('INSERT INTO registration.dsts_number_history(year,sequence,number,application_id,action,actor_id,request_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [year, slot.sequence, slot.number, applicationId, 'ASSIGNED', actorId, requestId]);
  return slot.number as string;
}

export async function releaseDstsNumber(manager: EntityManager, applicationId: string, actorId: string, requestId: string) {
  // Ownership is detached, never scores, identity, certificates or application IDs.
  const [slot] = await manager.query('UPDATE registration.dsts_number_slots SET application_id=NULL,released_at=now() WHERE application_id=$1 RETURNING year,sequence,number', [applicationId]);
  if (!slot) return null; // Legacy numbers are not silently converted or recycled.
  await manager.query('INSERT INTO registration.dsts_number_history(year,sequence,number,application_id,action,actor_id,request_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [slot.year, slot.sequence, slot.number, applicationId, 'RELEASED', actorId, requestId]);
  return slot.number as string;
}
