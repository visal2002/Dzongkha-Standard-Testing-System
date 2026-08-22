# DSTS (Dzongjuk) — Phase 1 QA Test Plan

### Frontend, Backend/API, and Database Test Cases

**Source:** Business Requirements Document — Dzongjuk (DSTS), DCDD, Ministry of Home Affairs (`docs/dsts_v1.txt`, `docs/nfr.txt`, `docs/tor.txt`)
**Scope:** Phase 1 only. Phase 2 items (Mock Test, Online Examination, Live Exam Monitoring/Audit Logs) and Out-of-Scope items (biometric auth, online/remote exam delivery) are explicitly excluded — see Section 5.

> **How to use this document:** Each module section below can be used standalone as a prompt/checklist for generating automated tests (e.g. Playwright for frontend, Postman/REST-assured for API, SQL assertions for DB) or handed to a QA engineer as a manual test plan. Section 7 maps each module to the endpoints, permission strings, and tables that exist in this repository today; Section 8 records what is already automated and where the gaps are.

---

## 1. Architecture & Business-Model Guardrails to Validate

Every test below should also confirm the system respects these architectural commitments from the BRD (Sections 4, 7.1–7.3, 8):

- Web-based, mobile-responsive, accessible via standard browsers (no native app required).
- Modular/microservices-style architecture — new modules/fields must not require full redeployment.
- Authentication aligned with **NDI (National Digital Identity)**; fallback to local system credentials.
- Two-way REST integration (fetch + post) with **NDI** and **Census (DCRC)** for applicant verification, with retry/error handling and interim manual-verification fallback if APIs are down.
- **SMS + Email** notifications triggered automatically on workflow state changes.
- **RBAC** enforced for every module: Test Taker, DCDD (Focal), Exam Head / Chief of Examination, Exam Committee / Committee Head, Chief Executive / Chief of Examiner, System Administrator. One user can hold multiple roles.
- **Master-data driven configuration**: registration window & capacity, certificate validity, payment amount, certificate template fields — changeable without code changes.
- Every unique **Exam ID** links registrations, documents, and results for that exam.
- **Audit trail with timestamps** for all status changes and sensitive actions.
- HTTPS/TLS in transit, encryption at rest for question papers/answer sheets.
- Unique **Registration Number** issued after verification; unique **QR code** per certificate.

---

## 2. Module-Wise Test Cases

### 2.1 Masters (BRD §5.1)

| Layer | Test Cases |
|---|---|
| **Frontend** | Config screens for registration window (start/end date, capacity), certificate validity period, and payment amount are visible only to authorized (DCDD/Admin) roles. Field validation: end date > start date, capacity is a positive integer, payment amount numeric ≥ 0. Save/Update confirmation shown. Non-admin roles cannot see or access these screens. |
| **Backend/API** | CRUD endpoints for each master (registration window, capacity, cert validity, payment amount) return 403 for non-admin callers. Server-side validation rejects invalid date ranges / negative capacity / non-numeric payment even if UI is bypassed. Update endpoint versions/audits the change (who, when, old value → new value). |
| **Database** | Master tables persist all configured values; no nulls in mandatory fields. Change-history/audit table captures prior + new value with timestamp and user ID. Constraints prevent negative capacity or invalid date ranges at DB level (defense-in-depth). |

### 2.2 Registration (BRD §5.2, BR-1 & BR-2)

| Layer | Test Cases |
|---|---|
| **Frontend** | Registration form is enabled only while the registration window is open (per master config); disabled/hidden outside the window with a clear message. All mandatory fields + document upload enforced before submit is allowed. Duplicate registration (same CID, same exam window) shows a clear rejection message. "Cancel Registration" is available before DCDD verification starts, and disappears once verification has begun. Applicants within capacity are visually marked (yellow); those exceeding capacity show as waiting list (red). Acknowledgement message/notification shown immediately after submit. Final status (approved/returned/waiting-list) with registration number is visible to the applicant. |
| **Backend/API** | POST registration rejected outside the configured window (with correct error code/message). Endpoint calls NDI + Census APIs to fetch/verify applicant data and stores the verification result; simulate NDI timeout/failure and confirm graceful fallback/error handling. Duplicate-CID-per-exam-window submissions rejected (e.g. 409 Conflict) with correct error payload. Cancel endpoint returns 403/blocked once status = "under verification" or later. On cancellation, waiting-list promotion logic auto-triggers the next applicant per capacity rules — verify correct ordering (FIFO by submission time, unless BRD specifies otherwise — confirm with stakeholder). Verify/Approve/Return-for-correction endpoints restricted to DCDD role only. Approval generates a unique Registration Number (test uniqueness under concurrent approvals). Resubmission-request endpoint triggers a notification to the test taker. Notification (SMS/email) sent post-verification with exam time & venue, triggerable any time after verification. |
| **Database** | Registration status transitions correctly: Submitted → Verified/Approved → (Absent, later) or Returned → Resubmitted. Exam ID uniquely generated per exam and correctly foreign-keyed to all registrations, documents, and results under it. Unique constraint on (CID + Exam Window) prevents duplicate rows. Capacity counters (yellow/waiting-list) reconcile correctly against actual row counts, including under concurrent inserts (race-condition test). Notification log table records each SMS/email sent with timestamp, recipient, and trigger event. |

