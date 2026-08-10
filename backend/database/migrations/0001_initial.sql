-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

CREATE EXTENSION IF NOT EXISTS pgcrypto;

\if :identity
CREATE SCHEMA IF NOT EXISTS identity;
\endif
\if :registration
CREATE SCHEMA IF NOT EXISTS registration;
\endif
\if :assessment
CREATE SCHEMA IF NOT EXISTS assessment;
\endif
\if :result
CREATE SCHEMA IF NOT EXISTS result;
\endif
\if :appeal_certificate
CREATE SCHEMA IF NOT EXISTS appeal_certificate;
\endif
\if :notification
CREATE SCHEMA IF NOT EXISTS notification;
\endif
\if :reporting
CREATE SCHEMA IF NOT EXISTS reporting;
\endif
\if :integration
CREATE SCHEMA IF NOT EXISTS integration;
\endif

\if :identity
CREATE TABLE identity.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL UNIQUE,
  description varchar(240) NOT NULL DEFAULT ''
);
CREATE TABLE identity.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  administrative boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  cid varchar(32) UNIQUE,
  "fullName" varchar(160) NOT NULL,
  "passwordHash" varchar,
  status varchar NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED','LOCKED')),
  "failedLoginCount" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamptz,
  "ndiLinkedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity.user_roles (
  "usersId" uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  "rolesId" uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  PRIMARY KEY ("usersId", "rolesId")
);
CREATE TABLE identity.role_permissions (
  "rolesId" uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  "permissionsId" uuid NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY ("rolesId", "permissionsId")
);
CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  "refreshTokenHash" varchar(64) NOT NULL UNIQUE,
  assurance varchar(16) NOT NULL,
  "lastActivityAt" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz,
  "ipHash" varchar(64),
  "userAgent" varchar(512),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier varchar(254) NOT NULL,
  success boolean NOT NULL,
  "ipHash" varchar(64),
  reason varchar(64),
  "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempt_identifier ON identity.login_attempts(identifier);
CREATE TABLE identity.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action varchar(80) NOT NULL,
  "resourceType" varchar(80) NOT NULL,
  "resourceId" varchar(80),
  "actorUserId" uuid,
  "requestId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}',
  "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_identity_audit_resource ON identity.audit_events("resourceId", "occurredAt" DESC);
\endif

\if :registration
DO $$ BEGIN CREATE TYPE registration.exam_status AS ENUM ('DRAFT','PUBLISHED','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','RESULTS_DECLARED','ARCHIVED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE registration.application_status AS ENUM ('DRAFT','SUBMITTED','WAITLISTED','UNDER_REVIEW','RETURNED','VERIFIED','CANCELLED','ABSENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE registration.skill AS ENUM ('WRITING','READING','LISTENING','SPEAKING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE registration.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(40) NOT NULL UNIQUE, title varchar(180) NOT NULL,
  "examDate" timestamptz NOT NULL, "registrationStart" timestamptz NOT NULL, "registrationEnd" timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0), venue varchar(240) NOT NULL,
  "registrationFee" numeric(12,2) NOT NULL DEFAULT 0, status registration.exam_status NOT NULL DEFAULT 'DRAFT',
  version integer NOT NULL DEFAULT 1, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("registrationStart" < "registrationEnd" AND "registrationEnd" < "examDate")
);
CREATE TABLE registration.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL REFERENCES registration.exams(id) ON DELETE RESTRICT,
  "testTakerUserId" uuid NOT NULL, "identityKey" varchar(64) NOT NULL, "profileSnapshot" jsonb NOT NULL,
  status registration.application_status NOT NULL, "registrationNumber" varchar(64) UNIQUE,
  "reviewStartedAt" timestamptz, "submittedAt" timestamptz, "verifiedAt" timestamptz, "cancelledAt" timestamptz,
  "reviewRemarks" text, version integer NOT NULL DEFAULT 1, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_application_exam_identity UNIQUE ("examId", "identityKey")
);
CREATE INDEX idx_application_exam_status ON registration.applications("examId", status);
CREATE INDEX idx_application_owner_time ON registration.applications("testTakerUserId", "submittedAt" DESC);
CREATE TABLE registration.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL, "applicationId" uuid NOT NULL UNIQUE REFERENCES registration.applications(id) ON DELETE CASCADE,
  "positionKey" bigint NOT NULL, status varchar(20) NOT NULL DEFAULT 'WAITING', "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_order ON registration.waitlist_entries("examId", status, "positionKey");
CREATE TABLE registration.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL, "applicationId" uuid NOT NULL UNIQUE REFERENCES registration.applications(id) ON DELETE RESTRICT,
  "absentSkills" registration.skill[] NOT NULL DEFAULT '{}', "overallStatus" varchar(16) NOT NULL CHECK ("overallStatus" IN ('PRESENT','ABSENT')),
  "markedByUserId" uuid NOT NULL, "markedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE registration.application_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "applicationId" uuid NOT NULL REFERENCES registration.applications(id) ON DELETE RESTRICT,
  "fromStatus" registration.application_status, "toStatus" registration.application_status NOT NULL, "actorUserId" uuid NOT NULL,
  remarks text, "requestId" varchar(64) NOT NULL, "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_application_history ON registration.application_history("applicationId", "occurredAt");
CREATE TABLE registration.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventType" varchar(80) NOT NULL, "aggregateId" uuid NOT NULL,
  payload jsonb NOT NULL, "correlationId" varchar(64) NOT NULL, "publishedAt" timestamptz, attempts integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_unpublished ON registration.outbox_events("createdAt") WHERE "publishedAt" IS NULL;
CREATE TABLE registration.idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope varchar(120) NOT NULL, key varchar(128) NOT NULL,
  response jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), UNIQUE(scope, key)
);
\endif

\if :identity
INSERT INTO identity.permissions(name) VALUES
('*'),('admin.user.manage'),('admin.role.manage'),('exam.window.manage'),
('registration.application.submit'),('registration.application.verify'),('attendance.mark'),
('question.secure.upload'),('question.secure.download'),('score.enter'),('score.submit'),('score.view'),
('appeal.submit'),('appeal.review'),('appeal.approve'),('certificate.view_own'),('certificate.manage'),
('report.run'),('audit.view') ON CONFLICT DO NOTHING;
INSERT INTO identity.roles(code,name,administrative) VALUES
('admin','System Administrator',true),('dcdd','DCDD Administrator',true),('exam_head','Chief of Examination / Exam Head',true),
('committee_head','Committee Head',true),('committee_member','Committee Member',true),('chief_executive','Chief Executive / Approval Authority',true),
('test_taker','Test Taker',false) ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r CROSS JOIN identity.permissions p WHERE r.code='admin' AND p.name='*' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('exam.window.manage','registration.application.verify','attendance.mark','report.run') WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('registration.application.submit','appeal.submit','certificate.view_own') WHERE r.code='test_taker' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('question.secure.upload','question.secure.download') WHERE r.code='exam_head' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('score.enter','score.submit','score.view','appeal.review') WHERE r.code='committee_head' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('score.view','appeal.review') WHERE r.code='committee_member' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('appeal.approve','report.run') WHERE r.code='chief_executive' ON CONFLICT DO NOTHING;

REVOKE UPDATE, DELETE ON identity.audit_events FROM PUBLIC;
\endif
\if :registration
REVOKE UPDATE, DELETE ON registration.application_history FROM PUBLIC;
\endif
