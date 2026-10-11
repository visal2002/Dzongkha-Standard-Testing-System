\if :registration
CREATE TABLE IF NOT EXISTS registration.dsts_number_counters (
  year integer PRIMARY KEY, next_sequence integer NOT NULL DEFAULT 1 CHECK (next_sequence BETWEEN 1 AND 1000)
);
CREATE TABLE IF NOT EXISTS registration.dsts_number_slots (
  year integer NOT NULL, sequence integer NOT NULL CHECK (sequence BETWEEN 1 AND 999),
  number varchar(32) NOT NULL UNIQUE,
  application_id uuid UNIQUE REFERENCES registration.applications(id) ON DELETE RESTRICT,
  released_at timestamptz,
  PRIMARY KEY(year, sequence)
);
CREATE TABLE IF NOT EXISTS registration.dsts_number_history (
  id bigserial PRIMARY KEY, year integer NOT NULL, sequence integer NOT NULL,
  number varchar(32) NOT NULL, application_id uuid NOT NULL REFERENCES registration.applications(id) ON DELETE RESTRICT,
  action varchar(16) NOT NULL CHECK(action IN ('ASSIGNED','RELEASED')),
  actor_id uuid NOT NULL, request_id varchar(64) NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE registration.applications ADD COLUMN IF NOT EXISTS "releasedRegistrationNumber" varchar(64);
\endif
