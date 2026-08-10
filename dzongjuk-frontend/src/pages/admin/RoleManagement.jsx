import { useState } from 'react';
import { Shield, Users, Check, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { systemRoles } from '../../data/mockData';

const MODULES = ['users', 'roles', 'registration', 'verification', 'attendance', 'questions', 'scores', 'appeals', 'certificates', 'reports', 'masters', 'audit'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

export default function RoleManagement() {
  const [selectedRole, setSelectedRole] = useState(systemRoles[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Permission Management"
        subtitle="Configure access control matrix for all system roles"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]}
        icon={<Shield size={18} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Role list */}
        <div className="lg:col-span-1 space-y-2">
          {systemRoles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={[
                'w-full text-left p-3 rounded-xl border transition-all',
                selectedRole.id === role.id
                  ? 'bg-brand-gold/10 border-brand-gold/30'
                  : 'bg-surface-card border-surface-border hover:border-brand-gold/20',
              ].join(' ')}
            >
              <p className={`text-sm font-semibold ${selectedRole.id === role.id ? 'text-brand-gold' : 'text-text-primary'}`}>{role.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Users size={10} className="text-text-muted" />
                <span className="text-[10px] text-text-muted">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-3 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary">{selectedRole.name}</h3>
              <p className="text-xs text-text-muted mt-0.5">{selectedRole.description}</p>
            </div>
            <Badge variant="gold" size="md">Code: {selectedRole.code}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="pb-2 text-left font-medium text-text-muted pr-4 w-32">Module</th>
                  {ACTIONS.map(a => (
                    <th key={a} className="pb-2 text-center font-medium text-text-muted px-3 capitalize">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(mod => {
                  const perms = selectedRole.permissions[mod];
                  if (!perms) return null;
                  return (
                    <tr key={mod} className="border-b border-surface-border/40 hover:bg-surface-bg transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-text-primary capitalize">{mod}</td>
                      {ACTIONS.map(action => (
                        <td key={action} className="py-2.5 px-3 text-center">
                          {perms[action] ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400">
                              <Check size={10} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400">
                              <X size={10} />
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
