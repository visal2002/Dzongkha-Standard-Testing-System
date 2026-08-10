/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AccessClaims } from '@dzongjuk/contracts';
import { DomainException } from '@dzongjuk/common';
import { CreateScoringRuleDto } from './dtos';
import { BandRange, ResultAuditEntity, ScoreValues, ScoringRuleEntity, ScoringRuleStatus } from './entities';

@Injectable()
export class ScoringService {
  private readonly privilegedAssurance: Set<string>;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ScoringRuleEntity) private readonly rules: Repository<ScoringRuleEntity>,
    config: ConfigService,
  ) {
    this.privilegedAssurance = new Set(config.get<string>('PRIVILEGED_ASSURANCE_LEVELS', 'MFA').split(',').map((value) => value.trim()));
  }

  listRules() { return this.rules.find({ order: { createdAt: 'DESC' } }); }

  async createRule(dto: CreateScoringRuleDto, actor: AccessClaims, requestId: string) {
    this.validateRule(dto);
    if (await this.rules.existsBy({ code: dto.code })) throw new DomainException('SCORING_RULE_DUPLICATE', 'Scoring rule code already exists.', 409);
    return this.dataSource.transaction(async (manager) => {
      const rule = await manager.save(ScoringRuleEntity, manager.create(ScoringRuleEntity, {
        code: dto.code, name: dto.name, minimumScore: String(dto.minimumScore), maximumScore: String(dto.maximumScore),
        increment: String(dto.increment), roundingDecimals: dto.roundingDecimals, aggregation: 'ARITHMETIC_MEAN',
        bands: dto.bands, effectiveFrom: new Date(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        status: ScoringRuleStatus.Draft,
      }));
      await manager.save(ResultAuditEntity, manager.create(ResultAuditEntity, { action: 'SCORING_RULE_CREATED', resourceType: 'ScoringRule', resourceId: rule.id, actorUserId: actor.sub, requestId, safeData: { code: rule.code } }));
      return rule;
    });
  }

  async approveRule(id: string, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    const rule = await this.rules.findOneBy({ id });
    if (!rule) throw new DomainException('SCORING_RULE_NOT_FOUND', 'Scoring rule not found.', 404);
    if (rule.status !== ScoringRuleStatus.Draft) throw new DomainException('SCORING_RULE_STATE_INVALID', 'Only a draft scoring rule may be approved.', 409);
    const overlapping = await this.rules.createQueryBuilder('rule')
      .where('rule.status = :status', { status: ScoringRuleStatus.Approved })
      .andWhere("rule.effectiveFrom < COALESCE(CAST(:effectiveTo AS timestamptz), 'infinity'::timestamptz)", {
        effectiveTo: rule.effectiveTo?.toISOString() ?? null,
      })
      .andWhere("COALESCE(rule.effectiveTo, 'infinity'::timestamptz) > CAST(:effectiveFrom AS timestamptz)", {
        effectiveFrom: rule.effectiveFrom.toISOString(),
      })
      .getOne();
    if (overlapping) throw new DomainException('SCORING_RULE_OVERLAP', 'An approved scoring rule already covers this effective period.', 409);
    rule.status = ScoringRuleStatus.Approved;
    rule.approvedAt = new Date();
    rule.approvedByUserId = actor.sub;
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(ScoringRuleEntity, rule);
      await manager.save(ResultAuditEntity, manager.create(ResultAuditEntity, { action: 'SCORING_RULE_APPROVED', resourceType: 'ScoringRule', resourceId: rule.id, actorUserId: actor.sub, requestId, safeData: { code: rule.code } }));
      return saved;
    });
  }

  async activeRule(manager?: EntityManager, at = new Date()) {
    const repository = manager ? manager.getRepository(ScoringRuleEntity) : this.rules;
    const rule = await repository.findOne({
      where: [
        { status: ScoringRuleStatus.Approved, effectiveFrom: LessThanOrEqual(at), effectiveTo: IsNull() },
        { status: ScoringRuleStatus.Approved, effectiveFrom: LessThanOrEqual(at), effectiveTo: MoreThan(at) },
      ],
      order: { effectiveFrom: 'DESC' },
    });
    if (!rule) throw new DomainException('SCORING_RULE_NOT_APPROVED', 'Score submission is blocked until an effective scoring rule is formally approved.', 409);
    return rule;
  }

  calculate(scores: ScoreValues, rule: ScoringRuleEntity) {
    const values: number[] = [scores.WRITING, scores.READING, scores.LISTENING, scores.SPEAKING];
    const minimum = Number(rule.minimumScore);
    const maximum = Number(rule.maximumScore);
    const increment = Number(rule.increment);
    for (const value of values) {
      if (!Number.isFinite(value) || value < minimum || value > maximum) {
        throw new DomainException('SCORE_OUT_OF_RANGE', `Every skill score must be between ${minimum} and ${maximum}.`);
      }
      const steps = (value - minimum) / increment;
      if (Math.abs(steps - Math.round(steps)) > 1e-7) throw new DomainException('SCORE_INCREMENT_INVALID', `Scores must use increments of ${increment}.`);
    }
    const raw = values.reduce((sum, value) => sum + value, 0) / values.length;
    const overall = Number(raw.toFixed(rule.roundingDecimals));
    const band = rule.bands.find((range) => overall >= range.min && overall <= range.max);
    if (!band) throw new DomainException('SCORING_BAND_UNMAPPED', 'The calculated score is not covered by the approved band mapping.', 409);
    return { overall, bandLabel: band.label, cefrLevel: band.cefr ?? null };
  }

  assertPrivileged(actor: AccessClaims) {
    if (!this.privilegedAssurance.has(actor.assurance)) {
      throw new DomainException('PRIVILEGED_ASSURANCE_REQUIRED', 'This action requires an approved privileged authentication assurance level.', 403);
    }
  }

  private validateRule(dto: CreateScoringRuleDto) {
    if (dto.minimumScore >= dto.maximumScore || dto.increment <= 0) throw new DomainException('SCORING_RULE_INVALID', 'Score bounds or increment are invalid.');
    if (dto.effectiveTo && new Date(dto.effectiveTo) <= new Date(dto.effectiveFrom)) throw new DomainException('SCORING_RULE_PERIOD_INVALID', 'Effective end must be after effective start.');
    const bands = [...dto.bands].sort((a, b) => a.min - b.min);
    for (let index = 0; index < bands.length; index += 1) {
      const band: BandRange = bands[index];
      if (band.min > band.max || band.min < dto.minimumScore || band.max > dto.maximumScore) throw new DomainException('SCORING_BAND_INVALID', `Band ${band.label} is outside the score range.`);
      if (index > 0 && band.min <= bands[index - 1].max) throw new DomainException('SCORING_BAND_OVERLAP', 'Scoring bands must not overlap.');
    }
  }
}
