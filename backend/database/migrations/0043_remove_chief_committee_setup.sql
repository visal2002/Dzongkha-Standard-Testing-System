\if :identity
-- Revoke only Chief of Examination committee setup; preserve committees and other grants.
WITH removed AS (
  DELETE FROM identity.role_permissions rp
  USING identity.roles r, identity.permissions p
  WHERE rp."rolesId" = r.id AND rp."permissionsId" = p.id
    AND r.code = 'exam_head' AND p.name = 'committee.manage'
  RETURNING rp."rolesId"
)
INSERT INTO identity.audit_events(action, "resourceType", "resourceId", "requestId", "safeData")
SELECT 'ROLE_PERMISSION_REVOKED', 'Role', "rolesId"::text,
  'migration-0043-remove-chief-committee',
  '{"permission":"committee.manage","source":"0043_remove_chief_committee_setup"}'::jsonb
FROM removed;
\endif
