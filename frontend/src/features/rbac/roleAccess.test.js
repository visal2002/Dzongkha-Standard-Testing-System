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
import { DASHBOARD_ROLES } from '@/features/dashboard/pages/Dashboard';

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
  { path: '/questions/downloads', access: ['questions', 'secure_read'] },
  { path: '/questions/samples', access: ['questions', 'sample'] },
  { path: '/scores', access: ['scores', 'submit'] },
  { path: '/scores/view', access: ['scores', 'read'] },
  { path: '/scores/summary', access: ['scores', 'read_all'] },
  { path: '/scores/band-scores', access: ['scores', 'read'] },
  { path: '/appeals', access: ['appeals', 'read'] },
  { path: '/appeals/new', access: ['appeals', 'submit_own'] },
  { path: '/certificates', access: ['certificates', 'read'] },
  { path: '/reports', access: ['reports', 'read_all'] },
  { path: '/reports/my', access: ['reports', 'read_own'] },
  { path: '/admin/users', access: ['users', 'read'] },
  { path: '/admin/roles', access: ['roles', 'read'] },
  { path: '/scores/committee', operation: 'committeeSetup' },
  // BRD §5.6.2 Committee BR-2: only the Committee Head runs the committee review
  // step that produces a revision request, so 'process' is what actually
  // distinguishes this route from the broader 'read' every appeals-facing role holds.
  { path: '/appeals/revisions', access: ['appeals', 'process'] },
  { path: '/admin/permissions', operation: 'permissionManagement' },
  { path: '/admin/role-assignment', operation: 'roleAssignment' },
  { path: '/admin/audit-logs', operation: 'systemAuditLogs' },
  { path: '/admin/technical', operation: 'technicalSettings' },
  { path: '/masters', operation: 'examConfiguration' },
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
    expect(menuFor('test_taker')).toEqual(expect.arrayContaining(['My Results', 'Register / My Profile']));
    // `read_own` on Registration is only incidental to the `full`/`read` access level
    // every staff role holds for organisation-wide oversight - none of them has a
    // personal registration record of its own. Only the Test Taker registers for
    // exams, so it is the only role with a real "Register / My Profile" screen. This
    // was fixed per-role (System Admin, then a second role) before being caught a
    // third time on Exam Head; the entry was removed from the shared Registration
    // menu entirely rather than excluding one more role, so this holds for every
    // role covered by the matrix, present and future.
    MATRIX_ROLES.filter(role => role !== 'test_taker').forEach(role => {
      expect(menuFor(role), role).not.toContain('My Results');
      expect(menuFor(role), role).not.toContain('Register / My Profile');
    });
    // "My Reports" was dropped entirely under the v2 Test Taker sidebar decision -
    // no role sees it any more, not even the Test Taker.
    MATRIX_ROLES.forEach(role => expect(menuFor(role), role).not.toContain('My Records'));
  });

  it('keeps organisation-wide Reports out of the Test Taker menu', () => {
    expect(menuFor('test_taker')).not.toContain('Reports');
    // System Administrator held Reports too until the v2 sidebar decision withdrew
    // every exam-workflow module from that role. DCDD sees its own flattened
    // "Reports & Analytics" entry and Chief Executive its own "Executive Reports"
    // instead of the generic "Reports" label, and Exam Head's, Committee Member's
    // and Committee Head's own v2 strict-least-privilege menus drop Reports from
    // the sidebar entirely (the matrix grant stays real and reachable by direct URL
    // in every case, just unsurfaced) - see the six-item, four-item and three-item
    // menu tests below.
    expect(menuFor('chief_executive')).toContain('Executive Reports');
    expect(menuFor('chief_executive')).not.toContain('Reports');
    expect(menuFor('dcdd')).not.toContain('Reports');
    expect(menuFor('admin')).not.toContain('Reports');
    expect(menuFor('exam_head')).not.toContain('Reports');
    expect(menuFor('committee_member')).not.toContain('Reports');
    expect(menuFor('committee_head')).not.toContain('Reports');
  });

  it('hides administration from every role but the System Administrator', () => {
    // DCDD holds `users`/`roles` Read in the matrix too, but under the v2 six-item
    // sidebar decision that stays an unsurfaced backend entitlement, the same
    // treatment given its other matrix-only Read grants - see the six-item menu test.
    ['dcdd', 'exam_head', 'committee_head', 'committee_member', 'chief_executive', 'test_taker'].forEach(role => {
      expect(menuFor(role), role).not.toContain('User Management');
      expect(menuFor(role), role).not.toContain('Role Management');
    });
    expect(menuFor('admin')).toContain('User Management');
    expect(menuFor('admin')).toContain('Role Management');
  });

  it('does not offer the System Administrator DCDD-only master configuration', () => {
    expect(menuFor('admin')).not.toContain('Master Configuration');
    expect(menuFor('dcdd')).toContain('Master Configuration');
  });

  it('gives the Exam Head exactly four flat items and nothing else - v2 strict least-privilege', () => {
    // Supersedes the earlier draft that kept Registration/Verification/Absentee/
    // Score History/Re-evaluation/Certificates/Reports visible under a demoted
    // "Read-Only" section. BRD §5.4.2 defines exactly one function for this role -
    // uploading question papers and answer sheets (BR-1/BR-2) - split across two
    // screens from BR-3's separately time-gated download screen, plus BR-4's
    // released-sample review screen. Every other module the matrix grants this
    // role only "Read" on, none of it a stated day-to-day task, so v2 drops all of
    // it from the sidebar rather than demoting it into a secondary section - the
    // matrix grant stays real and reachable by direct URL (see the route-guard
    // test below), the same unsurfaced-entitlement treatment DCDD's own
    // situational-awareness grants get.
    const examHeadNav = navigationFor('exam_head');
    expect(examHeadNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(examHeadNav.map(item => item.label)).toEqual([
      'Dashboard', 'Question Bank', 'Exam Day Downloads', 'Released Sample Papers',
    ]);

    [
      'Registration', 'Exam Windows', 'Applications', 'My Applications', 'Verification', 'Absentee',
      'Question Papers', 'Upload Papers', 'Sample Papers', 'Band Score Entry', 'My Results',
      'Score History', 'Committee', 'Re-evaluation', 'Certificates', 'Reports', 'My Records',
      'Master Configuration', 'User Management', 'Role Management',
    ].forEach(label => expect(menuFor('exam_head'), label).not.toContain(label));

    // Every other role keeps NAV_CONFIG's declared order untouched.
    expect(navigationFor('dcdd').some(item => item.type === 'section' && item.label === 'Read-Only')).toBe(false);
  });

  it('gives the Committee Head exactly four flat items and nothing else - v2 strict least-privilege', () => {
    // Supersedes the earlier draft that kept Registration/Question Papers/Sample
    // Papers/Score History/Certificates/Reports visible under a demoted "Read-Only"
    // section. BRD §5.5-5.6 define this role's actual job as band score entry
    // (§5.5.2 BR-1/BR-2) and re-evaluation processing (§5.6.1-5.6.2 Committee
    // BR-1/BR-2) - nothing else is a stated day-to-day task, so v2 drops every
    // other module from the sidebar rather than demoting it into a secondary
    // section, the same treatment Exam Head and Committee Member already carry.
    // Constituting the committee (§5.5.2 BR-1) is dropped too - a Committee Head
    // assembling and designating themselves does not make organisational sense;
    // see the 'committeeSetup' entry in outOfMatrix.js, now DCDD-only.
    const committeeHeadNav = navigationFor('committee_head');
    expect(committeeHeadNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(committeeHeadNav.map(item => item.label)).toEqual([
      'Dashboard', 'Band Score Entry', 'Re-evaluation Panel', 'Revision Status Tracker',
    ]);

    [
      'Registration', 'Exam Windows', 'Applications', 'Verification', 'Absentee',
      'Question Papers', 'Upload Papers', 'Sample Papers', 'My Results', 'Score History',
      'Committee', 'Re-evaluation', 'Certificates', 'Reports', 'My Records', 'Master Configuration',
    ].forEach(label => expect(menuFor('committee_head'), label).not.toContain(label));

    // Only the Committee Head ever held committee constitution among the roles that
    // still see a Re-evaluation-shaped screen - it is gone from all of them now.
    expect(menuFor('committee_member')).not.toContain('Committee');
    expect(menuFor('chief_executive')).not.toContain('Committee');
  });

  it('gives the Committee Member exactly three flat items and nothing else - v2 strict least-privilege', () => {
    // BRD §5.5.2/§5.6.1 define this role's whole job as viewing submitted band
    // scores and tracking re-evaluation requests after they clear payment - a pure
    // read surface, not a defined day-to-day task beyond looking. Registration and
    // Reports are "Read" in the matrix by default, the same situational-awareness
    // grant every other v2-reduced role holds, so v2 drops them from the sidebar
    // entirely rather than demoting them into a secondary section - the matrix
    // grant stays real and reachable by direct URL (see the route-guard test
    // below), the same unsurfaced-entitlement treatment DCDD's and Exam Head's own
    // situational-awareness grants get.
    const memberNav = navigationFor('committee_member');
    expect(memberNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(memberNav.map(item => item.label)).toEqual(['Dashboard', 'View Band Scores', 'Re-evaluation Queue']);

    [
      'Registration', 'Exam Windows', 'Applications', 'My Applications', 'Verification', 'Absentee',
      'Question Papers', 'Upload Papers', 'Sample Papers', 'Band Score Entry', 'My Results',
      'Score History', 'Committee', 'Re-evaluation', 'Certificates', 'Reports', 'My Records',
      'Master Configuration', 'User Management', 'Role Management',
    ].forEach(label => expect(menuFor('committee_member'), label).not.toContain(label));
  });

  it('gives Master Configuration to DCDD only, not the System Administrator', () => {
    // §5.1 Masters is business/policy configuration sitting ahead of the Registration
    // section, which the BRD treats as DCDD's domain throughout; DCDD confirmed
    // ownership over the System Administrator, whose remit is technical.
    expect(menuFor('admin')).not.toContain('Master Configuration');
    expect(menuFor('dcdd')).toContain('Master Configuration');
  });

  it('gives DCDD exactly six flat items and nothing else - v2 six-item sidebar decision', () => {
    // Supersedes the earlier, broader DCDD menu (Registration group, Verification,
    // Absentee, Question Papers group, Sample Papers, Score History, Committee,
    // Re-evaluation, Certificates, Reports, plus the two now-consolidated settings
    // screens). The matrix still grants DCDD Read on Question Papers/Band
    // Scores/Re-evaluation, `users`/`roles` Read, and `certificates: full`, but none
    // of that is surfaced here - it stays an unsurfaced backend entitlement, the same
    // way System Admin's withdrawn matrix grants stay withdrawn in accessMatrix.js.
    const dcddNav = navigationFor('dcdd');
    expect(dcddNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(dcddNav.map(item => item.label)).toEqual([
      'Dashboard',
      'Registration Windows',
      'Application Verification',
      'Absentee Management',
      'Master Configuration',
      'Reports & Analytics',
    ]);

    [
      'Exam Windows', 'Applications', 'My Applications', 'Verification', 'Absentee',
      'Question Papers', 'Upload Papers', 'Sample Papers', 'Band Score Entry', 'My Results',
      'Score History', 'Committee', 'Re-evaluation', 'Certificates', 'Reports', 'My Records',
      'User Management', 'Role Management', 'Exam Configuration', 'Operational Settings',
      'Technical Settings',
    ].forEach(label => expect(menuFor('dcdd'), label).not.toContain(label));
  });

  it('gives the System Administrator exactly seven flat items and nothing else - v2 strict least-privilege', () => {
    // v2 sidebar decision: this supersedes an earlier draft that collapsed DCDD's
    // day-to-day screens (Exam Windows, Verification, Absentee) into a de-emphasised
    // "Admin Overrides" group for System Admin. This version removes them from the
    // role entirely instead - no sub-menus, no secondary section, no operational
    // exam-workflow module, not even read-only oversight. The role's scope is
    // technical governance: user/role/permission administration plus system-level
    // technical settings.
    const adminNav = navigationFor('admin');
    expect(adminNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(adminNav.map(item => item.label)).toEqual([
      'Admin Dashboard',
      'User Management',
      'Role Management',
      'Permission & Association Management',
      'Role Assignment',
      'System Audit Logs',
      'Technical Settings',
    ]);

    // Every exam-workflow module is gone, not merely hidden - the underlying matrix
    // grant is withdrawn (see accessMatrix.contract.test.js), so this holds even if
    // a future nav change tried to surface it again through a different entry.
    [
      'Dashboard', 'Registration', 'Exam Windows', 'Applications', 'My Applications',
      'Verification', 'Absentee', 'Question Papers', 'Upload Papers', 'Sample Papers',
      'Band Score Entry', 'My Results', 'Score History', 'Committee', 'Re-evaluation',
      'Certificates', 'Reports', 'My Records', 'Master Configuration',
      'Exam Configuration', 'Operational Settings', 'Admin Overrides',
    ].forEach(label => expect(menuFor('admin'), label).not.toContain(label));

    // DCDD's own six-item menu (Registration Windows, Application Verification,
    // Absentee Management, Master Configuration, Reports & Analytics) is exercised
    // in full by the 'gives DCDD exactly six flat items' test above.
  });

  it('gives Technical Settings to the System Administrator only', () => {
    expect(menuFor('admin')).toContain('Technical Settings');
    MATRIX_ROLES.filter(role => role !== 'admin').forEach(role =>
      expect(menuFor(role), role).not.toContain('Technical Settings'));
  });

  it('gives the Test Taker exactly six flat items and nothing else - v2 six-item sidebar decision', () => {
    // Supersedes the earlier draft that gave this role a "Registration" section
    // wrapping a single "My Applications" child, plus a separate "My Records"
    // reporting screen. Registration and profile editing are the same underlying
    // record for this role (BRD §5.2.1-§5.2.2), so they now share one sidebar entry;
    // "My Records" is dropped entirely rather than kept as a seventh screen; and
    // "Sample Question Papers" moves to the end of the menu as the public
    // post-results archive, distinct from the exam-cycle workflow above it.
    const testTakerNav = navigationFor('test_taker');
    expect(testTakerNav.every(item => !item.children && item.type !== 'section'), 'flat, no sections or groups').toBe(true);
    expect(testTakerNav.map(item => item.label)).toEqual([
      'Dashboard', 'Register / My Profile', 'My Results', 'Re-evaluation', 'Certificates', 'Sample Question Papers',
    ]);

    [
      'My Applications', 'Verification', 'Absentee', 'Question Papers', 'Upload Papers',
      'Sample Papers', 'Band Score Entry', 'Score History', 'Committee', 'Reports', 'My Records',
      'Master Configuration', 'User Management', 'Role Management',
    ].forEach(label => expect(menuFor('test_taker'), label).not.toContain(label));
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
    expect(reachable).toEqual(expect.arrayContaining(['/appeals', '/scores/summary', '/scores/band-scores', '/reports']));
    ['/scores', '/scores/committee', '/verification', '/attendance', '/questions',
      '/certificates', '/admin/users', '/admin/roles',
    ].forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('gives the Committee Head score entry and re-evaluation processing, but not committee constitution', () => {
    // The underlying matrix row is unchanged (registration/questions/certificates/
    // reports stay Read, scores stays Submit, appeals stays Process) - only
    // 'committeeSetup' was actually withdrawn (see outOfMatrix.js) and the v2
    // four-item sidebar no longer links to the rest, so those routes stay reachable
    // by direct URL, the same unsurfaced-entitlement treatment used everywhere else.
    const reachable = routesFor('committee_head');
    expect(reachable).toEqual(expect.arrayContaining(['/scores', '/appeals', '/appeals/revisions', '/questions']));
    ['/scores/committee', '/verification', '/attendance', '/questions/upload', '/questions/downloads', '/admin/users', '/admin/roles']
      .forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('confines the System Administrator to technical governance under v2 strict least-privilege', () => {
    // Supersedes the earlier, broader posture: the matrix used to give this role
    // Full/Read across every exam-workflow module, reachable directly by URL even
    // where the sidebar didn't show it. That backend-style `*` wildcard reasoning is
    // exactly what the frontend has always refused to mirror (see the old comment
    // this replaces) - the v2 decision applies the same discipline to System Admin's
    // own former grants, not just DCDD's.
    const reachable = routesFor('admin');
    expect(reachable).toEqual([
      '/admin/users', '/admin/roles', '/admin/permissions', '/admin/role-assignment', '/admin/audit-logs',
      '/admin/technical',
    ]);
    [
      '/registration/windows', '/my-applications', '/registration/apply/:examId', '/registration/applications',
      '/verification', '/attendance', '/questions', '/questions/upload', '/questions/samples',
      '/scores', '/scores/view', '/scores/summary', '/scores/committee',
      '/appeals', '/appeals/new', '/certificates', '/reports', '/reports/my',
      '/masters',
    ].forEach(path => expect(reachable, path).not.toContain(path));
  });

  it('gives Role Assignment and System Audit Logs to the System Administrator only', () => {
    MATRIX_ROLES.filter(role => role !== 'admin').forEach(role => {
      expect(canPerform('roleAssignment', role), role).toBe(false);
      expect(canPerform('systemAuditLogs', role), role).toBe(false);
    });
    expect(canPerform('roleAssignment', 'admin')).toBe(true);
    expect(canPerform('systemAuditLogs', 'admin')).toBe(true);
  });

  it('gives the Exam Head the question repository but no administration', () => {
    // The matrix (accessMatrix.js) is unchanged for this role under v2 - only the
    // sidebar was reduced to four items. /verification and /attendance remain
    // reachable by direct URL as an unsurfaced entitlement, same as DCDD's.
    const reachable = routesFor('exam_head');
    expect(reachable).toEqual(expect.arrayContaining([
      '/questions', '/questions/upload', '/questions/downloads', '/verification', '/attendance',
    ]));
    ['/admin/users', '/admin/roles', '/scores'].forEach(path => expect(reachable, path).not.toContain(path));
  });
});

describe('encrypted question documents stay with the roles that hold Full access', () => {
  it('opens the document controls to the Exam Head only', () => {
    // System Administrator held this too until the v2 sidebar decision withdrew
    // question-paper access from the role entirely.
    expect(canAccess('exam_head', 'questions', 'secure_read')).toBe(true);
    ['admin', 'dcdd', 'committee_head', 'chief_executive', 'committee_member', 'test_taker'].forEach(role =>
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
  it('names a surface and a reason for every entry', () => {
    OUT_OF_MATRIX_OPERATIONS.forEach(operation => {
      expect(Array.isArray(operation.roles), operation.key).toBe(true);
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

  it('keeps result declaration with DCDD only, not the System Administrator', () => {
    // System Administrator held this too until the v2 sidebar decision withdrew
    // every exam-workflow operation from the role, declaring results included.
    expect(canPerform('declareResults', 'dcdd')).toBe(true);
    expect(canPerform('declareResults', 'admin')).toBe(false);
  });

  it('gives Technical Settings to the System Administrator only', () => {
    // System-level integration configuration (API keys, NDI credentials, SMS/email
    // gateways). Out of the matrix because no module describes infrastructure, but
    // owned by the role that already holds technical governance.
    expect(rolesFor('technicalSettings')).toEqual(['admin']);
    expect(canPerform('technicalSettings', 'admin')).toBe(true);
    MATRIX_ROLES.filter(role => role !== 'admin').forEach(role =>
      expect(canPerform('technicalSettings', role), role).toBe(false));
  });

  it('leaves Operational Settings unassigned - consolidated into Master Configuration', () => {
    // Retired under the v2 six-item sidebar decision: its real sections (certificate
    // settings, fee settings) were absorbed into 'examConfiguration', and the rest
    // never had a backend behind them. The page stays in the codebase, reachable by
    // nobody, rather than being deleted.
    expect(rolesFor('operationalSettings')).toEqual([]);
    MATRIX_ROLES.forEach(role => expect(canPerform('operationalSettings', role), role).toBe(false));
  });

  it('leaves committee setup with DCDD only - withdrawn from both the System Administrator and the Committee Head', () => {
    // System Admin lost this under the v2 sidebar decision that withdrew every
    // exam-workflow operation from that role. The Committee Head held it too, until
    // the v2 Committee Head sidebar decision withdrew it as well - a Committee Head
    // assembling and designating themselves does not make organisational sense.
    // DCDD is left holding it as an unsurfaced grant pending an explicit ownership
    // ratification (see outOfMatrix.js).
    expect(canPerform('committeeSetup', 'dcdd')).toBe(true);
    expect(canPerform('committeeSetup', 'committee_head')).toBe(false);
    expect(canPerform('committeeSetup', 'admin')).toBe(false);
  });
});
