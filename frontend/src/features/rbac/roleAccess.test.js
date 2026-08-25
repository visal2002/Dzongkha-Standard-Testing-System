/**
 * Per-role access coverage for the approved matrix.
 *
 * Two things are asserted here that the cell-by-cell contract test cannot:
 *
 *  1. The sidebar. `navigationFor` is imported from the real Sidebar module, so this
 *     exercises the actual NAV_CONFIG rather than a copy of it.
 *  2. The route guards. The route table below is transcribed from `routes/index.jsx`.
 *     A transcription can drift from the routes it describes, so it is not the last
 *     word: `tests/e2e/routes.spec.js` logs in as each role and requests every denied
 *     route directly by URL. That is the binding check; this one catches regressions
 *     in seconds instead of minutes.
 */
import { describe, expect, it } from 'vitest';
import { MATRIX_ROLES, canAccess } from './accessMatrix';
import { OUT_OF_MATRIX_OPERATIONS, canPerform, rolesFor } from './outOfMatrix';
import { navigationFor } from '@/layouts/Sidebar';
import { DASHBOARD_ROLES } from '@/pages/dashboard/Dashboard';

// Transcribed from routes/index.jsx. `access` mirrors requiredAccess, `operation`
// mirrors a requiredRoles list sourced from the out-of-matrix registry.
const ROUTES = [
  { path: '/registration/windows', access: ['registration', 'read'] },
  { path: '/my-applications', access: ['registration', 'read_own'] },
  { path: '/registration/apply/:examId', access: ['registration', 'create_own'] },
  { path: '/registration/applications', access: ['registration', 'read_all'] },
  { path: '/verification', access: ['verification', 'read'] },
  { path: '/attendance', access: ['attendance', 'read'] },
  { path: '/questions', access: ['questions', 'read'] },
  { path: '/questions/upload', access: ['questions', 'create'] },
  { path: '/questions/samples', access: ['questions', 'sample'] },
  { path: '/scores', access: ['scores', 'submit'] },
  { path: '/scores/view', access: ['scores', 'read'] },
  { path: '/scores/summary', access: ['scores', 'read_all'] },
  { path: '/appeals', access: ['appeals', 'read'] },
  { path: '/appeals/new', access: ['appeals', 'submit_own'] },
  { path: '/certificates', access: ['certificates', 'read'] },
  { path: '/reports', access: ['reports', 'read_all'] },
  { path: '/reports/my', access: ['reports', 'read_own'] },
  { path: '/admin/users', access: ['users', 'read'] },
  { path: '/admin/roles', access: ['roles', 'read'] },
  { path: '/scores/committee', operation: 'committeeSetup' },
  { path: '/admin/permissions', operation: 'permissionManagement' },
  { path: '/admin/technical', operation: 'technicalSettings' },
  { path: '/masters', operation: 'examConfiguration' },
  { path: '/dcdd/operational', operation: 'operationalSettings' },
];

const reaches = (role, route) =>
  route.operation ? canPerform(route.operation, role) : canAccess(role, route.access[0], route.access[1]);

const routesFor = role => ROUTES.filter(route => reaches(role, route)).map(route => route.path);

const menuFor = role =>
  navigationFor(role).flatMap(item => (item.children ? item.children.map(child => child.label) : [item.label]));

