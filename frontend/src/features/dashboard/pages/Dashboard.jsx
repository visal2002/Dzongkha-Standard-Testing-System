/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import DCDDDashboard from './DCDDDashboard';
import TestTakerDashboard from './TestTakerDashboard';
import CommitteeDashboard from './CommitteeDashboard';
import ChiefDashboard from './ChiefDashboard';
import ExamHeadDashboard from './ExamHeadDashboard';

// Exported so the RBAC suite can assert that every approved role has a dashboard and
// that no unknown role silently inherits one.
export const DASHBOARD_ROLES = ['admin', 'dcdd', 'test_taker', 'committee_head', 'committee_member', 'chief_executive', 'exam_head'];

const DASHBOARDS = {
  admin: AdminDashboard,
  dcdd: DCDDDashboard,
  test_taker: TestTakerDashboard,
  committee_head: CommitteeDashboard,
  committee_member: CommitteeDashboard,
  chief_executive: ChiefDashboard,
  exam_head: ExamHeadDashboard,
};

// Shown when a signed-in role has no dashboard of its own. The rest of the RBAC layer
// denies by default - `getAccessLevel` returns `none` for an unknown role - and this
// has to match it. Falling back to a populated dashboard would hand an unrecognised
// role a view built for somebody else.
function NoDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-base font-semibold text-text-primary mb-1">No dashboard is configured for your role</p>
      <p className="text-sm text-text-muted max-w-md">
        Your account is signed in, but no role dashboard has been assigned to it. Use the menu to
        reach the screens available to you, or contact the DCDD administrator.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const DashComp = DASHBOARDS[user?.role] || NoDashboard;
  return <DashComp />;
}
