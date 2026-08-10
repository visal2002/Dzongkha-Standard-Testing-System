-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :appeal_certificate
DO $$ BEGIN CREATE TYPE appeal_certificate.certificate_template_status AS ENUM ('DRAFT','APPROVED','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.certificate_paper_size AS ENUM ('A4','LETTER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.certificate_orientation AS ENUM ('LANDSCAPE','PORTRAIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.certificate_status AS ENUM ('ACTIVE','EXPIRED','REVOKED','SUPERSEDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.certificate_access_type AS ENUM ('VIEW','DOWNLOAD','VERIFY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS appeal_certificate.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL, "versionNumber" integer NOT NULL CHECK ("versionNumber" > 0),
  title varchar(180) NOT NULL, "declarationText" text NOT NULL, "signatoryName" varchar(180) NOT NULL, "signatoryTitle" varchar(180) NOT NULL,
  "paperSize" appeal_certificate.certificate_paper_size NOT NULL, orientation appeal_certificate.certificate_orientation NOT NULL,
  "validityMonths" smallint NOT NULL CHECK ("validityMonths" BETWEEN 1 AND 240), "testOnly" boolean NOT NULL DEFAULT false,
  status appeal_certificate.certificate_template_status NOT NULL DEFAULT 'DRAFT', "effectiveFrom" timestamptz NOT NULL, "effectiveTo" timestamptz,
  "createdByUserId" uuid NOT NULL, "approvedByUserId" uuid, "approvedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_certificate_template_version UNIQUE(code,"versionNumber"), CHECK ("effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);

CREATE TABLE IF NOT EXISTS appeal_certificate.certificate_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "objectKey" varchar(320) NOT NULL UNIQUE, sha256 varchar(64) NOT NULL,
  "byteSize" bigint NOT NULL CHECK ("byteSize" > 0), "dataIv" text NOT NULL, "dataAuthTag" text NOT NULL,
  "wrappedKey" text NOT NULL, "wrapIv" text NOT NULL, "wrapAuthTag" text NOT NULL, "keyVersion" varchar(24) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appeal_certificate.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "certificateNumber" varchar(64) NOT NULL UNIQUE,
  "examId" uuid NOT NULL, "applicationId" uuid NOT NULL, "testTakerUserId" uuid NOT NULL,
  "scoreSheetId" uuid NOT NULL, "scoreVersionNumber" integer NOT NULL CHECK ("scoreVersionNumber" > 0), "versionNumber" integer NOT NULL CHECK ("versionNumber" > 0),
  "templateId" uuid NOT NULL REFERENCES appeal_certificate.certificate_templates(id) ON DELETE RESTRICT, "templateVersionNumber" integer NOT NULL,
  "holderName" varchar(180) NOT NULL, "registrationNumber" varchar(64) NOT NULL, "scoreSnapshot" jsonb NOT NULL,
  "bandLabel" varchar(80) NOT NULL, "cefrLevel" varchar(40), "verificationTokenHash" varchar(64) NOT NULL,
  "fileId" uuid NOT NULL REFERENCES appeal_certificate.certificate_files(id) ON DELETE RESTRICT,
  status appeal_certificate.certificate_status NOT NULL, "issuedAt" timestamptz NOT NULL, "validUntil" timestamptz NOT NULL,
  "revokedAt" timestamptz, "revocationReason" text, "revokedByUserId" uuid, "rowVersion" integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_certificate_application_version UNIQUE("applicationId","versionNumber"),
  CONSTRAINT uq_certificate_score_version UNIQUE("scoreSheetId","scoreVersionNumber")
);
CREATE INDEX IF NOT EXISTS idx_certificates_owner ON appeal_certificate.certificates("testTakerUserId","issuedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_exam ON appeal_certificate.certificates("examId");

CREATE TABLE IF NOT EXISTS appeal_certificate.certificate_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "certificateId" uuid NOT NULL REFERENCES appeal_certificate.certificates(id) ON DELETE RESTRICT,
  "accessType" appeal_certificate.certificate_access_type NOT NULL, "actorUserId" uuid, "requestId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}', "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_certificate_access ON appeal_certificate.certificate_access_events("certificateId","occurredAt" DESC);
\endif

\if :identity
INSERT INTO identity.permissions(name) VALUES ('certificate.template.manage'),('certificate.issue'),('certificate.revoke') ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('certificate.manage','certificate.template.manage','certificate.issue','certificate.revoke') WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
\endif

\if :appeal_certificate
REVOKE UPDATE, DELETE ON appeal_certificate.certificate_access_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON appeal_certificate.certificate_files FROM PUBLIC;
\endif

\if :notification
DO $$ BEGIN CREATE TYPE notification.notification_channel AS ENUM ('IN_APP','EMAIL','SMS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification.notification_template_status AS ENUM ('DRAFT','APPROVED','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification.notification_delivery_status AS ENUM ('DELIVERED','PENDING_PROVIDER','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notification.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventType" varchar(80) NOT NULL, channel notification.notification_channel NOT NULL,
  "versionNumber" integer NOT NULL CHECK ("versionNumber" > 0), "titleTemplate" varchar(180) NOT NULL, "bodyTemplate" text NOT NULL,
  status notification.notification_template_status NOT NULL, "effectiveFrom" timestamptz NOT NULL, "effectiveTo" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_notification_template_version UNIQUE("eventType",channel,"versionNumber")
);
CREATE TABLE IF NOT EXISTS notification.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "eventType" varchar(80) NOT NULL,
  "templateId" uuid NOT NULL REFERENCES notification.notification_templates(id) ON DELETE RESTRICT,
  title varchar(180) NOT NULL, message text NOT NULL, "safeMetadata" jsonb NOT NULL DEFAULT '{}',
  "readAt" timestamptz, "archivedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification.notifications("userId","createdAt" DESC) WHERE "archivedAt" IS NULL;
CREATE TABLE IF NOT EXISTS notification.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "notificationId" uuid NOT NULL REFERENCES notification.notifications(id) ON DELETE RESTRICT,
  channel notification.notification_channel NOT NULL, status notification.notification_delivery_status NOT NULL,
  attempts integer NOT NULL DEFAULT 0, "providerMessageId" varchar(120), "failureCode" varchar(120), "deliveredAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries ON notification.notification_deliveries("notificationId",channel);
CREATE TABLE IF NOT EXISTS notification.processed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventId" varchar(64) NOT NULL UNIQUE, "eventType" varchar(80) NOT NULL,
  "processedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO notification.notification_templates("eventType",channel,"versionNumber","titleTemplate","bodyTemplate",status,"effectiveFrom") VALUES
('ApplicationSubmitted','IN_APP',1,'Application received','Your examination application has been received.','APPROVED','2025-01-01T00:00:00Z'),
('ApplicationWaitlisted','IN_APP',1,'Application waitlisted','Your application is on the examination waitlist.','APPROVED','2025-01-01T00:00:00Z'),
('ApplicationCancelled','IN_APP',1,'Application cancelled','Your examination application has been cancelled.','APPROVED','2025-01-01T00:00:00Z'),
('WaitlistCandidatePromoted','IN_APP',1,'Waitlist place confirmed','Your application has been promoted from the waitlist.','APPROVED','2025-01-01T00:00:00Z'),
('ApplicationReturned','IN_APP',1,'Application needs correction','Your application has been returned for correction.','APPROVED','2025-01-01T00:00:00Z'),
('ApplicationVerified','IN_APP',1,'Application verified','Your examination registration has been verified.','APPROVED','2025-01-01T00:00:00Z'),
('CandidateMarkedAbsent','IN_APP',1,'Attendance recorded','An absence has been recorded for your examination.','APPROVED','2025-01-01T00:00:00Z'),
('AppealSubmitted','IN_APP',1,'Appeal received','Your appeal has been received and is awaiting payment confirmation.','APPROVED','2025-01-01T00:00:00Z'),
('AppealPaymentCompleted','IN_APP',1,'Appeal payment confirmed','Payment for your appeal has been confirmed.','APPROVED','2025-01-01T00:00:00Z'),
('AppealRevisionRequested','IN_APP',1,'Appeal reviewed','Your appeal recommends a score revision and is awaiting approval.','APPROVED','2025-01-01T00:00:00Z'),
('AppealApproved','IN_APP',1,'Appeal approved','Your appeal was approved and is awaiting controlled score application.','APPROVED','2025-01-01T00:00:00Z'),
('AppealRejected','IN_APP',1,'Appeal decision','Your appeal was not approved.','APPROVED','2025-01-01T00:00:00Z'),
('AppealCompleted','IN_APP',1,'Appeal completed','Your appeal process is complete. Outcome: {{outcome}}.','APPROVED','2025-01-01T00:00:00Z'),
('CertificateIssued','IN_APP',1,'Certificate available','Certificate {{certificateNumber}} is available securely in your account.','APPROVED','2025-01-01T00:00:00Z'),
('CertificateRevoked','IN_APP',1,'Certificate revoked','Certificate {{certificateNumber}} has been revoked. Contact DCDD for assistance.','APPROVED','2025-01-01T00:00:00Z')
ON CONFLICT ("eventType",channel,"versionNumber") DO NOTHING;

REVOKE UPDATE, DELETE ON notification.processed_events FROM PUBLIC;
REVOKE DELETE ON notification.notification_deliveries FROM PUBLIC;
\endif