### 2.3 Absentees (BRD §5.3)

| Layer | Test Cases |
|---|---|
| **Frontend** | "Mark Absent" action is available to DCDD only, and only for test takers whose status is Verified/Approved. UI allows marking absence per skill (Writing/Reading/Listening/Speaking); partial attendance still results in full "Absent" status (not partial credit). Status badge updates visibly to "Absent" after action. |
| **Backend/API** | Mark-absent endpoint restricted to DCDD role; rejects action on test takers not in Verified/Approved status. Confirms that marking any subset of the 4 skills as not attended sets full-record status to Absent (not partial). Once Absent, any Committee attempt to enter/view/submit a band score for that test taker is blocked (expect 403 or equivalent). SMS + email notification triggered automatically on marking absent. Certificate-generation endpoint refuses to generate for Absent-status records. |
| **Database** | Status field transitions Approved/Verified → Absent, with a timestamp recorded for audit. Absent record retains registration number, CID, scheduled exam date, and the specific skill(s) marked absent — permanently. Query used for certificate generation excludes Absent records by design (verify via test query). No automatic carry-forward: a fresh registration row (not reactivation) is required for the test taker to re-attempt in a future window. |

### 2.4 Question Paper Upload (BRD §5.4)

| Layer | Test Cases |
|---|---|
| **Frontend** | Upload screen visible/usable only by the DCDD Chief of Examination role. Question paper and answer sheet are uploaded as two separate documents. Download/view access is available only during the scheduled exam time window for the Chief of Examination. Post-result-declaration, documents appear under a "Sample Question Paper" section visible to all system users. |
| **Backend/API** | Upload endpoint enforces Chief-of-Examination-only role check (403 for others). Uploaded files are stored encrypted (verify encryption at rest, not just in transit). Download/view endpoint enforces the scheduled-time-window restriction — requests outside window rejected even for the correct role, except the defined access window. Post-results "publish to sample section" endpoint correctly flips visibility flag for all authenticated users. |
| **Database** | File metadata table records uploader, upload timestamp, associated Exam ID, and encryption status. Access-control checks are enforced at the query/service layer, not just UI. Visibility flag (private vs. public/sample) toggles correctly and only after result declaration — verify no premature exposure. |

### 2.5 Band Score Update (BRD §5.5)

| Layer | Test Cases |
|---|---|
| **Frontend** | Committee-formation screen allows adding members and designating exactly one Committee Head. Only the Committee Head sees editable score-entry fields; other members see read/view-only. Score entry is skill-wise (Writing, Listening, Speaking, Reading) per test taker, matching the approved scoring format. After submission, fields lock to view-only for all committee members (including the Head) unless a formal revision is in progress. Names of all committee members are displayed alongside the submitted score sheet. |
| **Backend/API** | Committee CRUD endpoints; only one Head can be designated per committee (test attempting to set two Heads is rejected). POST score endpoint accepts submissions only from the designated Head; validates each skill score against the approved range/format. After submission, further PATCH/PUT attempts on that score without an approved revision request return 403/locked. Committee member list is persisted and returned with the score record for transparency. |
| **Database** | Band scores stored skill-wise per test taker, linked to Exam ID and Registration Number. Role/permission enforced at data-access layer (defense-in-depth against a compromised or buggy UI). Scores are immutable post-submission unless a `revision_approved` flag/state is set. Committee member list stored as an auditable association with each score record. |

### 2.6 Re-evaluation / Appeal (BRD §5.6)