describe('every approved role resolves a sidebar', () => {
  it.each(MATRIX_ROLES)('%s gets a non-empty menu', role => {
    expect(menuFor(role).length).toBeGreaterThan(0);
  });

  it('offers each personal screen only to the role scoped to its own records', () => {
    expect(menuFor('test_taker')).toEqual(expect.arrayContaining(['My Records', 'My Results', 'My Applications']));
    // `read_own` on Registration is only incidental to the `full`/`read` access level
    // every staff role holds for organisation-wide oversight - none of them has a
    // personal registration record of its own. Only the Test Taker registers for
    // exams, so it is the only role with a real "My Applications" screen. This was
    // fixed per-role (System Admin, then a second role) before being caught a third
    // time on Exam Head; the entry was removed from the shared Registration menu
    // entirely rather than excluding one more role, so this holds for every role
    // covered by the matrix, present and future.
    MATRIX_ROLES.filter(role => role !== 'test_taker').forEach(role => {
      expect(menuFor(role), role).not.toContain('My Records');
      expect(menuFor(role), role).not.toContain('My Results');
      expect(menuFor(role), role).not.toContain('My Applications');
    });
  });

  it('keeps organisation-wide Reports out of the Test Taker menu', () => {
    expect(menuFor('test_taker')).not.toContain('Reports');
    ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member', 'chief_executive']
      .forEach(role => expect(menuFor(role), role).toContain('Reports'));
  });

  it('hides administration from every role but the System Administrator and DCDD', () => {
    ['exam_head', 'committee_head', 'committee_member', 'chief_executive', 'test_taker'].forEach(role => {
      expect(menuFor(role), role).not.toContain('User Management');
      expect(menuFor(role), role).not.toContain('Role Management');
    });
    ['admin', 'dcdd'].forEach(role => {
      expect(menuFor(role), role).toContain('User Management');
      expect(menuFor(role), role).toContain('Role Management');
    });
  });

  it('does not offer the System Administrator DCDD-only operational settings', () => {
    expect(menuFor('admin')).not.toContain('Operational Settings');
    expect(menuFor('dcdd')).toContain('Operational Settings');
  });

  it('separates the Exam Head\'s question-paper work from its read-only modules', () => {
    // BRD §5.4.2 defines exactly one function for this role - uploading question
    // papers and answer sheets. Every other module it can see is "Read" in the
    // matrix by default, not a defined day-to-day task, so it is collapsed into one
    // secondary section beneath the role's actual work instead of sitting at the
    // same visual weight as it.
    const examHeadNav = navigationFor('exam_head');
    const labels = examHeadNav.map(item => item.label);

    expect(labels.slice(0, 3)).toEqual(['Dashboard', 'Question Papers', 'Sample Papers']);
    expect(examHeadNav[3]).toMatchObject({ type: 'section' });
    expect(labels.slice(4)).toEqual(['Registration', 'Verification', 'Absentee', 'Score History', 'Re-evaluation', 'Certificates', 'Reports']);

    // Every other role keeps NAV_CONFIG's declared order untouched.
    expect(navigationFor('dcdd').some(item => item.type === 'section' && item.label === 'Read-Only')).toBe(false);
  });

  it('separates the Committee Head\'s band-score work from its read-only modules', () => {
    // BRD §5.5-5.6 define this role's actual job as band score entry and
    // re-evaluation processing, plus constituting the committee (§5.5.2 BR-1).
    // Every other module it can see is "Read" in the matrix by default, not a
    // defined day-to-day task, so it gets the same demotion Exam Head's read-only
    // modules get above.
    const committeeHeadNav = navigationFor('committee_head');
    const labels = committeeHeadNav.map(item => item.label);

    expect(labels.slice(0, 5)).toEqual(['Dashboard', 'Band Score Entry', 'Score History', 'Committee', 'Re-evaluation']);
    expect(committeeHeadNav[5]).toMatchObject({ type: 'section' });
    expect(labels.slice(6)).toEqual(['Registration', 'Question Papers', 'Sample Papers', 'Certificates', 'Reports']);

    // Only the Committee Head constitutes the committee - not the rest of it.
    expect(menuFor('committee_member')).not.toContain('Committee');
    expect(menuFor('chief_executive')).not.toContain('Committee');
  });

  it('gives Exam Configuration to DCDD only, not the System Administrator', () => {
    // §5.1 Masters is business/policy configuration sitting ahead of the Registration
    // section, which the BRD treats as DCDD's domain throughout; DCDD confirmed
    // ownership over the System Administrator, whose remit is technical.
    expect(menuFor('admin')).not.toContain('Exam Configuration');
    expect(menuFor('dcdd')).toContain('Exam Configuration');
  });

  it('collapses the System Administrator\'s DCDD-oversight screens into Admin Overrides', () => {
    // BRD §5.2.1/§5.3.1 assign window configuration, verification and absentee
    // marking to DCDD. The matrix still gives System Admin "Full" access, but that is
    // break-glass oversight, not a day-to-day task, so its copies are collapsed into
    // one group instead of sitting at the same level as core admin work.
    const adminNav = navigationFor('admin');
    const registration = adminNav.find(item => item.label === 'Registration');
    const overrides = adminNav.find(item => item.label === 'Admin Overrides');

    expect(registration.children.map(child => child.label)).not.toContain('Exam Windows');
    expect(overrides).toBeDefined();
    expect(overrides.children.map(child => child.label)).toEqual(['Exam Windows', 'Verification', 'Absentee']);

    // DCDD keeps these as ordinary, top-level day-to-day screens.
    expect(menuFor('dcdd')).toEqual(expect.arrayContaining(['Exam Windows', 'Verification', 'Absentee']));
    const dcddNav = navigationFor('dcdd');
    expect(dcddNav.find(item => item.label === 'Admin Overrides')).toBeUndefined();
  });
});

