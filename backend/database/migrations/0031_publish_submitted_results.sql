-- Score submission is the release point for the Test Taker dashboard.
-- Existing submitted rows are released so they are not stranded by the previous
-- declaration-only workflow. Certificate records are backfilled by the deployed
-- certificate service after this migration runs.
\if :result
UPDATE result.score_sheets
SET status = 'PUBLISHED',
    "publishedAt" = COALESCE("publishedAt", "submittedAt", CURRENT_TIMESTAMP)
WHERE status = 'SUBMITTED';
\endif
