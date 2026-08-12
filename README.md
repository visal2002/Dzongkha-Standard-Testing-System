# Dzongjuk - Dzongkha Standard Testing System


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
- [Project Architecture](#-project-architecture)
- [Available Roles & Navigation](#-available-roles--navigation)
- [Demo Accounts](#-demo-accounts)
- [Developer Notes & Design Tokens](#-developer-notes--design-tokens)
- [Performance & Security](#-performance--security)
- [License](#-license)

---

## 📖 Overview

The application presents a complete internal workflow for exam administration. It features a modern dark-first interface, role-based access control (RBAC), full-screen responsive layouts, profile picture uploads, and robust themed styling (Dark/Light). It is designed to be production-ready and easily integrable with a backend API.

---

## ✨ Key Features

- 🔐 **Role-Based Access Control (RBAC):** Custom dashboards and navigation for 6 distinct roles.
- 📝 **Registration Workflow:** Multi-step forms with Zod validation for robust application submissions.
- ✅ **Verification & Attendance:** Streamlined data tables for application verification and test day attendance.
- 📊 **Scoring & Appeals:** Secure band score entry and re-evaluation appeal workflows with chief approval.
- 🎓 **Certificates:** Automated certificate generation with embedded QR codes and PDF export.
- 📈 **Analytics & Reporting:** Interactive charts (Recharts) for real-time system metrics.
- 🌓 **Theming:** Full dark/light mode support using custom Tailwind CSS v4 design tokens.
- 🖥️ **Technical Settings:** Full IT/infrastructure configuration module for System Administrator (16 sections).
- ⚙️ **Operational Settings:** Exam business rules, fees, certificates, notifications & workflow for DCDD Admin (7 sections).
- 👤 **Profile & Settings:** Profile picture upload, password change, and system contact info management for all roles.

---

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 |
| **Styling** | Tailwind CSS v4, Framer Motion v11, Lucide React |
| **Forms** | React Hook Form, Zod |
| **Data Viz** | Recharts, TanStack Table v8 |
| **PDF** | @react-pdf/renderer v4 |
| **Utils** | React Hot Toast, qrcode.react |

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
   cd dzongjuk-frontend
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

### GovTech Kubernetes deployment

The production deployment package for the assigned `dzongjuk` namespace is documented in `backend/deploy/k8s/govtech/README.md`. It deploys the frontend, gateway, all eight microservices, eight service-owned databases, Redis, RabbitMQ, and encrypted object storage through the supplied GovTech kubeconfig and Harbor registry.

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

The route suite signs in as every demonstration role and checks all role-specific routes for rendering failures, browser errors, and runtime exception messages. GitHub Actions runs these checks together with the backend build, lint, tests, and production dependency audits on every pull request and every push to `main`.

---

## 📂 Project Architecture

```text
dzongjuk-frontend/
├── src/
│   ├── components/
│   │   ├── layout/         # AppLayout, Sidebar, Header
│   │   └── ui/             # Button, Input, Modal, Table, Badge, Card, Tabs, Alert, PageHeader
│   ├── context/            # AuthContext, ThemeContext
│   ├── data/               # mockData.js — seed data (no longer imported by pages)
│   ├── hooks/              # useApi.js — centralized async data-fetching hook
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
```

---

## 👥 Available Roles & Navigation

### System Administrator
> Manages IT infrastructure, security, and platform administration.

| Nav Item | Route |
|---|---|
| Dashboard | `/dashboard` |
| User Management | `/admin/users` |
| Role Management | `/admin/roles` |
| Technical Settings | `/admin/technical` |
| Audit Logs | `/admin/technical` |
| System Monitoring | `/admin/technical` |

### DCDD Administrator
> Manages examination operations, business rules, and certifications.

| Nav Item | Route |
|---|---|
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
- Dashboard, Register for Exam, My Applications, My Results, Certificates, Submit Appeal, My Appeals, Sample Papers

---

## 🧪 Demo Accounts

Log in using CID / User ID and password `password`.

| Role | CID / User ID | Password |
|---|---|---|
| System Admin | `11101001001` | password |
| DCDD Admin | `11102002002` | password |
| Exam Head | `11103003003` | password |
| Committee Head | `11104004004` | password |
| Chief Executive | `11105005005` | password |
| Test Taker | `11106006006` | password |
| Local acceptance test taker | `local.acceptance@dzongjuk.test` | `LocalTestOnly!2026` |

> **Note:** Standard demonstration roles use the listed CID. The local acceptance test taker uses the listed email address.

---

## 📝 Developer Notes & Design Tokens

### Brand Color Palette

| Token | Value | Usage |
|---|---|---|
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
- **Service Layer:** All data fetched via `useApi(serviceFunction)` in `src/hooks/useApi.js`. Each module has a corresponding service in `src/services/`. To connect a real backend, update `src/services/api.js` (Axios baseURL) and implement real endpoints in each service.
- **Mock Responses:** Services fall back to `mockData.js` in development until a real backend is connected.
- **Mock Persistence:** Profile picture and settings use `localStorage` keys (`dsts_user`, `system_contact_info`, `ts_*`, `ops_*`) for demo state.
- **Component Imports:** Always import `Select` from `../../components/ui/Input`.
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
