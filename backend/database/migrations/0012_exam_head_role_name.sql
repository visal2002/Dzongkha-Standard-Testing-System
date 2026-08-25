\if :identity
-- The BRD is inconsistent about this role's name (§5.4.1 calls it "Exam Head",
-- §5.4.2 BR-1 calls it "DCDD Chief of Examination"). 0001_initial.sql seeded the
-- combined "Chief of Examination / Exam Head", which carried that ambiguity into
-- every screen driven by identity.roles.name (Add User's role picker, User
-- Management, Role Management). The frontend has since standardised on "Exam Head"
-- (see ROLE_LABELS in accessMatrix.js) - this brings the seeded row in line with it.
UPDATE identity.roles SET name = 'Exam Head' WHERE code = 'exam_head';
\endif
