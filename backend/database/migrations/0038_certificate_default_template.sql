\if :appeal_certificate
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "isDefault" boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificate_template_default ON appeal_certificate.certificate_templates ("isDefault") WHERE "isDefault" = true;
\endif
