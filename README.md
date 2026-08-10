# 🏰 Dzongjuk (DSTS) Frontend

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646cff.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38b2ac.svg?logo=tailwind-css)

> **Dzongjuk** is a modern, polished frontend application for the **Dzongkha Standard Testing System (DSTS)**, developed for the Department of Culture and Dzongkha Development (DCDD) in Bhutan.

It provides a secure, role-based administration portal covering the entire examination lifecycle — from candidate registration and verification, to scoring, appeals, and certificate generation. Currently, there is no backend — all data is served from `src/data/mockData.js` with simulated async delays.

---

## 📑 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Architecture](#-project-architecture)
- [Available Roles](#-available-roles)
- [Developer Notes & Preferences](#-developer-notes--preferences)
- [Performance & Security](#-performance--security)
- [License](#-license)

---

## 📖 Overview

The application presents a complete internal workflow for exam administration. It features a modern interface, role-based access control, responsive layouts, and robust themed styling (Dark/Light). It is designed to be production-ready and easily integrable with a backend API.

---

## ✨ Key Features

- 🔐 **Role-Based Access Control (RBAC):** Custom dashboards for System Admin, DCDD Admin, Exam Heads, Committee roles, and Test Takers.
- 📝 **Registration Workflow:** Multi-step wizard forms with Zod validation for robust application submissions.
- ✅ **Verification & Attendance:** Streamlined data tables for application verification and test day attendance tracking.
- 📊 **Scoring & Appeals:** Secure band score entry and re-evaluation appeal workflows.
- 🎓 **Certificates:** Automated certificate generation with embedded QR codes.
- 📈 **Analytics & Reporting:** Interactive charts (Recharts) for real-time system metrics.
- 🌓 **Theming:** Full dark/light mode support using custom Tailwind configuration.

---

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 |
| **Styling** | Tailwind CSS v4, Framer Motion v11, Lucide React |
| **Forms** | React Hook Form, Zod |
| **Data Viz** | Recharts, TanStack Table v8 |
| **Utils** | React Hot Toast, qrcode.react |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and install dependencies. **Note: `--legacy-peer-deps` is required** due to React 19 peer dependency conflicts with `@react-pdf/renderer`:
   ```bash
   cd dzongjuk-frontend
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the app in your browser:
   [http://localhost:5000](http://localhost:5000)

### Building for Production

To create an optimized production build (includes chunk splitting and lazy loading):
```bash
npm run build
npm run preview
```

---

## 📂 Project Architecture

```text
dzongjuk-frontend/
├── src/
│   ├── components/       # Reusable UI primitives (Button, Input, Modal, Table)
│   │   ├── layout/       # Shell, Sidebar, Headers
│   │   └── ui/           # Core design system components
│   ├── context/          # React Context (AuthContext, ThemeContext)
│   ├── data/             # mockData.js — all mock data
│   ├── pages/            # Feature-driven route modules
│   │   ├── admin/        # System configuration
│   │   ├── auth/         # Login & authentication flows
│   │   ├── dashboard/    # Role-specific dashboard variants
│   │   └── ...           # (registration, scores, appeals, certificates, reports)
│   ├── App.jsx           # Routing configuration & Lazy loading
│   └── main.jsx          # Application entry point
```

---

## 👥 Available Roles

Use the following demo credentials to explore different features. See the Demo Accounts table below for exact CIDs.

Role examples:

- **System Admin:** Full system configuration, user management
- **DCDD Admin:** Verification, attendance, masters
- **Exam Head:** Exam window management, question paper uploads
- **Committee Head:** Score entry, committee constitution
- **Chief Executive:** Final approval for appeals and certificates
- **Test Taker:** Registration, view scores, submit appeals, download certificates

## 🧪 Demo Accounts

For the demo environment, log in using your **CID / User ID** and password `password`.

| Role | CID / User ID | Password |
|---|---|---|
| System Admin | `11101001001` | password |
| DCDD Admin | `11102002002` | password |
| Exam Head | `11103003003` | password |
| Committee Head | `11104004004` | password |
| Chief Executive | `11105005005` | password |
| Test Taker | `11106006006` | password |

> **Note:** Email login is disabled. Use only the CID above to sign in.

---

## 📝 Developer Notes & Preferences

- **Design Tokens:** 
  - **Saffron Gold**: `#D4830A` — primary brand color
  - **Deep Navy**: `#1B2A4A` — dark surface
  - **Teal**: `#0D9488` — secondary accent
- **Dark Mode:** The application uses a dark-first design. Light mode is toggled via the `.light` class on the `<html>` tag.
- **Component Imports:** Always import `Select` from `../../components/ui/Input` (not the old Select.jsx).
- **Routing:** All role-specific pages dispatch from `Dashboard.jsx` based on `user.role`.

---

## ⚡ Performance & Security

- **Code Splitting:** Route-level `React.lazy()` and `Suspense` implementation.
- **Vendor Chunking:** Dedicated chunks for React, charting libraries, tables, and forms configured via Rollup to ensure minimal initial bundle size.
- **Route Guards:** Robust `PrivateRoute` wrappers that restrict access based on authenticated role permissions.

---

## 📄 License

This project is intended for internal and demonstration use by the Department of Culture and Dzongkha Development (DCDD). Please confirm licensing with the relevant stakeholders before wider distribution.
