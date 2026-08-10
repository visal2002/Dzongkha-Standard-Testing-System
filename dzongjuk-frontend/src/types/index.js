/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview DZONGJUK (DSTS) — Domain Type Definitions
 *
 * JSDoc @typedef declarations that map to backend database entities.
 * Use these types in JSDoc annotations throughout the codebase for
 * editor autocomplete and documentation.
 *
 * When a TypeScript migration occurs, convert these to interfaces/types.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

/**
 * @enum {string}
 */
export const ApplicationStatus = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  RETURNED: 'returned',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ABSENT: 'absent',
  WAITLISTED: 'waitlisted',
};

/**
 * @enum {string}
 */
export const PaymentStatus = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  REFUNDED: 'refunded',
  PENDING: 'pending',
};

/**
 * @enum {string}
 */
export const ExamWindowStatus = {
  UPCOMING: 'upcoming',
  OPEN: 'open',
  CLOSED: 'closed',
  COMPLETED: 'completed',
};

/**
 * @enum {string}
 */
export const Skill = {
  WRITING: 'Writing',
  READING: 'Reading',
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
};

/**
 * @enum {string}
 */
export const BandLevel = {
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C1: 'C1',
  C2: 'C2',
};

/**
 * @enum {string}
 */
export const AppealStatus = {
  SUBMITTED: 'submitted',
  PAYMENT_COMPLETED: 'payment_completed',
  PENDING_COMMITTEE: 'pending_committee',
  REVISION_REQUESTED: 'revision_requested',
  PENDING_CHIEF_APPROVAL: 'pending_chief_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/**
 * @enum {string}
 */
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * @enum {string}
 */
export const UserRole = {
  ADMIN: 'admin',
  DCDD: 'dcdd',
  EXAM_HEAD: 'exam_head',
  COMMITTEE_HEAD: 'committee_head',
  COMMITTEE_MEMBER: 'committee_member',
  CHIEF_EXECUTIVE: 'chief_executive',
  TEST_TAKER: 'test_taker',
};

// ─── Entity Typedefs ──────────────────────────────────────────────────────────

/**
 * Authenticated user object stored in context and localStorage.
 * @typedef {Object} AuthUser
 * @property {string} id - User ID (e.g. 'USR-001')
 * @property {string} name - Full name
 * @property {string} email - Email address
 * @property {string} cid - Bhutanese Citizenship ID (11 digits)
 * @property {string} role - Role code (see UserRole enum)
 * @property {string} roleName - Human-readable role name
 * @property {string|null} avatar - Avatar image URL or null
 * @property {string|null} department - Department/organization
 * @property {string[]} permissions - List of permission keys, or ['*'] for admin
 */

/**
 * Exam registration window.
 * @typedef {Object} ExamWindow
 * @property {string} id - Exam ID (e.g. 'EXM-2026-001')
 * @property {string} title - Descriptive title
 * @property {string} examDate - ISO date string (YYYY-MM-DD)
 * @property {string} registrationStart - ISO date string
 * @property {string} registrationEnd - ISO date string
 * @property {number} maxCapacity - Maximum number of registrations
 * @property {number} currentRegistrations - Current registration count
 * @property {number} waitlistCount - Waitlist count
 * @property {string} status - ExamWindowStatus value
 * @property {string} venue - Exam venue name and location
 * @property {number} paymentAmount - Registration fee in BTN
 * @property {string} createdBy - User ID of creator
 * @property {string} createdAt - ISO datetime string
 */

/**
 * Document attached to an application.
 * @typedef {Object} ApplicationDocument
 * @property {string} name - Display name
 * @property {string} type - Document type key (e.g. 'cid_card', 'photo')
 * @property {string} status - 'pending' | 'verified' | 'rejected'
 * @property {string} url - File URL or '#'
 */

/**
 * Status history entry.
 * @typedef {Object} StatusHistoryEntry
 * @property {string} status - Status value
 * @property {string} timestamp - ISO datetime string
 * @property {string} by - Actor name or user ID
 * @property {string} [remarks] - Optional remarks
 */

/**
 * Exam registration application.
 * @typedef {Object} Application
 * @property {string} id - Application ID
 * @property {string} examId - Related exam window ID
 * @property {string} testTakerId - User ID of test taker
 * @property {string} testTakerName - Full name
 * @property {string} cid - Citizenship ID
 * @property {string} email
 * @property {string} phone
 * @property {string} dob - Date of birth (YYYY-MM-DD)
 * @property {string} gender - 'Male' | 'Female' | 'Other'
 * @property {string} dzongkhag - District name
 * @property {string} gewog - Sub-district name
 * @property {string} education - Education qualification
 * @property {string} institution - Institution name
 * @property {string} employmentStatus - 'Employed' | 'Unemployed' | 'Student'
 * @property {string} organization - Organization name (if employed)
 * @property {string|null} registrationNumber - Assigned after verification
 * @property {string} status - ApplicationStatus value
 * @property {string} paymentStatus - PaymentStatus value
 * @property {number} paymentAmount - Amount paid in BTN
 * @property {string|null} paymentDate - ISO datetime of payment
 * @property {string} submittedAt - ISO datetime of submission
 * @property {string|null} verifiedAt - ISO datetime of verification
 * @property {string|null} verifiedBy - User ID of verifier
 * @property {string} remarks - Rejection/return remarks
 * @property {ApplicationDocument[]} documents - Attached documents
 * @property {boolean} isWithinCapacity
 * @property {string[]} [absentSkills] - Skills marked as absent
 * @property {StatusHistoryEntry[]} statusHistory
 */

/**
 * Band score record for a test taker.
 * @typedef {Object} BandScore
 * @property {string} id
 * @property {string} examId
 * @property {string} applicationId
 * @property {string} testTakerName
 * @property {string} cid
 * @property {string} registrationNumber
 * @property {number} writing - Score (1–9, 0.5 steps)
 * @property {number} reading
 * @property {number} listening
 * @property {number} speaking
 * @property {number} average - Computed average
 * @property {string} status - 'draft' | 'submitted' | 'published'
 * @property {string} enteredBy - User ID
 * @property {string} enteredAt - ISO datetime
 * @property {string[]} committeeMembers - Names of committee members
 */

/**
 * Appeal / re-evaluation request.
 * @typedef {Object} Appeal
 * @property {string} id
 * @property {string} examId
 * @property {string} applicationId
 * @property {string} testTakerName
 * @property {string} cid
 * @property {string} registrationNumber
 * @property {string[]} skills - Skills being appealed
 * @property {string} reason - Applicant's reason
 * @property {string} paymentStatus - PaymentStatus value
 * @property {number} paymentAmount
 * @property {string} status - AppealStatus value
 * @property {string} submittedAt - ISO datetime
 * @property {Object.<string, number>} originalScores - e.g. { writing: 5.0 }
 * @property {Object.<string, number>|null} revisedScores
 * @property {string|null} committeeRemarks
 * @property {string|null} chiefApproval - 'approved' | 'rejected' | null
 * @property {string} [chiefRemarks]
 * @property {StatusHistoryEntry[]} statusHistory
 */

/**
 * Certificate issued after successful examination.
 * @typedef {Object} Certificate
 * @property {string} id
 * @property {string} examId
 * @property {string} certificateNumber
 * @property {string} holderName
 * @property {string} registrationNumber
 * @property {{scores: Record<string, number>, overallScore: number}} scoreSnapshot
 * @property {string} bandLabel
 * @property {string} [cefrLevel] - CEFR value (A1-C2)
 * @property {string} issuedAt - ISO datetime
 * @property {string} validUntil - YYYY-MM-DD
 * @property {string} verificationToken - Signed verification token
 * @property {string} status - 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED'
 * @property {number} downloadCount
 */

/**
 * Question paper.
 * @typedef {Object} QuestionPaper
 * @property {string} id
 * @property {string} examId
 * @property {string} title
 * @property {string} skill - Skill enum value
 * @property {string} fileName
 * @property {string} fileSize - Human-readable size
 * @property {string} uploadedBy - User ID
 * @property {string} uploadedByName
 * @property {string} uploadedAt - ISO datetime
 * @property {boolean} isEncrypted
 * @property {string} status - 'draft' | 'published'
 * @property {boolean} hasAnswerSheet
 */

/**
 * Examination committee member assignment.
 * @typedef {Object} CommitteeMember
 * @property {string} id
 * @property {string} examId
 * @property {string} userId
 * @property {string} name
 * @property {string} role - 'Committee Head' | 'Committee Member'
 * @property {boolean} isHead
 * @property {string} addedAt - ISO datetime
 */

/**
 * In-app notification.
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId - Recipient user ID
 * @property {string} title
 * @property {string} message
 * @property {string} type - NotificationType value
 * @property {boolean} read
 * @property {string} createdAt - ISO datetime
 */

/**
 * System user (for admin management).
 * @typedef {Object} SystemUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} cid
 * @property {string} role - Role name (human-readable)
 * @property {string} roleCode - Role code (machine-readable)
 * @property {string} status - 'active' | 'inactive' | 'suspended'
 * @property {string} lastLogin - ISO datetime
 */

/**
 * System role definition.
 * @typedef {Object} SystemRole
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} description
 * @property {number} userCount
 * @property {Object.<string, {create: boolean, read: boolean, update: boolean, delete: boolean}>} permissions
 */

/**
 * Master system configuration.
 * @typedef {Object} MasterConfig
 * @property {number} certificateValidity - Validity period in months
 * @property {number} registrationFee - In BTN
 * @property {number} appealFee - Base appeal fee in BTN
 * @property {number} appealFeePerSkill - Per-skill appeal fee in BTN
 * @property {number} maxBandScore
 * @property {number} minBandScore
 * @property {number} bandScoreStep
 * @property {string[]} skills - Available test skills
 * @property {Array<{min: number, max: number, level: string, description: string}>} bandLevels
 * @property {Object} certificateTemplate
 * @property {Object.<string, string>} notificationTemplates
 */

// ─── API Response Wrappers ─────────────────────────────────────────────────────

/**
 * Standard API response envelope.
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {T} data
 * @property {string} [message]
 * @property {Object} [errors] - Validation errors keyed by field name
 */

/**
 * Paginated API response.
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success
 * @property {T[]} data
 * @property {number} total - Total record count
 * @property {number} page - Current page (1-indexed)
 * @property {number} pageSize - Records per page
 * @property {number} totalPages
 */
