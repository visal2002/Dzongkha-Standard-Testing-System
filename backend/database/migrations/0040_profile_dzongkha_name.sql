\if :identity
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "fullNameDz" varchar(160);
\endif
