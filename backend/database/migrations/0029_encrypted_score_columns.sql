-- Encrypted score payloads are AES-GCM strings, not JSON documents.
-- USING preserves any legacy plaintext JSON score rows as JSON text; the
-- application transformer remains able to read and migrate them on update.
\if :result
ALTER TABLE result.score_sheets ALTER COLUMN "draftScores" TYPE text USING "draftScores"::text;
ALTER TABLE result.score_versions ALTER COLUMN scores TYPE text USING scores::text;
\endif
