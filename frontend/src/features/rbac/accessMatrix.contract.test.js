import { describe, expect, it } from 'vitest';
import { ACCESS_MODULES, MATRIX_ROLES, canAccess, getAccessLevel, isOwnScoped } from './accessMatrix';

// Transcribed cell by cell from the signed-off access matrix document. Rows follow
// the document's module order, columns its role order. If a grant is ever changed
// in accessMatrix.js without the document being reissued, this table fails.
const APPROVED = {
  //                 admin    dcdd     exam_head  committee_head  committee_member  chief_executive  test_taker
  users:        ['crud',  'read',  'none',    'none',         'none',           'none',          'none'],
  roles:        ['crud',  'read',  'none',    'none',         'none',           'none',          'none'],
  registration: ['full',  'full',  'read',    'read',         'read',           'read',          'create_own'],
  verification: ['full',  'full',  'read',    'none',         'none',           'none',          'none'],
  attendance:   ['full',  'full',  'read',    'none',         'none',           'none',          'none'],
  questions:    ['full',  'read',  'full',    'read',         'none',           'read',          'sample'],
  scores:       ['read',  'read',  'read',    'submit',       'read',           'read',          'read_own'],
  appeals:      ['read',  'read',  'read',    'process',      'read',           'approve',       'submit_own'],
  certificates: ['full',  'full',  'read',    'read',         'none',           'read',          'read_own'],
  reports:      ['full',  'full',  'read',    'read',         'read',           'read',          'read_own'],
};

describe('approved access matrix', () => {
  it('covers exactly the modules and roles the document defines', () => {
    expect(ACCESS_MODULES.map(module => module.key)).toEqual(Object.keys(APPROVED));
    expect(MATRIX_ROLES).toHaveLength(7);
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
    // "View own" on Reports: the personal view is open, the organisation-wide one is not.
    expect(canAccess('test_taker', 'reports', 'read_own')).toBe(true);
    expect(canAccess('test_taker', 'reports', 'read_all')).toBe(false);
  });

  it('gives the Chief of Examiner the reads and the approval the document grants', () => {
    ['registration', 'questions', 'scores', 'certificates', 'reports']
      .forEach(module => expect(getAccessLevel('chief_executive', module), module).toBe('read'));
    expect(getAccessLevel('chief_executive', 'appeals')).toBe('approve');
    // Still no administration, verification, or absentee access.
    ['users', 'roles', 'verification', 'attendance']
      .forEach(module => expect(canAccess('chief_executive', module, 'read'), module).toBe(false));
  });

  it('does not invent permissions for an undefined module or role', () => {
    expect(getAccessLevel('chief_executive', 'masters')).toBe('none');
    expect(canAccess('chief_executive', 'masters', 'read')).toBe(false);
    expect(canAccess('unknown_role', 'appeals', 'read')).toBe(false);
  });
});

describe('approve and process are distinct steps in the re-evaluation workflow', () => {
  // The document separates the Committee Head's "Process (pending approval)" from the
  // Chief of Examiner's "Approve". Collapsing them would let either role complete the
  // other's step, which is the control the whole appeal workflow rests on.
  it('does not let the Committee Head approve', () => {
    expect(canAccess('committee_head', 'appeals', 'process')).toBe(true);
    expect(canAccess('committee_head', 'appeals', 'approve')).toBe(false);
  });

  it('does not let the Chief of Examiner run the committee review', () => {
    expect(canAccess('chief_executive', 'appeals', 'approve')).toBe(true);
    expect(canAccess('chief_executive', 'appeals', 'process')).toBe(false);
  });

  it('leaves Committee Members able to do neither', () => {
    expect(canAccess('committee_member', 'appeals', 'read_all')).toBe(true);
    expect(canAccess('committee_member', 'appeals', 'process')).toBe(false);
    expect(canAccess('committee_member', 'appeals', 'approve')).toBe(false);
  });
});

describe('question paper metadata is separate from the encrypted document', () => {
  // Question Upload "Read" is permission to see that a paper exists, not to open it.
  it('grants secure_read only to roles with Full access', () => {
    ['admin', 'exam_head'].forEach(role =>
      expect(canAccess(role, 'questions', 'secure_read'), role).toBe(true));
  });

  it('refuses secure_read to every role holding only Read or sample access', () => {
    ['dcdd', 'committee_head', 'chief_executive', 'committee_member', 'test_taker']
      .forEach(role => expect(canAccess(role, 'questions', 'secure_read'), role).toBe(false));
  });

  it('still lets the Read roles see the repository listing', () => {
    ['dcdd', 'committee_head', 'chief_executive']
      .forEach(role => expect(canAccess(role, 'questions', 'read'), role).toBe(true));
  });
});

describe('isOwnScoped identifies the roles that need a personal screen', () => {
  it('is true only for a role that cannot read everyone\'s records', () => {
    expect(isOwnScoped('test_taker', 'reports')).toBe(true);
    expect(isOwnScoped('test_taker', 'scores')).toBe(true);
  });

  it('is false for every role holding the organisation-wide view', () => {
    ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member', 'chief_executive']
      .forEach(role => {
        expect(isOwnScoped(role, 'reports'), role).toBe(false);
        expect(isOwnScoped(role, 'scores'), role).toBe(false);
      });
  });

  it('is false where a role has no access to the module at all', () => {
    expect(isOwnScoped('test_taker', 'users')).toBe(false);
    expect(isOwnScoped('committee_member', 'certificates')).toBe(false);
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
    ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member', 'chief_executive']
      .forEach(role => expect(canAccess(role, 'registration', 'read_all'), role).toBe(true));
  });

  it('keeps verification closed to roles the document marks No', () => {
    ['committee_head', 'committee_member', 'chief_executive', 'test_taker']
      .forEach(role => expect(canAccess(role, 'verification', 'read'), role).toBe(false));
  });

  it('refuses a test taker the organisation-wide reports', () => {
    expect(canAccess('test_taker', 'reports', 'read_all')).toBe(false);
    expect(canAccess('test_taker', 'reports', 'manage')).toBe(false);
  });
});
