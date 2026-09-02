-- BIRMS provider data for the DCDD re-evaluation/appeal service.
\if :appeal_certificate
ALTER TABLE appeal_certificate.payments
  ADD COLUMN IF NOT EXISTS "providerReference" varchar(100),
  ADD COLUMN IF NOT EXISTS "paymentAdviceNo" varchar(100),
  ADD COLUMN IF NOT EXISTS "paymentRedirectUrl" text,
  ADD COLUMN IF NOT EXISTS "paymentReceiptNo" varchar(100),
  ADD COLUMN IF NOT EXISTS "providerDetails" jsonb,
  ADD COLUMN IF NOT EXISTS "providerUpdatedAt" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appeal_payment_provider_reference
  ON appeal_certificate.payments("providerReference")
  WHERE "providerReference" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appeal_payment_advice
  ON appeal_certificate.payments("paymentAdviceNo")
  WHERE "paymentAdviceNo" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appeal_payment_receipt
  ON appeal_certificate.payments("paymentReceiptNo")
  WHERE "paymentReceiptNo" IS NOT NULL;
\endif
