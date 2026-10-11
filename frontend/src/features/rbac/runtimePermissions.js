// Runtime navigation and actions use the same named grants carried by the API token.
// The access matrix remains the fallback for mock sessions and its reference screens.
export const hasExplicitPermissions = user => Boolean(user && typeof user === 'object'
  && user.permissionsAuthoritative !== false && Array.isArray(user.permissions));

export const hasGrantedPermission = (user, ...names) => hasExplicitPermissions(user)
  && (user.permissions.includes('*') || names.some(name => user.permissions.includes(name)));

const MODULE_PERMISSIONS = {
  users: { read: ['admin.user.read'], read_all: ['admin.user.read'], manage: ['admin.user.manage'], create: ['admin.user.manage'], update: ['admin.user.manage'], delete: ['admin.user.manage'] },
  roles: { read: ['admin.role.read'], read_all: ['admin.role.read'], manage: ['admin.role.manage'], create: ['admin.role.manage'], update: ['admin.role.manage'], delete: ['admin.role.manage'] },
  registration: { read: ['exam.window.manage', 'registration.application.verify', 'registration.application.submit'], read_all: ['registration.application.verify'], read_own: ['registration.application.submit'], create_own: ['registration.application.submit'], create: ['registration.application.submit'], manage: ['exam.window.manage'] },
  verification: { read: ['registration.application.verify'], manage: ['registration.application.verify'] },
  attendance: { read: ['attendance.mark'], manage: ['attendance.mark'] },
  questions: { read: ['question.secure.download'], read_all: ['question.secure.download'], create: ['question.secure.upload'], manage: ['question.secure.upload'], secure_read: ['question.secure.download'] },
  scores: { read: ['score.view', 'score.view_own'], read_all: ['score.view'], read_own: ['score.view_own'], submit: ['score.submit'], manage: ['score.rule.manage'] },
  appeals: { read: ['appeal.view', 'appeal.review', 'appeal.approve', 'appeal.submit'], read_all: ['appeal.view', 'appeal.review', 'appeal.approve'], read_own: ['appeal.submit'], process: ['appeal.review'], approve: ['appeal.approve'], submit: ['appeal.submit'], submit_own: ['appeal.submit'] },
  certificates: { read: ['certificate.manage', 'certificate.view_own'], read_all: ['certificate.manage'], read_own: ['certificate.view_own'], manage: ['certificate.issue'] },
  reports: { read: ['report.run'], read_all: ['report.run'], manage: ['report.run'] },
};

export function hasGrantedAccess(user, module, action = 'read') {
  // Released sample papers are public; there is no corresponding grant to select.
  if (module === 'questions' && action === 'sample') return true;
  // Classified content also has a server-enforced Chief of Examination role gate.
  if (module === 'questions' && ![...(user?.roles || []), user?.role].includes('exam_head')) return false;
  const names = MODULE_PERMISSIONS[module]?.[action];
  return Boolean(names && hasGrantedPermission(user, ...names));
}

const OPERATION_PERMISSIONS = {
  declareResults: ['result.declare'],
  committeeSetup: ['committee.manage'],
  examConfiguration: ['appeal.fee.manage', 'certificate.template.manage'],
  permissionManagement: ['admin.role.manage'],
  roleAssignment: ['admin.user.manage'],
  systemAuditLogs: ['audit.view'],
};

export function hasGrantedOperation(user, operation) {
  const names = OPERATION_PERMISSIONS[operation];
  return Boolean(names && hasGrantedPermission(user, ...names));
}
