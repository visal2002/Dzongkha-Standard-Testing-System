/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DCDDDashboard from './DCDDDashboard';
import TestTakerDashboard from './TestTakerDashboard';
import CommitteeDashboard from './CommitteeDashboard';
import ChiefDashboard from './ChiefDashboard';
import ExamHeadDashboard from './ExamHeadDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  const dashboards = {
    admin: AdminDashboard,
    dcdd: DCDDDashboard,
    test_taker: TestTakerDashboard,
    committee_head: CommitteeDashboard,
    committee_member: CommitteeDashboard,
    chief_executive: ChiefDashboard,
    exam_head: ExamHeadDashboard,
  };

  const DashComp = dashboards[user?.role] || AdminDashboard;
  return <DashComp />;
}
