# RBAC Integration Contract

This document defines the access rules the frontend enforces, so the backend can
enforce the identical set. It exists because **frontend guards are a usability
layer, not a security boundary** - every rule below has to be re-checked server
side, or it is not enforced at all.

- **Source of truth:** `frontend/src/features/rbac/accessMatrix.js`
- **Machine-readable copy:** [`access-matrix.json`](access-matrix.json), regenerated with
  `npm --prefix frontend run export:access-matrix`
- **Pinned by:** `src/features/rbac/accessMatrix.contract.test.js` (transcribes the approved
  document cell by cell) and `tests/e2e/routes.spec.js` (requests every denied route
  directly by URL)

---

## 1. The approved matrix

| Module | System Admin | DCDD Admin | Exam Head | Committee Head | Committee Member | Chief of Examiner | Test Taker |
|---|---|---|---|---|---|---|---|
| User Management | CRUD | Read | No | No | No | No | No |
| Role Management | CRUD | Read | No | No | No | No | No |
| Registration | Full | Full | Read | Read | Read | Read | Create / view own |
| Verification | Full | Full | Read | No | No | No | No |
| Absentee | Full | Full | Read | No | No | No | No |
| Question Upload | Full | Read | Full | Read | No | Read | View sample only |
| Band Scores | Read | Read | Read | Submit | View | Read | View own result |
| Re-evaluation | Read | Read | Read | Process | View | **Approve** | Submit own |
| Certificates | Full | Full | Read | Read | No | Read | View own |
| Reports | Full | Full | Read | Read | Read | Read | **View own** |

### Chief of Examiner

The approved document promotes this role into the matrix as a seventh column. Its
role **key remains `chief_executive`** in code, JWT claims and `identity.roles` -
only the display label follows the document, because renaming the key would mean a
data migration for no functional gain.

The document treats "Chief of Examiner" (BRD §5.5) and "Chief Executive" (BRD §5.6)
as the same role. That reading is still worth confirming with DCDD in writing: if
they are two roles, this matrix needs an eighth column and a second approval
permission.

### Operations outside the matrix

Every **role** is now covered. What remains outside are individual **operations** with
no matrix row - declaring results, constituting the exam committee, exam
configuration, permission management, and the technical and operational settings
screens. They are registered in `frontend/src/features/rbac/outOfMatrix.js` with the
roles they admit and the reason each has no matrix row, and rendered on the Role &
Access Matrix screen. They need ratifying alongside the matrix.

Result declaration is the one worth flagging: the matrix gives DCDD **Read** on Band
Scores and gives no role `manage`, so a strict reading would leave the action with no
holder at all and strand the workflows it unlocks. It is treated as an exam
operation, held by DCDD and the System Administrator.

---

## 2. Action vocabulary

The single most important rule: **`read_own` and `read_all` are different
permissions.** Collapsing them is how a Test Taker ends up able to read every
applicant record.

| Action | Meaning |
|---|---|
| `read_all` | Read records belonging to **any** user |
| `read_own` | Read **only** records belonging to the requesting user |
| `create` | Create a record on behalf of anyone |
| `create_own` | Create a record owned by the requesting user |
| `update` / `delete` | Modify / remove a record |
| `manage` | Administrative operations on the module |
| `submit` | Submit band scores for any candidate |
| `submit_own` | Submit a request concerning the requesting user only |
| `process` | Run the **committee review** step of a re-evaluation. Does **not** approve it |
| `approve` | Take the **final decision** on a re-evaluation. Does **not** run the committee review step |
| `sample` | Read published sample papers only |
| `secure_read` | Open the **encrypted** question paper or answer sheet, as opposed to its metadata |

Two separations carry weight beyond `read_own` / `read_all`:

- **`process` and `approve` are not interchangeable.** The document gives the
  Committee Head "Process (pending approval)" and the Chief of Examiner "Approve".
  If one action satisfied the other, either role could complete the other's step,
  and the two-person control the re-evaluation workflow rests on would be gone.
- **`read` on Question Upload is not `secure_read`.** Question Upload "Read" is
  permission to see that a paper exists, not to open it. Only `full` grants
  `secure_read`, which keeps the encrypted paper with the Exam Head as the BRD
  requires while DCDD, Committee Head and Chief of Examiner still get their listing.

Levels satisfy actions as follows. Note that the own-scoped levels **never**
satisfy `read_all`:

| Level | Satisfies |
|---|---|
| `crud` | read, read_all, read_own, create, update, delete, manage |
| `full` | all of the above plus create_own, submit, process, approve, sample, secure_read |
| `read` | read, read_all, read_own, sample |
| `submit` | read, read_all, read_own, submit |
| `process` | read, read_all, read_own, process |
| `approve` | read, read_all, read_own, approve |
| `create_own` | read, read_own, create, create_own |
| `read_own` | read, read_own |
| `submit_own` | read, read_own, submit, submit_own |
| `sample` | sample |

