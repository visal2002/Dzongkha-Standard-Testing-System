\if :appeal_certificate
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "examinationSignatureImageData" bytea;
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "examinationSignatureImageMimeType" varchar(80);
\endif
