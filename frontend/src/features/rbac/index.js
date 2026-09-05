/**
 * Role-based access control feature.
 *
 * `accessMatrix.js` is the single source of truth for who may do what; the
 * components below render and enforce it. `scripts/export-access-matrix.mjs`
 * serialises the same matrix to docs/rbac/access-matrix.json for the backend.
 */
export {
  ACCESS_MATRIX,
  ACCESS_MODULES,
  MATRIX_ROLES,
  ROLE_LABELS,
  SUPPLEMENTARY_ROLES,
  canAccess,
  getAccessLevel,
  isMatrixManager,
  isOwnScoped,
} from './accessMatrix';

export { OUT_OF_MATRIX_OPERATIONS, canPerform, rolesFor } from './outOfMatrix';

export { RouteGuard } from './RouteGuard';
export { AuthGuard } from './AuthGuard';
export { AccessDeniedPage } from './AccessDeniedPage';
export { RoleAssignmentDrawer } from './RoleAssignmentDrawer';
