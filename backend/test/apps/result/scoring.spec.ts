/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { DomainException } from '@dzongjuk/common';
import { ScoreValues, ScoringRuleEntity, ScoringRuleStatus } from '../../../apps/result-service/src/entities';
import { ScoringService } from '../../../apps/result-service/src/scoring.service';

describe('Approved scoring calculation', () => {
  const service = new ScoringService({} as DataSource, {} as Repository<ScoringRuleEntity>, new ConfigService({ PRIVILEGED_ASSURANCE_LEVELS: 'MFA' }));
  const rule = {
    id: 'rule-1', minimumScore: '1', maximumScore: '50', increment: '0.5', roundingDecimals: 2,
    aggregation: 'ARITHMETIC_MEAN', status: ScoringRuleStatus.Approved,
    bands: [
      { min: 1, max: 5.5, label: 'Standard 1', standard: 1 },
      { min: 6, max: 12.5, label: 'Standard 2', standard: 2 },
      { min: 13, max: 19.5, label: 'Standard 3', standard: 3 },
      { min: 20, max: 26.5, label: 'Standard 4', standard: 4 },
      { min: 27, max: 33.5, label: 'Standard 5', standard: 5 },
      { min: 34, max: 40.5, label: 'Standard 6', standard: 6 },
      { min: 41, max: 44.5, label: 'Standard 7', standard: 7 },
      { min: 45, max: 47.5, label: 'Standard 8', standard: 8 },
      { min: 48, max: 49.5, label: 'Standard 9', standard: 9 },
      { min: 50, max: 50, label: 'Standard 10', standard: 10 },
    ],
  } as ScoringRuleEntity;

  it('converts each skill total and averages the four DSTS standards', () => {
    const scores: ScoreValues = { WRITING: 50, READING: 48, LISTENING: 45, SPEAKING: 41 };
    expect(service.calculate(scores, rule)).toEqual({ overall: 8.5, bandLabel: 'Standard 8.5', cefrLevel: null });
  });

  it('implements every boundary from the approved conversion table', () => {
    const boundaryExpectations = [
      [1, 1], [5.5, 1], [6, 2], [12.5, 2], [13, 3], [19.5, 3], [20, 4], [26.5, 4],
      [27, 5], [33.5, 5], [34, 6], [40.5, 6], [41, 7], [44.5, 7], [45, 8], [47.5, 8],
      [48, 9], [49.5, 9], [50, 10],
    ];
    for (const [total, standard] of boundaryExpectations) {
      const scores: ScoreValues = { WRITING: total, READING: total, LISTENING: total, SPEAKING: total };
      expect(service.calculate(scores, rule).overall).toBe(standard);
    }
  });

  it('rejects scores outside the approved increment', () => {
    const scores: ScoreValues = { WRITING: 6.2, READING: 20, LISTENING: 30.5, SPEAKING: 40 };
    expect(() => service.calculate(scores, rule)).toThrow(DomainException);
  });

  it('requires privileged assurance for formula approval and declaration', () => {
    expect(() => service.assertPrivileged({ sub: 'u', sessionId: 's', roles: [], permissions: [], assurance: 'NDI' })).toThrow(DomainException);
  });
});
