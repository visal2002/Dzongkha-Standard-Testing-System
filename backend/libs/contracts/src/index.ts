/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

export enum CanonicalRole {
  SystemAdmin = 'admin',
  Dcdd = 'dcdd',
  ExamHead = 'exam_head',
  CommitteeHead = 'committee_head',
  CommitteeMember = 'committee_member',
  ChiefExecutive = 'chief_executive',
  TestTaker = 'test_taker',
}

export enum ApplicationStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  Waitlisted = 'WAITLISTED',
  UnderReview = 'UNDER_REVIEW',
  Returned = 'RETURNED',
  Verified = 'VERIFIED',
  Cancelled = 'CANCELLED',
  Absent = 'ABSENT',
}

export enum ExamStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  RegistrationOpen = 'REGISTRATION_OPEN',
  RegistrationClosed = 'REGISTRATION_CLOSED',
  InProgress = 'IN_PROGRESS',
  ResultsDeclared = 'RESULTS_DECLARED',
  Archived = 'ARCHIVED',
  Cancelled = 'CANCELLED',
}

export enum Skill {
  Writing = 'WRITING',
  Reading = 'READING',
  Listening = 'LISTENING',
  Speaking = 'SPEAKING',
}

export enum QuestionPaperStatus {
  Draft = 'DRAFT',
  Ready = 'READY',
  SamplePublished = 'SAMPLE_PUBLISHED',
  Retired = 'RETIRED',
}

export enum ScoreSheetStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  Published = 'PUBLISHED',
  Revised = 'REVISED',
}

export enum AppealStatus {
  Submitted = 'SUBMITTED',
  PaymentCompleted = 'PAYMENT_COMPLETED',
  PendingCommittee = 'PENDING_COMMITTEE',
  NoChange = 'NO_CHANGE',
  RevisionRequested = 'REVISION_REQUESTED',
  PendingChiefApproval = 'PENDING_CHIEF_APPROVAL',
  Rejected = 'REJECTED',
  ApprovedPendingScoreUpdate = 'APPROVED_PENDING_SCORE_UPDATE',
  Completed = 'COMPLETED',
}

export enum CertificateStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED',
  Superseded = 'SUPERSEDED',
}

export interface AccessClaims {
  sub: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  assurance: 'LOCAL' | 'NDI' | 'MFA';
}

export interface DomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  source: string;
  correlationId: string;
  resourceId: string;
  payload: T;
}

export const DomainEventTypes = {
  ExamCreated: 'ExamCreated',
  ApplicationSubmitted: 'ApplicationSubmitted',
  ApplicationWaitlisted: 'ApplicationWaitlisted',
  ApplicationCancelled: 'ApplicationCancelled',
  WaitlistCandidatePromoted: 'WaitlistCandidatePromoted',
  ApplicationReturned: 'ApplicationReturned',
  ApplicationVerified: 'ApplicationVerified',
  CandidateMarkedAbsent: 'CandidateMarkedAbsent',
  QuestionPaperUploaded: 'QuestionPaperUploaded',
  SamplePaperPublished: 'SamplePaperPublished',
  CandidateEligibleForScoring: 'CandidateEligibleForScoring',
  ScoreSubmitted: 'ScoreSubmitted',
  ResultsDeclared: 'ResultsDeclared',
  AppealSubmitted: 'AppealSubmitted',
  AppealPaymentCompleted: 'AppealPaymentCompleted',
  AppealRevisionRequested: 'AppealRevisionRequested',
  AppealApproved: 'AppealApproved',
  AppealRejected: 'AppealRejected',
  AppealCompleted: 'AppealCompleted',
  ScoreRevised: 'ScoreRevised',
  CertificateIssued: 'CertificateIssued',
  CertificateRevoked: 'CertificateRevoked',
  NotificationCreated: 'NotificationCreated',
} as const;
