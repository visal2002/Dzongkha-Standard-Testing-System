/**
 * Operations the approved access matrix does not describe.
 *
 * The matrix covers ten modules against seven roles. A handful of screens and
 * actions fall outside it entirely - exam configuration, technical and operational
 * settings - and two more sit inside a matrix module but are not the thing that
 * module grants: declaring results and constituting the exam committee are exam
 * operations, not band score values, and the matrix gives nobody `manage` on Band
 * Scores.
 *
 * Rather than leave those as role arrays scattered through routes, the sidebar and
 * page components, every one of them is registered here with the roles it admits
 * and the reason it is not in the matrix. The Role & Access Matrix screen renders
 * this list, so an out-of-matrix grant is visible to an administrator instead of
 * being discoverable only by reading the source.
 *
 * Each entry needs ratifying by DCDD alongside the matrix itself.
 */
export const OUT_OF_MATRIX_OPERATIONS = [
  {
    key: 'declareResults',
    label: 'Declare examination results',
    roles: ['dcdd'],
    surface: 'Band Scores — "Declare Results"',
    reason:
      'Publishing results is an exam operation, not band score entry. The matrix gives DCDD ' +
      'Read on Band Scores and no role `manage`, so a strict reading would leave the action ' +
      'with no holder and strand the workflows it unlocks - sample papers, re-evaluation and ' +
      'certificate generation. The System Administrator held this too until the v2 sidebar ' +
      'decision withdrew every exam-workflow operation from that role, including this one.',
  },
  {
    key: 'committeeSetup',
    label: 'Constitute the exam committee',
    roles: ['dcdd', 'committee_head'],
    surface: '/scores/committee',
    reason:
      'Appointing committee members decides who may later enter scores. It is an ' +
      'administrative act over the committee, not access to the scores themselves, and the ' +
      'matrix has no row for it. The System Administrator held this too until the v2 sidebar ' +
      'decision withdrew every exam-workflow operation from that role, including this one.',
  },
  {
    key: 'examConfiguration',
    label: 'Exam configuration and master data',
    roles: ['dcdd'],
    surface: '/masters',
    reason:
      'Registration timeline, certificate validity and payment amount are business and ' +
      'policy settings, not technical configuration. §5.1 sits directly ahead of the ' +
      'Registration section, which the BRD treats as DCDD\'s domain throughout, and DCDD ' +
      'confirmed ownership over the System Administrator, whose matrix remit is users, roles ' +
      'and permissions.',
  },
  {
    key: 'permissionManagement',
    label: 'Permission management',
    roles: ['admin'],
    surface: '/admin/permissions',
    reason:
      'The editing surface behind Role Management CRUD. Restricted to the System ' +
      'Administrator, consistent with the matrix giving only that role CRUD on Roles.',
  },
  {
    key: 'roleAssignment',
    label: 'Assign roles to users',
    roles: ['admin'],
    surface: '/admin/role-assignment',
    reason:
      'BRD §6.1 names role assignment as its own System Administrator function, distinct ' +
      'from role creation. A user may hold more than one role concurrently (BRD §4).',
  },
  {
    key: 'systemAuditLogs',
    label: 'System audit logs',
    roles: ['admin'],
    surface: '/admin/audit-logs',
    reason:
      'Supported by §7.3\'s complete, searchable, immutable audit trail requirement and ' +
      '§8 NFR-Security, and mitigates Risk R4 (§9). No matrix module covers it.',
  },
  {
    key: 'technicalSettings',
    label: 'Technical settings',
    roles: [],
    surface: '/admin/technical',
    reason:
      'System-level configuration - API keys, NDI credentials, SMS/email gateway config. ' +
      'Dropped from the System Administrator under the v2 sidebar\'s strict least-privilege ' +
      'model: that role is scoped to user, role and permission governance, and integration ' +
      'credentials arguably belong to a distinct DevOps/Platform role instead. No role holds ' +
      'this operation until that ownership question is settled; the screen stays in the ' +
      'codebase, unreachable, rather than being deleted.',
  },
  {
    key: 'operationalSettings',
    label: 'Operational settings',
    roles: ['dcdd'],
    surface: '/dcdd/operational',
    reason:
      'DCDD-specific operational configuration. Deliberately excludes the System ' +
      'Administrator, whose matrix remit is users, roles and permissions.',
  },
];

const BY_KEY = Object.fromEntries(OUT_OF_MATRIX_OPERATIONS.map(operation => [operation.key, operation]));

/** Roles admitted to an out-of-matrix operation. Unknown keys grant nobody. */
export function rolesFor(operationKey) {
  return BY_KEY[operationKey]?.roles ?? [];
}

/**
 * Whether a role may perform an out-of-matrix operation. Fails closed the same way
 * `canAccess` does: an unknown operation or an unlisted role returns false.
 */
export function canPerform(operationKey, role) {
  return rolesFor(operationKey).includes(role);
}