| Layer | Test Cases |
|---|---|
| **Frontend** | Appeal form is available to test takers only after official result declaration. Test taker can select one or more specific skills to appeal. Payment step is enforced before the appeal is submitted/forwarded. Test taker can track appeal status (submitted → under review → outcome). |
| **Backend/API** | Appeal-submit endpoint rejects requests if results have not yet been declared for that exam. Endpoint enforces successful payment (integrates with configured payment amount from Masters) before forwarding to the Examination Committee; unsuccessful/pending payment blocks forwarding. On successful payment, committee is notified automatically. Committee's "request score revision" endpoint routes to the Chief of Examiner (Chief Executive role) for approval; confirm no score can be modified before this approval is granted (attempt direct update and expect rejection). Chief Executive approve/reject endpoint restricted to that role only. On approval, only the selected/approved skill(s) are updated — verify unapproved skills remain untouched. Final-outcome notification (SMS/email) fires regardless of whether the score changed. |
| **Database** | Appeal record linked to original Registration Number and specific skill(s) under appeal. Payment transaction recorded and linked to the appeal. Workflow states (Submitted → Paid → Under Review → Revision Requested → Approved/Rejected → Closed) stored with timestamps for full audit trail. Band-score table retains both original and revised values (audit history), not just an overwrite. |

### 2.7 Certificate Generation & Update (BRD §5.7)

