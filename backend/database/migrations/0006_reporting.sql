-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :reporting
CREATE TABLE IF NOT EXISTS reporting.resource_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "resourceType" varchar(40) NOT NULL, "resourceId" varchar(80) NOT NULL,
  "examId" uuid, "ownerUserId" uuid, status varchar(60) NOT NULL, dimensions jsonb NOT NULL DEFAULT '{}',
  "sourceEventId" varchar(64) NOT NULL, "occurredAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reporting_resource UNIQUE("resourceType","resourceId")
);
CREATE INDEX IF NOT EXISTS idx_reporting_resource_type_status ON reporting.resource_projections("resourceType",status);
CREATE INDEX IF NOT EXISTS idx_reporting_resource_exam ON reporting.resource_projections("examId","resourceType");
CREATE INDEX IF NOT EXISTS idx_reporting_resource_owner ON reporting.resource_projections("ownerUserId","resourceType");

CREATE TABLE IF NOT EXISTS reporting.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventId" varchar(64) NOT NULL UNIQUE, action varchar(80) NOT NULL,
  source varchar(80) NOT NULL, "resourceId" varchar(80) NOT NULL, "actorUserId" uuid, "correlationId" varchar(64) NOT NULL,
  "safeData" jsonb NOT NULL DEFAULT '{}', "occurredAt" timestamptz NOT NULL, "projectedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reporting_audit_action_time ON reporting.audit_events(action,"occurredAt" DESC);
CREATE INDEX IF NOT EXISTS idx_reporting_audit_actor_time ON reporting.audit_events("actorUserId","occurredAt" DESC);
CREATE INDEX IF NOT EXISTS idx_reporting_audit_correlation ON reporting.audit_events("correlationId");

CREATE TABLE IF NOT EXISTS reporting.processed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "eventId" varchar(64) NOT NULL UNIQUE,
  "eventType" varchar(80) NOT NULL, "processedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reporting.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ownerUserId" uuid NOT NULL, name varchar(120) NOT NULL,
  dataset varchar(30) NOT NULL, definition jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_reports_owner ON reporting.saved_reports("ownerUserId","updatedAt" DESC);

CREATE TABLE IF NOT EXISTS reporting.report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ownerUserId" uuid NOT NULL, format varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'QUEUED', definition jsonb NOT NULL, "fileName" varchar(180), "mimeType" varchar(100),
  artifact bytea, "rowCount" integer, "failureCode" varchar(80), "startedAt" timestamptz, "completedAt" timestamptz,
  "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (format IN ('CSV','XLSX','PDF')), CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','EXPIRED'))
);
CREATE INDEX IF NOT EXISTS idx_report_jobs_queue ON reporting.report_jobs(status,"createdAt");
CREATE INDEX IF NOT EXISTS idx_report_jobs_owner ON reporting.report_jobs("ownerUserId","createdAt" DESC);

CREATE TABLE IF NOT EXISTS reporting.dashboard_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "roleCode" varchar(64) NOT NULL UNIQUE, "metricKeys" jsonb NOT NULL,
  "updatedByUserId" uuid NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now()
);

REVOKE UPDATE, DELETE ON reporting.audit_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON reporting.processed_events FROM PUBLIC;
\endif

\if :identity
INSERT INTO identity.permissions(name) VALUES ('dashboard.configure') ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name IN ('report.run','dashboard.configure') WHERE r.code='dcdd' ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions("rolesId","permissionsId")
SELECT r.id,p.id FROM identity.roles r JOIN identity.permissions p ON p.name='report.run' WHERE r.code IN ('exam_head','committee_head','committee_member') ON CONFLICT DO NOTHING;
\endif
