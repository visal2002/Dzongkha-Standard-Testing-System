\if :result
INSERT INTO result.scoring_rules (
  code, name, "minimumScore", "maximumScore", increment, "roundingDecimals", aggregation,
  bands, status, "effectiveFrom", "approvedByUserId", "approvedAt"
)
SELECT
  'DSTS-BAND-1-9-V1', 'DSTS Band Scale 1–9', 1, 9, 0.5, 2, 'ARITHMETIC_MEAN',
  '[{"min":1,"max":3.49,"label":"Foundation","cefr":"A1"},{"min":3.5,"max":4.99,"label":"Basic","cefr":"A2"},{"min":5,"max":6.49,"label":"Independent","cefr":"B1"},{"min":6.5,"max":7.49,"label":"Proficient","cefr":"B2"},{"min":7.5,"max":8.49,"label":"Advanced","cefr":"C1"},{"min":8.5,"max":9,"label":"Expert","cefr":"C2"}]'::jsonb,
  'APPROVED', '2020-01-01T00:00:00Z', '00000000-0000-0000-0000-000000000001', now()
WHERE NOT EXISTS (SELECT 1 FROM result.scoring_rules WHERE status = 'APPROVED');
\endif

\if :appeal_certificate
INSERT INTO appeal_certificate.fee_rules (
  code, "amountPerSkill", currency, status, "effectiveFrom", "approvedByUserId", "approvedAt"
)
SELECT 'DSTS-REEVALUATION-V1', 500, 'BTN', 'APPROVED', '2020-01-01T00:00:00Z', '00000000-0000-0000-0000-000000000001', now()
WHERE NOT EXISTS (SELECT 1 FROM appeal_certificate.fee_rules WHERE status = 'APPROVED');

INSERT INTO appeal_certificate.certificate_templates (
  code, "versionNumber", title, "declarationText", "signatoryName", "signatoryTitle", "paperSize", orientation,
  "validityMonths", "testOnly", status, "effectiveFrom", "createdByUserId", "approvedByUserId", "approvedAt"
)
SELECT
  'DSTS-STANDARD', 1, 'Dzongkha Standard Testing System Certificate',
  'This is to certify that the holder has completed the Dzongkha Standard Test with the results shown below.',
  'Director General', 'Department of Culture and Dzongkha Development', 'A4', 'LANDSCAPE',
  36, true, 'APPROVED', '2020-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now()
WHERE NOT EXISTS (SELECT 1 FROM appeal_certificate.certificate_templates WHERE status = 'APPROVED');
\endif
