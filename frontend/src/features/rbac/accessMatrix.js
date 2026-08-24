export const ACCESS_MODULES = [
  { key: 'users', label: 'User Management' },
  { key: 'roles', label: 'Role Management' },
  { key: 'registration', label: 'Registration' },
  { key: 'verification', label: 'Verification' },
  { key: 'attendance', label: 'Absentee' },
  { key: 'questions', label: 'Question Upload' },
  { key: 'scores', label: 'Band Scores' },
  { key: 'appeals', label: 'Re-evaluation' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'reports', label: 'Reports' },
];

export const ROLE_LABELS = {
  admin: 'System Administrator',
  dcdd: 'DCDD Administrator',
  exam_head: 'Exam Head',
  committee_head: 'Committee Head',
  committee_member: 'Committee Member',
  chief_executive: 'Chief of Examiner',
  test_taker: 'Test Taker',
};

// The seven roles covered by the approved access matrix, in its column order.
//
// `chief_executive` is the role key for Chief of Examiner. The approved document
// names the role "Chief of Examiner" and treats it as the same role the BRD calls
// "Chief Executive"; only the display label follows the document, because renaming
// the key would mean migrating JWT claims, seeded roles, and fixtures for no
// functional gain.
export const MATRIX_ROLES = ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member', 'chief_executive', 'test_taker'];

// Roles carrying permissions the approved matrix does not describe. Every role is
// now covered by the matrix, so this is empty. Operations that sit outside the
// matrix are registered in `outOfMatrix.js` instead, per action rather than role.
export const SUPPLEMENTARY_ROLES = [];

// This is the approved access matrix, transcribed from the signed-off document.
export const ACCESS_MATRIX = {
  admin: {
    users: 'crud', roles: 'crud', registration: 'full', verification: 'full',
    attendance: 'full', questions: 'full', scores: 'read', appeals: 'read',
    certificates: 'full', reports: 'full',
  },
  dcdd: {
    users: 'read', roles: 'read', registration: 'full', verification: 'full',
    attendance: 'full', questions: 'read', scores: 'read', appeals: 'read',
    certificates: 'full', reports: 'full',
  },
  exam_head: {
    registration: 'read', verification: 'read', attendance: 'read', questions: 'full',
    scores: 'read', appeals: 'read', certificates: 'read', reports: 'read',
  },
  committee_head: {
    registration: 'read', questions: 'read', scores: 'submit', appeals: 'process',
    certificates: 'read', reports: 'read',
  },
  committee_member: {
    registration: 'read', scores: 'read', appeals: 'read', reports: 'read',
  },
  chief_executive: {
    registration: 'read', questions: 'read', scores: 'read', appeals: 'approve',
    certificates: 'read', reports: 'read',
  },
  test_taker: {
    registration: 'create_own', questions: 'sample', scores: 'read_own',
    appeals: 'submit_own', certificates: 'read_own', reports: 'read_own',
  },
};

// Actions each access level satisfies.
//
// `read_all` means "read records belonging to anyone" and is the action that
// separates an organisation-wide listing from a personal one. The own-scoped
// levels below deliberately omit it: without that separation a "view own" grant
// silently satisfies any guard asking for a plain `read`, which is how a Test
// Taker could reach the full applicant list. Guard organisation-wide screens
// with `read_all`, and personal screens with `read_own`.
//
// Two actions are narrower than they look, and the narrowness is the point:
//
//   `approve`      the Chief of Examiner's final decision on a re-evaluation. It is
//                  separate from `process` in both directions - the Committee Head
//                  processes a request but cannot approve it, and the Chief approves
//                  but does not run the committee review step.
//   `secure_read`  opening the encrypted question paper or answer sheet. Only `full`
//                  grants it, so a role holding Question Upload "Read" sees the
//                  paper's metadata and never its contents.
const ALLOWED_ACTIONS = {
  crud: ['read', 'read_all', 'read_own', 'create', 'update', 'delete', 'manage'],
  full: ['read', 'read_all', 'read_own', 'create', 'create_own', 'update', 'delete', 'manage', 'submit', 'process', 'approve', 'sample', 'secure_read'],
  read: ['read', 'read_all', 'read_own', 'sample'],
  submit: ['read', 'read_all', 'read_own', 'submit'],
  process: ['read', 'read_all', 'read_own', 'process'],
  approve: ['read', 'read_all', 'read_own', 'approve'],
  create_own: ['read', 'read_own', 'create', 'create_own'],
  read_own: ['read', 'read_own'],
  submit_own: ['read', 'read_own', 'submit', 'submit_own'],
  sample: ['sample'],
};

export function getAccessLevel(role, module) {
  return ACCESS_MATRIX[role]?.[module] || 'none';
}

export function canAccess(role, module, action = 'read') {
  const level = getAccessLevel(role, module);
  return (ALLOWED_ACTIONS[level] || []).includes(action);
}

// True when a role may read its own records in a module but not anyone else's.
// Personal screens - My Results, My Reports - are shown on this, so that a role
// holding the organisation-wide view is not also offered an empty personal one.
export function isOwnScoped(role, module) {
  return canAccess(role, module, 'read_own') && !canAccess(role, module, 'read_all');
}

export function isMatrixManager(role) {
  return role === 'admin';
}