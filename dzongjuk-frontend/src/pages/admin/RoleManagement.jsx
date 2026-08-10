import { useState } from 'react';
import { Shield, Users, Check, X, Plus, Save } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import { systemRoles } from '../../data/mockData';
import toast from 'react-hot-toast';

const MODULES = ['users', 'roles', 'registration', 'verification', 'attendance', 'questions', 'scores', 'appeals', 'certificates', 'reports', 'masters', 'audit'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

export default function RoleManagement() {
  const [roles, setRoles] = useState(systemRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0].id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', code: '', description: '' });

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleTogglePermission = (mod, action) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === selectedRoleId) {
        const currentModPerms = role.permissions[mod] || { create: false, read: false, update: false, delete: false };
        const updatedModPerms = { ...currentModPerms, [action]: !currentModPerms[action] };
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [mod]: updatedModPerms
          }
        };
      }
      return role;
    }));
  };

  const handleSavePermissions = () => {
    toast.success(`Permissions updated for ${selectedRole.name}`);
  };

  const handleCreateRole = () => {
    if (!newRoleForm.name || !newRoleForm.code) {
      toast.error('Role name and code are required.');
      return;
    }
    const defaultPerms = {};
    MODULES.forEach(m => {
      defaultPerms[m] = { create: false, read: true, update: false, delete: false };
    });

    const newRole = {
      id: `ROLE-${Date.now()}`,
      name: newRoleForm.name,
      code: newRoleForm.code.toLowerCase().replace(/\s+/g, '_'),
      description: newRoleForm.description || 'Custom defined role',
      userCount: 0,
      permissions: defaultPerms
    };

    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setShowCreateModal(false);
    setNewRoleForm({ name: '', code: '', description: '' });
    toast.success(`Role "${newRole.name}" created successfully.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Permission Management"
        subtitle="Define roles, assign CRUD permissions per module, and manage access control"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]}
        icon={<Shield size={18} />}
        action={
          <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={14} />}>
            Create Role
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Role list */}
        <div className="lg:col-span-1 space-y-2">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={[
                'w-full text-left p-3 rounded-xl border transition-all',
                selectedRole.id === role.id
                  ? 'bg-brand-gold/10 border-brand-gold/30'
                  : 'bg-surface-card border-surface-border hover:border-brand-gold/20',
              ].join(' ')}
            >
              <p className={`text-sm font-semibold ${selectedRole.id === role.id ? 'text-brand-gold' : 'text-text-primary'}`}>{role.name}</p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <Users size={10} className="text-text-muted" />
                  <span className="text-[10px] text-text-muted">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-[9px] font-mono text-text-muted">Code: {role.code}</span>
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
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="md">Code: {selectedRole.code}</Badge>
              <Button size="sm" icon={<Save size={13} />} onClick={handleSavePermissions}>Save Changes</Button>
            </div>
          </div>

          <div className="p-3 bg-surface-bg rounded-lg border border-surface-border mb-4 text-xs text-text-muted flex items-center justify-between">
            <span>Click any action button below to toggle specific CRUD permissions for <strong>{selectedRole.name}</strong>.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="pb-2 text-left font-medium text-text-muted pr-4 w-36">Module</th>
                  {ACTIONS.map(a => (
                    <th key={a} className="pb-2 text-center font-medium text-text-muted px-3 capitalize">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(mod => {
                  const perms = selectedRole.permissions[mod] || { create: false, read: false, update: false, delete: false };
                  return (
                    <tr key={mod} className="border-b border-surface-border/40 hover:bg-surface-bg transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-text-primary capitalize">{mod}</td>
                      {ACTIONS.map(action => {
                        const isAllowed = !!perms[action];
                        return (
                          <td key={action} className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleTogglePermission(mod, action)}
                              title={`Click to ${isAllowed ? 'revoke' : 'grant'} ${action} permission on ${mod}`}
                              className={[
                                'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all',
                                isAllowed
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                              ].join(' ')}
                            >
                              {isAllowed ? <Check size={11} /> : <X size={11} />}
                              <span className="capitalize">{action}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New System Role"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRole}>Create Role</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            placeholder="e.g. Chief Evaluator"
            required
            value={newRoleForm.name}
            onChange={e => setNewRoleForm(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Role Code"
            placeholder="e.g. chief_evaluator"
            required
            value={newRoleForm.code}
            onChange={e => setNewRoleForm(p => ({ ...p, code: e.target.value }))}
            hint="Machine-readable code used in RBAC guards"
          />
          <Textarea
            label="Description"
            rows={3}
            placeholder="Brief overview of responsibilities and access level..."
            value={newRoleForm.description}
            onChange={e => setNewRoleForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
