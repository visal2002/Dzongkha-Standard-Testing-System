-- System Admin controlled appeal-fee waiver for new re-evaluation requests.
\if :appeal_certificate
ALTER TYPE appeal_certificate.payment_status ADD VALUE IF NOT EXISTS 'WAIVED';
ALTER TYPE appeal_certificate.reconciliation_status ADD VALUE IF NOT EXISTS 'WAIVED';
ALTER TABLE appeal_certificate.payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE appeal_certificate.payments DROP CONSTRAINT IF EXISTS payments_amount_nonnegative;
ALTER TABLE appeal_certificate.payments ADD CONSTRAINT payments_amount_nonnegative CHECK (amount >= 0);
CREATE TABLE IF NOT EXISTS appeal_certificate.appeal_fee_settings (
  id varchar(32) PRIMARY KEY,
  "waiveFees" boolean NOT NULL DEFAULT false,
  "updatedByUserId" uuid,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 'SYSTEM')
);
INSERT INTO appeal_certificate.appeal_fee_settings(id, "waiveFees")
VALUES ('SYSTEM', false)
ON CONFLICT (id) DO NOTHING;
\endif