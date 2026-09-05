/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { rolesFor } from '@/features/rbac/outOfMatrix';
import { RouteGuard as PrivateRoute } from '@/features/rbac/RouteGuard';
import PageLoader from '@/components/ui/PageLoader';

// Layout
import AppLayout from '@/layouts/AppLayout';

// Eagerly loaded critical pages
import LoginPage from '@/features/auth/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import Dashboard from '@/features/dashboard/pages/Dashboard';

// Lazy loaded pages
// The standalone Bhutan NDI screens are a detour from the login page rather than
// part of it, so they load on demand instead of riding in the entry bundle.
const NdiLoginPage = lazy(() => import('@/features/auth/pages/NdiLoginPage'));
const NdiRegistrationPage = lazy(() => import('@/features/auth/pages/NdiRegistrationPage'));
const RegistrationWindows = lazy(() => import('@/features/registration/pages/RegistrationWindows'));
const MyApplications = lazy(() => import('@/features/registration/pages/MyApplications'));
const ApplicationForm = lazy(() => import('@/features/registration/pages/ApplicationForm'));
const VerificationList = lazy(() => import('@/features/verification/pages/VerificationList'));
const AttendanceList = lazy(() => import('@/features/attendance/pages/AttendanceList'));
const ScoreEntry = lazy(() => import('@/features/scores/pages/ScoreEntry'));
const ViewScores = lazy(() => import('@/features/scores/pages/ViewScores'));
const CommitteeSetup = lazy(() => import('@/features/scores/pages/CommitteeSetup'));
const ScoreSummary = lazy(() => import('@/features/scores/pages/ScoreSummary'));
const ViewBandScores = lazy(() => import('@/features/scores/pages/ViewBandScores'));
const AppealList = lazy(() => import('@/features/appeals/pages/AppealList'));
const RevisionTracker = lazy(() => import('@/features/appeals/pages/RevisionTracker'));
const SubmitAppeal = lazy(() => import('@/features/appeals/pages/SubmitAppeal'));
const CertificateList = lazy(() => import('@/features/certificates/pages/CertificateList'));
const CertificatePrint = lazy(() => import('@/features/certificates/pages/CertificatePrint'));
const QuestionPapers = lazy(() => import('@/features/questions/pages/QuestionPapers'));
const UploadQuestionPaper = lazy(() => import('@/features/questions/pages/UploadQuestionPaper'));
const ExamDayDownloads = lazy(() => import('@/features/questions/pages/ExamDayDownloads'));
const SamplePapers = lazy(() => import('@/features/questions/pages/SamplePapers'));
const Reports = lazy(() => import('@/features/reports/pages/Reports'));
const MyReports = lazy(() => import('@/features/reports/pages/MyReports'));
const Notifications = lazy(() => import('@/features/notifications/pages/Notifications'));
const UserManagement = lazy(() => import('@/features/admin/pages/UserManagement'));
const RoleManagement = lazy(() => import('@/features/admin/pages/RoleManagement'));
const PermissionManagement = lazy(() => import('@/features/admin/pages/PermissionManagement'));
const RoleAssignment = lazy(() => import('@/features/admin/pages/RoleAssignment'));
const AuditLogs = lazy(() => import('@/features/admin/pages/AuditLogs'));
const MasterConfiguration = lazy(() => import('@/features/admin/pages/MasterConfiguration'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/features/profile/pages/SettingsPage'));
const TechnicalSettings = lazy(() => import('@/features/admin/pages/TechnicalSettings'));

// 404
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center py-24 text-text-muted">
    <p className="text-6xl font-black text-surface-border mb-4">404</p>
    <p className="text-base font-semibold text-text-primary mb-1">Page not found</p>
    <p className="text-sm mb-4">The page you're looking for doesn't exist.</p>
    <Link to="/dashboard" className="text-sm text-brand-gold hover:text-[#FCD34D] transition-colors">← Back to Dashboard</Link>
  </div>
);

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/ndi-login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <NdiLoginPage />} />
        <Route path="/ndi-register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <NdiRegistrationPage />} />

        {/* Full-page, print-ready certificate - rendered outside the app shell. */}
        <Route path="/certificates/print/:id" element={<PrivateRoute><CertificatePrint /></PrivateRoute>} />

        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Registration */}
          <Route path="/registration/windows" element={<PrivateRoute requiredAccess={{ module: 'registration', action: 'read' }}><RegistrationWindows /></PrivateRoute>} />
          <Route path="/my-applications" element={<PrivateRoute requiredAccess={{ module: 'registration', action: 'read_own' }}><MyApplications /></PrivateRoute>} />
          <Route path="/registration/apply/:examId" element={<PrivateRoute requiredAccess={{ module: 'registration', action: 'create_own' }}><ApplicationForm /></PrivateRoute>} />
          <Route path="/registration/applications" element={<PrivateRoute requiredAccess={{ module: 'registration', action: 'read_all' }}><VerificationList /></PrivateRoute>} />

          {/* DCDD Workflows */}
          <Route path="/verification" element={<PrivateRoute requiredAccess={{ module: 'verification', action: 'read' }}><VerificationList /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute requiredAccess={{ module: 'attendance', action: 'read' }}><AttendanceList /></PrivateRoute>} />

          {/* Questions */}
          <Route path="/questions" element={<PrivateRoute requiredAccess={{ module: 'questions', action: 'read' }}><QuestionPapers /></PrivateRoute>} />
          <Route path="/questions/upload" element={<PrivateRoute requiredAccess={{ module: 'questions', action: 'create' }}><UploadQuestionPaper /></PrivateRoute>} />
          {/* BRD §5.4.2 BR-3: view/download is a separate, scheduled-window-only screen
              from the upload workspace above. The route guard only confirms the role
              holds Full access; the exam window itself is enforced server-side on the
              document endpoints this screen calls, so a direct request outside the
              window 403s no matter how it was reached. */}
          <Route path="/questions/downloads" element={<PrivateRoute requiredAccess={{ module: 'questions', action: 'secure_read' }}><ExamDayDownloads /></PrivateRoute>} />
          <Route path="/questions/samples" element={<PrivateRoute requiredAccess={{ module: 'questions', action: 'sample' }}><SamplePapers /></PrivateRoute>} />

          {/* Scores */}
          <Route path="/scores" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'submit' }}><ScoreEntry /></PrivateRoute>} />
          <Route path="/scores/view" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'read' }}><ViewScores /></PrivateRoute>} />
          <Route path="/scores/committee" element={<PrivateRoute requiredRoles={rolesFor('committeeSetup')}><CommitteeSetup /></PrivateRoute>} />
          <Route path="/scores/summary" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'read_all' }}><ScoreSummary /></PrivateRoute>} />
          {/* Committee Member's dedicated read-only screen (BRD §5.5.2 BR-2/BR-3):
              search by Exam ID or candidate Registration Number, plus the reviewing
              committee's names. Guarded the same as /scores/view - any role holding
              at least Band Scores Read may reach it - but only Committee Member's
              sidebar links here. */}
          <Route path="/scores/band-scores" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'read' }}><ViewBandScores /></PrivateRoute>} />

          {/* Appeals & Certificates */}
          <Route path="/appeals" element={<PrivateRoute requiredAccess={{ module: 'appeals', action: 'read' }}><AppealList /></PrivateRoute>} />
          <Route path="/appeals/new" element={<PrivateRoute requiredAccess={{ module: 'appeals', action: 'submit_own' }}><SubmitAppeal /></PrivateRoute>} />
          {/* BRD §5.6.2 Committee BR-2: only the Committee Head runs the committee
              review step that produces a revision request, so 'process' - not the
              broader 'read' every other appeals-facing role holds - is what actually
              distinguishes this role here. */}
          <Route path="/appeals/revisions" element={<PrivateRoute requiredAccess={{ module: 'appeals', action: 'process' }}><RevisionTracker /></PrivateRoute>} />
          <Route path="/certificates" element={<PrivateRoute requiredAccess={{ module: 'certificates', action: 'read' }}><CertificateList /></PrivateRoute>} />

          {/* Reports & Notifications */}
          {/* Organisation-wide analytics demands `read_all`. A plain `read` would admit
              the Test Taker, whose Reports grant is "view own": every own-scoped level
              satisfies `read`. */}
          <Route path="/reports" element={<PrivateRoute requiredAccess={{ module: 'reports', action: 'read_all' }}><Reports /></PrivateRoute>} />
          <Route path="/reports/my" element={<PrivateRoute requiredAccess={{ module: 'reports', action: 'read_own' }}><MyReports /></PrivateRoute>} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Administration */}
          <Route path="/admin/users" element={<PrivateRoute requiredAccess={{ module: 'users', action: 'read' }}><UserManagement /></PrivateRoute>} />
          <Route path="/admin/roles" element={<PrivateRoute requiredAccess={{ module: 'roles', action: 'read' }}><RoleManagement /></PrivateRoute>} />
          <Route path="/admin/permissions" element={<PrivateRoute requiredRoles={rolesFor('permissionManagement')}><PermissionManagement /></PrivateRoute>} />
          <Route path="/admin/role-assignment" element={<PrivateRoute requiredRoles={rolesFor('roleAssignment')}><RoleAssignment /></PrivateRoute>} />
          <Route path="/admin/audit-logs" element={<PrivateRoute requiredRoles={rolesFor('systemAuditLogs')}><AuditLogs /></PrivateRoute>} />
          <Route path="/admin/technical" element={<PrivateRoute requiredRoles={rolesFor('technicalSettings')}><TechnicalSettings /></PrivateRoute>} />
          <Route path="/masters" element={<PrivateRoute requiredRoles={rolesFor('examConfiguration')}><MasterConfiguration /></PrivateRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
