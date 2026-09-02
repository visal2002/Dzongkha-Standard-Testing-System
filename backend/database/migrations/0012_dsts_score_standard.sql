\if :result
-- Preserve earlier rules for already-published results while making the
-- approved DSTS total-score conversion effective for new score submissions.
WITH effective_time AS (SELECT now() AS value)
UPDATE result.scoring_rules
SET "effectiveTo" = effective_time.value
FROM effective_time
WHERE status = 'APPROVED'
  AND code <> 'DSTS-TOTAL-1-50-V1'
  AND "effectiveFrom" <= effective_time.value
  AND ("effectiveTo" IS NULL OR "effectiveTo" > effective_time.value);

INSERT INTO result.scoring_rules (
  code, name, "minimumScore", "maximumScore", increment, "roundingDecimals", aggregation,
  bands, status, "effectiveFrom", "approvedByUserId", "approvedAt"
)
SELECT
  'DSTS-TOTAL-1-50-V1', 'DSTS Total Score to Standard 1–10', 1, 50, 0.5, 2, 'ARITHMETIC_MEAN',
  '[{"min":1,"max":5.5,"label":"Standard 1","standard":1},{"min":6,"max":12.5,"label":"Standard 2","standard":2},{"min":13,"max":19.5,"label":"Standard 3","standard":3},{"min":20,"max":26.5,"label":"Standard 4","standard":4},{"min":27,"max":33.5,"label":"Standard 5","standard":5},{"min":34,"max":40.5,"label":"Standard 6","standard":6},{"min":41,"max":44.5,"label":"Standard 7","standard":7},{"min":45,"max":47.5,"label":"Standard 8","standard":8},{"min":48,"max":49.5,"label":"Standard 9","standard":9},{"min":50,"max":50,"label":"Standard 10","standard":10}]'::jsonb,
  'APPROVED', now(), '00000000-0000-0000-0000-000000000001', now()
WHERE NOT EXISTS (SELECT 1 FROM result.scoring_rules WHERE code = 'DSTS-TOTAL-1-50-V1');
\endif
