-- Committee Members and Committee Heads may both submit a committee review recommendation.
-- The Chief Executive's separate appeal.approve permission remains unchanged.
\if :identity
INSERT INTO identity.role_permissions("rolesId", "permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name = 'appeal.review'
WHERE r.code = 'committee_member'
ON CONFLICT DO NOTHING;
\endif