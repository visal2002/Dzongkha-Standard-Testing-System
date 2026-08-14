\if :registration
DO $$ BEGIN
  CREATE TYPE registration.registration_payment_status AS ENUM ('INITIATED','PAID','FAILED','WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE registration.applications
  ADD COLUMN IF NOT EXISTS "paymentStatus" registration.registration_payment_status NOT NULL DEFAULT 'INITIATED',
  ADD COLUMN IF NOT EXISTS "paymentAmount" numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentCurrency" varchar(3) NOT NULL DEFAULT 'BTN',
  ADD COLUMN IF NOT EXISTS "paymentMethod" varchar(40),
  ADD COLUMN IF NOT EXISTS "paymentReference" varchar(100),
  ADD COLUMN IF NOT EXISTS "paidAt" timestamptz;

UPDATE registration.applications application
SET "paymentAmount" = exam."registrationFee",
    "paymentStatus" = CASE WHEN exam."registrationFee" = 0 THEN 'WAIVED'::registration.registration_payment_status ELSE 'INITIATED'::registration.registration_payment_status END
FROM registration.exams exam
WHERE application."examId" = exam.id
  AND application."paymentAmount" = 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_payment_reference
  ON registration.applications("paymentReference")
  WHERE "paymentReference" IS NOT NULL;
\endif
