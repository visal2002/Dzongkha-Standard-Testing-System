-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- Profile completion for non-NDI Test Takers. Existing accounts are treated as
-- complete; newly registered accounts explicitly set the two onboarding flags.
\if :identity
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "emailSet" boolean NOT NULL DEFAULT true;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "passwordSet" boolean NOT NULL DEFAULT true;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "dateOfBirth" date;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS gender varchar(16);
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "contactNumber" varchar(32);
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS education varchar(64);
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS photo text;
\endif
