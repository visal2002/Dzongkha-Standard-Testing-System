import { describe, expect, it } from 'vitest';
import { canAccess, getAccessLevel } from './accessMatrix';

describe('approved access matrix', () => {
  it('gives system administrators CRUD access to users', () => {
    expect(canAccess('admin', 'users', 'create')).toBe(true);
    expect(canAccess('admin', 'users', 'delete')).toBe(true);
  });

  it('keeps DCDD user and role administration read-only', () => {
    expect(canAccess('dcdd', 'users', 'read')).toBe(true);
    expect(canAccess('dcdd', 'users', 'manage')).toBe(false);
    expect(canAccess('dcdd', 'roles', 'read')).toBe(true);
  });

  it('allows committee heads to submit scores and process re-evaluations', () => {
    expect(canAccess('committee_head', 'scores', 'submit')).toBe(true);
    expect(canAccess('committee_head', 'appeals', 'process')).toBe(true);
  });

  it('limits test takers to owned records and samples', () => {
    expect(canAccess('test_taker', 'registration', 'create_own')).toBe(true);
    expect(canAccess('test_taker', 'scores', 'read_own')).toBe(true);
    expect(canAccess('test_taker', 'questions', 'sample')).toBe(true);
    expect(canAccess('test_taker', 'reports', 'read')).toBe(false);
  });

  it('does not invent permissions for an undefined role', () => {
    expect(getAccessLevel('chief_executive', 'reports')).toBe('none');
    expect(canAccess('chief_executive', 'appeals', 'read')).toBe(false);
  });
});
