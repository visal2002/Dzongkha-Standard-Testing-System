-- Fix encrypted score columns from jsonb to text
\if :result
ALTER TABLE result.score_sheets ALTER COLUMN "draftScores" TYPE text;
ALTER TABLE result.score_versions ALTER COLUMN scores TYPE text;
\endif
