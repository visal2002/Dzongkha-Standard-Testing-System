/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, LessThanOrEqual, MoreThan, Not, Repository } from 'typeorm';
import { AccessClaims, AppealStatus, DomainEventTypes, Skill } from '@dzongjuk/contracts';
import { assertSharedSecret, DomainException } from '@dzongjuk/common';
import { ChiefDecisionDto, CommitteeReviewDto, ConfirmAppealPaymentDto, CreateAppealDto, CreateFeeRuleDto } from './dtos';
import {
  AppealApprovalEntity,
  AppealAuditEntity,
  AppealCommitteeReviewEntity,
  AppealDecision,
  AppealEntity,
  AppealHistoryEntity,
  AppealIdempotencyEntity,
  AppealOutboxEntity,
  AppealRecommendation,
  AppealSkillEntity,
  FeeRuleEntity,
  FeeRuleStatus,
  PaymentEntity,
  PaymentEventEntity,
  PaymentStatus,
  ReconciliationStatus,
} from './entities';
import { ResultClientService } from './result-client.service';
import { CertificateService } from './certificate.service';

@Injectable()
export class AppealService {
  private readonly internalServiceSecret: string;
  private readonly privilegedAssurance: string[];

  constructor(
    private readonly dataSource: DataSource,
    private readonly resultClient: ResultClientService,
    private readonly certificateService: CertificateService,
    config: ConfigService,
    @InjectRepository(AppealEntity) private readonly appeals: Repository<AppealEntity>,
    @InjectRepository(FeeRuleEntity) private readonly fees: Repository<FeeRuleEntity>,
    @InjectRepository(AppealIdempotencyEntity) private readonly idempotency: Repository<AppealIdempotencyEntity>,
  ) {
    this.internalServiceSecret = config.get<string>('INTERNAL_SERVICE_SECRET', '');
    this.privilegedAssurance = config.get<string>('PRIVILEGED_ASSURANCE_LEVELS', 'MFA').split(',').map((value) => value.trim()).filter(Boolean);
  }

