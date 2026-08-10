import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

// Layout
import AppLayout from './components/layout/AppLayout';

// Eagerly loaded critical pages
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/HomePage';
import Dashboard from './pages/dashboard/Dashboard';

// Lazy loaded pages
const RegistrationWindows = lazy(() => import('./pages/registration/RegistrationWindows'));
const MyApplications = lazy(() => import('./pages/registration/MyApplications'));
const ApplicationForm = lazy(() => import('./pages/registration/ApplicationForm'));
const VerificationList = lazy(() => import('./pages/verification/VerificationList'));
const AttendanceList = lazy(() => import('./pages/attendance/AttendanceList'));
const ScoreEntry = lazy(() => import('./pages/scores/ScoreEntry'));
const ViewScores = lazy(() => import('./pages/scores/ViewScores'));
const CommitteeSetup = lazy(() => import('./pages/scores/CommitteeSetup'));
const ScoreSummary = lazy(() => import('./pages/scores/ScoreSummary'));
const AppealList = lazy(() => import('./pages/appeals/AppealList'));
const SubmitAppeal = lazy(() => import('./pages/appeals/SubmitAppeal'));
const CertificateList = lazy(() => import('./pages/certificates/CertificateList'));
const QuestionPapers = lazy(() => import('./pages/questions/QuestionPapers'));
const UploadQuestionPaper = lazy(() => import('./pages/questions/UploadQuestionPaper'));
const SamplePapers = lazy(() => import('./pages/questions/SamplePapers'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const RoleManagement = lazy(() => import('./pages/admin/RoleManagement'));
const MasterConfiguration = lazy(() => import('./pages/admin/MasterConfiguration'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TechnicalSettings = lazy(() => import('./pages/admin/TechnicalSettings'));


// Page loader
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading...</p>
      </div>
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
function PrivateRoute({ children, requiredRoles }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRoles && !requiredRoles.includes(user?.role) && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Registration */}
          <Route path="/registration/windows" element={<RegistrationWindows />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/registration/apply" element={<PrivateRoute requiredRoles={['test_taker']}><ApplicationForm /></PrivateRoute>} />
          <Route path="/registration/applications" element={<PrivateRoute requiredRoles={['dcdd']}><VerificationList /></PrivateRoute>} />

          {/* DCDD Workflows */}
          <Route path="/verification" element={<PrivateRoute requiredRoles={['dcdd']}><VerificationList /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute requiredRoles={['dcdd']}><AttendanceList /></PrivateRoute>} />

          {/* Questions */}
          <Route path="/questions" element={<QuestionPapers />} />
          <Route path="/questions/upload" element={<PrivateRoute requiredRoles={['exam_head']}><UploadQuestionPaper /></PrivateRoute>} />
          <Route path="/questions/samples" element={<SamplePapers />} />

          {/* Scores */}
          <Route path="/scores" element={<PrivateRoute requiredRoles={['committee_head']}><ScoreEntry /></PrivateRoute>} />
          <Route path="/scores/view" element={<ViewScores />} />
          <Route path="/scores/committee" element={<PrivateRoute requiredRoles={['committee_head', 'dcdd']}><CommitteeSetup /></PrivateRoute>} />
          <Route path="/scores/summary" element={<ScoreSummary />} />

          {/* Appeals & Certificates */}
          <Route path="/appeals" element={<AppealList />} />
          <Route path="/appeals/new" element={<PrivateRoute requiredRoles={['test_taker']}><SubmitAppeal /></PrivateRoute>} />
          <Route path="/certificates" element={<CertificateList />} />

          {/* Reports & Notifications */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Administration */}
          <Route path="/admin/users" element={<PrivateRoute requiredRoles={['admin']}><UserManagement /></PrivateRoute>} />
          <Route path="/admin/roles" element={<PrivateRoute requiredRoles={['admin']}><RoleManagement /></PrivateRoute>} />
          <Route path="/admin/technical" element={<PrivateRoute requiredRoles={['admin']}><TechnicalSettings /></PrivateRoute>} />
          <Route path="/masters" element={<PrivateRoute requiredRoles={['dcdd', 'admin']}><MasterConfiguration /></PrivateRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                background: 'var(--color-surface-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-surface-border)',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
