-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :appeal_certificate
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "chiefExecutiveName" varchar(180);
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "chiefExecutiveTitle" varchar(180);

UPDATE appeal_certificate.certificate_templates SET "chiefExecutiveName" = 'Chief Executive' WHERE "chiefExecutiveName" IS NULL;
UPDATE appeal_certificate.certificate_templates SET "chiefExecutiveTitle" = 'Chief Executive, DSTS' WHERE "chiefExecutiveTitle" IS NULL;

ALTER TABLE appeal_certificate.certificate_templates ALTER COLUMN "chiefExecutiveName" SET NOT NULL;
ALTER TABLE appeal_certificate.certificate_templates ALTER COLUMN "chiefExecutiveTitle" SET NOT NULL;

UPDATE appeal_certificate.certificate_templates SET "signatoryTitle" = 'Chief of Examination'
WHERE code = 'DSTS-STANDARD' AND "signatoryTitle" = 'Department of Culture and Dzongkha Development';

ALTER TABLE appeal_certificate.certificates ADD COLUMN IF NOT EXISTS "cid" varchar(64);
ALTER TABLE appeal_certificate.certificates ADD COLUMN IF NOT EXISTS "dateOfBirth" timestamptz;
ALTER TABLE appeal_certificate.certificates ADD COLUMN IF NOT EXISTS "examDate" timestamptz;
\endif
