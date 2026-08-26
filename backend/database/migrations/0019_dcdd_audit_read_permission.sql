-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- DCDD's Reports & Analytics screen includes a "System Audit Logs" predefined report
-- (BRD §6), reading the same reporting-service audit projection the System
-- Administrator's dedicated /admin/audit-logs screen already uses. This grants the
-- backend permission the read-only report query needs; it does not add DCDD to the
-- 'systemAuditLogs' out-of-matrix operation, so the dedicated audit-log screen itself
-- stays System-Administrator-only under the v2 six-item sidebar decision.
\if :identity
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='audit.view' WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
\endif
