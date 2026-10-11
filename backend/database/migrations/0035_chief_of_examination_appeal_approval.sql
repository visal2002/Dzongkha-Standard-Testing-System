\if :identity
-- Chief of Examination may decide committee-reviewed score revisions.
-- Review and final decision remain separate permissions and workflow stages.
INSERT INTO identity.role_permissions("rolesId", "permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name IN ('appeal.view', 'appeal.approve')
WHERE r.code = 'exam_head'
ON CONFLICT DO NOTHING;
\endif
