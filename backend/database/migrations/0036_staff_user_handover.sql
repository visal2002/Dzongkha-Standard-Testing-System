\if :identity
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "handoverPending" boolean NOT NULL DEFAULT false;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS "requiresRoleTransfer" boolean NOT NULL DEFAULT false;
UPDATE identity.users u SET "requiresRoleTransfer"=true WHERE EXISTS (SELECT 1 FROM identity.user_roles ur JOIN identity.roles r ON r.id=ur."rolesId" WHERE ur."usersId"=u.id AND r.code<>'test_taker');
CREATE TABLE IF NOT EXISTS identity.user_handovers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "sourceUserId" uuid NOT NULL UNIQUE,
 "targetUserId" uuid NOT NULL, "actorUserId" uuid NOT NULL, "roleCodes" jsonb NOT NULL,
 "createdTarget" boolean NOT NULL DEFAULT false, "targetEmail" text NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'PENDING', "lastError" text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "completedAt" timestamptz
);
\endif
\if :result
CREATE TABLE IF NOT EXISTS result.staff_transfer_receipts (id uuid PRIMARY KEY, "sourceUserId" uuid NOT NULL, "targetUserId" uuid NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now());
\endif
\if :assessment
CREATE TABLE IF NOT EXISTS assessment.staff_transfer_receipts (id uuid PRIMARY KEY, "sourceUserId" uuid NOT NULL, "targetUserId" uuid NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now());
\endif
\if :reporting
CREATE TABLE IF NOT EXISTS reporting.staff_transfer_receipts (id uuid PRIMARY KEY, "sourceUserId" uuid NOT NULL, "targetUserId" uuid NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now());
\endif
