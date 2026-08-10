-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :appeal_certificate
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$ BEGIN CREATE TYPE appeal_certificate.fee_rule_status AS ENUM ('DRAFT','APPROVED','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.appeal_status AS ENUM ('SUBMITTED','PAYMENT_COMPLETED','PENDING_COMMITTEE','NO_CHANGE','REVISION_REQUESTED','PENDING_CHIEF_APPROVAL','REJECTED','APPROVED_PENDING_SCORE_UPDATE','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.appeal_skill AS ENUM ('WRITING','READING','LISTENING','SPEAKING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.appeal_recommendation AS ENUM ('NO_CHANGE','REVISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.appeal_decision AS ENUM ('APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.payment_status AS ENUM ('INITIATED','PAID','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appeal_certificate.reconciliation_status AS ENUM ('PENDING','MATCHED','EXCEPTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE appeal_certificate.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL UNIQUE,
  "amountPerSkill" numeric(12,2) NOT NULL CHECK ("amountPerSkill" > 0), currency varchar(3) NOT NULL,
  status appeal_certificate.fee_rule_status NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" timestamptz NOT NULL, "effectiveTo" timestamptz,
  "approvedByUserId" uuid, "approvedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (currency ~ '^[A-Z]{3}$'), CHECK ("effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);
ALTER TABLE appeal_certificate.fee_rules ADD CONSTRAINT ex_approved_appeal_fee_period
  EXCLUDE USING gist (tstzrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'::timestamptz), '[)') WITH &&)
  WHERE (status = 'APPROVED');

CREATE TABLE appeal_certificate.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "applicationId" uuid NOT NULL, "examId" uuid NOT NULL,
  "scoreSheetId" uuid NOT NULL, "scoreVersionNumber" integer NOT NULL CHECK ("scoreVersionNumber" > 0),
  "testTakerUserId" uuid NOT NULL, reason text NOT NULL, status appeal_certificate.appeal_status NOT NULL,
  "paymentId" uuid, "committeeRecommendation" appeal_certificate.appeal_recommendation,
  "chiefDecision" appeal_certificate.appeal_decision, "submittedAt" timestamptz NOT NULL,
  "completedAt" timestamptz, version integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appeals_user ON appeal_certificate.appeals("testTakerUserId", "submittedAt" DESC);
CREATE INDEX idx_appeals_exam_status ON appeal_certificate.appeals("examId", status);
CREATE UNIQUE INDEX uq_active_appeal_application ON appeal_certificate.appeals("applicationId") WHERE status <> 'COMPLETED';

CREATE TABLE appeal_certificate.appeal_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "appealId" uuid NOT NULL REFERENCES appeal_certificate.appeals(id) ON DELETE RESTRICT,
  skill appeal_certificate.appeal_skill NOT NULL, "originalScore" numeric(8,3) NOT NULL,
  "proposedScore" numeric(8,3), "finalScore" numeric(8,3),
  CONSTRAINT uq_appeal_skill UNIQUE ("appealId", skill)
);
CREATE INDEX idx_appeal_skills_appeal ON appeal_certificate.appeal_skills("appealId");

CREATE TABLE appeal_certificate.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL,
  "referenceType" varchar(24) NOT NULL DEFAULT 'APPEAL' CHECK ("referenceType" = 'APPEAL'),
  "referenceId" uuid NOT NULL UNIQUE, "feeRuleId" uuid NOT NULL REFERENCES appeal_certificate.fee_rules(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0), currency varchar(3) NOT NULL,
  status appeal_certificate.payment_status NOT NULL, gateway varchar(80), "externalTransactionId" varchar(160) UNIQUE,
  "initiatedAt" timestamptz NOT NULL, "paidAt" timestamptz, "failedAt" timestamptz,
  "reconciliationStatus" appeal_certificate.reconciliation_status NOT NULL,
  CHECK (currency ~ '^[A-Z]{3}$')
);
ALTER TABLE appeal_certificate.appeals ADD CONSTRAINT fk_appeal_payment FOREIGN KEY ("paymentId") REFERENCES appeal_certificate.payments(id) ON DELETE RESTRICT;

CREATE TABLE appeal_certificate.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "paymentId" uuid NOT NULL REFERENCES appeal_certificate.payments(id) ON DELETE RESTRICT,
  "eventType" varchar(40) NOT NULL, "externalTransactionId" varchar(160), "safeData" jsonb NOT NULL DEFAULT '{}',
  "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_events_payment ON appeal_certificate.payment_events("paymentId", "occurredAt");

CREATE TABLE appeal_certificate.committee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "appealId" uuid NOT NULL UNIQUE REFERENCES appeal_certificate.appeals(id) ON DELETE RESTRICT,
  "reviewedByUserId" uuid NOT NULL, remarks text NOT NULL,
  recommendation appeal_certificate.appeal_recommendation NOT NULL, "submittedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE appeal_certificate.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "appealId" uuid NOT NULL UNIQUE REFERENCES appeal_certificate.appeals(id) ON DELETE RESTRICT,
  decision appeal_certificate.appeal_decision NOT NULL, "decidedByUserId" uuid NOT NULL,
  remarks text NOT NULL, "decidedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE appeal_certificate.appeal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "appealId" uuid NOT NULL REFERENCES appeal_certificate.appeals(id) ON DELETE RESTRICT,
  "fromStatus" appeal_certificate.appeal_status, "toStatus" appeal_certificate.appeal_status NOT NULL,
  "actorUserId" uuid, "actorType" varchar(24) NOT NULL CHECK ("actorType" IN ('USER','INTEGRATION','SYSTEM')),
  remarks text, "requestId" varchar(64) NOT NULL, "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appeal_history ON appeal_certificate.appeal_history("appealId", "occurredAt");

CREATE TABLE appeal_certificate.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action varchar(80) NOT NULL, "resourceType" varchar(60) NOT NULL,
  "resourceId" uuid NOT NULL, "actorUserId" uuid, "requestId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}', "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appeal_audit_resource ON appeal_certificate.audit_events("resourceType", "resourceId", "occurredAt" DESC);
CREATE TABLE appeal_certificate.idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope varchar(120) NOT NULL, key varchar(128) NOT NULL,
  response jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_appeal_idempotency UNIQUE(scope,key)
);
CREATE TABLE appeal_certificate.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventType" varchar(80) NOT NULL, "aggregateId" uuid NOT NULL,
  payload jsonb NOT NULL, "correlationId" varchar(64) NOT NULL, "publishedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appeal_outbox_unpublished ON appeal_certificate.outbox_events("createdAt") WHERE "publishedAt" IS NULL;
\endif

\if :identity
INSERT INTO identity.permissions(name) VALUES ('appeal.fee.manage') ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='appeal.fee.manage' WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
\endif

\if :appeal_certificate
REVOKE UPDATE, DELETE ON appeal_certificate.appeal_history FROM PUBLIC;
REVOKE UPDATE, DELETE ON appeal_certificate.audit_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON appeal_certificate.payment_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON appeal_certificate.approvals FROM PUBLIC;
\endif
