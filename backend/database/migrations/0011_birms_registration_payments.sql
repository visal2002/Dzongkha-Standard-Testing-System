\if :registration
DO $$ BEGIN ALTER TYPE registration.registration_payment_status ADD VALUE IF NOT EXISTS 'CANCELLED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE registration.registration_payment_status ADD VALUE IF NOT EXISTS 'REVERSED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE registration.applications
  ADD COLUMN IF NOT EXISTS "paymentAdviceNo" varchar(100),
  ADD COLUMN IF NOT EXISTS "paymentRedirectUrl" text,
  ADD COLUMN IF NOT EXISTS "paymentReceiptNo" varchar(100),
  ADD COLUMN IF NOT EXISTS "paymentProviderDetails" jsonb,
  ADD COLUMN IF NOT EXISTS "paymentUpdatedAt" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_payment_advice
  ON registration.applications("paymentAdviceNo")
  WHERE "paymentAdviceNo" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registration_payment_receipt
  ON registration.applications("paymentReceiptNo")
  WHERE "paymentReceiptNo" IS NOT NULL;
\endif
