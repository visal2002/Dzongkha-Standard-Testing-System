# Dzongjuk - Dzongkha Standard Testing System

![Dzongjuk Logo](frontend/public/images/Dzongjuk%20logo.png)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646cff.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38b2ac.svg?logo=tailwind-css)

> **Dzongjuk** is the frontend and microservice backend for the **Dzongkha Standard Testing System (DSTS)**, developed for the Department of Culture and Dzongkha Development (DCDD) in Bhutan.

It provides a secure, role-based administration portal covering the examination lifecycle from registration and verification through scoring, appeals, encrypted certificate generation, and notifications. Live workflows use the versioned APIs in `backend/`; mock responses remain available only as an explicit frontend demonstration mode. Each backend microservice owns an independent PostgreSQL database so a bounded feature can be deployed, retained, or removed without deleting another service's persistence.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Quality Checks](#quality-checks)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Project Architecture](#-project-architecture)
- [Available Roles & Navigation](#-available-roles--navigation)
- [Access Control](#-access-control)
- [Demo Accounts](#-demo-accounts)
- [Developer Notes & Design Tokens](#-developer-notes--design-tokens)
- [Performance & Security](#-performance--security)
- [License](#-license)

---

## 📖 Overview

The application presents a complete internal workflow for exam administration. It features a modern dark-first interface, role-based access control (RBAC), full-screen responsive layouts, profile picture uploads, and robust themed styling (Dark/Light). It is designed to be production-ready and easily integrable with a backend API.

---

## ✨ Key Features

- 🔐 **Role-Based Access Control (RBAC):** Custom dashboards and navigation for 7 distinct roles, driven by the approved access matrix in `src/features/rbac/accessMatrix.js`.
- 🪪 **Bhutan NDI Authentication:** QR-code and wallet deep-link sign-in against the Bhutan National Digital Identity service, with a self-contained demonstration flow when NDI credentials are not configured.
- 🌐 **Bilingual Interface:** English and Dzongkha via i18next. Dzongkha strings are currently `[dz]`-prefixed placeholders awaiting review by a certified linguist.
- 📝 **Registration Workflow:** Multi-step forms with Zod validation for robust application submissions.
- ✅ **Verification & Attendance:** Streamlined data tables for application verification and test day attendance.
- 📊 **Scoring & Appeals:** Secure band score entry and re-evaluation appeal workflows with chief approval.
- 🎓 **Certificates:** Automated certificate generation with embedded QR codes and PDF export.
- 📈 **Analytics & Reporting:** Interactive charts (Recharts) for real-time system metrics.
- 🌓 **Theming:** Full dark/light mode support using custom Tailwind CSS v4 design tokens.
- 🖥️ **Technical Settings:** Full IT/infrastructure configuration module for System Administrator (14 sections).
- ⚙️ **Operational Settings:** Exam business rules, fees, certificates, question paper security, QR verification, notifications & workflow for DCDD Admin (9 sections).
- 👤 **Profile & Settings:** Profile picture upload, password change, and system contact info management for all roles.

---

## 🛠 Tech Stack

| Category | Technologies |
| --- | --- |
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 |
| **Styling** | Tailwind CSS v4, Framer Motion v11, Lucide React |
| **Forms** | React Hook Form, Zod |
| **HTTP** | Axios (single `apiClient` in `src/services/api.js`) |
| **i18n** | i18next, react-i18next, i18next-browser-languagedetector (English + Dzongkha) |
| **Data Viz** | Recharts, TanStack Table v8 |
| **PDF** | @react-pdf/renderer v4 |
| **Utils** | React Hot Toast, qrcode.react (NDI login QR + certificate QR) |
| **Testing** | Vitest (service contracts), Playwright (Chromium route suite) |
| **Backend** | NestJS microservices, TypeORM, PostgreSQL, RabbitMQ, MinIO |
| **Gateway** | nginx (Docker Compose locally, Kubernetes in staging) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn
- Docker Desktop with Docker Compose

### Installation

From the repository root, the common development commands are:

```bash
npm run backend:up
npm run dev
```

`npm start` is also an alias for the frontend development server. Keep the backend containers running while using the frontend.

1. Configure and start the backend:

   ```bash
   cd backend
   cp .env.example .env
   # Replace every placeholder and generate local encryption/signing keys.
   docker compose up --build
   ```

   Compose creates and migrates eight service-owned databases before starting the APIs. See `backend/database/README.md` for ownership and removal rules.

2. Install frontend dependencies and enable live APIs:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Set VITE_USE_MOCK_DATA=false in .env.local.
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app in your browser:
   [http://localhost:5000](http://localhost:5000)

The API gateway runs at `http://localhost:8000`. Backend implementation evidence and unresolved external decisions are documented in `backend/docs/IMPLEMENTATION-STATUS.md`.

### Bhutan NDI sign-in

NDI is optional for local development. If `NDI_CLIENT_ID` and `NDI_CLIENT_SECRET` are blank in `backend/.env`, the identity service answers `POST /api/v1/auth/ndi/initiate` with HTTP 503 and the error code `NDI_NOT_CONFIGURED`. The frontend treats that specific code as a signal to render a self-contained demonstration QR flow, so the scanner still appears and completes after a short delay.

**A 503 on `/auth/ndi/initiate` during local development is therefore expected, not a fault.** Supply real credentials from [bhutanndi.com](https://bhutanndi.com/developers) to exercise the live service. The relevant backend settings are `NDI_AUTHENTICATION_URL`, `NDI_VERIFIER_URL`, `NDI_WEBHOOK_URL`, `NDI_CLIENT_ID`, `NDI_CLIENT_SECRET`, and `NDI_LOGIN_TTL_SECONDS`.

### CORS

The backend accepts browser origins listed in `CORS_ORIGINS` (default `http://localhost:5000`). Serving the frontend from another port, or reaching it via `127.0.0.1` rather than `localhost`, will be rejected by the browser as a CORS failure. Add any additional origin to that variable rather than working around it in the client.

### Building for Production

```bash
npm run build
npm run preview
```

## Quality Checks

Run the fast frontend service contracts from the repository root:

```bash
npm run frontend:test
```

Run the production-style Chromium route suite from the repository root:

```bash
npm run frontend:test:e2e
```

The route suite signs in as every demonstration role and checks all role-specific routes for rendering failures, browser errors, and runtime exception messages. Both frontend suites run against a mock build (`VITE_USE_MOCK_DATA=true`), so they need no backend containers.

Run the backend build, lint, and Jest suites:

```bash
npm run backend:build
npm run lint
npm test
```

Run the frontend contracts, backend build, lint, and backend tests in one command:

```bash
npm run quality
```

Note that `npm run quality` does not include the Playwright route suite or the `npm audit` dependency checks; CI runs both in addition, so a clean `quality` run is not by itself a guarantee that CI will pass.

GitHub Actions (`.github/workflows/quality.yml`) runs the frontend contract and route suites alongside the backend build, lint, tests, and production dependency audits on every pull request and every push to `main`.

---

## 🚢 Deployment

> **GitHub Actions performs continuous integration only.** `quality.yml` builds, lints, and tests; it holds no registry or cluster credentials and contains no deploy job. **Pushing to GitHub does not deploy anything.**

`backend/.gitlab-ci.yml` describes a full GitLab pipeline including `deploy-staging` and a manual `deploy-production`. That file is inert in this repository, because GitHub does not execute GitLab CI definitions. It is retained as the reference for the intended automated pipeline.

### Staging (manual)

Staging runs from the manifests in `deploy/k8s/staging/` against the GovTech registry `dev-harbor.systems.gov.bt`, in namespace `dzongjuk`. It comprises all eight backend services, the frontend, an nginx API gateway exposed via NodePort, and the PostgreSQL, RabbitMQ, and MinIO infrastructure.

```bash
# 1. Build and push a backend service image
cd backend
docker build --build-arg SERVICE=identity-service \
  -t dev-harbor.systems.gov.bt/dzongjuk/identity-service:<tag> .
docker push dev-harbor.systems.gov.bt/dzongjuk/identity-service:<tag>

# 2. Build and push the frontend
cd ../frontend
docker build -t dev-harbor.systems.gov.bt/dzongjuk/frontend:<tag> .
docker push dev-harbor.systems.gov.bt/dzongjuk/frontend:<tag>

# 3. Update the image tags in deploy/k8s/staging/{backend,frontend}.yaml, then apply
cd ..
kubectl apply -k deploy/k8s/staging
kubectl rollout status deployment/identity-service -n dzongjuk
```

Deploying requires a kubeconfig for the GovTech cluster and a `docker login` against `dev-harbor.systems.gov.bt`. Both are issued by GovTech and are not present in this repository.

### Known deployment issues

These are recorded so they are not rediscovered the hard way:

- **Two divergent Kubernetes definitions exist.** `deploy/k8s/staging/` (namespace `dzongjuk`, all eight services, real registry) is what staging actually runs. `backend/deploy/k8s/overlays/staging/` (namespace `dzongjuk-staging`, four services, placeholder registry `registry.example.gov.bt`) is what `.gitlab-ci.yml` targets. They are not reconciled, and the GitLab pipeline would not update the running staging environment.
- **Image tags have drifted.** Services are pinned to a mixture of hand-set tags rather than one release identifier, so staging does not necessarily represent a single commit.
- **`deploy/k8s/staging/api-gateway.conf` still uses literal `proxy_pass` hostnames with no `resolver` directive** — the same defect described under [Troubleshooting](#-troubleshooting), which has been fixed in the Docker Compose gateway but not yet in the Kubernetes one.

---

## 🔧 Troubleshooting

### "Network Error" in the browser, or the NDI scanner fails to render

If the frontend reports a network failure across many screens shortly after a backend rebuild, the API gateway is most likely proxying to stale container addresses.

nginx resolves a hostname written directly into `proxy_pass` **once, while loading its configuration**, and then caches that address for the lifetime of the worker process. Every `docker compose up --build` recreates the service containers, and Docker assigns them new IP addresses. The gateway carries on forwarding to addresses nothing is listening on and answers `502`, which the browser surfaces as `Network Error`. Because a `502` response carries no CORS headers, the browser may report it as a CORS failure instead, which is misleading.

This is fixed in `backend/deploy/docker/nginx.conf` by declaring Docker's embedded DNS server and holding each upstream in a variable, which defers resolution to request time:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;

set $identity http://identity-service:8001;
location ~ ^/api/v1/(auth|admin) { proxy_pass $identity$request_uri; }
```

Using a variable upstream also stops nginx appending the request URI implicitly, so `$request_uri` must be supplied explicitly, and any path-rewriting location must use `rewrite ... break` to produce the final path.

To confirm the gateway is healthy rather than guessing:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health          # expect 200
docker compose -f backend/compose.yml logs gateway | grep "connect() failed"   # expect no recent hits
```

A `502` indicates a routing or DNS fault. A `503` carrying a JSON body such as `NDI_NOT_CONFIGURED` is a legitimate application response and means routing is working correctly.

The Phase 1 QA test plan — module-by-module frontend, API, and database test cases, traceability to the endpoints and tables that exist today, and the list of coverage gaps still open — lives in [`docs/qa/QA-TEST-PLAN-PHASE-1.md`](docs/qa/QA-TEST-PLAN-PHASE-1.md).

---

## 📂 Project Architecture

```text
frontend/
├── src/
│   ├── components/ui/      # Button, Input, Modal, Table, Badge, Card, Tabs, Alert,
│   │                       # PageHeader, BhutanNDI (QR + wallet sign-in)
│   ├── layouts/            # AppLayout, Sidebar, Header
│   ├── features/
│   │   └── rbac/           # accessMatrix.js (the approved RBAC matrix and ROLE_LABELS),
│   │                       # AuthGuard, AccessDeniedPage, PermissionMatrix,
│   │                       # RoleAssignmentDrawer, and their tests
│   ├── contexts/           # AuthContext, ThemeContext
│   ├── constants/          # domain.js — shared enums, incl. ExamWindowStatus
│   ├── hooks/              # useApi.js — centralized async data-fetching hook
│   ├── i18n/               # index.js — English and Dzongkha resource bundles
│   ├── mocks/              # mockData.js — seed data for demonstration mode
│   ├── utils/              # examWindows.js (open-window selection), uuid.js
│   ├── pages/
│   │   ├── admin/          # UserManagement, RoleManagement, MasterConfiguration, TechnicalSettings
│   │   ├── auth/           # LoginPage
│   │   ├── appeals/        # AppealList, SubmitAppeal
│   │   ├── attendance/     # AttendanceList
│   │   ├── certificates/   # CertificateList
│   │   ├── dashboard/      # AdminDashboard, DCDDDashboard, ExamHeadDashboard,
│   │   │                   # CommitteeDashboard, ChiefDashboard, TestTakerDashboard
│   │   ├── dcdd/           # OperationalSettings
│   │   ├── notifications/  # Notifications
│   │   ├── questions/      # QuestionPapers, UploadQuestionPaper, SamplePapers
│   │   ├── registration/   # RegistrationWindows, ApplicationForm, MyApplications
│   │   ├── reports/        # Reports
│   │   ├── scores/         # ScoreEntry, ViewScores, ScoreSummary, CommitteeSetup
│   │   ├── verification/   # VerificationList
│   │   ├── ProfilePage.jsx
│   │   └── SettingsPage.jsx
│   ├── services/           # Per-module API services (admin, appeals, applications, attendance,
│   │                       # auth, certificates, exams, masters, notifications, questions,
│   │                       # reports, scores, verification) — all backed by apiClient (Axios)
│   ├── routes/             # index.jsx — React Router v7 route configuration with lazy loading
│   ├── App.jsx             # App entry with providers
│   └── main.jsx            # Application entry point
└── tests/e2e/              # Playwright route and registration suites
```

Modules inside `src/` import each other through the `@/` alias (`@/components/ui/Button`,
`@/features/rbac/accessMatrix`), declared in `vite.config.js`, `vitest.config.js`, and
`jsconfig.json`. Only same-directory imports stay relative.

Backend and deployment layout:

```text
backend/
├── apps/                   # Eight NestJS microservices, one folder per bounded context
├── libs/                   # Shared code: @dzongjuk/common, @dzongjuk/contracts, @dzongjuk/security
├── database/               # Per-service schemas and numbered migrations
├── deploy/docker/          # nginx.conf — local API gateway (resolver fix applied)
├── deploy/k8s/             # base manifests + staging/production overlays
├── test/
│   ├── apps/               # Per-service unit specs, mirroring apps/
│   ├── libs/               # Contract and security-guard specs
│   └── integration/        # Cross-service event and outbox contracts
├── compose.yml             # Local stack: services, Postgres, RabbitMQ, MinIO
└── .gitlab-ci.yml          # Reference pipeline (not executed by GitHub)

deploy/k8s/staging/         # Manifests staging actually runs (namespace: dzongjuk)

docs/
├── requirements/           # BRD, NFR, and TOR source documents plus text extracts
├── rbac/                   # RBAC integration contract and the generated access matrix
├── qa/                     # Phase 1 QA test plan and traceability
└── audits/                 # Frontend and RBAC audit reports
```

---

## 👥 Available Roles & Navigation

### System Administrator

> Manages IT infrastructure, security, and platform administration.

| Nav Item | Route |
| --- | --- |
| Dashboard | `/dashboard` |
| User Management | `/admin/users` |
| Role Management | `/admin/roles` |
| Technical Settings | `/admin/technical` |
| Audit Logs | `/admin/technical` |
| System Monitoring | `/admin/technical` |

### DCDD Administrator

> Manages examination operations, business rules, and certifications.

| Nav Item | Route |
| --- | --- |
| Dashboard | `/dashboard` |
| Registration → Exam Windows | `/registration/windows` |
| Registration → Applications | `/registration/applications` |
| Application Verification | `/verification` |
| Attendance | `/attendance` |
| Examination → Config | `/masters` |
| Examination → Score Summary | `/scores/summary` |
| Question Bank → Sample Papers | `/questions/samples` |
| Certificate Management | `/certificates` |
| Reports | `/reports` |
| Notifications | `/notifications` |
| **Operational Settings** | `/dcdd/operational` |

### Exam Head

- Dashboard, Upload Papers, My Uploads, Sample Papers, Score Summary, Reports

### Committee Head / Member

- Dashboard, Committee Setup, Band Score Entry, Score Summary, Appeals, Reports

### Chief Executive

- Dashboard, Appeal Approvals, Reports

### Test Taker

- Dashboard, My Applications, Sample Papers, My Results, Re-evaluation, Certificates, My Records

---

## 🔑 Access Control

Module-level permissions come from the signed-off access matrix, transcribed into
[`src/features/rbac/accessMatrix.js`](frontend/src/features/rbac/accessMatrix.js). That file is the
single source of truth: routes, navigation, and in-page controls all read from it, and
nothing hard-codes a role list against a matrix module.

### Enforcement points

| Layer | Mechanism |
| --- | --- |
| Routes | `PrivateRoute requiredAccess={{ module, action }}` redirects a denied request to `/dashboard` |
| Navigation | Sidebar items declare `access: [module, action]` and hide when denied |
| In-page controls | Pages call `canAccess(role, module, action)` to gate actions |

### Own-scoped versus organisation-wide reads

`read_own` and `read_all` are deliberately distinct actions. A "view own" grant must
never satisfy a guard protecting an organisation-wide listing — otherwise a Test
Taker holding *Create / view own* on Registration would pass a plain `read` check and
load the full applicant list.

- Guard personal screens (`/my-applications`) with `read_own`.
- Guard cross-record listings (`/registration/applications`, `/scores/summary`) with `read_all`.

The own-scoped levels (`create_own`, `read_own`, `submit_own`) never satisfy `read_all`.

### Verification

- `src/features/rbac/accessMatrix.contract.test.js` transcribes the approved document cell by
  cell, so any drift from it fails the unit suite.
- `tests/e2e/routes.spec.js` requests every denied route **directly by URL** for each
  role, because hiding a menu item is not enforcement.

### Backend integration

[`docs/rbac/RBAC-INTEGRATION-CONTRACT.md`](docs/rbac/RBAC-INTEGRATION-CONTRACT.md) maps every API
endpoint to the module and action the backend must require, and
[`docs/rbac/access-matrix.json`](docs/rbac/access-matrix.json) is a generated, machine-readable copy of
the matrix. Regenerate it after any change:

```bash
npm --prefix frontend run export:access-matrix
```

> **Frontend guards are a usability layer, not a security boundary.** Every rule above
> has to be re-checked server side. A request made outside the browser bypasses all of it.

---

## 🧪 Demo Accounts

These accounts exist only when the frontend runs with `VITE_USE_MOCK_DATA=true` (which is how `npm test` and the Playwright suites build it). They are defined in `src/services/auth.js`.

Every demonstration account shares the same password: **`LocalTestOnly!2026`**

| Role | User ID (4 digits) | Email |
| --- | --- | --- |
| System Admin | `1001` | `system.admin@demo.com` |
| DCDD Admin | `1002` | `dcdd.admin@demo.com` |
| Exam Head | `1003` | `exam.head@demo.com` |
| Committee Head | `1004` | `committee.head@demo.com` |
| Committee Member | `1007` | `member@dsts.bt` (Pending) |
| Chief Executive | `1005` | `chief.executive@demo.com` |
| Test Taker | `1006` | `test.taker@demo.com` |

> **Note:** The sign-in field accepts either the 4-digit User ID or the email address for any of these accounts. When connected to a live backend (`VITE_USE_MOCK_DATA=false`) none of these accounts exist — authenticate against real identity-service records instead.

---

## 📝 Developer Notes & Design Tokens

### Brand Color Palette

| Token | Value | Usage |
| --- | --- | --- |
| `--color-brand-gold` | `#F59E0B` | Primary accent — buttons, active states, highlights |
| `--color-brand-gold-light` | `#FCD34D` | Hover states |
| `--color-brand-gold-dark` | `#D97706` | Pressed/dark variant |
| `--color-surface-bg` | `#0F1629` | Page background |
| `--color-surface-card` | `#1A2540` | Card backgrounds |
| `--color-brand-navy` | `#1B2A4A` | Dark navy surface |
| `--color-brand-teal` | `#0D9488` | Secondary accent |

### Architecture Notes

- **Dark Mode First:** Light mode toggled via `.light` class on `<html>`.
- **Routing:** All role-specific dashboards dispatch from `Dashboard.jsx` via `user.role`.
- **Service Layer:** All data fetched via `useApi(serviceFunction)` in `src/hooks/useApi.js`. Each module has a corresponding service in `src/services/`, and every service issues requests through the single Axios instance in `src/services/api.js`. To point at a different backend, set `VITE_API_BASE_URL`.
- **Error Shape:** `api.js` rejects with `{ status, code, message, raw }` rather than the raw Axios error. Callers branch on `err.code` — this is how `authService.loginWithNDI` detects `NDI_NOT_CONFIGURED` and falls back to the demonstration flow.
- **Mock Responses:** `VITE_USE_MOCK_DATA=true` switches services to local fixtures. **This is currently implemented in `auth.js`, `exams.js`, and `admin.js` only.** The remaining services (`appeals`, `applications`, `attendance`, `certificates`, `masters`, `notifications`, `questions`, `reports`, `scores`, `verification`) always issue live HTTP requests and will fail without a running backend. Screens that depend on them — the dashboards in particular — are not fully exercised by the mock build.
- **Exam Status Vocabulary:** `ExamWindowStatus` in `src/types/index.js` holds the canonical lowercase values the API returns (`draft`, `published`, `registration_open`, `registration_closed`, `in_progress`, `results_declared`, `archived`, `cancelled`). Select the active window through `findOpenExamWindow` / `isRegistrationOpen` in `src/utils/examWindows.js` rather than comparing status strings inline; `src/data/examStatus.contract.test.js` pins this vocabulary.
- **Mock Persistence:** Profile picture and settings use `localStorage` keys (`dsts_user`, `system_contact_info`, `ts_*`, `ops_*`) for demo state.
- **Component Imports:** Always import `Select` from `../../components/ui/Input`.
- **Self-Registration Form:** The "Register without NDI" form on `LoginPage` collects CID, full name, date of birth, gender, and contact number. Parental names and permanent address were removed; those details are captured later during exam application rather than at account creation. The form renders full-screen on a white background, in a responsive one-to-three column grid.
- **Registration Payload:** `authService.register` accepts `contactNumber`, but `POST /auth/register` currently transmits only `fullName`, `cid`, `email`, and `password`. Extend the backend DTO before relying on the contact number being persisted.
- **Settings Separation:**
  - *System Admin* → `/admin/technical` — infrastructure, security, integrations, backup, audit, API, QR, performance.
  - *DCDD Admin* → `/dcdd/operational` — exam dates, fees, certificate templates, notification messages, workflow, dashboard widgets.

---

## ⚡ Performance & Security

- **Code Splitting:** Route-level `React.lazy()` and `Suspense` for all feature pages.
- **Vendor Chunking:** Dedicated chunks for React, Recharts, TanStack Table, forms, Framer Motion, and PDF renderer via Rollup.
- **Route Guards:** `PrivateRoute` wrappers restrict access based on authenticated role permissions.
- **Build Output:** ~13s clean Vite build, gzipped bundle ~129 KB (main chunk).

---

## 📄 License

This project is intended for internal and demonstration use by the Department of Culture and Dzongkha Development (DCDD). Please confirm licensing with the relevant stakeholders before wider distribution.
