CREATE TABLE identity.ndi_login_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" varchar(80) NOT NULL UNIQUE,
  "pollTokenHash" varchar(64) NOT NULL UNIQUE,
  status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED','FAILED','CANCELLED','CONSUMED')),
  "proofRequestUrl" text NOT NULL,
  "deepLinkUrl" text,
  "verifiedIdentity" jsonb NOT NULL DEFAULT '{}',
  "userId" uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  "expiresAt" timestamptz NOT NULL,
  "completedAt" timestamptz,
  "consumedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ndi_login_expiry ON identity.ndi_login_requests(status, "expiresAt");
