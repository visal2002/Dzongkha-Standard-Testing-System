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
  test_taker: 'Test Taker',
  chief_executive: 'Chief Executive',
};

// This is the approved access matrix. Chief Executive is intentionally not
// assigned module access because that role is absent from the supplied matrix.
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
  test_taker: {
    registration: 'create_own', questions: 'sample', scores: 'read_own',
    appeals: 'submit_own', certificates: 'read_own',
  },
  chief_executive: {},
};

const ALLOWED_ACTIONS = {
  crud: ['read', 'create', 'update', 'delete', 'manage'],
  full: ['read', 'create', 'update', 'delete', 'manage', 'submit', 'process', 'sample'],
  read: ['read', 'sample'],
  submit: ['read', 'submit'],
  process: ['read', 'process'],
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

export function isMatrixManager(role) {
  return role === 'admin';
}
