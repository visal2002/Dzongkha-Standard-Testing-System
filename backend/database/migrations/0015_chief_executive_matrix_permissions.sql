-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :identity
-- 0001_initial.sql seeded chief_executive with appeal.approve and report.run.
-- 0008_access_matrix.sql deleted both "until its access is formally defined" because
-- the role was absent from the approved matrix at the time. The approved matrix
-- (docs/rbac/access-matrix.json) now defines chief_executive explicitly - read on
-- registration, questions, scores, certificates and reports, plus approve on appeals -
-- but nothing since 0008 ever re-granted anything, leaving the role with zero
-- permissions. Every backend route the role needs, including the Chief's own approve/
-- reject decision on a re-evaluation, has been unreachable as a result. This restores
-- the two 0008 removed and adds the remaining four the matrix calls for.
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name IN (
  'registration.application.verify',
  'question.secure.download',
  'score.view',
  'appeal.approve',
  'certificate.manage',
  'report.run'
)
WHERE r.code = 'chief_executive'
ON CONFLICT DO NOTHING;
\endif