| Layer | Test Cases |
|---|---|
| **Frontend** | Test taker can view/download certificate using Registration Number or CID; access is scoped only to the owner (attempt to view another user's certificate should fail). Certificate displays correct scores, title, logos, authorized signature, QR code, issuance date, and validity period. If a test taker has multiple exam attempts, all previous certificates remain listed and accessible. |
| **Backend/API** | Certificate-generation endpoint triggers only after Committee completes band-score update, and is blocked for Absent-status registrations (cross-check with §2.3). Certificate fields (paper size/orientation/border, logos, title, declaration statement, signature/seal) are pulled from the Masters/template table, not hard-coded. QR-code generation endpoint produces a unique code per certificate; verify code uniqueness and correct verification/lookup behavior. Download endpoint is authorization-scoped (403 for non-owner, non-admin roles). Validity-date calculation is correct: issuance date = date of band-score update; validity = issuance date + configured validity period from Masters. |
| **Database** | Certificate table stores a distinct record per exam attempt — new attempts never overwrite/replace prior certificates. QR code column has a uniqueness constraint. Validity date is stored (not computed only on the fly) and matches the calculation rule. Foreign key ties certificate to Registration Number and Exam ID for traceability. |

### 2.8 Dashboards & Reports (BRD §6)

| Layer | Test Cases |
|---|---|
| **Frontend** | Each role (DCDD, Exam Head, Committee, Chief of Examiner/Chief Executive, Test Taker) sees only the KPIs/widgets relevant to their permissions — verify no data leakage across roles. Dashboards reflect real-time data from Registration, Question Paper Upload, Band Score Entry, and Certificate modules. Report filters (date range, skill type, exam session, exam ID) function correctly and combine (AND logic) as expected. Export buttons produce correctly formatted PDF, Excel, and CSV files matching the on-screen data. |
| **Backend/API** | Reporting endpoints enforce role-based data scoping server-side (not just hidden in UI — attempt direct API call with a lower-privileged token and confirm restricted/filtered data). Predefined report endpoints exist and return correct data for: registration summary, verification status, band-score distribution, appeal tracking, certificate validity status, exam schedules, committee performance, system audit logs. Ad-hoc/custom report endpoint restricts field selection to an allow-list (no arbitrary SQL/field injection). Export endpoints set correct Content-Type headers and produce valid, parseable files. |
| **Database** | Reporting queries/views reconcile exactly with source transactional tables (no drift). Audit-log table is append-only/immutable (attempt update/delete and confirm it's blocked or logged as a security event). When a new field/module is added, dashboard config table picks it up without requiring a schema migration touching every report (verify via a test "new field" addition). |

### 2.9 Authentication & Role-Based Access Control (BRD §6.1)

| Layer | Test Cases |
|---|---|
| **Frontend** | Login supports both local system credentials and NDI federated login. Unauthorized/unauthenticated users are redirected to login for protected routes. Menu items and module access reflect the logged-in user's role(s) — hidden, not just disabled, for unauthorized modules. Admin screens allow create/edit/delete of Users, Roles, and Permissions. |
| **Backend/API** | Login endpoint validates both local credential and NDI token paths; invalid/expired NDI tokens are rejected with a clear error. Session/token validation middleware applied consistently across all protected endpoints (spot-check each module's API for missing auth checks). User/Role/Permission CRUD endpoints restricted to System Administrator only. Permission checks (Create/Read/Update/Delete) are enforced per module, per role — build a full role × module × CRUD-action test matrix and verify each cell. A user can be assigned multiple roles simultaneously and effective permissions union correctly. Administrative functions enforce MFA per NFR (§8 Security) — test that bypassing MFA is not possible. |
| **Database** | User, Role, Permission, Role-Permission mapping, and User-Role mapping tables maintain referential integrity (no orphaned mappings). Multiple roles per user supported via proper many-to-many schema. Local credentials are stored hashed (never plaintext); NDI tokens are never persisted in plaintext or logged. |

---

## 3. Integration Test Cases (BRD §7.2)

- **NDI verification:** success path (valid CID, data matches); failure path (NDI unreachable/timeout) triggers documented retry + fallback to interim manual verification; data mismatch between NDI and submitted form is flagged, not silently accepted.
- **Census (DCRC) cross-check:** demographic data match/mismatch handling; missing-record handling.
- **SMS gateway:** notification triggers fire correctly on each defined event (ack, verification status, exam schedule, results, appeal outcome, absent marking); delivery failure is retried and logged.
- **Email service:** same trigger/retry/logging coverage as SMS.
- **General:** all external API calls are logged (request, response, status, timestamp) in an integration/audit log for traceability; simulate downstream outages and confirm the core registration/exam workflow degrades gracefully rather than failing hard.

---

## 4. Non-Functional Test Cases (BRD §8 — Phase 1 relevant items)

| Category | Test Cases |
|---|---|
| Performance | Load test with ≥100 concurrent users; average page load < 3 seconds simulated on 3G/4G network conditions. |
| Scalability | Confirm architecture supports adding new dzongkhags/gewogs and new modules via configuration, without redesign — validate via a config-only "new region" test. |
| Availability | Uptime monitoring ≥ 99% excluding planned maintenance; core functions (registration, certificate access) verified reachable outside normal business hours. |
| Reliability | Simulate connectivity interruption mid-transaction; confirm auto-save/backup prevents data loss and no partial/corrupt records are committed. |
| Security | Full RBAC test matrix (see §2.9); HTTPS/TLS enforced on all endpoints (reject plain HTTP); audit trail present for every sensitive action; run a vulnerability scan / basic penetration test pass. |
| Maintainability | Confirm a workflow or master-table config change can be made via admin UI without a code deployment. |
| Usability | UI walkthrough for low-literacy users; mobile-first rendering check on Android smartphone and tablet viewports. |
| Interoperability | Verify integration conformance with DCRC and NDI API contracts; confirm exposed APIs are documented and callable by an external test client. |
| Portability | Cross-browser test on desktop (Chrome/Edge/Firefox) and Android mobile devices. |
| Backup & Recovery | Confirm daily automated backups run and are restorable; simulate an outage and measure Recovery Time Objective (target < 4 hours). |
| Compliance | Confirm authentication/data-handling aligns with NDI regulations and applicable Bhutanese data-protection Acts/Rules. |

> **Note on NFR targets:** `backend/docs/IMPLEMENTATION-STATUS.md` records unresolved conflicts in the source NFR text — peak concurrency (`[1,00]` = 100 or 1,000?), log retention (12 months vs. 90 days), and recovery time (MTTR 2 hours vs. RTO 60 minutes, against the 4-hour figure above). Confirm each in writing with DCDD before running the corresponding NFR test; do not treat a passing run against an unconfirmed target as acceptance.

---

## 5. Explicitly Out of Scope for Phase 1 Testing

Do **not** write or execute test cases for the following — they belong to Phase 2 or are excluded entirely per the BRD:

- Mock Test Module (practice tests, automated scoring/feedback)
- Online Examination Module (online/remote test delivery)
- Live Examination Monitoring & real-time exam audit logs
- Biometric authentication/verification
- Any online/remote exam delivery flow (Phase 1 exams remain offline/in-person; the system only manages registration, scoring, certification, and question-bank storage around that offline exam)

---

## 6. Test Data & Environment Notes

- Use sandbox/staging endpoints for NDI and Census (DCRC) — never point automated tests at production identity systems.
- Seed a range of test CIDs covering: valid/verifiable, invalid, and NDI-mismatch scenarios.
- Configure test Masters data (registration window, capacity limit, payment amount, certificate validity) to known values before each test run so expected outcomes are deterministic.
- Prepare sample encrypted question papers/answer sheets for the Question Paper Upload module.
- Maintain a role × credential test-user matrix (Test Taker, DCDD, Exam Head/Chief of Examination, Committee Member, Committee Head, Chief Executive/Chief of Examiner, System Admin) for RBAC testing across all modules.

### 6.1 Runnable entry points in this repository

| Suite | Command (repository root) | Direct equivalent |
|---|---|---|
| Backend unit/contract tests | `npm test` | `npm test` in `backend/` |
| Backend coverage | — | `npm run test:cov` in `backend/` |
| Backend acceptance against a live stack (gateway, PostgreSQL, RabbitMQ, encrypted MinIO) | `npm run backend:up` then `npm run test:acceptance` | `npm run test:local-acceptance` in `backend/` (needs `.env`) |
| Frontend unit/component/contract tests | `npm run frontend:test` | `npm test` in `dzongjuk-frontend/` |
| Frontend Playwright route suite (mock-data build) | `npm run frontend:test:e2e` | `npm run test:e2e` in `dzongjuk-frontend/` |
| Backend lint and full build | `npm run lint`, `npm run backend:build` | in `backend/` |
| Everything the gate expects, locally | `npm run quality` | — |

CI (`.github/workflows/quality.yml`) runs on every pull request and every push to `main`: frontend contract tests, a high-severity production dependency audit, and the Chromium route suite; then the backend build, lint, unit tests, and its own dependency audit. It does **not** run the live-stack acceptance script — that stays a local/staging step.

Frontend E2E runs against `VITE_USE_MOCK_DATA=true`, so it exercises routing, RBAC visibility, and rendering — not server enforcement. Every server-side assertion in Sections 2–4 must be executed against a real backend, not the mock build.

---

## 7. Traceability to the Current Implementation

The endpoints, permission strings, and tables below exist in this repository as of this document. Use them as the concrete targets for the API and DB test cases above; where a row says *not implemented*, the test case is still in scope but must be written against the design, and the gap tracked in Section 8.

### 7.1 Masters (§2.1)

| Item | Where |
|---|---|
| Registration window & capacity | `POST/PATCH /exams`, `PATCH /exams/:id/status` — permission `exam.window.manage` (`backend/apps/registration-service/src/registration.controller.ts`) |
| Appeal fee amount | `GET /appeal-fees/active`, `POST /appeal-fees`, `POST /appeal-fees/:id/approve` — permission `appeal.fee.manage` |
| Certificate template & validity fields | `GET/POST /certificate-templates`, `POST /certificate-templates/:id/approve` — permission `certificate.template.manage` |
| Scoring rules (range, increments, band mapping) | `GET/POST /scoring-rules`, `POST /scoring-rules/:id/approve` — permission `score.rule.manage` |
| Tables | `registration.exams`, `appeal_certificate.fee_rules`, `appeal_certificate.certificate_templates`, `result.scoring_rules` |
| Audit of changes | `identity.audit_events`, `result.audit_events`, `appeal_certificate.audit_events`, `reporting.audit_events` |

Masters are **approval-gated and effective-dated** rather than free-form editable: fee rules, certificate templates, and scoring rules each require a separate `approve` call. Test cases must cover the create → approve transition, and confirm an unapproved version is never used by the workflow.

### 7.2 Registration (§2.2)

| Item | Where |
|---|---|
| Submit | `POST /applications/exam/:examId` — `registration.application.submit` |
| Own applications | `GET /applications/my` |
| Cancel / resubmit | `POST /applications/:id/cancel`, `POST /applications/:id/resubmit` |
| DCDD verification | `POST /applications/:id/start-review`, `/return`, `/verify` — `registration.application.verify` |
| Pending queue | `GET /verification/pending` |
| Payment record | `POST /applications/:id/payment` |
| History | `GET /applications/:id/history` |
| Tables | `registration.applications`, `registration.application_history`, `registration.waitlist_entries`, `registration.exams`, `registration.idempotency_records`, `registration.outbox_events` |

Waitlisting is a first-class application state with its own table, and the service uses serializable transactions and row locks — the concurrency test in §2.2 should target `registration.waitlist_entries` ordering and the capacity counter together.

### 7.3 Absentees (§2.3)

| Item | Where |
|---|---|
| List / mark | `GET /attendance`, `PATCH /attendance/:applicationId` — permission `attendance.mark` |
| Tables | `registration.attendance`, `registration.application_history` |
| Whole-exam absence rule | asserted in `backend/test/contracts.spec.ts` |
| Score eligibility gate | `result.candidate_eligibility` (populated from registration events) |

### 7.4 Question Paper Upload (§2.4)

| Item | Where |
|---|---|
| Upload | `POST /question-papers` — `question.secure.upload` |
| Timed download | `GET /question-papers/:id/question-document`, `/answer-document` — `question.secure.download` |
| Publish as sample | `POST /question-papers/:id/publish-sample` — `question.secure.publish` |
| Public samples | `GET /sample-papers`, `GET /sample-papers/:id/:type` (`@Public()`) |
| Assignments | `POST /question-papers/assignments` — `question.assignment.manage` |
| Tables | `assessment.question_papers`, `assessment.question_documents`, `assessment.sample_publications`, `assessment.exam_content_assignments`, `assessment.access_audit_events`, `assessment.result_declaration_projections` |
| Encryption | AES-256-GCM envelope encryption, covered by `backend/test/encryption.spec.ts` |

Note the sample endpoints are deliberately **public**, not merely authenticated — §2.4's "visible to all system users" case should assert the public contract, and separately assert that nothing is published before the matching row exists in `assessment.result_declaration_projections`.

### 7.5 Band Scores (§2.5)

| Item | Where |
|---|---|
| Committee | `GET/POST/PUT /exams/:examId/committee` — `committee.manage`, read via `score.view` |
| Draft entry | `PUT /score-sheets/:applicationId/draft` — `score.enter` |
| Submit (locks) | `POST /score-sheets/:scoreSheetId/submit` — `score.submit` |
| Read | `GET /exams/:examId/scores`, `GET /exams/:examId/candidates` |
| Declare | `POST /exams/:examId/declare-results` — `result.declare` |
| Own result | `GET /results/my` — `score.view_own` |
| Tables | `result.committees`, `result.committee_members`, `result.score_sheets`, `result.score_versions`, `result.result_declarations`, `result.candidate_eligibility` |

Immutability is implemented as **versioned rows** (`result.score_versions`), not an in-place `revision_approved` flag — write the §2.5 DB assertion against version history rather than a mutable column.

### 7.6 Appeals (§2.6)

| Item | Where |
|---|---|
| Submit | `POST /appeals` — `appeal.submit` |
| Payment confirm | `POST /appeals/:id/payment/confirm` (`@Public()`, internal-key transport) |
| Committee review | `POST /appeals/:id/committee-review` — `appeal.review` |
| Chief decision | `POST /appeals/:id/decision` — `appeal.approve` |
| Apply revision | `POST /appeals/:id/apply-revision` — `appeal.approve`, calls `POST /internal/score-sheets/:scoreSheetId/appeal-revisions` in the result service |
| Tables | `appeal_certificate.appeals`, `appeal_skills`, `appeal_history`, `committee_reviews`, `approvals`, `payments`, `payment_events`, `fee_rules`, `idempotency_records` |
| Contract assertions | `backend/test/contracts.spec.ts` (approval ≠ applied revision; internal-key transport scope) |

The payment-confirm and revision endpoints are `@Public()` but guarded by an internal service key. `appeal.service.spec.ts` ("rejects payment with wrong internal service key") and `registration.service.spec.ts` ("returns 403 when internal key is wrong") assert this today — keep those cases green rather than letting them rot, because a public route decorator is exactly the kind of thing a regression can widen silently.

### 7.7 Certificates (§2.7)

| Item | Where |
|---|---|
| Generate | `POST /certificates/generate` — `certificate.issue`, idempotency-key header |
| Own list | `GET /certificates/my` — `certificate.view_own` |
| File download | `GET /certificates/:id/file` (owner-scoped) |
| History | `GET /certificates/:id/history` |
| Revoke | `POST /certificates/:id/revoke` — `certificate.revoke` |
| Public verification | `GET /public/certificates/verify/:token` (signed QR token) |
| Tables | `appeal_certificate.certificates`, `certificate_files`, `certificate_access_events`, `certificate_templates` |

Public verification returns a **minimal** field set by design; §2.7's QR test should assert both that the token resolves and that the response does not leak scores or personal data beyond the approved public fields.

### 7.8 Dashboards & Reports (§2.8)

| Item | Where |
|---|---|
| Catalog / predefined | `GET /reports/catalog`, `/summary`, `/registration`, `/scores`, `/appeals` — `report.run` |
| Ad-hoc (allow-listed) | `POST /reports/query` — rejects uncatalogued fields, covered by `backend/test/reporting.spec.ts` |
| Saved definitions | `POST/GET /reports/saved` |
| Export jobs | `POST /reports/jobs` (202), `GET /reports/jobs/:id`, `GET /reports/jobs/:id/download` (owner-only) |
| Role dashboards | `GET /dashboard`, `PUT /dashboard/config/:roleCode` — `dashboard.configure` |
| Audit viewer | `GET /audit/events`, `/events/:id`, `/export` — `audit.view` |
| Tables | `reporting.resource_projections`, `dashboard_configs`, `saved_reports`, `report_jobs`, `audit_events`, `processed_events` |

Reporting reads **projections** fed by idempotent RabbitMQ consumers, not the owning services' tables. The §2.8 "reconcile exactly with source tables" case is therefore an eventual-consistency test: assert convergence after the projection drains, and separately assert that replaying an event does not double-count (`reporting.processed_events`).

### 7.9 Authentication & RBAC (§2.9)

| Item | Where |
|---|---|
| Local login / register | `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` |
| NDI | `POST /auth/ndi/initiate`, `/ndi/status`, `/ndi/cancel`, `/ndi/webhook` |
| Session | `GET /auth/me` |
| User admin | `GET/POST/PUT/DELETE /admin/users`, `PATCH /admin/users/:id/status`, `PUT /admin/users/:id/roles` — `admin.user.read` / `admin.user.manage` |
| Role & permission admin | `GET/POST /admin/roles`, `GET /admin/permissions`, `PUT /admin/roles/:id/permissions` — `admin.role.read` / `admin.role.manage` |
| Tables | `identity.users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sessions`, `login_attempts`, `ndi_login_requests`, `audit_events` |
| Guard behaviour | `backend/test/security.guard.spec.ts` (grant, admin wildcard, denial) |
| Frontend matrix | `dzongjuk-frontend/src/config/accessMatrix.js` + `accessMatrix.contract.test.js` |

Two implementation facts change how §2.9 should be tested:

1. Local login is **denied** for administrative accounts by policy (NDI-only) — the "local credentials" path in §2.9 applies to test takers and non-privileged users, and the admin case must assert denial.
2. The permission guard grants a **System Administrator wildcard**. The role × module × CRUD matrix must include a case proving the wildcard is not reachable by any other role.

---

## 8. Current Automated Coverage and Known Gaps

### 8.1 Already automated

| Area | Suite |
|---|---|
| Workflow contract invariants (four skills, absence/waitlist states, declaration vs. archival, public vs. protected routes, appeal approval ≠ applied revision, certificate lifecycle) | `backend/test/contracts.spec.ts` |
| Question-paper encryption round trip, tamper rejection, production key length | `backend/test/encryption.spec.ts` |
| Report field allow-listing and grouping; rejection of arbitrary fields | `backend/test/reporting.spec.ts` |
| Score mean/band calculation, increment validation, privileged approval for formula/declaration | `backend/test/scoring.spec.ts` |
| Permission guard grant/deny and admin wildcard | `backend/test/security.guard.spec.ts` |
| Full permission matrix: 14 permissions × 7 roles, admin wildcard, multi-role union, `@Public()` bypass, and per-role negative cases | `backend/test/rbac.matrix.spec.ts` |
| Outbox envelope contract for all 13 domain events, NDI-timeout and census-mismatch contracts, notification trigger coverage, audit-row shape | `backend/test/integration.events.spec.ts` |
| Exam state machine, registration window and duplicate-CID rejection, waitlist creation and promotion on cancellation, registration-number format, idempotency-key replay, absent marking, certificate-profile internal key | `backend/test/registration.service.spec.ts` |
| Committee formation (duplicate members, zero/two Heads, lock after entry), score entry (non-Head, absent candidate, post-submit lock), declaration (MFA assurance, completeness), appeal revision versioning | `backend/test/result.service.spec.ts` |
| Appeal submission gating, proportional fee, internal-key payment confirmation, committee recommendation paths, privileged Chief decision | `backend/test/appeal.service.spec.ts` |
| Upload validation, download access-window enforcement (before and after), sample publication gated on declaration | `backend/test/assessment.service.spec.ts` |
| Certificate owner-only access, validity = issuance + template months, per-attempt records, supersession on revision | `backend/test/certificate.service.spec.ts` |
| Local login, lockout after five failures, disabled accounts, admin NDI enforcement, token claims, NDI webhook paths, duplicate registration | `backend/test/auth.service.spec.ts` |
| Live-stack acceptance: registration, appeals, certificate PDF/QR/ownership, notification projection | `backend/scripts/local-acceptance.ts` (`npm run test:local-acceptance`) |
| Frontend access matrix contract | `dzongjuk-frontend/src/config/accessMatrix.contract.test.js` |
| Frontend RBAC rendering, service contracts, UI units | `src/rbac/rbac.test.jsx`, `src/services/frontend-services.contract.test.js`, `src/components/ui/Badge.test.jsx`, `src/utils/uuid.test.js` |
| Route rendering per role, registration and admin-created login flows | `dzongjuk-frontend/tests/e2e/routes.spec.js` |
| Registration window closed-state, mandatory fields, duplicate CID, cancel affordance, acknowledgement, own-status visibility | `dzongjuk-frontend/tests/e2e/registration.workflow.spec.js` |

### 8.2 Blocker: six backend suites do not currently compile

On `main` at the time of writing, `npm test` in `backend/` reports **6 failed suites, 7 passed, 150 tests passing** — the six failures are TypeScript compile errors, not assertion failures, so none of those tests execute at all:

`appeal.service.spec.ts`, `assessment.service.spec.ts`, `auth.service.spec.ts`, `certificate.service.spec.ts`, `registration.service.spec.ts`, `result.service.spec.ts`

`npm run lint` in `backend/` also fails with **71 errors** (mostly `@typescript-eslint/require-await` and unused imports across the same files, plus a parse error at `certificate.service.spec.ts:192`).

This matters for the plan, not just for CI: the §8.1 rows for those six suites describe tests that **exist but do not currently run**. Until they compile, treat that coverage as claimed rather than demonstrated, and do not count it toward Phase 1 sign-off.

### 8.3 Gaps to close before Phase 1 sign-off

| # | Gap | Section |
|---|---|---|
| 1 | The six suites above do not compile; their coverage is unverified until they do. | §8.2 |
| 2 | Waitlist promotion, capacity, and registration-number uniqueness are covered only as single-threaded unit tests with mocked repositories. No test exercises real concurrent submissions or concurrent approvals against PostgreSQL, which is where the ordering and uniqueness guarantees actually live. | §2.2 |
| 3 | Audit-log append-only enforcement is not tested — no attempted `UPDATE`/`DELETE` against `*.audit_events`. `integration.events.spec.ts` asserts audit-row *shape*, not immutability. | §2.8 |
| 4 | Reporting projection convergence and replay idempotency are not asserted end to end (`reporting.processed_events`). | §2.8, §7.8 |
| 5 | The RBAC matrix is asserted at the guard level. No test proves each of the nine controllers actually carries the intended `@Permissions(...)` decorator — a route shipped without one would pass the matrix suite. | §2.9 |
| 6 | NDI and DCRC adapters are foundation-only. `integration.events.spec.ts` fixes the timeout and mismatch *contracts*, but no test runs against a real or sandbox provider. | §3 |
| 7 | SMS/email delivery, retry, and logging remain unverifiable: the notification workflow is in-app only and provider adapters are open. | §3, §2.2 |
| 8 | Assurance-level gating is tested (declaration, certificate issuance, Chief decision), but actual MFA enrolment and challenge cannot be tested — provider and NDI assurance level are unresolved. | §2.9 |
| 9 | No performance, load, availability, backup/restore, or VAPT evidence; these require target GovTech infrastructure. | §4 |
| 10 | Frontend E2E still runs only against the mock-data build, so no browser-level test exercises real server enforcement. | §6.1 |

Gaps 6–9 are blocked on the external decisions listed in `backend/docs/IMPLEMENTATION-STATUS.md`; gaps 1–5 and 10 are actionable now against the existing code, and gap 1 blocks the rest.
