-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- System-assigned 4-digit login handle. Test Takers register with their 11-digit CID
-- and sign in with this shorter id (or their email). Nullable so rows created before
-- this migration stay valid; backfilled below with a random unused 4-digit value.
\if :identity
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "userId" varchar(4);

UPDATE identity.users u
SET "userId" = sub.candidate
FROM (
  SELECT id, lpad(((row_number() OVER (ORDER BY "createdAt")) + 1000)::text, 4, '0') AS candidate
  FROM identity.users
  WHERE "userId" IS NULL
) sub
WHERE u.id = sub.id AND u."userId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_userId" ON identity.users ("userId");
\endif
