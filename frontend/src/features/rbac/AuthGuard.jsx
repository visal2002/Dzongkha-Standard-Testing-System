import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDeniedPage } from './AccessDeniedPage';

export function AuthGuard({
  children,
  requireAnyRole,
  requireAnyPermission,
  fallback = <AccessDeniedPage />,
  redirectTo = '/login',
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-[30vh] items-center justify-center text-sm text-text-muted">Loading session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  const hasRequiredRole = !requireAnyRole || requireAnyRole.some(role => roles.includes(role) || user.role === role);
  const hasRequiredPermission = !requireAnyPermission || requireAnyPermission.some(permission => permissions.includes(permission) || permissions.includes('*'));

  if (!hasRequiredRole || !hasRequiredPermission) {
    return fallback;
  }

  return children;
}
