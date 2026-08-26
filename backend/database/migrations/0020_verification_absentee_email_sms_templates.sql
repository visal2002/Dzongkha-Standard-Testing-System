-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- Migration 0004 seeded only IN_APP notification templates for every event type, so
-- the notification event consumer (which only creates a delivery row per template
-- that actually exists for that eventType) has never had an EMAIL or SMS template to
-- match against - no EMAIL/SMS notification_deliveries row has ever been created for
-- any event, regardless of the dispatch worker built to advance them. This adds the
-- two BRD-required cases: verification (§5.2.2 item 3 - registration number, exam
-- time, venue) and absentee marking (§5.3.2 BR-4/BR-5).
\if :notification
INSERT INTO notification.notification_templates("eventType",channel,"versionNumber","titleTemplate","bodyTemplate",status,"effectiveFrom") VALUES
('ApplicationVerified','EMAIL',1,'Your DSTS examination registration is verified',
 'Dear applicant, your DSTS examination registration has been verified. Registration Number: {{registrationNumber}}. Examination Date: {{examDate}}. Venue: {{venue}}. Please keep this registration number for your records.',
 'APPROVED','2025-01-01T00:00:00Z'),
('ApplicationVerified','SMS',1,'DSTS registration verified',
 'DSTS: Registration verified. Reg No: {{registrationNumber}}. Exam Date: {{examDate}}. Venue: {{venue}}.',
 'APPROVED','2025-01-01T00:00:00Z'),
('CandidateMarkedAbsent','EMAIL',1,'DSTS examination attendance recorded',
 'Dear applicant, you have been marked absent for your DSTS examination on {{examDate}} at {{venue}}. Absent skills carry no band score for this sitting. Contact DCDD if you believe this is an error.',
 'APPROVED','2025-01-01T00:00:00Z'),
('CandidateMarkedAbsent','SMS',1,'DSTS attendance recorded',
 'DSTS: You were marked absent for the exam on {{examDate}} at {{venue}}. Contact DCDD if this is an error.',
 'APPROVED','2025-01-01T00:00:00Z')
ON CONFLICT ("eventType",channel,"versionNumber") DO NOTHING;

-- The seeded IN_APP body for ApplicationVerified predates registration numbers being
-- available at send time and never carried the placeholder; bring it in line with the
-- new EMAIL/SMS bodies above so the in-app notification is equally useful.
UPDATE notification.notification_templates
SET "bodyTemplate" = 'Your examination registration has been verified. Registration Number: {{registrationNumber}}. Examination Date: {{examDate}}. Venue: {{venue}}.'
WHERE "eventType" = 'ApplicationVerified' AND channel = 'IN_APP' AND "versionNumber" = 1;
\endif
