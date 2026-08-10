-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

\if :result
CREATE UNIQUE INDEX IF NOT EXISTS uq_score_version_appeal
  ON result.score_versions("appealId")
  WHERE "appealId" IS NOT NULL;
\endif

\if :notification
INSERT INTO notification.notification_templates(
  "eventType",channel,"versionNumber","titleTemplate","bodyTemplate",status,"effectiveFrom"
) VALUES (
  'ScoreRevised','IN_APP',1,'Score revision completed',
  'Your approved appeal has been applied to score version {{version}}. Any older certificate is no longer valid.',
  'APPROVED','2025-01-01T00:00:00Z'
)
ON CONFLICT ("eventType",channel,"versionNumber") DO NOTHING;
\endif
