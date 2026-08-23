# Frontend RBAC Audit Report

> **Note (2026-08-23):** This report is a point-in-time record. File paths below refer to
> the pre-restructure layout, when the frontend lived in `dzongjuk-frontend/` and RBAC code
> sat under `src/config/` and `src/components/rbac/`. See the README for the current layout.

## Executive Summary

The DSTS frontend has significant RBAC foundations in place, including session-based auth state, guard logic, and admin role-permission screens. However, the implementation is not yet Phase 1 production-ready for a secure deployment.

The key blockers are:

- a lingering legacy localStorage/session mismatch in the auth flow,
- incomplete verification of the remaining frontend tests,
- route and guard behavior that is not yet fully validated under the actual app/test harness.

## Findings

### 1. Auth/session model

The app has moved toward a session-based model using `dsts_session` in [dzongjuk-frontend/src/context/AuthContext.jsx](dzongjuk-frontend/src/context/AuthContext.jsx), which is the correct direction for Phase 1. The app also clears the client session on unauthorized responses in [dzongjuk-frontend/src/services/api.js](dzongjuk-frontend/src/services/api.js).

Status: partially implemented, but not fully hardened against legacy localStorage assumptions.

### 2. Route protection

Protected routes are configured in [dzongjuk-frontend/src/routes/index.jsx](dzongjuk-frontend/src/routes/index.jsx) with required roles and permissions, and there is a dedicated access-denied page at [dzongjuk-frontend/src/components/rbac/AccessDeniedPage.jsx](dzongjuk-frontend/src/components/rbac/AccessDeniedPage.jsx).

Status: implemented in principle, but still needs a clean regression pass to confirm it behaves correctly under real UI tests.

### 3. Admin RBAC UI

The admin area includes dedicated pages and role/permission management scaffolding, including [dzongjuk-frontend/src/pages/admin/UserManagement.jsx](dzongjuk-frontend/src/pages/admin/UserManagement.jsx), [dzongjuk-frontend/src/pages/admin/RoleManagement.jsx](dzongjuk-frontend/src/pages/admin/RoleManagement.jsx), and [dzongjuk-frontend/src/pages/admin/permissions/PermissionManagement.jsx](dzongjuk-frontend/src/pages/admin/permissions/PermissionManagement.jsx).

Status: present and structurally aligned with the RBAC model, but not fully signed off by end-to-end validation.

### 4. Security gap

The app still contains legacy assumptions that can reintroduce insecure patterns if not tightly controlled. The current codebase now prefers sessionStorage, but it was still necessary to add compatibility reads for historical localStorage entries during the audit.

This is acceptable as a migration aid, but it should be removed once all legacy sessions are migrated and the app is locked to the session-only model.

## Verification Status

I ran the frontend tests with:

`cd "D:\Dzongkha-Standard-Testing-System\dzongjuk-frontend"; npm test -- --run`

The most recent fresh evidence showed failing suites in the RBAC area and service-contract area. The output included:

- `src/rbac/rbac.test.jsx` failing in multiple tests
- `src/services/frontend-services.contract.test.js` failing in multiple tests
- multiple failures caused by session/localStorage assumptions and test-harness instability

This means the current implementation is not yet verified as Phase 1 production-ready.

## Conclusion

The frontend RBAC module is partially implemented and directionally correct, but it is not yet complete and production-ready as of this audit.

Recommended next step:

1. finish the remaining compatibility cleanup and eliminate lingering legacy storage assumptions,
2. re-run the RBAC and contract suites until the entire frontend validation set passes,
3. then run the frontend build and lint checks for final production sign-off.

## Updated Files During Audit

- [dzongjuk-frontend/src/context/AuthContext.jsx](dzongjuk-frontend/src/context/AuthContext.jsx)
- [dzongjuk-frontend/src/services/api.js](dzongjuk-frontend/src/services/api.js)
- [dzongjuk-frontend/src/services/auth.js](dzongjuk-frontend/src/services/auth.js)
- [dzongjuk-frontend/src/test/setup.js](dzongjuk-frontend/src/test/setup.js)
- [dzongjuk-frontend/vitest.config.js](dzongjuk-frontend/vitest.config.js)
- [dzongjuk-frontend/src/components/rbac/AuthGuard.jsx](dzongjuk-frontend/src/components/rbac/AuthGuard.jsx)
- [dzongjuk-frontend/src/components/rbac/AccessDeniedPage.jsx](dzongjuk-frontend/src/components/rbac/AccessDeniedPage.jsx)
- [dzongjuk-frontend/src/routes/index.jsx](dzongjuk-frontend/src/routes/index.jsx)
