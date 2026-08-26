-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- docs/rbac/RBAC-INTEGRATION-CONTRACT.md §5.4: Committee Member still holds
-- `appeal.review` server-side, so a member can call POST /appeals/:id/committee-review
-- directly even though the approved matrix gives the role View only on Re-evaluation.
-- The frontend already hides every decision control for this role, but hiding a
-- button is not enforcement - the permission has to be revoked.
--
-- `appeal.review` cannot simply be deleted, though. AppealService.listAll / getOne /
-- getHistory gate every organisation-wide read on the same permission
-- (assertElevated() in appeal.service.ts), because until now nothing distinguished
-- "may read every appeal" from "may run the committee review step". Revoking
-- `appeal.review` alone would 403 the Committee Member out of GET /appeals entirely,
-- breaking the `appeals:read_all` read access §3 of the contract requires. This
-- introduces `appeal.view` for that read-only grant and moves committee_member onto
-- it in the same migration, so the role is never left without both permissions at
-- once. appeal.service.ts's assertElevated() now accepts appeal.view alongside
-- appeal.review/appeal.approve for the read paths.
\if :identity
INSERT INTO identity.permissions(name, description) VALUES
('appeal.view', 'Read every re-evaluation request without committee-review or Chief-of-Examiner approval authority')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions("rolesId", "permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name = 'appeal.view'
WHERE r.code = 'committee_member'
ON CONFLICT DO NOTHING;

DELETE FROM identity.role_permissions rp
USING identity.roles r, identity.permissions p
WHERE rp."rolesId" = r.id
  AND rp."permissionsId" = p.id
  AND r.code = 'committee_member'
  AND p.name = 'appeal.review';
\endif
