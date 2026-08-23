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
    id: 'rule-1', minimumScore: '1', maximumScore: '9', increment: '0.5', roundingDecimals: 1,
    aggregation: 'ARITHMETIC_MEAN', status: ScoringRuleStatus.Approved,
    bands: [
      { min: 1, max: 4.9, label: 'LOW' },
      { min: 5, max: 6.9, label: 'MEDIUM', cefr: 'B2' },
      { min: 7, max: 9, label: 'HIGH', cefr: 'C1' },
    ],
  } as ScoringRuleEntity;

  it('calculates the four-skill arithmetic mean and mapped band', () => {
    const scores: ScoreValues = { WRITING: 6, READING: 7, LISTENING: 6.5, SPEAKING: 7.5 };
    expect(service.calculate(scores, rule)).toEqual({ overall: 6.8, bandLabel: 'MEDIUM', cefrLevel: 'B2' });
  });

  it('rejects scores outside the approved increment', () => {
    const scores: ScoreValues = { WRITING: 6.2, READING: 7, LISTENING: 6.5, SPEAKING: 7.5 };
    expect(() => service.calculate(scores, rule)).toThrow(DomainException);
  });

  it('requires privileged assurance for formula approval and declaration', () => {
    expect(() => service.assertPrivileged({ sub: 'u', sessionId: 's', roles: [], permissions: [], assurance: 'NDI' })).toThrow(DomainException);
  });
});
