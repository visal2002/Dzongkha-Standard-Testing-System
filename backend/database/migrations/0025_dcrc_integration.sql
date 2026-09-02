-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :integration
CREATE TABLE IF NOT EXISTS integration.dcrc_lookup_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cidHash" varchar(64) NOT NULL,
  "applicationId" uuid,
  "requestedByUserId" uuid,
  status varchar(16) NOT NULL CHECK (status IN ('MATCHED','MISMATCH','NOT_FOUND','FAILED')),
  "providerHttpStatus" smallint,
  "matchedFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "mismatchFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "requestId" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dcrc_lookup_cid_time ON integration.dcrc_lookup_audits("cidHash", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_dcrc_lookup_application ON integration.dcrc_lookup_audits("applicationId") WHERE "applicationId" IS NOT NULL;
REVOKE UPDATE, DELETE ON integration.dcrc_lookup_audits FROM PUBLIC;
\endif

\if :registration
ALTER TABLE registration.applications
  ADD COLUMN IF NOT EXISTS "dcrcLookupId" uuid,
  ADD COLUMN IF NOT EXISTS "dcrcVerifiedAt" timestamptz;
CREATE INDEX IF NOT EXISTS idx_registration_dcrc_lookup ON registration.applications("dcrcLookupId") WHERE "dcrcLookupId" IS NOT NULL;
\endif
