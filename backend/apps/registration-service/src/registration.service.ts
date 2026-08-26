/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ApplicationStatus, DomainEventTypes, ExamStatus } from '@dzongjuk/contracts';
import { assertInternalService, DomainException } from '@dzongjuk/common';
import { CreateExamDto, MarkAttendanceDto, RecordRegistrationPaymentDto, ReturnApplicationDto, SubmitApplicationDto, UpdateExamDto } from './dtos';
import { ApplicationEntity, ApplicationHistoryEntity, AttendanceEntity, ExamEntity, IdempotencyRecordEntity, OutboxEventEntity, RegistrationPaymentStatus, WaitlistEntryEntity } from './entities';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(ExamEntity) private readonly exams: Repository<ExamEntity>,
    @InjectRepository(ApplicationEntity) private readonly applications: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationHistoryEntity) private readonly history: Repository<ApplicationHistoryEntity>,
  ) {}

  async listExams() {
    const exams = await this.exams.find({ order: { examDate: 'ASC' } });
    return Promise.all(exams.map(async exam => ({
      ...exam,
      currentRegistrations: await this.applications.count({
        where: { examId: exam.id, status: In([ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned, ApplicationStatus.Verified, ApplicationStatus.Absent]) },
      }),
      waitlistCount: await this.applications.count({ where: { examId: exam.id, status: ApplicationStatus.Waitlisted } }),
    })));
  }

  async getExam(id: string) {
    const exam = await this.exams.findOneBy({ id });
    if (!exam) throw new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404);
    return exam;
  }

  async createExam(dto: CreateExamDto, actorId: string, requestId: string) {
    if (new Date(dto.registrationEnd) <= new Date(dto.registrationStart)) throw new DomainException('EXAM_WINDOW_INVALID', 'Registration end must be after registration start.');
    if (new Date(dto.examDate) <= new Date(dto.registrationEnd)) throw new DomainException('EXAM_DATE_INVALID', 'Examination date must be after registration closes.');
    return this.dataSource.transaction(async (manager) => {
      const exam = await manager.save(ExamEntity, manager.create(ExamEntity, {
        ...dto, examDate: new Date(dto.examDate), registrationStart: new Date(dto.registrationStart),
        registrationEnd: new Date(dto.registrationEnd), status: ExamStatus.Draft,
      }));
      await this.outbox(manager, DomainEventTypes.ExamCreated, exam.id, requestId, {
        examId: exam.id, code: exam.code, title: exam.title, examDate: exam.examDate, registrationStart: exam.registrationStart,
        registrationEnd: exam.registrationEnd, capacity: exam.capacity, venue: exam.venue, status: exam.status, actorId,
      });
      return exam;
    });
  }

  async setExamStatus(id: string, status: ExamStatus, actorId: string, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      const exam = await manager.findOne(ExamEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!exam) throw new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404);
      const allowed: Partial<Record<ExamStatus, ExamStatus[]>> = {
        [ExamStatus.Draft]: [ExamStatus.Published, ExamStatus.Cancelled],
        [ExamStatus.Published]: [ExamStatus.RegistrationOpen, ExamStatus.Cancelled],
        [ExamStatus.RegistrationOpen]: [ExamStatus.RegistrationClosed, ExamStatus.Cancelled],
        [ExamStatus.RegistrationClosed]: [ExamStatus.InProgress, ExamStatus.Cancelled],
        [ExamStatus.InProgress]: [ExamStatus.ResultsDeclared],
        [ExamStatus.ResultsDeclared]: [ExamStatus.Archived],
      };
      if (!allowed[exam.status]?.includes(status)) throw new DomainException('EXAM_TRANSITION_INVALID', `Cannot change examination from ${exam.status} to ${status}.`, 409);
      const previousStatus = exam.status;
      exam.status = status;
      await manager.save(exam);
      await this.outbox(manager, DomainEventTypes.ExamStatusChanged, exam.id, requestId, { examId: exam.id, previousStatus, status, actorId });
      return exam;
    });
  }

  async submit(examId: string, dto: SubmitApplicationDto, userId: string, requestId: string, idempotencyKey: string) {
    if (!idempotencyKey) throw new DomainException('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.', 400);
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const scope = `application.submit:${userId}`;
      const existing = await manager.findOne(IdempotencyRecordEntity, { where: { scope, key: idempotencyKey } });
      if (existing) return existing.response;
      const exam = await manager.findOne(ExamEntity, { where: { id: examId }, lock: { mode: 'pessimistic_write' } });
      if (!exam) throw new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404);
      const now = new Date();
      if (exam.status !== ExamStatus.RegistrationOpen || now < exam.registrationStart || now > exam.registrationEnd) {
        throw new DomainException('REGISTRATION_CLOSED', 'The registration window is not open.', 409);
      }
      if (await manager.exists(ApplicationEntity, { where: { examId, identityKey: dto.identityKey } })) {
        throw new DomainException('APPLICATION_DUPLICATE', 'You already registered for this examination.', 409);
      }
      const confirmed = await manager.count(ApplicationEntity, { where: { examId, status: In([ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned, ApplicationStatus.Verified]) } });
      const status = confirmed < exam.capacity ? ApplicationStatus.Submitted : ApplicationStatus.Waitlisted;
      const application = await manager.save(ApplicationEntity, manager.create(ApplicationEntity, {
        examId, exam, testTakerUserId: userId, identityKey: dto.identityKey,
        profileSnapshot: dto.profileSnapshot, status, submittedAt: now,
        paymentAmount: exam.registrationFee,
        paymentCurrency: 'BTN',
        paymentStatus: Number(exam.registrationFee) === 0 ? RegistrationPaymentStatus.Waived : RegistrationPaymentStatus.Initiated,
      }));
      if (status === ApplicationStatus.Waitlisted) {
        await manager.save(WaitlistEntryEntity, manager.create(WaitlistEntryEntity, { examId, applicationId: application.id, positionKey: Date.now().toString(), status: 'WAITING' }));
      }
      await this.transitionLog(manager, application.id, null, status, userId, requestId, null);
      await this.outbox(manager, status === ApplicationStatus.Waitlisted ? DomainEventTypes.ApplicationWaitlisted : DomainEventTypes.ApplicationSubmitted, application.id, requestId, { applicationId: application.id, examId, testTakerUserId: userId });
      const response = { applicationId: application.id, status };
      await manager.save(IdempotencyRecordEntity, manager.create(IdempotencyRecordEntity, { scope, key: idempotencyKey, response }));
      return response;
    });
  }

  listMine(userId: string) { return this.applications.find({ where: { testTakerUserId: userId }, order: { submittedAt: 'DESC' } }); }

  listApplications(examId?: string) {
    return this.applications.find({
      where: examId ? { examId } : {},
      order: { submittedAt: 'DESC' },
      take: 500,
    });
  }

  async updateExam(id: string, dto: UpdateExamDto, actorId: string, requestId: string) {
    return this.dataSource.transaction(async manager => {
      const exam = await manager.findOne(ExamEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!exam) throw new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404);
      if (![ExamStatus.Draft, ExamStatus.Published, ExamStatus.RegistrationOpen, ExamStatus.RegistrationClosed].includes(exam.status)) {
        throw new DomainException('EXAM_EDIT_BLOCKED', 'The examination schedule cannot be edited after the exam has started.', 409);
      }

      const registrationStart = new Date(dto.registrationStart ?? exam.registrationStart);
      const registrationEnd = new Date(dto.registrationEnd ?? exam.registrationEnd);
      const examDate = new Date(dto.examDate ?? exam.examDate);
      if (registrationEnd <= registrationStart) throw new DomainException('EXAM_WINDOW_INVALID', 'Registration end must be after registration start.');
      if (examDate <= registrationEnd) throw new DomainException('EXAM_DATE_INVALID', 'Examination date must be after registration closes.');

      const capacity = dto.capacity ?? exam.capacity;
      const reserved = await manager.count(ApplicationEntity, {
        where: { examId: id, status: In([ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned, ApplicationStatus.Verified, ApplicationStatus.Absent]) },
      });
      if (capacity < reserved) throw new DomainException('EXAM_CAPACITY_INVALID', `Capacity cannot be lower than the ${reserved} confirmed registrations.`, 409);

      Object.assign(exam, dto, { registrationStart, registrationEnd, examDate, capacity });
      const updated = await manager.save(exam);
      await this.outbox(manager, 'EXAM_UPDATED', exam.id, requestId, { examId: exam.id, actorId, changedFields: Object.keys(dto) });
      return updated;
    });
  }

  listPendingVerification(examId?: string) {
    return this.applications.find({
      where: examId
        ? { examId, status: In([ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned]) }
        : { status: In([ApplicationStatus.Submitted, ApplicationStatus.UnderReview, ApplicationStatus.Returned]) },
      order: { submittedAt: 'ASC' },
      take: 100,
    });
  }

  async listAttendance(examId?: string) {
    const applications = await this.applications.find({
      where: examId
        ? { examId, status: In([ApplicationStatus.Verified, ApplicationStatus.Absent]) }
        : { status: In([ApplicationStatus.Verified, ApplicationStatus.Absent]) },
      order: { verifiedAt: 'ASC' },
      take: 500,
    });
    const attendance = applications.length
      ? await this.dataSource.getRepository(AttendanceEntity).findBy({ applicationId: In(applications.map(item => item.id)) })
      : [];
    const attendanceByApplication = new Map(attendance.map(item => [item.applicationId, item]));
    return applications.map(application => ({
      ...application,
      attendance: attendanceByApplication.get(application.id) ?? null,
    }));
  }

  async getApplication(id: string, userId: string, elevated: boolean) {
    const application = await this.applications.findOneBy({ id });
    if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
    if (!elevated && application.testTakerUserId !== userId) throw new DomainException('APPLICATION_FORBIDDEN', 'You may only access your own application.', 403);
    return application;
  }

  async cancel(id: string, userId: string, requestId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const application = await manager.findOne(ApplicationEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (application.testTakerUserId !== userId) throw new DomainException('APPLICATION_FORBIDDEN', 'You may only cancel your own application.', 403);
      if (application.reviewStartedAt || ![ApplicationStatus.Submitted, ApplicationStatus.Waitlisted].includes(application.status)) {
        throw new DomainException('APPLICATION_CANCELLATION_BLOCKED', 'Cancellation is not allowed after review has started.', 409);
      }
      const previous = application.status;
      application.status = ApplicationStatus.Cancelled;
      application.cancelledAt = new Date();
      await manager.save(application);
      await manager.update(WaitlistEntryEntity, { applicationId: id, status: 'WAITING' }, { status: 'CANCELLED' });
      await this.transitionLog(manager, id, previous, application.status, userId, requestId, null);
      await this.outbox(manager, DomainEventTypes.ApplicationCancelled, id, requestId, { applicationId: id, examId: application.examId, testTakerUserId: application.testTakerUserId });
      if (previous === ApplicationStatus.Submitted) await this.promoteNext(manager, application.examId, requestId);
      return application;
    });
  }

  async startReview(id: string, actorId: string, requestId: string) {
    return this.transition(id, [ApplicationStatus.Submitted], ApplicationStatus.UnderReview, actorId, requestId, null, (application) => { application.reviewStartedAt = new Date(); });
  }

  async returnForCorrection(id: string, dto: ReturnApplicationDto, actorId: string, requestId: string) {
    return this.transition(id, [ApplicationStatus.UnderReview], ApplicationStatus.Returned, actorId, requestId, dto.remarks, (application) => { application.reviewRemarks = dto.remarks; }, DomainEventTypes.ApplicationReturned);
  }

  async resubmit(id: string, userId: string, requestId: string) {
    const application = await this.getApplication(id, userId, false);
    return this.transition(application.id, [ApplicationStatus.Returned], ApplicationStatus.Submitted, userId, requestId, null, (record) => { record.reviewRemarks = null; });
  }

  async verify(id: string, actorId: string, requestId: string) {
    return this.transition(id, [ApplicationStatus.UnderReview], ApplicationStatus.Verified, actorId, requestId, null, (application) => {
      application.verifiedAt = new Date();
      application.registrationNumber = `DSTS-${new Date().getUTCFullYear()}-${application.id.slice(0, 8).toUpperCase()}`;
    }, DomainEventTypes.ApplicationVerified, (manager, application) => this.verificationNotificationPayload(manager, application));
  }

  // BRD §5.2.2 item 3: sendable any time after verification, not only once at the
  // moment of verifying. Re-publishes the same ApplicationVerified event the initial
  // verification fires, reusing the whole existing template-render -> notification ->
  // delivery pipeline rather than a second one.
  async resendVerificationNotification(id: string, actorId: string, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      const application = await manager.findOneBy(ApplicationEntity, { id });
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (application.status !== ApplicationStatus.Verified) {
        throw new DomainException('APPLICATION_NOT_VERIFIED', 'Only a verified application can be notified.', 409);
      }
      const extra = await this.verificationNotificationPayload(manager, application);
      await this.outbox(manager, DomainEventTypes.ApplicationVerified, id, requestId, {
        applicationId: id, examId: application.examId, testTakerUserId: application.testTakerUserId, ...extra,
      });
      await this.transitionLog(manager, id, application.status, application.status, actorId, requestId, 'Verification notification resent.');
      return { sent: true };
    });
  }

  // Cross-service contact resolution for the notification dispatch worker (SMS
  // delivery). The applicant's phone number lives on the registration profile
  // captured at submission time, not on the identity account.
  async applicationContact(id: string, internalKey: string | undefined) {
    assertInternalService(this.config, internalKey);
    const application = await this.applications.findOneBy({ id });
    if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
    return { phone: this.profileString(application.profileSnapshot, ['phone', 'contactNo', 'mobileNo']) };
  }

  async recordPayment(id: string, dto: RecordRegistrationPaymentDto, actorId: string, requestId: string) {
    return this.dataSource.transaction(async manager => {
      const application = await manager.findOne(ApplicationEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (application.paymentStatus === RegistrationPaymentStatus.Paid || application.paymentStatus === RegistrationPaymentStatus.Waived) {
        throw new DomainException('REGISTRATION_PAYMENT_FINAL', 'This registration payment is already finalized.', 409);
      }
      if (dto.status === RegistrationPaymentStatus.Paid && !dto.reference) {
        throw new DomainException('PAYMENT_REFERENCE_REQUIRED', 'A transaction reference is required for a paid registration.', 400);
      }
      application.paymentStatus = dto.status;
      application.paymentMethod = dto.method.trim();
      application.paymentReference = dto.reference?.trim() || null;
      application.paidAt = new Date();
      await manager.save(application);
      await this.outbox(manager, 'REGISTRATION_PAYMENT_RECORDED', application.id, requestId, {
        applicationId: application.id, examId: application.examId, testTakerUserId: application.testTakerUserId,
        status: application.paymentStatus, amount: application.paymentAmount, currency: application.paymentCurrency,
        method: application.paymentMethod, actorId,
      });
      return application;
    });
  }

  async markAttendance(id: string, dto: MarkAttendanceDto, actorId: string, requestId: string) {
    return this.dataSource.transaction(async (manager) => {
      const application = await manager.findOneBy(ApplicationEntity, { id });
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (application.status !== ApplicationStatus.Verified) throw new DomainException('ATTENDANCE_NOT_ELIGIBLE', 'Only verified candidates are eligible for attendance.', 409);
      const absentSkills = [...new Set(dto.absentSkills)];
      const overallStatus = absentSkills.length ? 'ABSENT' : 'PRESENT';
      let attendance = await manager.findOneBy(AttendanceEntity, { applicationId: id });
      attendance = manager.create(AttendanceEntity, { ...attendance, examId: application.examId, applicationId: id, absentSkills, overallStatus, markedByUserId: actorId });
      await manager.save(attendance);
      if (overallStatus === 'ABSENT') {
        const previous = application.status;
        application.status = ApplicationStatus.Absent;
        await manager.save(application);
        await this.transitionLog(manager, id, previous, application.status, actorId, requestId, `Absent skills: ${absentSkills.join(', ')}`);
        const exam = await manager.findOneBy(ExamEntity, { id: application.examId });
        await this.outbox(manager, DomainEventTypes.CandidateMarkedAbsent, id, requestId, {
          applicationId: id, examId: application.examId, testTakerUserId: application.testTakerUserId, absentSkills,
          examDate: exam?.examDate ? exam.examDate.toISOString().slice(0, 10) : '', venue: exam?.venue ?? '',
        });
      }
      return attendance;
    });
  }

  applicationHistory(id: string) { return this.history.find({ where: { applicationId: id }, order: { occurredAt: 'ASC' } }); }

  async certificateProfile(id: string, internalKey: string | undefined) {
    assertInternalService(this.config, internalKey);
    const application = await this.applications.findOneBy({ id });
    if (!application || !application.registrationNumber) throw new DomainException('CERTIFICATE_PROFILE_UNAVAILABLE', 'A verified registration profile is unavailable.', 409);
    const fullName = application.profileSnapshot.fullName;
    if (typeof fullName !== 'string' || !fullName.trim()) throw new DomainException('CERTIFICATE_PROFILE_INCOMPLETE', 'The verified profile has no holder name.', 409);
    const cid = application.profileSnapshot.cid;
    const dateOfBirth = application.profileSnapshot.dateOfBirth;
    if (typeof cid !== 'string' || !cid.trim()) throw new DomainException('CERTIFICATE_PROFILE_INCOMPLETE', 'The verified profile has no CID.', 409);
    if (typeof dateOfBirth !== 'string' || !dateOfBirth.trim()) throw new DomainException('CERTIFICATE_PROFILE_INCOMPLETE', 'The verified profile has no date of birth.', 409);
    return {
      applicationId: application.id, examId: application.examId, testTakerUserId: application.testTakerUserId,
      registrationNumber: application.registrationNumber, fullName: fullName.trim(), cid: cid.trim(), dateOfBirth: dateOfBirth.trim(),
    };
  }

  private async transition(id: string, allowed: ApplicationStatus[], target: ApplicationStatus, actorId: string, requestId: string, remarks: string | null, mutate?: (application: ApplicationEntity) => void, eventType?: string, extraPayload?: (manager: EntityManager, application: ApplicationEntity) => Promise<Record<string, unknown>>) {
    return this.dataSource.transaction(async (manager) => {
      const application = await manager.findOne(ApplicationEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!application) throw new DomainException('APPLICATION_NOT_FOUND', 'Application not found.', 404);
      if (!allowed.includes(application.status)) throw new DomainException('APPLICATION_TRANSITION_INVALID', `Cannot change application from ${application.status} to ${target}.`, 409);
      const previous = application.status;
      application.status = target;
      mutate?.(application);
      await manager.save(application);
      await this.transitionLog(manager, id, previous, target, actorId, requestId, remarks);
      if (eventType) {
        const extra = extraPayload ? await extraPayload(manager, application) : {};
        await this.outbox(manager, eventType, id, requestId, { applicationId: id, examId: application.examId, testTakerUserId: application.testTakerUserId, ...extra });
      }
      return application;
    });
  }

  private async verificationNotificationPayload(manager: EntityManager, application: ApplicationEntity) {
    const exam = await manager.findOneBy(ExamEntity, { id: application.examId });
    return {
      registrationNumber: application.registrationNumber,
      examDate: exam?.examDate ? exam.examDate.toISOString().slice(0, 10) : '',
      venue: exam?.venue ?? '',
    };
  }

  private profileString(profile: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = profile[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private async promoteNext(manager: EntityManager, examId: string, requestId: string) {
    const entry = await manager.findOne(WaitlistEntryEntity, { where: { examId, status: 'WAITING' }, order: { positionKey: 'ASC' }, lock: { mode: 'pessimistic_write' } });
    if (!entry) return;
    const application = await manager.findOneByOrFail(ApplicationEntity, { id: entry.applicationId });
    application.status = ApplicationStatus.Submitted;
    entry.status = 'PROMOTED';
    await manager.save(ApplicationEntity, application);
    await manager.save(WaitlistEntryEntity, entry);
    await this.transitionLog(manager, application.id, ApplicationStatus.Waitlisted, ApplicationStatus.Submitted, application.testTakerUserId, requestId, 'Automatically promoted from waitlist.');
    await this.outbox(manager, DomainEventTypes.WaitlistCandidatePromoted, application.id, requestId, { applicationId: application.id, examId, testTakerUserId: application.testTakerUserId });
  }

  private transitionLog(manager: EntityManager, applicationId: string, fromStatus: ApplicationStatus | null, toStatus: ApplicationStatus, actorUserId: string, requestId: string, remarks: string | null) {
    return manager.save(ApplicationHistoryEntity, manager.create(ApplicationHistoryEntity, { applicationId, fromStatus, toStatus, actorUserId, requestId, remarks }));
  }

  private outbox(manager: EntityManager, eventType: string, aggregateId: string, correlationId: string, payload: Record<string, unknown>) {
    return manager.save(OutboxEventEntity, manager.create(OutboxEventEntity, { eventType, aggregateId, correlationId, payload }));
  }
}
