/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';
import { rolesFor } from '@/features/rbac/outOfMatrix';

// Layout
import AppLayout from '@/layouts/AppLayout';

// Eagerly loaded critical pages
import LoginPage, { NdiLoginPage, NdiRegistrationPage } from '@/pages/auth/LoginPage';
import HomePage from '@/pages/HomePage';
import Dashboard from '@/pages/dashboard/Dashboard';

// Lazy loaded pages
const RegistrationWindows = lazy(() => import('@/pages/registration/RegistrationWindows'));
const MyApplications = lazy(() => import('@/pages/registration/MyApplications'));
const ApplicationForm = lazy(() => import('@/pages/registration/ApplicationForm'));
const VerificationList = lazy(() => import('@/pages/verification/VerificationList'));
const AttendanceList = lazy(() => import('@/pages/attendance/AttendanceList'));
const ScoreEntry = lazy(() => import('@/pages/scores/ScoreEntry'));
const ViewScores = lazy(() => import('@/pages/scores/ViewScores'));
const CommitteeSetup = lazy(() => import('@/pages/scores/CommitteeSetup'));
const ScoreSummary = lazy(() => import('@/pages/scores/ScoreSummary'));
const AppealList = lazy(() => import('@/pages/appeals/AppealList'));
const SubmitAppeal = lazy(() => import('@/pages/appeals/SubmitAppeal'));
const CertificateList = lazy(() => import('@/pages/certificates/CertificateList'));
const QuestionPapers = lazy(() => import('@/pages/questions/QuestionPapers'));
const UploadQuestionPaper = lazy(() => import('@/pages/questions/UploadQuestionPaper'));
const SamplePapers = lazy(() => import('@/pages/questions/SamplePapers'));
const Reports = lazy(() => import('@/pages/reports/Reports'));
const MyReports = lazy(() => import('@/pages/reports/MyReports'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const RoleManagement = lazy(() => import('@/pages/admin/RoleManagement'));
const PermissionManagement = lazy(() => import('@/pages/admin/permissions/PermissionManagement'));
const MasterConfiguration = lazy(() => import('@/pages/admin/MasterConfiguration'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const TechnicalSettings = lazy(() => import('@/pages/admin/TechnicalSettings'));
const OperationalSettings = lazy(() => import('@/pages/dcdd/OperationalSettings'));

// Page loader
export function PageLoader() {
  return (
    <div className="flex flex-col gap-6 w-full p-6 animate-pulse">
      <div className="h-10 bg-surface-card border border-surface-border rounded-xl w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-surface-card border border-surface-border rounded-xl"></div>
        ))}
      </div>
      <div className="h-64 bg-surface-card border border-surface-border rounded-xl w-full mt-4"></div>
    </div>
  );
}

// 404
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center py-24 text-text-muted">
    <p className="text-6xl font-black text-surface-border mb-4">404</p>
    <p className="text-base font-semibold text-text-primary mb-1">Page not found</p>
    <p className="text-sm mb-4">The page you're looking for doesn't exist.</p>
    <Link to="/dashboard" className="text-sm text-brand-gold hover:text-[#FCD34D] transition-colors">← Back to Dashboard</Link>
  </div>
);

// Route Guard
function PrivateRoute({ children, requiredRoles, requiredAccess }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // A System Administrator is not admitted to a route just for being one. The
  // backend keeps a `*` wildcard as documented break-glass, but the frontend follows
  // the approved matrix and the out-of-matrix registry, so `admin` reaches a
  // role-listed route only where it is actually listed.
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  const hasRequiredRole = !requiredRoles || requiredRoles.some(role => roles.includes(role) || user?.role === role);

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  if (requiredAccess && !canAccess(user?.role, requiredAccess.module, requiredAccess.action)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/ndi-login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <NdiLoginPage />} />
        <Route path="/ndi-register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <NdiRegistrationPage />} />

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
          <Route path="/questions/samples" element={<PrivateRoute requiredAccess={{ module: 'questions', action: 'sample' }}><SamplePapers /></PrivateRoute>} />

          {/* Scores */}
          <Route path="/scores" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'submit' }}><ScoreEntry /></PrivateRoute>} />
          <Route path="/scores/view" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'read' }}><ViewScores /></PrivateRoute>} />
          <Route path="/scores/committee" element={<PrivateRoute requiredRoles={rolesFor('committeeSetup')}><CommitteeSetup /></PrivateRoute>} />
          <Route path="/scores/summary" element={<PrivateRoute requiredAccess={{ module: 'scores', action: 'read_all' }}><ScoreSummary /></PrivateRoute>} />

          {/* Appeals & Certificates */}
          <Route path="/appeals" element={<PrivateRoute requiredAccess={{ module: 'appeals', action: 'read' }}><AppealList /></PrivateRoute>} />
          <Route path="/appeals/new" element={<PrivateRoute requiredAccess={{ module: 'appeals', action: 'submit_own' }}><SubmitAppeal /></PrivateRoute>} />
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
          <Route path="/admin/technical" element={<PrivateRoute requiredRoles={rolesFor('technicalSettings')}><TechnicalSettings /></PrivateRoute>} />
          <Route path="/masters" element={<PrivateRoute requiredRoles={rolesFor('examConfiguration')}><MasterConfiguration /></PrivateRoute>} />
          <Route path="/dcdd/operational" element={<PrivateRoute requiredRoles={rolesFor('operationalSettings')}><OperationalSettings /></PrivateRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