  async submit(dto: CreateAppealDto, actor: AccessClaims, authorization: string | undefined, requestId: string, idempotencyKey: string) {
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    const scope = `appeal.submit:${actor.sub}`;
    const replay = await this.idempotency.findOneBy({ scope, key: idempotencyKey });
    if (replay) return replay.response;

    const selectedSkills = [...new Set(dto.skills)];
    if (selectedSkills.length !== dto.skills.length) throw new DomainException('APPEAL_SKILL_DUPLICATE', 'Each appealed skill may only be selected once.');
    const result = await this.resultClient.ownPublishedResult(authorization, dto.applicationId);
    if (result.examId !== dto.examId) throw new DomainException('APPEAL_EXAM_MISMATCH', 'The application does not belong to the supplied examination.', 409);

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const transactionReplay = await manager.findOneBy(AppealIdempotencyEntity, { scope, key: idempotencyKey });
      if (transactionReplay) return transactionReplay.response;
      const existing = await manager.findOneBy(AppealEntity, {
        applicationId: dto.applicationId,
        testTakerUserId: actor.sub,
        status: Not(AppealStatus.Completed),
      });
      if (existing) throw new DomainException('ACTIVE_APPEAL_EXISTS', 'An active appeal already exists for this application.', 409);
      const fee = await this.activeFee(manager);
      const submittedAt = new Date();
      let appeal = await manager.save(AppealEntity, manager.create(AppealEntity, {
        applicationId: dto.applicationId,
        examId: dto.examId,
        scoreSheetId: result.id,
        scoreVersionNumber: result.score!.versionNumber,
        testTakerUserId: actor.sub,
        reason: dto.reason,
        status: AppealStatus.Submitted,
        paymentId: null,
        committeeRecommendation: null,
        chiefDecision: null,
        submittedAt,
        completedAt: null,
      }));
      const skills = selectedSkills.map((skill) => {
        const originalScore = Number(result.score!.scores[skill]);
        if (!Number.isFinite(originalScore)) throw new DomainException('APPEAL_SCORE_SNAPSHOT_INVALID', `Published ${skill} score is unavailable.`, 409);
        return manager.create(AppealSkillEntity, { appealId: appeal.id, skill, originalScore: String(originalScore), proposedScore: null, finalScore: null });
      });
      await manager.save(AppealSkillEntity, skills);
      const amount = (Number(fee.amountPerSkill) * selectedSkills.length).toFixed(2);
      const payment = await manager.save(PaymentEntity, manager.create(PaymentEntity, {
        userId: actor.sub,
        referenceType: 'APPEAL',
        referenceId: appeal.id,
        feeRuleId: fee.id,
        amount,
        currency: fee.currency,
        status: PaymentStatus.Initiated,
        gateway: null,
        externalTransactionId: null,
        initiatedAt: submittedAt,
        paidAt: null,
        failedAt: null,
        reconciliationStatus: ReconciliationStatus.Pending,
      }));
      appeal.paymentId = payment.id;
      appeal = await manager.save(AppealEntity, appeal);
      await this.history(manager, appeal.id, null, AppealStatus.Submitted, actor.sub, 'USER', requestId, 'Appeal submitted; payment pending.');
      await this.audit(manager, 'APPEAL_SUBMITTED', appeal.id, actor.sub, requestId, { examId: appeal.examId, applicationId: appeal.applicationId, skills: selectedSkills, amount, currency: fee.currency });
      await this.outbox(manager, DomainEventTypes.AppealSubmitted, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, applicationId: appeal.applicationId, testTakerUserId: actor.sub, skills: selectedSkills, paymentStatus: payment.status });
      const response = await this.detail(manager, appeal.id);
      await manager.save(AppealIdempotencyEntity, manager.create(AppealIdempotencyEntity, { scope, key: idempotencyKey, response }));
      return response;
    });
  }

  async confirmPayment(appealId: string, dto: ConfirmAppealPaymentDto, internalKey: string | undefined, requestId: string) {
    assertSharedSecret(this.internalServiceSecret, internalKey, {
      code: 'PAYMENT_CONFIRMATION_UNAVAILABLE',
      message: 'Internal payment confirmation is not configured.',
    });
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const appeal = await manager.findOne(AppealEntity, { where: { id: appealId }, lock: { mode: 'pessimistic_write' } });
      if (!appeal || !appeal.paymentId) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
      const payment = await manager.findOne(PaymentEntity, { where: { id: appeal.paymentId }, lock: { mode: 'pessimistic_write' } });
      if (!payment) throw new DomainException('APPEAL_PAYMENT_NOT_FOUND', 'Appeal payment record not found.', 404);
      const reused = await manager.findOneBy(PaymentEntity, { externalTransactionId: dto.externalTransactionId });
      if (reused && reused.id !== payment.id) throw new DomainException('PAYMENT_TRANSACTION_DUPLICATE', 'The provider transaction has already been reconciled.', 409);
      if (payment.status === PaymentStatus.Paid) {
        if (payment.externalTransactionId !== dto.externalTransactionId) throw new DomainException('PAYMENT_ALREADY_CONFIRMED', 'Appeal payment was confirmed using a different transaction.', 409);
        return this.detail(manager, appeal.id);
      }
      if (appeal.status !== AppealStatus.Submitted || payment.status !== PaymentStatus.Initiated) throw new DomainException('PAYMENT_STATE_INVALID', 'This appeal is not awaiting payment.', 409);
      if (Number(payment.amount) !== dto.amount || payment.currency !== dto.currency) throw new DomainException('PAYMENT_AMOUNT_MISMATCH', 'Confirmed payment does not match the required appeal fee.', 409);

      payment.status = PaymentStatus.Paid;
      payment.gateway = dto.gateway;
      payment.externalTransactionId = dto.externalTransactionId;
      payment.paidAt = new Date(dto.paidAt);
      payment.reconciliationStatus = ReconciliationStatus.Matched;
      await manager.save(PaymentEntity, payment);
      await manager.save(PaymentEventEntity, manager.create(PaymentEventEntity, {
        paymentId: payment.id,
        eventType: 'PAYMENT_CONFIRMED',
        externalTransactionId: dto.externalTransactionId,
        safeData: { gateway: dto.gateway, amount: payment.amount, currency: payment.currency },
      }));
      await this.transition(manager, appeal, AppealStatus.PaymentCompleted, null, 'INTEGRATION', requestId, 'Payment confirmed and reconciled.');
      await this.transition(manager, appeal, AppealStatus.PendingCommittee, null, 'SYSTEM', requestId, 'Appeal released to the Examination Committee.');
      await this.audit(manager, 'APPEAL_PAYMENT_CONFIRMED', appeal.id, null, requestId, { paymentId: payment.id, gateway: dto.gateway, amount: payment.amount, currency: payment.currency });
      await this.outbox(manager, DomainEventTypes.AppealPaymentCompleted, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, testTakerUserId: appeal.testTakerUserId, paymentId: payment.id });
      return this.detail(manager, appeal.id);
    });
  }

  async committeeReview(appealId: string, dto: CommitteeReviewDto, actor: AccessClaims, authorization: string | undefined, requestId: string) {
    const existing = await this.appeals.findOneBy({ id: appealId });
    if (!existing) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
    await this.resultClient.assertCommitteeAccess(authorization, existing.examId);
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const appeal = await manager.findOne(AppealEntity, { where: { id: appealId }, lock: { mode: 'pessimistic_write' } });
      if (!appeal) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
      if (appeal.status !== AppealStatus.PendingCommittee) throw new DomainException('APPEAL_REVIEW_STATE_INVALID', 'Appeal is not pending committee review.', 409);
      const skills = await manager.findBy(AppealSkillEntity, { appealId });
      this.validateRecommendation(dto, skills);
      await manager.save(AppealCommitteeReviewEntity, manager.create(AppealCommitteeReviewEntity, {
        appealId,
        reviewedByUserId: actor.sub,
        remarks: dto.remarks,
        recommendation: dto.recommendation,
      }));
      appeal.committeeRecommendation = dto.recommendation;
      if (dto.recommendation === AppealRecommendation.NoChange) {
        await this.transition(manager, appeal, AppealStatus.NoChange, actor.sub, 'USER', requestId, dto.remarks);
        appeal.completedAt = new Date();
        await this.transition(manager, appeal, AppealStatus.Completed, actor.sub, 'USER', requestId, 'Committee completed the appeal with no score change.');
        await this.outbox(manager, DomainEventTypes.AppealCompleted, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, testTakerUserId: appeal.testTakerUserId, outcome: AppealRecommendation.NoChange });
      } else {
        for (const skill of skills) skill.proposedScore = String(dto.proposedScores![skill.skill]);
        await manager.save(AppealSkillEntity, skills);
        await this.transition(manager, appeal, AppealStatus.RevisionRequested, actor.sub, 'USER', requestId, dto.remarks);
        await this.transition(manager, appeal, AppealStatus.PendingChiefApproval, actor.sub, 'SYSTEM', requestId, 'Revision request forwarded for privileged approval.');
        await this.outbox(manager, DomainEventTypes.AppealRevisionRequested, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, scoreSheetId: appeal.scoreSheetId, testTakerUserId: appeal.testTakerUserId, selectedSkills: skills.map((skill) => skill.skill) });
      }
      await this.audit(manager, 'APPEAL_COMMITTEE_REVIEWED', appeal.id, actor.sub, requestId, { recommendation: dto.recommendation, selectedSkills: skills.map((skill) => skill.skill) });
      return this.detail(manager, appeal.id);
    });
  }

  async decide(appealId: string, dto: ChiefDecisionDto, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    const decided = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const appeal = await manager.findOne(AppealEntity, { where: { id: appealId }, lock: { mode: 'pessimistic_write' } });
      if (!appeal) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
      if (appeal.status !== AppealStatus.PendingChiefApproval || appeal.committeeRecommendation !== AppealRecommendation.Revise) {
        throw new DomainException('APPEAL_DECISION_STATE_INVALID', 'Only a committee revision request may receive a Chief decision.', 409);
      }
      const skills = await manager.findBy(AppealSkillEntity, { appealId });
      this.validateSkillDecisions(dto, skills);
      for (const skill of skills) skill.chiefDecision = dto.skillDecisions[skill.skill]!;
      await manager.save(AppealSkillEntity, skills);
      const approvedSkills = skills.filter((skill) => skill.chiefDecision === AppealDecision.Approved).map((skill) => skill.skill);
      const rejectedSkills = skills.filter((skill) => skill.chiefDecision === AppealDecision.Rejected).map((skill) => skill.skill);
      // A request is only fully rejected when every appealed skill is rejected; any
      // approved skill carries the appeal into the score-update stage for that skill
      // while the rejected skills keep their published score.
      const decision = approvedSkills.length > 0 ? AppealDecision.Approved : AppealDecision.Rejected;
      await manager.save(AppealApprovalEntity, manager.create(AppealApprovalEntity, {
        appealId,
        decision,
        decidedByUserId: actor.sub,
        remarks: dto.remarks,
      }));
      appeal.chiefDecision = decision;
      if (decision === AppealDecision.Approved) {
        await this.transition(manager, appeal, AppealStatus.ApprovedPendingScoreUpdate, actor.sub, 'USER', requestId, dto.remarks);
        await this.outbox(manager, DomainEventTypes.AppealApproved, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, scoreSheetId: appeal.scoreSheetId, scoreVersionNumber: appeal.scoreVersionNumber, testTakerUserId: appeal.testTakerUserId, approvedSkills, rejectedSkills });
      } else {
        await this.transition(manager, appeal, AppealStatus.Rejected, actor.sub, 'USER', requestId, dto.remarks);
        appeal.completedAt = new Date();
        await this.transition(manager, appeal, AppealStatus.Completed, actor.sub, 'USER', requestId, 'Chief rejection completed the appeal without a score change.');
        await this.outbox(manager, DomainEventTypes.AppealRejected, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, testTakerUserId: appeal.testTakerUserId, rejectedSkills });
        await this.outbox(manager, DomainEventTypes.AppealCompleted, appeal.id, requestId, { appealId: appeal.id, examId: appeal.examId, testTakerUserId: appeal.testTakerUserId, outcome: AppealDecision.Rejected });
      }
      await this.audit(manager, 'APPEAL_CHIEF_DECIDED', appeal.id, actor.sub, requestId, { skillDecisions: dto.skillDecisions });
      return this.detail(manager, appeal.id);
    });

    // BRD §5.6.1-5.6.2: the actual score field stays locked until the Chief approves;
    // once approved, the committee's already-recorded proposed score becomes final
    // automatically - nobody, Committee Head included, manually re-enters or unlocks
    // it afterward. Applying the revision calls out to result-service and certificate
    // supersession, so it runs after this transaction commits rather than inside it.
    // A failure here does not undo the recorded decision - the appeal simply stays at
    // ApprovedPendingScoreUpdate, and POST :id/apply-revision (also Chief-only) stays
    // available to retry it.
    if (decided.chiefDecision !== AppealDecision.Approved) return decided;
    try {
      return await this.applyApprovedRevision(appealId, actor, requestId, `auto-apply:${requestId}`);
    } catch (error) {
      await this.audit(this.dataSource.manager, 'APPEAL_AUTO_APPLY_FAILED', appealId, actor.sub, requestId, {
        message: error instanceof Error ? error.message : 'Unknown error applying the approved revision.',
      });
      return decided;
    }
  }

  async applyApprovedRevision(appealId: string, actor: AccessClaims, requestId: string, idempotencyKey: string) {
    this.assertPrivileged(actor);
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
    const scope = `appeal.apply-revision:${appealId}`;
    const replay = await this.idempotency.findOneBy({ scope, key: idempotencyKey });
    if (replay) return replay.response;

    const appeal = await this.appeals.findOneBy({ id: appealId });
    if (!appeal) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
    if (appeal.status === AppealStatus.Completed && appeal.chiefDecision === AppealDecision.Approved) {
      return this.detail(this.dataSource.manager, appealId);
    }
    if (appeal.status !== AppealStatus.ApprovedPendingScoreUpdate || appeal.chiefDecision !== AppealDecision.Approved) {
      throw new DomainException('APPEAL_SCORE_UPDATE_STATE_INVALID', 'Only an approved appeal awaiting score update may be applied.', 409);
    }
    const skills = await this.dataSource.manager.findBy(AppealSkillEntity, { appealId });
    const approvedSkills = skills.filter((skill) => skill.chiefDecision === AppealDecision.Approved);
    const changes: Record<string, number> = {};
    for (const skill of approvedSkills) {
      if (skill.proposedScore === null) throw new DomainException('APPEAL_PROPOSED_SCORE_MISSING', `Proposed ${skill.skill} score is unavailable.`, 409);
      changes[this.scoreProperty(skill.skill)] = Number(skill.proposedScore);
    }
    const revision = await this.resultClient.applyAppealRevision(
      appeal.scoreSheetId, appeal.id, appeal.scoreVersionNumber, actor.sub, changes, requestId,
    );
    if (revision.examId !== appeal.examId || revision.applicationId !== appeal.applicationId || revision.testTakerUserId !== appeal.testTakerUserId) {
      throw new DomainException('APPEAL_SCORE_UPDATE_MISMATCH', 'The revised result does not match the approved appeal.', 409);
    }
    const certificateUpdate = await this.certificateService.supersedeForScoreRevision(
      revision.scoreSheetId, revision.version, actor, requestId,
    );

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const transactionReplay = await manager.findOneBy(AppealIdempotencyEntity, { scope, key: idempotencyKey });
      if (transactionReplay) return transactionReplay.response;
      const locked = await manager.findOne(AppealEntity, { where: { id: appealId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
      if (locked.status !== AppealStatus.ApprovedPendingScoreUpdate || locked.chiefDecision !== AppealDecision.Approved) {
        if (locked.status === AppealStatus.Completed && locked.chiefDecision === AppealDecision.Approved) return this.detail(manager, appealId);
        throw new DomainException('APPEAL_SCORE_UPDATE_STATE_INVALID', 'Appeal state changed before score revision completion.', 409);
      }
      const lockedSkills = await manager.findBy(AppealSkillEntity, { appealId });
      // Rejected skills keep their published score - only skills the Chief approved
      // receive the committee's proposed score as their final score.
      for (const skill of lockedSkills) {
        if (skill.chiefDecision === AppealDecision.Approved) skill.finalScore = skill.proposedScore;
      }
      await manager.save(AppealSkillEntity, lockedSkills);
      locked.completedAt = new Date();
      await this.transition(manager, locked, AppealStatus.Completed, actor.sub, 'USER', requestId, `Approved score revision applied as version ${revision.version}.`);
      await this.audit(manager, 'APPEAL_SCORE_REVISION_APPLIED', locked.id, actor.sub, requestId, {
        scoreSheetId: revision.scoreSheetId, previousVersion: locked.scoreVersionNumber, version: revision.version,
        supersededCertificateCount: certificateUpdate.supersededCount,
      });
      await this.outbox(manager, DomainEventTypes.AppealCompleted, locked.id, requestId, {
        appealId: locked.id, examId: locked.examId, applicationId: locked.applicationId,
        testTakerUserId: locked.testTakerUserId, outcome: AppealDecision.Approved,
        scoreSheetId: revision.scoreSheetId, scoreVersionNumber: revision.version,
      });
      const response = {
        ...await this.detail(manager, appealId),
        scoreRevision: revision,
        certificateUpdate: { ...certificateUpdate, replacementIssuanceRequired: certificateUpdate.supersededCount > 0 },
      };
      await manager.save(AppealIdempotencyEntity, manager.create(AppealIdempotencyEntity, { scope, key: idempotencyKey, response }));
      return response;
    });
  }

  async listMine(actor: AccessClaims) {
    const appeals = await this.appeals.find({ where: { testTakerUserId: actor.sub }, order: { submittedAt: 'DESC' } });
    return this.details(appeals);
  }

  async listAll(actor: AccessClaims) {
    this.assertElevated(actor);
    const appeals = await this.appeals.find({ order: { submittedAt: 'DESC' } });
    return this.details(appeals);
  }

  async getOne(id: string, actor: AccessClaims) {
    const appeal = await this.appeals.findOneBy({ id });
    if (!appeal) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
    if (appeal.testTakerUserId !== actor.sub) this.assertElevated(actor);
    return this.detail(this.dataSource.manager, id);
  }

  async getHistory(id: string, actor: AccessClaims) {
    await this.getOne(id, actor);
    return this.dataSource.manager.find(AppealHistoryEntity, { where: { appealId: id }, order: { occurredAt: 'ASC' } });
  }

  listFees() { return this.fees.find({ order: { effectiveFrom: 'DESC' } }); }
  getActiveFee() { return this.activeFee(this.dataSource.manager); }

  async createFee(dto: CreateFeeRuleDto, actor: AccessClaims, requestId: string) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveTo && effectiveFrom >= effectiveTo) throw new DomainException('FEE_PERIOD_INVALID', 'Fee effectiveTo must be after effectiveFrom.');
    return this.dataSource.transaction(async (manager) => {
      const fee = await manager.save(FeeRuleEntity, manager.create(FeeRuleEntity, {
        code: dto.code,
        amountPerSkill: dto.amountPerSkill.toFixed(2),
        currency: dto.currency,
        status: FeeRuleStatus.Draft,
        effectiveFrom,
        effectiveTo,
        approvedByUserId: null,
        approvedAt: null,
      }));
      await this.audit(manager, 'APPEAL_FEE_RULE_CREATED', fee.id, actor.sub, requestId, { code: fee.code, amountPerSkill: fee.amountPerSkill, currency: fee.currency }, 'FeeRule');
      return fee;
    });
  }

  async approveFee(id: string, actor: AccessClaims, requestId: string) {
    this.assertPrivileged(actor);
    try {
      return await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const fee = await manager.findOne(FeeRuleEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!fee) throw new DomainException('FEE_RULE_NOT_FOUND', 'Appeal fee rule not found.', 404);
        if (fee.status !== FeeRuleStatus.Draft) throw new DomainException('FEE_RULE_STATE_INVALID', 'Only draft fee rules may be approved.', 409);
        fee.status = FeeRuleStatus.Approved;
        fee.approvedByUserId = actor.sub;
        fee.approvedAt = new Date();
        const saved = await manager.save(FeeRuleEntity, fee);
        await this.audit(manager, 'APPEAL_FEE_RULE_APPROVED', fee.id, actor.sub, requestId, { code: fee.code, effectiveFrom: fee.effectiveFrom, effectiveTo: fee.effectiveTo }, 'FeeRule');
        return saved;
      });
    } catch (error) {
      if (error instanceof DomainException) throw error;
      throw new DomainException('FEE_RULE_PERIOD_OVERLAP', 'An approved appeal fee already overlaps this effective period.', 409);
    }
  }

  private async activeFee(manager: EntityManager) {
    const now = new Date();
    const fee = await manager.findOne(FeeRuleEntity, {
      where: [
        { status: FeeRuleStatus.Approved, effectiveFrom: LessThanOrEqual(now), effectiveTo: IsNull() },
        { status: FeeRuleStatus.Approved, effectiveFrom: LessThanOrEqual(now), effectiveTo: MoreThan(now) },
      ],
      order: { effectiveFrom: 'DESC' },
    });
    if (!fee) throw new DomainException('APPEAL_FEE_NOT_CONFIGURED', 'No approved appeal fee is currently effective.', 409);
    return fee;
  }

  private scoreProperty(skill: Skill) {
    return skill.toLowerCase();
  }

  private validateRecommendation(dto: CommitteeReviewDto, skills: AppealSkillEntity[]) {
    const proposed = dto.proposedScores ?? {};
    const keys = Object.keys(proposed);
    const selected = new Set(skills.map((skill) => skill.skill));
    if (dto.recommendation === AppealRecommendation.NoChange) {
      if (keys.length) throw new DomainException('APPEAL_PROPOSED_SCORE_NOT_ALLOWED', 'No proposed scores are allowed for a no-change recommendation.');
      return;
    }
    if (keys.length !== selected.size || keys.some((key) => !selected.has(key as Skill))) {
      throw new DomainException('APPEAL_PROPOSED_SKILLS_INVALID', 'Proposed scores must contain exactly the appealed skills.');
    }
    let changed = false;
    for (const skill of skills) {
      const proposedScore = proposed[skill.skill];
      if (typeof proposedScore !== 'number' || !Number.isFinite(proposedScore) || proposedScore < 0) {
        throw new DomainException('APPEAL_PROPOSED_SCORE_INVALID', `Proposed ${skill.skill} score must be a non-negative number.`);
      }
      if (proposedScore !== Number(skill.originalScore)) changed = true;
    }
    if (!changed) throw new DomainException('APPEAL_REVISION_UNCHANGED', 'A revision recommendation must change at least one appealed score.');
  }

  private validateSkillDecisions(dto: ChiefDecisionDto, skills: AppealSkillEntity[]) {
    const decisions = dto.skillDecisions ?? {};
    const keys = Object.keys(decisions);
    const selected = new Set(skills.map((skill) => skill.skill));
    if (keys.length !== selected.size || keys.some((key) => !selected.has(key as Skill))) {
      throw new DomainException('APPEAL_SKILL_DECISIONS_INVALID', 'Skill decisions must cover exactly the appealed skills.');
    }
    for (const key of keys) {
      if (!Object.values(AppealDecision).includes(decisions[key as Skill] as AppealDecision)) {
        throw new DomainException('APPEAL_SKILL_DECISION_INVALID', `Decision for ${key} must be APPROVED or REJECTED.`);
      }
    }
  }

  /**
   * The same shape `detail()` returns, for a whole list.
   *
   * `detail()` costs five queries per appeal; mapping it over a list issued that
   * many round-trips per row, so an organisation-wide queue grew linearly. Each
   * related table is now read once for the whole page and matched in memory.
   */
  private async details(appeals: AppealEntity[]) {
    if (!appeals.length) return [];
    const appealIds = appeals.map((appeal) => appeal.id);
    const paymentIds = appeals.map((appeal) => appeal.paymentId).filter((id): id is string => Boolean(id));
    const manager = this.dataSource.manager;
    const [skills, payments, reviews, approvals] = await Promise.all([
      manager.find(AppealSkillEntity, { where: { appealId: In(appealIds) }, order: { skill: 'ASC' } }),
      paymentIds.length ? manager.find(PaymentEntity, { where: { id: In(paymentIds) } }) : Promise.resolve([]),
      manager.find(AppealCommitteeReviewEntity, { where: { appealId: In(appealIds) } }),
      manager.find(AppealApprovalEntity, { where: { appealId: In(appealIds) } }),
    ]);

    const skillsByAppeal = new Map<string, AppealSkillEntity[]>();
    for (const skill of skills) {
      const bucket = skillsByAppeal.get(skill.appealId);
      if (bucket) bucket.push(skill);
      else skillsByAppeal.set(skill.appealId, [skill]);
    }
    const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
    const reviewByAppeal = new Map(reviews.map((review) => [review.appealId, review]));
    const approvalByAppeal = new Map(approvals.map((approval) => [approval.appealId, approval]));

    return appeals.map((appeal) => ({
      ...appeal,
      skills: skillsByAppeal.get(appeal.id) ?? [],
      payment: appeal.paymentId ? paymentById.get(appeal.paymentId) ?? null : null,
      committeeReview: reviewByAppeal.get(appeal.id) ?? null,
      approval: approvalByAppeal.get(appeal.id) ?? null,
    }));
  }

  private async detail(manager: EntityManager, id: string) {
    const appeal = await manager.findOneBy(AppealEntity, { id });
    if (!appeal) throw new DomainException('APPEAL_NOT_FOUND', 'Appeal not found.', 404);
    const [skills, payment, committeeReview, approval] = await Promise.all([
      manager.find(AppealSkillEntity, { where: { appealId: id }, order: { skill: 'ASC' } }),
      appeal.paymentId ? manager.findOneBy(PaymentEntity, { id: appeal.paymentId }) : null,
      manager.findOneBy(AppealCommitteeReviewEntity, { appealId: id }),
      manager.findOneBy(AppealApprovalEntity, { appealId: id }),
    ]);
    return { ...appeal, skills, payment, committeeReview, approval };
  }

  private async transition(manager: EntityManager, appeal: AppealEntity, toStatus: AppealStatus, actorUserId: string | null, actorType: 'USER' | 'INTEGRATION' | 'SYSTEM', requestId: string, remarks: string) {
    const fromStatus = appeal.status;
    appeal.status = toStatus;
    await manager.save(AppealEntity, appeal);
    await this.history(manager, appeal.id, fromStatus, toStatus, actorUserId, actorType, requestId, remarks);
  }

  private history(manager: EntityManager, appealId: string, fromStatus: AppealStatus | null, toStatus: AppealStatus, actorUserId: string | null, actorType: 'USER' | 'INTEGRATION' | 'SYSTEM', requestId: string, remarks: string) {
    return manager.save(AppealHistoryEntity, manager.create(AppealHistoryEntity, { appealId, fromStatus, toStatus, actorUserId, actorType, requestId, remarks }));
  }

  private audit(manager: EntityManager, action: string, resourceId: string, actorUserId: string | null, requestId: string, safeData: Record<string, unknown>, resourceType = 'Appeal') {
    return manager.save(AppealAuditEntity, manager.create(AppealAuditEntity, { action, resourceType, resourceId, actorUserId, requestId, safeData }));
  }

  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) {
    return manager.save(AppealOutboxEntity, manager.create(AppealOutboxEntity, { eventType, aggregateId, correlationId, payload }));
  }

  private assertElevated(actor: AccessClaims) {
    // `appeal.review` and `appeal.approve` carry write authority (the committee-review
    // and Chief decision steps) as well as this organisation-wide read. `appeal.view`
    // is the read-only counterpart, held by a role - Committee Member - authorised to
    // see every re-evaluation request but neither of those decisions. See
    // docs/rbac/RBAC-INTEGRATION-CONTRACT.md §5.4.
    if (actor.permissions.includes('*') || actor.permissions.includes('appeal.review') || actor.permissions.includes('appeal.approve') || actor.permissions.includes('appeal.view')) return;
    throw new DomainException('APPEAL_ACCESS_DENIED', 'Appeal review, approval, or view permission is required.', 403);
  }

  private assertPrivileged(actor: AccessClaims) {
    if (!this.privilegedAssurance.includes(actor.assurance)) throw new DomainException('PRIVILEGED_ASSURANCE_REQUIRED', 'Privileged appeal approval requires approved MFA or NDI assurance.', 403);
  }

}
