\if :identity
-- Committee setup is authorized for DCDD and Chief of Examination.
-- Add only this permission; preserve all existing role associations.
WITH added AS (
  INSERT INTO identity.role_permissions("rolesId", "permissionsId")
  SELECT r.id, p.id FROM identity.roles r
  JOIN identity.permissions p ON p.name = 'committee.manage'
  WHERE r.code IN ('dcdd', 'exam_head')
  ON CONFLICT DO NOTHING
  RETURNING "rolesId"
)
INSERT INTO identity.audit_events(action, "resourceType", "resourceId", "requestId", "safeData")
SELECT 'ROLE_PERMISSION_GRANTED', 'Role', "rolesId"::text,
  'migration-0042-chief-committee-setup',
  '{"permission":"committee.manage","source":"0042_chief_committee_setup"}'::jsonb
FROM added;
\endif
