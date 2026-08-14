/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { AccessClaims, DomainEventTypes, ScoreSheetStatus } from '@dzongjuk/contracts';
import { assertInternalService, DomainException } from '@dzongjuk/common';
import { AppealScoreChangesDto, ApplyAppealRevisionDto, CreateCommitteeDto, ScoreValuesDto } from './dtos';
import { CandidateEligibilityEntity, CommitteeEntity, CommitteeMemberEntity, CommitteeRole, EligibilityStatus, ResultAuditEntity, ResultDeclarationEntity, ResultIdempotencyEntity, ResultOutboxEntity, ScoreSheetEntity, ScoreValues, ScoreVersionEntity } from './entities';
import { ScoringService } from './scoring.service';

@Injectable()
export class ResultService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly scoring: ScoringService,
    private readonly config: ConfigService,
    @InjectRepository(CommitteeEntity) private readonly committees: Repository<CommitteeEntity>,
    @InjectRepository(CommitteeMemberEntity) private readonly members: Repository<CommitteeMemberEntity>,
    @InjectRepository(CandidateEligibilityEntity) private readonly eligibility: Repository<CandidateEligibilityEntity>,
    @InjectRepository(ScoreSheetEntity) private readonly sheets: Repository<ScoreSheetEntity>,
    @InjectRepository(ScoreVersionEntity) private readonly versions: Repository<ScoreVersionEntity>,
  ) {}

  async setCommittee(examId: string, dto: CreateCommitteeDto, actor: AccessClaims, requestId: string) {
    const uniqueUsers = new Set(dto.members.map((member) => member.userId));
    if (uniqueUsers.size !== dto.members.length) throw new DomainException('COMMITTEE_MEMBER_DUPLICATE', 'A user may only appear once in a committee.');
    if (dto.members.filter((member) => member.role === CommitteeRole.Head).length !== 1) throw new DomainException('COMMITTEE_HEAD_REQUIRED', 'Exactly one active Committee Head is required.');
    return this.dataSource.transaction(async (manager) => {
      let committee = await manager.findOne(CommitteeEntity, { where: { examId }, lock: { mode: 'pessimistic_write' } });
      if (committee && await manager.exists(ScoreSheetEntity, { where: { committeeId: committee.id } })) {
        throw new DomainException('COMMITTEE_LOCKED', 'Committee membership cannot be replaced after score entry begins.', 409);
      }
      if (!committee) committee = await manager.save(CommitteeEntity, manager.create(CommitteeEntity, { examId, createdByUserId: actor.sub, status: 'ACTIVE' }));
      await manager.delete(CommitteeMemberEntity, { committeeId: committee.id });
      const savedMembers = await manager.save(CommitteeMemberEntity, dto.members.map((member) => manager.create(CommitteeMemberEntity, { committeeId: committee.id, userId: member.userId, role: member.role })));
      await this.audit(manager, 'COMMITTEE_CONFIGURED', 'Committee', committee.id, actor.sub, requestId, { examId, memberCount: dto.members.length });
      await this.outbox(manager, DomainEventTypes.CommitteeConfigured, committee.id, requestId, {
        committeeId: committee.id, examId, memberCount: savedMembers.length,
        headUserId: savedMembers.find((member) => member.role === CommitteeRole.Head)!.userId, actorId: actor.sub,
      });
      return { ...committee, members: savedMembers };
    });
  }

  async getCommittee(examId: string, actor: AccessClaims) {
    const committee = await this.committees.findOneBy({ examId });
    if (!committee) throw new DomainException('COMMITTEE_NOT_FOUND', 'Committee not found.', 404);
    if (!actor.permissions.includes('*') && !actor.permissions.includes('committee.manage') && !await this.members.existsBy({ committeeId: committee.id, userId: actor.sub, removedAt: IsNull() })) {
      throw new DomainException('COMMITTEE_ACCESS_REQUIRED', 'Only the assigned committee may view this committee.', 403);
    }
    return { ...committee, members: await this.members.find({ where: { committeeId: committee.id, removedAt: IsNull() } }) };
  }

  async saveDraft(applicationId: string, dto: ScoreValuesDto, actor: AccessClaims, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      const candidate = await manager.findOneBy(CandidateEligibilityEntity, { applicationId });
      if (!candidate) throw new DomainException('ELIGIBILITY_NOT_CONFIRMED', 'Candidate eligibility has not been projected from registration.', 409);
      if (candidate.status !== EligibilityStatus.Eligible) throw new DomainException('CANDIDATE_NOT_SCOREABLE', 'Absent or ineligible candidates cannot receive scores.', 409);
      const committee = await manager.findOneBy(CommitteeEntity, { examId: candidate.examId, status: 'ACTIVE' });
      if (!committee) throw new DomainException('COMMITTEE_NOT_FOUND', 'An active examination committee is required.', 409);
      await this.assertCommitteeHead(manager, committee.id, actor);
      let sheet = await manager.findOne(ScoreSheetEntity, { where: { applicationId }, lock: { mode: 'pessimistic_write' } });
      if (sheet && sheet.status !== ScoreSheetStatus.Draft) throw new DomainException('SCORE_SHEET_LOCKED', 'Submitted scores are immutable outside an approved appeal revision.', 409);
      const scores = this.toScores(dto);
      if (sheet) {
        sheet.draftScores = scores;
        sheet.enteredByUserId = actor.sub;
      } else {
        sheet = manager.create(ScoreSheetEntity, { examId: candidate.examId, applicationId, committeeId: committee.id, enteredByUserId: actor.sub, draftScores: scores, status: ScoreSheetStatus.Draft });
      }
      sheet = await manager.save(ScoreSheetEntity, sheet);
      await this.audit(manager, 'SCORE_DRAFT_SAVED', 'ScoreSheet', sheet.id, actor.sub, requestId, { applicationId });
      return sheet;
    });
  }

  async submit(sheetId: string, actor: AccessClaims, requestId: string, idempotencyKey: string) {
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const scope = `score.submit:${actor.sub}`;
      const replay = await manager.findOneBy(ResultIdempotencyEntity, { scope, key: idempotencyKey });
      if (replay) return replay.response;
      const sheet = await manager.findOne(ScoreSheetEntity, { where: { id: sheetId }, lock: { mode: 'pessimistic_write' } });
      if (!sheet) throw new DomainException('SCORE_SHEET_NOT_FOUND', 'Score sheet not found.', 404);
      if (sheet.status !== ScoreSheetStatus.Draft) throw new DomainException('SCORE_SHEET_LOCKED', 'The score sheet has already been submitted.', 409);
      const candidate = await manager.findOneBy(CandidateEligibilityEntity, { applicationId: sheet.applicationId });
      if (!candidate || candidate.status !== EligibilityStatus.Eligible) throw new DomainException('CANDIDATE_NOT_SCOREABLE', 'Candidate is not eligible for scoring.', 409);
      await this.assertCommitteeHead(manager, sheet.committeeId, actor);
      const rule = await this.scoring.activeRule(manager);
      const calculated = this.scoring.calculate(sheet.draftScores, rule);
      const version = await manager.save(ScoreVersionEntity, manager.create(ScoreVersionEntity, {
        scoreSheetId: sheet.id, versionNumber: 1, scores: sheet.draftScores, overallScore: String(calculated.overall),
        bandLabel: calculated.bandLabel, cefrLevel: calculated.cefrLevel, scoringRuleId: rule.id,
        source: 'ORIGINAL', createdByUserId: actor.sub,
      }));
      sheet.status = ScoreSheetStatus.Submitted;
      sheet.currentVersion = 1;
      sheet.submittedAt = new Date();
      await manager.save(sheet);
      await this.audit(manager, 'SCORE_SUBMITTED', 'ScoreSheet', sheet.id, actor.sub, requestId, { version: 1, scoringRuleId: rule.id });
      await this.outbox(manager, DomainEventTypes.ScoreSubmitted, sheet.id, requestId, {
        scoreSheetId: sheet.id, examId: sheet.examId, applicationId: sheet.applicationId, testTakerUserId: candidate.testTakerUserId,
        version: 1, overallScore: version.overallScore, bandLabel: version.bandLabel, cefrLevel: version.cefrLevel,
        writing: version.scores.WRITING, reading: version.scores.READING, listening: version.scores.LISTENING,
        speaking: version.scores.SPEAKING, actorId: actor.sub,
      });
      const response = { scoreSheetId: sheet.id, status: sheet.status, version: version.versionNumber, overallScore: version.overallScore, bandLabel: version.bandLabel, cefrLevel: version.cefrLevel };
      await manager.save(ResultIdempotencyEntity, manager.create(ResultIdempotencyEntity, { scope, key: idempotencyKey, response }));
      return response;
    });
  }

  async declareResults(examId: string, actor: AccessClaims, requestId: string) {
    this.scoring.assertPrivileged(actor);
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      if (await manager.existsBy(ResultDeclarationEntity, { examId })) throw new DomainException('RESULTS_ALREADY_DECLARED', 'Results have already been declared.', 409);
      const rule = await this.scoring.activeRule(manager);
      const eligibleCount = await manager.countBy(CandidateEligibilityEntity, { examId, status: EligibilityStatus.Eligible });
      if (!eligibleCount) throw new DomainException('NO_ELIGIBLE_CANDIDATES', 'There are no eligible candidates to declare.', 409);
      const submitted = await manager.findBy(ScoreSheetEntity, { examId, status: ScoreSheetStatus.Submitted });
      if (submitted.length !== eligibleCount) throw new DomainException('RESULTS_INCOMPLETE', `Results are incomplete: ${submitted.length} of ${eligibleCount} eligible candidates have submitted scores.`, 409);
      const declaration = await manager.save(ResultDeclarationEntity, manager.create(ResultDeclarationEntity, { examId, scoringRuleId: rule.id, declaredByUserId: actor.sub }));
      const publishedAt = new Date();
      for (const sheet of submitted) { sheet.status = ScoreSheetStatus.Published; sheet.publishedAt = publishedAt; }
      await manager.save(ScoreSheetEntity, submitted);
      await this.audit(manager, 'RESULTS_DECLARED', 'ResultDeclaration', declaration.id, actor.sub, requestId, { examId, candidateCount: eligibleCount, scoringRuleId: rule.id });
      await this.outbox(manager, DomainEventTypes.ResultsDeclared, declaration.id, requestId, {
        declarationId: declaration.id, examId, scoringRuleId: rule.id, candidateCount: eligibleCount,
        declaredAt: declaration.declaredAt, actorId: actor.sub,
      });
      return declaration;
    });
  }

  async getExamScores(examId: string, actor: AccessClaims) {
    if (!actor.permissions.includes('*') && !actor.permissions.includes('committee.manage')) {
      const committee = await this.committees.findOneBy({ examId });
      if (!committee || !await this.members.existsBy({ committeeId: committee.id, userId: actor.sub, removedAt: IsNull() })) throw new DomainException('COMMITTEE_ACCESS_REQUIRED', 'Only the assigned committee may view these scores.', 403);
    }
    const sheets = await this.sheets.find({ where: { examId }, order: { updatedAt: 'DESC' } });
    return Promise.all(sheets.map(async (sheet) => ({ ...sheet, versions: await this.versions.find({ where: { scoreSheetId: sheet.id }, order: { versionNumber: 'DESC' } }) })));
  }

  async getCandidates(examId: string, actor: AccessClaims) {
    if (!actor.permissions.includes('*') && !actor.permissions.includes('committee.manage')) {
      const committee = await this.committees.findOneBy({ examId });
      if (!committee || !await this.members.existsBy({ committeeId: committee.id, userId: actor.sub, removedAt: IsNull() })) {
        throw new DomainException('COMMITTEE_ACCESS_REQUIRED', 'Only the assigned committee may view eligible candidates.', 403);
      }
    }
    const candidates = await this.eligibility.find({ where: { examId }, order: { updatedAt: 'ASC' } });
    const sheets = candidates.length ? await this.sheets.findBy({ applicationId: In(candidates.map(candidate => candidate.applicationId)) }) : [];
    const sheetByApplication = new Map(sheets.map(sheet => [sheet.applicationId, sheet]));
    return candidates.map(candidate => ({ ...candidate, scoreSheet: sheetByApplication.get(candidate.applicationId) ?? null }));
  }

  async myResults(userId: string) {
    const candidates = await this.eligibility.findBy({ testTakerUserId: userId });
    if (!candidates.length) return [];
    const applicationIds = candidates.map((candidate) => candidate.applicationId);
    const sheets = await this.sheets.findBy({ applicationId: In(applicationIds), status: In([ScoreSheetStatus.Published, ScoreSheetStatus.Revised]) });
    return Promise.all(sheets.map(async (sheet) => ({ ...sheet, score: await this.versions.findOneBy({ scoreSheetId: sheet.id, versionNumber: sheet.currentVersion }) })));
  }

  async certificateResults(examId: string, internalKey: string | undefined) {
    assertInternalService(this.config, internalKey);
    const declaration = await this.dataSource.getRepository(ResultDeclarationEntity).findOneBy({ examId });
    if (!declaration) throw new DomainException('RESULTS_NOT_DECLARED', 'Results have not been declared.', 409);
    const sheets = await this.sheets.findBy({ examId, status: In([ScoreSheetStatus.Published, ScoreSheetStatus.Revised]) });
    const candidates = await this.eligibility.findBy({ examId, status: EligibilityStatus.Eligible });
    const candidateByApplication = new Map(candidates.map((candidate) => [candidate.applicationId, candidate]));
    return Promise.all(sheets.map(async (sheet) => {
      const candidate = candidateByApplication.get(sheet.applicationId);
      const score = await this.versions.findOneBy({ scoreSheetId: sheet.id, versionNumber: sheet.currentVersion });
      if (!candidate || !score) throw new DomainException('CERTIFICATE_RESULT_INCOMPLETE', 'Published result data is incomplete.', 409);
      return {
        examId: sheet.examId, applicationId: sheet.applicationId, testTakerUserId: candidate.testTakerUserId,
        scoreSheetId: sheet.id, scoreVersionNumber: score.versionNumber, scores: score.scores,
        overallScore: score.overallScore, bandLabel: score.bandLabel, cefrLevel: score.cefrLevel,
      };
    }));
  }

  async applyAppealRevision(
    scoreSheetId: string,
    dto: ApplyAppealRevisionDto,
    internalKey: string | undefined,
    requestId: string,
    idempotencyKey: string,
  ) {
    assertInternalService(this.config, internalKey);
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    const scope = `score.appeal-revision:${dto.appealId}`;
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const replay = await manager.findOneBy(ResultIdempotencyEntity, { scope, key: idempotencyKey });
      if (replay) return replay.response;
      const existing = await manager.findOneBy(ScoreVersionEntity, { appealId: dto.appealId });
      if (existing) {
        if (existing.scoreSheetId !== scoreSheetId) throw new DomainException('APPEAL_REVISION_CONFLICT', 'The appeal has already revised a different score sheet.', 409);
        const existingSheet = await manager.findOneBy(ScoreSheetEntity, { id: scoreSheetId });
        if (!existingSheet) throw new DomainException('SCORE_SHEET_NOT_FOUND', 'Score sheet not found.', 404);
        const candidate = await manager.findOneBy(CandidateEligibilityEntity, { applicationId: existingSheet.applicationId });
        if (!candidate) throw new DomainException('CANDIDATE_NOT_SCOREABLE', 'Candidate eligibility is unavailable.', 409);
        const response = this.revisionResponse(existingSheet, existing, candidate.testTakerUserId);
        await manager.save(ResultIdempotencyEntity, manager.create(ResultIdempotencyEntity, { scope, key: idempotencyKey, response }));
        return response;
      }

      const sheet = await manager.findOne(ScoreSheetEntity, { where: { id: scoreSheetId }, lock: { mode: 'pessimistic_write' } });
      if (!sheet) throw new DomainException('SCORE_SHEET_NOT_FOUND', 'Score sheet not found.', 404);
      if (![ScoreSheetStatus.Published, ScoreSheetStatus.Revised].includes(sheet.status)) {
        throw new DomainException('SCORE_REVISION_STATE_INVALID', 'Only a published result may receive an approved appeal revision.', 409);
      }
      if (sheet.currentVersion !== dto.expectedVersion) {
        throw new DomainException('SCORE_REVISION_VERSION_CONFLICT', 'The appealed score version is no longer current.', 409);
      }
      const candidate = await manager.findOneBy(CandidateEligibilityEntity, { applicationId: sheet.applicationId });
      if (!candidate || candidate.status !== EligibilityStatus.Eligible) throw new DomainException('CANDIDATE_NOT_SCOREABLE', 'Candidate is not eligible for scoring.', 409);
      const current = await manager.findOneBy(ScoreVersionEntity, { scoreSheetId, versionNumber: sheet.currentVersion });
      if (!current) throw new DomainException('SCORE_VERSION_NOT_FOUND', 'The current score version is unavailable.', 409);
      const changes = this.toScoreChanges(dto.changes);
      if (!Object.keys(changes).length) throw new DomainException('SCORE_REVISION_EMPTY', 'At least one skill score must be revised.');
      const revisedScores: ScoreValues = { ...current.scores, ...changes };
      if ((Object.keys(changes) as Array<keyof ScoreValues>).every((skill) => revisedScores[skill] === current.scores[skill])) {
        throw new DomainException('SCORE_REVISION_UNCHANGED', 'An appeal revision must change at least one skill score.');
      }
      const rule = await this.scoring.ruleForRevision(manager, current.scoringRuleId);
      const calculated = this.scoring.calculate(revisedScores, rule);
      const version = await manager.save(ScoreVersionEntity, manager.create(ScoreVersionEntity, {
        scoreSheetId: sheet.id, versionNumber: sheet.currentVersion + 1, scores: revisedScores,
        overallScore: String(calculated.overall), bandLabel: calculated.bandLabel, cefrLevel: calculated.cefrLevel,
        scoringRuleId: rule.id, source: 'APPEAL_REVISION', appealId: dto.appealId, createdByUserId: dto.approvedByUserId,
      }));
      sheet.currentVersion = version.versionNumber;
      sheet.draftScores = revisedScores;
      sheet.status = ScoreSheetStatus.Revised;
      await manager.save(sheet);
      await this.audit(manager, 'SCORE_REVISED', 'ScoreSheet', sheet.id, dto.approvedByUserId, requestId, {
        appealId: dto.appealId, previousVersion: current.versionNumber, version: version.versionNumber, scoringRuleId: rule.id,
        revisedSkills: Object.keys(changes),
      });
      await this.outbox(manager, DomainEventTypes.ScoreRevised, sheet.id, requestId, {
        appealId: dto.appealId, scoreSheetId: sheet.id, examId: sheet.examId, applicationId: sheet.applicationId,
        testTakerUserId: candidate.testTakerUserId, previousVersion: current.versionNumber, version: version.versionNumber,
        overallScore: version.overallScore, bandLabel: version.bandLabel, cefrLevel: version.cefrLevel,
        writing: version.scores.WRITING, reading: version.scores.READING, listening: version.scores.LISTENING,
        speaking: version.scores.SPEAKING, approvedByUserId: dto.approvedByUserId,
      });
      const response = this.revisionResponse(sheet, version, candidate.testTakerUserId);
      await manager.save(ResultIdempotencyEntity, manager.create(ResultIdempotencyEntity, { scope, key: idempotencyKey, response }));
      return response;
    });
  }

  private async assertCommitteeHead(manager: EntityManager, committeeId: string, actor: AccessClaims) {
    if (actor.permissions.includes('*')) return;
    if (!await manager.existsBy(CommitteeMemberEntity, { committeeId, userId: actor.sub, role: CommitteeRole.Head, removedAt: IsNull() })) {
      throw new DomainException('COMMITTEE_HEAD_REQUIRED', 'Only the designated Committee Head may enter or submit scores.', 403);
    }
  }

  private toScores(dto: ScoreValuesDto): ScoreValues { return { WRITING: dto.writing, READING: dto.reading, LISTENING: dto.listening, SPEAKING: dto.speaking }; }
  private toScoreChanges(dto: AppealScoreChangesDto): Partial<ScoreValues> {
    const changes: Partial<ScoreValues> = {};
    if (dto.writing !== undefined) changes.WRITING = dto.writing;
    if (dto.reading !== undefined) changes.READING = dto.reading;
    if (dto.listening !== undefined) changes.LISTENING = dto.listening;
    if (dto.speaking !== undefined) changes.SPEAKING = dto.speaking;
    return changes;
  }
  private revisionResponse(sheet: ScoreSheetEntity, version: ScoreVersionEntity, testTakerUserId: string) {
    return {
      scoreSheetId: sheet.id, examId: sheet.examId, applicationId: sheet.applicationId, testTakerUserId,
      status: sheet.status, version: version.versionNumber, scores: version.scores, overallScore: version.overallScore,
      bandLabel: version.bandLabel, cefrLevel: version.cefrLevel, scoringRuleId: version.scoringRuleId,
      appealId: version.appealId,
    };
  }
  private audit(manager: EntityManager, action: string, resourceType: string, resourceId: string, actorUserId: string, requestId: string, safeData: Record<string, unknown>) { return manager.save(ResultAuditEntity, manager.create(ResultAuditEntity, { action, resourceType, resourceId, actorUserId, requestId, safeData })); }
  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) { return manager.save(ResultOutboxEntity, manager.create(ResultOutboxEntity, { eventType, aggregateId, correlationId, payload })); }
}