---

## 3. Endpoint enforcement map

What the backend must require on each endpoint. Anything marked **own** must be
scoped by the **JWT subject** - never by an identifier supplied in the request.

### Identity and administration

| Endpoint | Required |
|---|---|
| `GET /admin/users`, `GET /admin/users/:id` | `users:read_all` |
| `POST /admin/users` | `users:create` |
| `PUT /admin/users/:id`, `PATCH /admin/users/:id/status` | `users:update` |
| `DELETE /admin/users/:id` | `users:delete` |
| `GET /admin/roles`, `GET /admin/permissions` | `roles:read_all` |
| `POST /admin/roles` | `roles:create` |
| `PUT /admin/roles/:id`, `PUT /admin/roles/:id/permissions` | `roles:update` |
| `DELETE /admin/roles/:id` | `roles:delete` |

### Registration

| Endpoint | Required |
|---|---|
| `GET /applications`, `GET /applications?examId=` | **`registration:read_all`** - must reject Test Taker |
| `GET /applications/my` | `registration:read_own`, scoped to the token subject |
| `GET /applications/:id` | `read_all`, or `read_own` **and** the caller owns the record |
| `POST /applications/exam/:examId` | `registration:create_own` |
| `PUT /applications/:id` | owner before submission, else `registration:manage` |
| `POST /applications/:id/payment` | `registration:manage` |
| `GET /exams`, `GET /exams/:id` | any registration access (Test Takers must browse windows) |
| `POST /exams`, `PATCH /exams/:id`, `PATCH /exams/:id/status` | `registration:manage` |

### Verification

The verify, return, and review actions are **verification** operations even though
they sit under an `/applications/` path. Guarding them with a registration
permission would expose them to Committee roles and Test Takers, whom the matrix
marks **No**.

| Endpoint | Required |
|---|---|
| `GET /verification/pending` | `verification:read_all` |
| `POST /applications/:id/start-review` | `verification:manage` |
| `POST /applications/:id/verify` | `verification:manage` |
| `POST /applications/:id/return` | `verification:manage` |

### Absentee

| Endpoint | Required |
|---|---|
| `GET /attendance`, `GET /attendance?examId=` | `attendance:read_all` |
| `PATCH /attendance/:applicationId`, `POST /attendance/bulk` | `attendance:manage` |

### Question Upload

| Endpoint | Required |
|---|---|
| `GET /questions`, `GET /questions/:id`, `GET /questions/:id/metadata` | `questions:read_all` - metadata only |
| `GET /questions/:id/question-document`, `GET /questions/:id/answer-document` | **`questions:secure_read`** - the encrypted files, Exam Head only, inside the exam window |
| `POST /questions` | `questions:create` |
| `PATCH /questions/:id/publish`, `POST /questions/:id/publish-sample` | `questions:manage` |
| `DELETE /questions/:id` | `questions:delete` |
| `GET /sample-papers`, `GET /sample-papers/:id/:type` | `questions:sample` - the only questions route a Test Taker may reach |

### Band Scores

| Endpoint | Required |
|---|---|
| `GET /scores`, `GET /exams/:examId/scores`, `GET /exams/:examId/candidates` | `scores:read_all` |
| `GET /results/my` | `scores:read_own`, scoped to the token subject |
| `PUT /scores/:id`, `PUT /score-sheets/:applicationId/draft` | `scores:submit` |
| `GET /exams/:examId/committee` | `scores:read_all` |
| `PUT /exams/:examId/committee`, `POST /exams/:examId/declare-results` | `scores:manage` |

A Test Taker must additionally only receive **published** results.

### Re-evaluation

| Endpoint | Required |
|---|---|
| `GET /appeals` | `appeals:read_all` |
| `GET /appeals/my` | `appeals:read_own`, scoped to the token subject |
| `GET /appeals/:id`, `GET /appeals/:id/history` | `read_all`, or owner with `read_own` |
| `POST /appeals` | `appeals:submit_own` |
| `POST /appeals/:id/committee-review` | `appeals:process` (Committee Head) - must reject Chief of Examiner |
| `POST /appeals/:id/decision`, `POST /appeals/:id/apply-revision` | **`appeals:approve`** (Chief of Examiner) - must reject Committee Head |

### Certificates

| Endpoint | Required |
|---|---|
| `GET /certificates`, `GET /certificates/template` | `certificates:read_all` |
| `GET /certificates/my` | `certificates:read_own`, scoped to the token subject |
| `GET /certificates/:id`, `GET /certificates/:id/file` | `read_all`, or owner with `read_own` |
| `POST /certificates/generate` | `certificates:manage` |
| `GET /public/certificates/verify/:token` | public, unauthenticated by design |

### Reports

| Endpoint | Required |
|---|---|
| `GET /reports/summary`, `/reports/registration`, `/reports/scores`, `/reports/appeals` | `reports:read_all` - must reject Test Taker |
| `GET /reports/jobs/:id` | `reports:read_all` |
| `POST /reports/jobs` | `reports:manage` |

