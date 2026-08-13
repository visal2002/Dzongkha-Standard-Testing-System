\if :identity
INSERT INTO identity.permissions(name, description) VALUES
('admin.user.read', 'Read the system user directory'),
('admin.role.read', 'Read roles and the approved access matrix')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions("rolesId", "permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name IN ('admin.user.read', 'admin.role.read')
WHERE r.code IN ('admin', 'dcdd')
ON CONFLICT DO NOTHING;

-- Chief Executive is absent from the approved matrix. Remove the legacy
-- module grants until its access is formally defined.
DELETE FROM identity.role_permissions rp
USING identity.roles r, identity.permissions p
WHERE rp."rolesId" = r.id
  AND rp."permissionsId" = p.id
  AND r.code = 'chief_executive'
  AND p.name IN ('appeal.approve', 'report.run');
\endif
