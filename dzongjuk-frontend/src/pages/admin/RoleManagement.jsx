import { Shield, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { ACCESS_MATRIX, ACCESS_MODULES, ROLE_LABELS } from '../../config/accessMatrix';
import { useAuth } from '../../context/AuthContext';

const DISPLAY_LEVELS = {
  none: { label: 'No access', style: 'bg-red-500/10 text-red-400 border-red-500/20' },
  crud: { label: 'CRUD', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  full: { label: 'Full', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  read: { label: 'Read', style: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  submit: { label: 'Submit', style: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  process: { label: 'Process', style: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  create_own: { label: 'Create / view own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  read_own: { label: 'View own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  submit_own: { label: 'Submit own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  sample: { label: 'View sample only', style: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

const MATRIX_ROLES = ['admin', 'dcdd', 'exam_head', 'committee_head', 'committee_member', 'test_taker'];

export default function RoleManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin';
  return <div className="space-y-6">
    <PageHeader title="Role & Access Matrix" subtitle="Approved module-level access for every defined DSTS role" breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]} icon={<Shield size={18} />} />
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><h3 className="text-sm font-semibold text-text-primary">Approved access matrix</h3><p className="text-xs text-text-muted mt-1">Permissions are enforced by routes and navigation, not only hidden from the menu.</p></div>
        <Badge variant={readOnly ? 'default' : 'gold'}>{readOnly ? 'Read-only access' : 'System Administrator'}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr className="border-b border-surface-border"><th className="text-left py-3 pr-3 text-text-muted">Module</th>{MATRIX_ROLES.map(role => <th key={role} className="text-left px-2 py-3 text-text-muted">{ROLE_LABELS[role]}</th>)}</tr></thead>
          <tbody>{ACCESS_MODULES.map(module => <tr key={module.key} className="border-b border-surface-border/50 hover:bg-surface-bg"><td className="py-3 pr-3 font-medium text-text-primary">{module.label}</td>{MATRIX_ROLES.map(role => { const level = ACCESS_MATRIX[role]?.[module.key] || 'none'; const display = DISPLAY_LEVELS[level]; return <td key={role} className="px-2 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${display.style}`}>{display.label}</span></td>; })}</tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-start gap-3"><Users size={18} className="text-brand-gold mt-0.5" /><div><h3 className="text-sm font-semibold text-text-primary">Chief Executive role</h3><p className="text-xs text-text-muted mt-1">The supplied matrix does not define Chief Executive permissions. That role remains limited to the dashboard, profile, settings, and notifications until an approved access definition is supplied.</p></div></div>
  </div>;
}
