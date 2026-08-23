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

| Module | System Admin | DCDD Admin | Exam Head | Committee Head | Committee Member | Test Taker |
|---|---|---|---|---|---|---|
| User Management | CRUD | Read | No | No | No | No |
| Role Management | CRUD | Read | No | No | No | No |
| Registration | Full | Full | Read | Read | Read | Create / view own |
| Verification | Full | Full | Read | No | No | No |
| Absentee | Full | Full | Read | No | No | No |
| Question Upload | Full | Read | Full | Read | No | View sample only |
| Band Scores | Read | Read | Read | Submit | View | View own result |
| Re-evaluation | Read | Read | Read | Process | View | Submit own |
| Certificates | Full | Full | Read | Read | No | View own |
| Reports | Full | Full | Read | Read | Read | No |

### Chief Executive

Chief Executive is **absent from the approved document** but holds one grant the
workflow cannot function without: `appeals: process`, the chief approval step on a
re-evaluation. It holds no other module access. This is displayed on the Role and
Access Matrix screen under "Permissions outside the approved matrix" rather than
left implicit, and it needs ratifying alongside the rest of the matrix.

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
| `process` | Advance a re-evaluation through its approval step |
| `sample` | Read published sample papers only |

Levels satisfy actions as follows. Note that the own-scoped levels **never**
satisfy `read_all`:

| Level | Satisfies |
|---|---|
| `crud` | read, read_all, read_own, create, update, delete, manage |
| `full` | all of the above plus create_own, submit, process, sample |
| `read` | read, read_all, read_own, sample |
| `submit` | read, read_all, read_own, submit |
| `process` | read, read_all, read_own, process |
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
| `GET /questions`, `GET /questions/:id`, `GET /questions?examId=` | `questions:read_all` |
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
| `POST /appeals/:id/committee-review` | `appeals:process` (Committee Head) |
| `POST /appeals/:id/decision` | `appeals:process` (Chief Executive) |

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

3. **Modules outside the matrix.** `masters`, `notifications`, `dashboard`, technical
   settings, and operational settings have no entry in the approved document and are
   currently governed by hard-coded role lists in the frontend. They need either a
   matrix row or an explicit, separately documented rule.

4. **Deny by default.** `getAccessLevel` returns `none` for an unknown role or an
   unlisted module, and `canAccess` then returns `false`. The backend should fail
   closed the same way.

5. **Consuming the matrix.** `docs/rbac/access-matrix.json` is generated from the frontend
   source. Read it directly rather than re-typing the rules, so the two sides cannot
   drift. Regenerate after any change to `accessMatrix.js`.
