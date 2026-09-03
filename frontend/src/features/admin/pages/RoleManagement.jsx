import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { ACCESS_MATRIX, ACCESS_MODULES, MATRIX_ROLES, ROLE_LABELS } from '@/features/rbac/accessMatrix';
import { OUT_OF_MATRIX_OPERATIONS } from '@/features/rbac/outOfMatrix';
import { useAuth } from '@/contexts/AuthContext';

const DISPLAY_LEVELS = {
  none: { label: 'No access', style: 'bg-red-500/10 text-red-400 border-red-500/20' },
  crud: { label: 'CRUD', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  full: { label: 'Full', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  read: { label: 'Read', style: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  submit: { label: 'Submit', style: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  process: { label: 'Process', style: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  approve: { label: 'Approve', style: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  create_own: { label: 'Create / view own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  read_own: { label: 'View own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  submit_own: { label: 'Submit own', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  sample: { label: 'View sample only', style: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

const LevelBadge = ({ level }) => {
  const display = DISPLAY_LEVELS[level] || DISPLAY_LEVELS.none;
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${display.style}`}>{display.label}</span>;
};

export default function RoleManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin';

  // Every role is now covered by the approved matrix. What still sits outside it are
  // individual operations - declaring results, constituting the committee, the
  // settings screens - so those are listed below rather than left to be discovered in
  // the source.
  const outOfMatrixOperations = OUT_OF_MATRIX_OPERATIONS;

  return <div className="space-y-6">
    <PageHeader title="Role & Access Matrix" subtitle="Approved module-level access for every defined DSTS role" breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]} icon={<Shield size={18} />} />

    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Approved access matrix</h3>
          <p className="text-xs text-text-muted mt-1">Permissions are enforced by routes and navigation, not only hidden from the menu.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={readOnly ? 'default' : 'gold'}>{readOnly ? 'Read-only access' : 'System Administrator'}</Badge>
          {!readOnly && <Link to="/admin/permissions" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold hover:underline">Manage permissions <ArrowRight size={12} /></Link>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left py-3 pr-3 text-text-muted">Module</th>
              {MATRIX_ROLES.map(role => <th key={role} className="text-left px-2 py-3 text-text-muted">{ROLE_LABELS[role]}</th>)}
            </tr>
          </thead>
          <tbody>
            {ACCESS_MODULES.map(module => <tr key={module.key} className="border-b border-surface-border/50 hover:bg-surface-bg">
              <td className="py-3 pr-3 font-medium text-text-primary">{module.label}</td>
              {MATRIX_ROLES.map(role => <td key={role} className="px-2 py-3"><LevelBadge level={ACCESS_MATRIX[role]?.[module.key] || 'none'} /></td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <Users size={18} className="text-brand-gold mt-0.5 shrink-0" />
        <div className="w-full">
          <h3 className="text-sm font-semibold text-text-primary">Operations outside the approved matrix</h3>
          <p className="text-xs text-text-muted mt-1">
            All seven roles are covered by the matrix above. These individual operations are not: each one is listed here with the roles it admits and why it has no matrix row, so it can be reviewed and ratified rather than discovered in the source.
          </p>
          {outOfMatrixOperations.length > 0
            ? <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left py-2 pr-3 text-text-muted">Operation</th>
                    <th className="text-left px-2 py-2 text-text-muted">Where</th>
                    <th className="text-left px-2 py-2 text-text-muted">Roles</th>
                    <th className="text-left px-2 py-2 text-text-muted">Why it is not in the matrix</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfMatrixOperations.map(operation => <tr key={operation.key} className="border-b border-surface-border/50">
                    <td className="py-2 pr-3 font-medium text-text-primary">{operation.label}</td>
                    <td className="px-2 py-2 text-text-muted font-mono text-[10px]">{operation.surface}</td>
                    <td className="px-2 py-2 text-text-primary">{operation.roles.map(role => ROLE_LABELS[role] || role).join(', ')}</td>
                    <td className="px-2 py-2 text-text-muted">{operation.reason}</td>
                  </tr>)}
                </tbody>
              </table>
            : <p className="text-xs text-text-muted mt-3">No operations are granted outside the approved matrix.</p>}
        </div>
      </div>
    </div>
  </div>;
}
