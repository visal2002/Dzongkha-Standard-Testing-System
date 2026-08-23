import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { ACCESS_MATRIX, ACCESS_MODULES, MATRIX_ROLES, ROLE_LABELS, SUPPLEMENTARY_ROLES, getAccessLevel } from '../../config/accessMatrix';
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

const LevelBadge = ({ level }) => {
  const display = DISPLAY_LEVELS[level] || DISPLAY_LEVELS.none;
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${display.style}`}>{display.label}</span>;
};

export default function RoleManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin';

  // Any module a supplementary role can reach. These are permissions the signed-off
  // matrix does not describe, so they are listed explicitly rather than left to be
  // discovered in the source.
  const supplementaryGrants = SUPPLEMENTARY_ROLES.flatMap(role =>
    ACCESS_MODULES
      .map(module => ({ role, module, level: getAccessLevel(role, module.key) }))
      .filter(entry => entry.level !== 'none'));

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
          <h3 className="text-sm font-semibold text-text-primary">Permissions outside the approved matrix</h3>
          <p className="text-xs text-text-muted mt-1">
            The supplied matrix defines the six roles above. Any other grant the system relies on is listed here so it can be reviewed and ratified. Roles not shown below hold no module access beyond the dashboard, profile, settings, and notifications.
          </p>
          {supplementaryGrants.length > 0
            ? <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left py-2 pr-3 text-text-muted">Role</th>
                    <th className="text-left px-2 py-2 text-text-muted">Module</th>
                    <th className="text-left px-2 py-2 text-text-muted">Access</th>
                    <th className="text-left px-2 py-2 text-text-muted">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {supplementaryGrants.map(entry => <tr key={`${entry.role}-${entry.module.key}`} className="border-b border-surface-border/50">
                    <td className="py-2 pr-3 font-medium text-text-primary">{ROLE_LABELS[entry.role]}</td>
                    <td className="px-2 py-2 text-text-primary">{entry.module.label}</td>
                    <td className="px-2 py-2"><LevelBadge level={entry.level} /></td>
                    <td className="px-2 py-2 text-text-muted">Re-evaluation requires a chief approval step that no matrix role can complete.</td>
                  </tr>)}
                </tbody>
              </table>
            : <p className="text-xs text-text-muted mt-3">No permissions are granted outside the approved matrix.</p>}
        </div>
      </div>
    </div>
  </div>;
}
