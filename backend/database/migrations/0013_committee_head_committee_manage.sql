\if :identity
-- BRD §5.5.2 BR-1 requires the Committee Head to be able to constitute the exam
-- committee (add/remove members, designate the Head). The frontend already treats
-- committee_head as authorised for this - see the 'committeeSetup' entry in
-- outOfMatrix.js, which links /scores/committee from both the dashboard and the
-- sidebar - but 0001_initial.sql only ever granted committee.manage to dcdd
-- (0002_assessment_results.sql). A Committee Head could open Committee Setup and view
-- the roster via score.view, but every Add/Remove/Save call to
-- CommitteeController.create/replace 403'd for lack of committee.manage. This grants
-- the permission the frontend already assumes the role has.
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='committee.manage' WHERE r.code='committee_head' ON CONFLICT DO NOTHING;
\endif