The Test Taker's Reports grant is **View own**, and the frontend serves it at
`/reports/my` by composing endpoints that are already own-scoped -
`/applications/my`, `/results/my`, `/appeals/my`, `/certificates/my`. It needs no
new backend endpoint. If an own-scoped reporting endpoint is ever added, it must be
scoped by the token subject and must not satisfy any `read_all` route above.

---

## 4. Notes for the backend implementation

1. **Scope own-records by the token subject.** The frontend already calls
   `/applications/my`, `/results/my`, `/appeals/my`, and `/certificates/my` with no
   identifier in the request - the service functions accept a `userId` argument but
   deliberately ignore it. Keep it that way: never trust a client-supplied user id
   to decide whose records to return.

2. **`read_own` must not satisfy a `read_all` endpoint.** This was a real defect in
   the frontend: because "view own" implied a plain `read`, a Test Taker could load
   the full applicant list. Enforce the two as distinct permissions.

3. **Operations outside the matrix.** `masters`, `notifications`, `dashboard`,
   technical and operational settings, result declaration and committee setup have no
   entry in the approved document. They are no longer hard-coded ad hoc: each is
   registered in `frontend/src/features/rbac/outOfMatrix.js` with its roles and its
   reason, and displayed on the Role & Access Matrix screen. They still need either a
   matrix row or an explicit, separately documented rule.

4. **Deny by default.** `getAccessLevel` returns `none` for an unknown role or an
   unlisted module, and `canAccess` then returns `false`. The backend should fail
   closed the same way.

5. **Consuming the matrix.** `docs/rbac/access-matrix.json` is generated from the frontend
   source. Read it directly rather than re-typing the rules, so the two sides cannot
   drift. Regenerate after any change to `accessMatrix.js`.

---

## 5. Backend RBAC dependencies

The frontend has been aligned to the approved matrix (Phase 2). The items below could
**not** be closed from the frontend, because the backend permission model cannot express
the rule. In each case the frontend fails closed and hides the control - which is a
usability measure, not enforcement. **The system is not RBAC-compliant until these are
resolved server-side.**

### 5.1 Chief of Examiner holds no permissions at all — blocking

Migration `0008_access_matrix.sql` deletes `appeal.approve` and `report.run` from the
`chief_executive` role, on the grounds that the role was absent from the approved
matrix. It is no longer absent. The role now holds nothing, so `POST /appeals/:id/decision`
and `POST /appeals/:id/apply-revision` - both `@Permissions('appeal.approve')` - are
reachable only by `admin` through its `*` wildcard.

Every Chief of Examiner screen the frontend now exposes will return 403 against a live
backend. **Backend RBAC dependency — backend permissions are currently missing.**

### 5.2 Registration Read cannot be separated from Verification

`GET /applications` is guarded by `registration.application.verify`, the same permission
that authorises `/start-review`, `/return` and `/verify`. The matrix gives Committee Head,
Committee Member and Chief of Examiner **Read** on Registration and **No** on Verification.
Granting the read would grant the writes.

The frontend withholds the verification UI and route, but cannot give those three roles a
Registration read the backend will serve. **Backend RBAC model limitation — the frontend
cannot independently solve this without creating an incorrect security assumption.**
Resolving it needs a `registration.application.read` permission on the list and detail
routes, leaving the workflow actions on `registration.application.verify`.

### 5.3 Question metadata cannot be separated from the encrypted document

`question.secure.download` guards the listing, the detail and the metadata routes **and**
the two routes that stream the decrypted question paper and answer sheet. The matrix gives
DCDD, Committee Head and Chief of Examiner **Read** on Question Upload.

The frontend now shows the listing to Read roles and the document controls only to roles
with `secure_read`. That is a usability split; the server still exposes one permission for
both. Until it is split, those roles will 403 on the listing itself. Resolving it needs a
`question.metadata.read` permission on `GET /questions`, `GET /questions/:id` and
`GET /questions/:id/metadata`.

### 5.4 Committee Member still holds `appeal.review` server-side

Migration `0001_initial.sql` grants `appeal.review` to `committee_member`, so a member can
call `POST /appeals/:id/committee-review` directly. The approved matrix gives Committee
Member **View** only on Re-evaluation, and the frontend now hides every decision control
from that role - but hiding a button is not enforcement. Resolving it means revoking
`appeal.review` from `committee_member`.

### 5.5 System Administrator wildcard — accepted, documented

The `admin` role holds `*`, which satisfies `score.submit`, `result.declare` and
`appeal.approve` even though the matrix gives it **Read** on Band Scores and
Re-evaluation. This is retained deliberately as break-glass access and is **not** treated
as a defect. The frontend does not mirror it: `PrivateRoute` no longer admits `admin` to a
role-listed route just for being `admin`, and admin's screens follow the matrix.
