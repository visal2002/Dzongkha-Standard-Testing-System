-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :assessment
DO $$ BEGIN CREATE TYPE assessment.skill AS ENUM ('WRITING','READING','LISTENING','SPEAKING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE assessment.question_paper_status AS ENUM ('DRAFT','READY','SAMPLE_PUBLISHED','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE assessment.document_type AS ENUM ('QUESTION_PAPER','ANSWER_SHEET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE assessment.exam_content_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL, "userId" uuid NOT NULL,
  active boolean NOT NULL DEFAULT true, "assignedByUserId" uuid NOT NULL, "assignedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exam_content_assignment UNIQUE ("examId", "userId")
);
CREATE INDEX idx_exam_content_assignment_user ON assessment.exam_content_assignments("userId", active);

CREATE TABLE assessment.question_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "examId" uuid NOT NULL,
  title varchar(200) NOT NULL,
  skill assessment.skill NOT NULL,
  status assessment.question_paper_status NOT NULL DEFAULT 'DRAFT',
  "accessAllowedFrom" timestamptz NOT NULL,
  "accessAllowedUntil" timestamptz NOT NULL,
  "uploadedByUserId" uuid NOT NULL,
  "retiredAt" timestamptz,
  version integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("accessAllowedFrom" < "accessAllowedUntil")
);
CREATE INDEX idx_question_papers_exam ON assessment.question_papers("examId");
CREATE UNIQUE INDEX uq_active_question_paper_exam_skill ON assessment.question_papers("examId", skill) WHERE status <> 'RETIRED';

CREATE TABLE assessment.question_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "questionPaperId" uuid NOT NULL REFERENCES assessment.question_papers(id) ON DELETE RESTRICT,
  "documentType" assessment.document_type NOT NULL,
  "objectKey" varchar(512) NOT NULL UNIQUE,
  "originalName" varchar(255) NOT NULL,
  "mimeType" varchar(100) NOT NULL,
  "sizeBytes" bigint NOT NULL CHECK ("sizeBytes" > 0),
  sha256 varchar(64) NOT NULL,
  classification varchar(24) NOT NULL CHECK (classification = 'EXAM_CLASSIFIED'),
  "scanStatus" varchar(20) NOT NULL CHECK ("scanStatus" IN ('CLEAN','UNAVAILABLE')),
  cipher varchar(32) NOT NULL CHECK (cipher = 'AES-256-GCM'),
  "dataIv" text NOT NULL,
  "dataAuthTag" text NOT NULL,
  "wrappedKey" text NOT NULL,
  "wrapIv" text NOT NULL,
  "wrapAuthTag" text NOT NULL,
  "keyVersion" varchar(40) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_document_type UNIQUE ("questionPaperId", "documentType")
);

CREATE TABLE assessment.result_declaration_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "examId" uuid NOT NULL UNIQUE,
  "declarationId" uuid NOT NULL,
  "declaredAt" timestamptz NOT NULL,
  "eventId" varchar(64) NOT NULL UNIQUE,
  "projectedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assessment.sample_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "questionPaperId" uuid NOT NULL UNIQUE REFERENCES assessment.question_papers(id) ON DELETE RESTRICT,
  "sourceResultDeclarationId" uuid NOT NULL,
  "approvedByUserId" uuid NOT NULL,
  "publishedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assessment.access_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "questionPaperId" uuid NOT NULL,
  "documentId" uuid,
  "actorUserId" uuid NOT NULL,
  action varchar(40) NOT NULL,
  "requestId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}',
  "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessment_access_audit ON assessment.access_audit_events("questionPaperId", "occurredAt" DESC);
CREATE TABLE assessment.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventType" varchar(80) NOT NULL, "aggregateId" uuid NOT NULL,
  payload jsonb NOT NULL, "correlationId" varchar(64) NOT NULL, "publishedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessment_outbox_unpublished ON assessment.outbox_events("createdAt") WHERE "publishedAt" IS NULL;
\endif

\if :result
DO $$ BEGIN CREATE TYPE result.committee_role AS ENUM ('HEAD','MEMBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE result.eligibility_status AS ENUM ('ELIGIBLE','ABSENT','INELIGIBLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE result.scoring_rule_status AS ENUM ('DRAFT','APPROVED','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE result.score_sheet_status AS ENUM ('DRAFT','SUBMITTED','PUBLISHED','REVISED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE result.committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
  "createdByUserId" uuid NOT NULL, version integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE result.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "committeeId" uuid NOT NULL REFERENCES result.committees(id) ON DELETE RESTRICT,
  "userId" uuid NOT NULL, role result.committee_role NOT NULL,
  "assignedAt" timestamptz NOT NULL DEFAULT now(), "removedAt" timestamptz,
  CONSTRAINT uq_committee_active_member UNIQUE ("committeeId", "userId")
);
CREATE UNIQUE INDEX uq_one_committee_head ON result.committee_members("committeeId") WHERE role='HEAD' AND "removedAt" IS NULL;

CREATE TABLE result.candidate_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL, "applicationId" uuid NOT NULL,
  "testTakerUserId" uuid NOT NULL, status result.eligibility_status NOT NULL,
  "sourceEventId" varchar(64) NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_candidate_exam_application UNIQUE ("examId", "applicationId")
);
CREATE INDEX idx_candidate_eligibility_exam ON result.candidate_eligibility("examId", status);
CREATE INDEX idx_candidate_eligibility_user ON result.candidate_eligibility("testTakerUserId");

