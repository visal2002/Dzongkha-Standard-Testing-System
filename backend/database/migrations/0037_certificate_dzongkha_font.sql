\if :appeal_certificate
ALTER TABLE appeal_certificate.certificate_templates ADD COLUMN IF NOT EXISTS "dzongkhaFont" varchar(30) NOT NULL DEFAULT 'DDC Uchen';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='certificate_template_dzongkha_font_check') THEN
  ALTER TABLE appeal_certificate.certificate_templates ADD CONSTRAINT certificate_template_dzongkha_font_check CHECK ("dzongkhaFont" IN ('DDC Uchen','DDC Joyig'));
 END IF;
END $$;
\endif
