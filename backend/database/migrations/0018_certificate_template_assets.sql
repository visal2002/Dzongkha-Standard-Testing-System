-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :appeal_certificate
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "leftLogoData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "leftLogoMimeType" varchar(80);
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "rightLogoData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "rightLogoMimeType" varchar(80);
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "borderImageData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "borderImageMimeType" varchar(80);
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "signatureImageData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "signatureImageMimeType" varchar(80);
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "sealImageData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "sealImageMimeType" varchar(80);
\endif