CREATE TABLE result.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL UNIQUE, name varchar(160) NOT NULL,
  "minimumScore" numeric(8,3) NOT NULL, "maximumScore" numeric(8,3) NOT NULL, increment numeric(8,3) NOT NULL,
  "roundingDecimals" smallint NOT NULL CHECK ("roundingDecimals" BETWEEN 0 AND 3),
  aggregation varchar(40) NOT NULL DEFAULT 'ARITHMETIC_MEAN' CHECK (aggregation='ARITHMETIC_MEAN'),
  bands jsonb NOT NULL, status result.scoring_rule_status NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" timestamptz NOT NULL, "effectiveTo" timestamptz,
  "approvedByUserId" uuid, "approvedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("minimumScore" < "maximumScore" AND increment > 0),
  CHECK ("effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE result.scoring_rules ADD CONSTRAINT ex_approved_scoring_rule_period
  EXCLUDE USING gist (tstzrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'::timestamptz), '[)') WITH &&)
  WHERE (status = 'APPROVED');

CREATE TABLE result.score_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL, "applicationId" uuid NOT NULL,
  "committeeId" uuid NOT NULL REFERENCES result.committees(id) ON DELETE RESTRICT,
  "enteredByUserId" uuid NOT NULL, "draftScores" jsonb NOT NULL,
  status result.score_sheet_status NOT NULL DEFAULT 'DRAFT', "currentVersion" integer NOT NULL DEFAULT 0,
  "submittedAt" timestamptz, "publishedAt" timestamptz, "rowVersion" integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_score_sheet_application_exam UNIQUE ("examId", "applicationId")
);
CREATE INDEX idx_score_sheet_exam_status ON result.score_sheets("examId", status);

CREATE TABLE result.score_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "scoreSheetId" uuid NOT NULL REFERENCES result.score_sheets(id) ON DELETE RESTRICT,
  "versionNumber" integer NOT NULL CHECK ("versionNumber" > 0), scores jsonb NOT NULL,
  "overallScore" numeric(8,3) NOT NULL, "bandLabel" varchar(80) NOT NULL, "cefrLevel" varchar(40),
  "scoringRuleId" uuid NOT NULL REFERENCES result.scoring_rules(id) ON DELETE RESTRICT,
  source varchar(30) NOT NULL CHECK (source IN ('ORIGINAL','APPEAL_REVISION')), "appealId" uuid,
  "createdByUserId" uuid NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_score_version UNIQUE ("scoreSheetId", "versionNumber")
);

CREATE TABLE result.result_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "examId" uuid NOT NULL UNIQUE,
  "scoringRuleId" uuid NOT NULL REFERENCES result.scoring_rules(id) ON DELETE RESTRICT,
  "declaredByUserId" uuid NOT NULL, "declaredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE result.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action varchar(80) NOT NULL, "resourceType" varchar(60) NOT NULL,
  "resourceId" uuid NOT NULL, "actorUserId" uuid NOT NULL, "requestId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}', "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_result_audit_resource ON result.audit_events("resourceType", "resourceId", "occurredAt" DESC);
CREATE TABLE result.processed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventId" varchar(64) NOT NULL UNIQUE,
  "eventType" varchar(80) NOT NULL, "processedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE result.idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope varchar(120) NOT NULL, key varchar(128) NOT NULL,
  response jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_result_idempotency UNIQUE(scope,key)
);
CREATE TABLE result.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventType" varchar(80) NOT NULL, "aggregateId" uuid NOT NULL,
  payload jsonb NOT NULL, "correlationId" varchar(64) NOT NULL, "publishedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_result_outbox_unpublished ON result.outbox_events("createdAt") WHERE "publishedAt" IS NULL;
\endif

\if :identity
INSERT INTO identity.permissions(name) VALUES
('question.secure.publish'),('question.assignment.manage'),('committee.manage'),('score.rule.manage'),('result.declare'),('score.view_own')
ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('question.secure.upload','question.secure.download','question.secure.publish') WHERE r.code='exam_head' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('committee.manage','score.rule.manage','result.declare','score.view') WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='question.assignment.manage' WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='score.view_own' WHERE r.code='test_taker' ON CONFLICT DO NOTHING;
\endif

\if :assessment
REVOKE UPDATE, DELETE ON assessment.access_audit_events FROM PUBLIC;
\endif
\if :result
REVOKE UPDATE, DELETE ON result.audit_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON result.score_versions FROM PUBLIC;
REVOKE UPDATE, DELETE ON result.processed_events FROM PUBLIC;
\endif
