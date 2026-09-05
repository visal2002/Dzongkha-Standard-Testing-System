/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview The guard every protected route is wrapped in.
 *
 * Lives beside the access matrix it enforces rather than in the route table, so the
 * routes file only declares which paths exist and what each one requires, and every
 * rule about who may enter is in this feature.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageLoader from '@/components/ui/PageLoader';
import { USE_MOCK_DATA } from '@/lib/env';
import { canAccess } from './accessMatrix';

// The "finish your profile first" gate is part of the mock onboarding flow (email,
// password and photo are all collected post-registration there). A real backend
// mandates email + password at registration, so the gate is scoped to mock builds.
const PROFILE_GATE_ACTIVE = USE_MOCK_DATA;

const rolesOf = user => (Array.isArray(user?.roles) ? user.roles : [user?.role]);

/**
 * @param {object} props
 * @param {React.ReactNode} props.children the guarded element
 * @param {string[]} [props.requiredRoles] roles listed for an out-of-matrix operation
 * @param {{module: string, action: string}} [props.requiredAccess] matrix entry to satisfy
 */
export function RouteGuard({ children, requiredRoles, requiredAccess }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // A Test Taker is sent straight to their profile after signing in and cannot leave
  // it until their email, password and passport-size photo are all on file - none of
  // the three is collected at registration, so all three are completed on that page.
  if (
    PROFILE_GATE_ACTIVE
    && user?.role === 'test_taker'
    && (!user?.photo || !user?.passwordSet || !user?.emailSet)
    && location.pathname !== '/profile'
  ) {
    return <Navigate to="/profile" replace />;
  }

  // A System Administrator is not admitted to a route just for being one. The
  // backend keeps a `*` wildcard as documented break-glass, but the frontend follows
  // the approved matrix and the out-of-matrix registry, so `admin` reaches a
  // role-listed route only where it is actually listed.
  const roles = rolesOf(user);
  const hasRequiredRole = !requiredRoles || requiredRoles.some(role => roles.includes(role) || user?.role === role);
  if (!hasRequiredRole) return <Navigate to="/dashboard" replace />;

  if (requiredAccess && !canAccess(user?.role, requiredAccess.module, requiredAccess.action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