describe('route guards admit exactly the roles the matrix allows', () => {
  it('gives the Test Taker their own records and nothing organisation-wide', () => {
    const reachable = routesFor('test_taker');
    expect(reachable).toEqual(expect.arrayContaining([
      '/my-applications', '/registration/apply/:examId', '/questions/samples',
      '/scores/view', '/appeals', '/appeals/new', '/certificates', '/reports/my',
    ]));
    ['/reports', '/registration/applications', '/verification', '/attendance', '/questions',
      '/questions/upload', '/scores', '/scores/summary', '/admin/users', '/admin/roles',
    ].forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('gives the Chief of Examiner read access plus the appeal queue', () => {
    const reachable = routesFor('chief_executive');
    expect(reachable).toEqual(expect.arrayContaining([
      '/registration/windows', '/registration/applications', '/questions',
      '/scores/view', '/scores/summary', '/appeals', '/certificates', '/reports',
    ]));
    ['/verification', '/attendance', '/questions/upload', '/scores', '/appeals/new',
      '/admin/users', '/admin/roles', '/scores/committee', '/masters',
    ].forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('keeps the Committee Member out of every write surface', () => {
    const reachable = routesFor('committee_member');
    expect(reachable).toEqual(expect.arrayContaining(['/appeals', '/scores/summary', '/reports']));
    ['/scores', '/scores/committee', '/verification', '/attendance', '/questions',
      '/certificates', '/admin/users', '/admin/roles',
    ].forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('gives the Committee Head score entry and the committee, but not verification', () => {
    const reachable = routesFor('committee_head');
    expect(reachable).toEqual(expect.arrayContaining(['/scores', '/scores/committee', '/appeals', '/questions']));
    ['/verification', '/attendance', '/questions/upload', '/admin/users', '/admin/roles']
      .forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('confines the System Administrator to the matrix, not the backend wildcard', () => {
    const reachable = routesFor('admin');
    expect(reachable).toEqual(expect.arrayContaining(['/admin/users', '/admin/roles', '/admin/permissions', '/admin/technical']));
    // `*` server-side would satisfy score submission; the matrix gives admin Read.
    expect(reachable).not.toContain('/scores');
    expect(reachable).not.toContain('/dcdd/operational');
    // §5.1 Masters is DCDD's business/policy configuration, not System Admin's remit.
    expect(reachable).not.toContain('/masters');
  });

  it('gives the Exam Head the question repository but no administration', () => {
    const reachable = routesFor('exam_head');
    expect(reachable).toEqual(expect.arrayContaining(['/questions', '/questions/upload', '/verification', '/attendance']));
    ['/admin/users', '/admin/roles', '/scores'].forEach(path => expect(reachable, path).not.toContain(path));
  });
});

describe('encrypted question documents stay with the roles that hold Full access', () => {
  it('opens the document controls to the Exam Head and System Administrator only', () => {
    ['admin', 'exam_head'].forEach(role =>
      expect(canAccess(role, 'questions', 'secure_read'), role).toBe(true));
    ['dcdd', 'committee_head', 'chief_executive', 'committee_member', 'test_taker'].forEach(role =>
      expect(canAccess(role, 'questions', 'secure_read'), role).toBe(false));
  });
});

describe('dashboards deny by default', () => {
  it('gives every approved role a dashboard of its own', () => {
    MATRIX_ROLES.forEach(role => expect(DASHBOARD_ROLES, role).toContain(role));
  });

  it('has no dashboard for an unknown role, rather than falling back to a populated one', () => {
    expect(DASHBOARD_ROLES).not.toContain('unknown_role');
    expect(DASHBOARD_ROLES).toHaveLength(MATRIX_ROLES.length);
  });
});

describe('out-of-matrix operations are registered rather than hard-coded', () => {
  it('names a surface, a reason, and at least one role for every entry', () => {
    OUT_OF_MATRIX_OPERATIONS.forEach(operation => {
      expect(operation.roles.length, operation.key).toBeGreaterThan(0);
      expect(operation.reason, operation.key).toBeTruthy();
      expect(operation.surface, operation.key).toBeTruthy();
    });
  });

  it('fails closed for an unknown operation or an unlisted role', () => {
    expect(rolesFor('nonexistent')).toEqual([]);
    expect(canPerform('nonexistent', 'admin')).toBe(false);
    expect(canPerform('declareResults', 'test_taker')).toBe(false);
    expect(canPerform('declareResults', 'committee_head')).toBe(false);
  });

  it('keeps result declaration with DCDD and the System Administrator', () => {
    expect(canPerform('declareResults', 'dcdd')).toBe(true);
    expect(canPerform('declareResults', 'admin')).toBe(true);
  });
});
