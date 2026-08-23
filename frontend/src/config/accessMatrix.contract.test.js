import { describe, expect, it } from 'vitest';
import { ACCESS_MODULES, MATRIX_ROLES, canAccess, getAccessLevel } from './accessMatrix';

// Transcribed cell by cell from the signed-off access matrix document. Rows follow
// the document's module order, columns its role order. If a grant is ever changed
// in accessMatrix.js without the document being reissued, this table fails.
const APPROVED = {
  //                 admin    dcdd     exam_head  committee_head  committee_member  test_taker
  users:        ['crud',  'read',  'none',    'none',         'none',           'none'],
  roles:        ['crud',  'read',  'none',    'none',         'none',           'none'],
  registration: ['full',  'full',  'read',    'read',         'read',           'create_own'],
  verification: ['full',  'full',  'read',    'none',         'none',           'none'],
  attendance:   ['full',  'full',  'read',    'none',         'none',           'none'],
  questions:    ['full',  'read',  'full',    'read',         'none',           'sample'],
  scores:       ['read',  'read',  'read',    'submit',       'read',           'read_own'],
  appeals:      ['read',  'read',  'read',    'process',      'read',           'submit_own'],
  certificates: ['full',  'full',  'read',    'read',         'none',           'read_own'],
  reports:      ['full',  'full',  'read',    'read',         'read',           'none'],
};

describe('approved access matrix', () => {
  it('covers exactly the modules and roles the document defines', () => {
    expect(ACCESS_MODULES.map(module => module.key)).toEqual(Object.keys(APPROVED));
    expect(MATRIX_ROLES).toHaveLength(6);
  });

  it.each(Object.entries(APPROVED))('matches the document for %s', (moduleKey, expectedLevels) => {
    MATRIX_ROLES.forEach((role, index) => {
      expect(getAccessLevel(role, moduleKey), `${role} / ${moduleKey}`).toBe(expectedLevels[index]);
    });
  });

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

  it('does not invent permissions for an undefined module', () => {
    expect(getAccessLevel('chief_executive', 'reports')).toBe('none');
    expect(canAccess('chief_executive', 'reports', 'read')).toBe(false);
    expect(canAccess('unknown_role', 'appeals', 'read')).toBe(false);
  });
});

describe('own-scoped access cannot read other people\'s records', () => {
  // Guarding an organisation-wide listing with a plain `read` is not enough:
  // every own-scoped level satisfies it. `read_all` is the action that separates
  // "my records" from "everyone's records".
  it('refuses a test taker the organisation-wide listings', () => {
    expect(canAccess('test_taker', 'registration', 'read_all')).toBe(false);
    expect(canAccess('test_taker', 'scores', 'read_all')).toBe(false);
    expect(canAccess('test_taker', 'appeals', 'read_all')).toBe(false);
    expect(canAccess('test_taker', 'certificates', 'read_all')).toBe(false);
  });

  it('still lets a test taker reach their own records', () => {
    expect(canAccess('test_taker', 'registration', 'read_own')).toBe(true);
    expect(canAccess('test_taker', 'scores', 'read_own')).toBe(true);
    expect(canAccess('test_taker', 'appeals', 'submit_own')).toBe(true);
    expect(canAccess('test_taker', 'certificates', 'read_own')).toBe(true);
  });

  it('grants read_all to every role the document gives a non-owned read', () => {
    ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member']
      .forEach(role => expect(canAccess(role, 'registration', 'read_all'), role).toBe(true));
  });

  it('keeps verification closed to roles the document marks No', () => {
    ['committee_head', 'committee_member', 'test_taker']
      .forEach(role => expect(canAccess(role, 'verification', 'read'), role).toBe(false));
  });
});
