-- Secure Question Bank access belongs exclusively to the Exam Head.
-- Publicly released sample papers use separate @Public endpoints and are unaffected.
\if :identity
DELETE FROM identity.role_permissions rp
USING identity.roles r, identity.permissions p
WHERE rp."rolesId" = r.id
  AND rp."permissionsId" = p.id
  AND r.code <> 'exam_head'
  AND p.name LIKE 'question.%';
\endif
