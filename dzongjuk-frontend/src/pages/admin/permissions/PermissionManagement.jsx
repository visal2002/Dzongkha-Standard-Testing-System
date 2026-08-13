import { useState } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import { PermissionMatrix } from '../../../components/rbac/PermissionMatrix';
import { adminService } from '../../../services/admin';
import { useApi } from '../../../hooks/useApi';
import toast from 'react-hot-toast';

export default function PermissionManagement() {
  const { data: rolesData, loading, setData: setRoles } = useApi(adminService.getRoles);
  const roles = rolesData || [];

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const activeRoleId = selectedRoleId || roles[0]?.id;
  const selectedRole = roles.find(r => r.id === activeRoleId);

  // Convert CRUD permission object to flat matrix format for PermissionMatrix component
  const toMatrix = (permissions = {}) => {
    const matrixKeys = {
      Registration: 'registration',
      Verification: 'verification',
      Absentee: 'attendance',
      'Question Paper': 'questions',
      'Band Scores': 'scores',
      Appeal: 'appeals',
      Certificate: 'certificates',
      Reports: 'reports',
      Users: 'users',
      Roles: 'roles',
      Permissions: 'roles',
    };
    return Object.fromEntries(
      Object.entries(matrixKeys).map(([label, key]) => {
        const perms = permissions[key] || {};
        return [label, {
          View: !!perms.read,
          Create: !!perms.create,
          Update: !!perms.update,
          Delete: !!perms.delete,
          Approve: !!perms.create && !!perms.update,
          Export: !!perms.read,
        }];
      })
    );
  };

  // Convert flat matrix back to CRUD permissions object
  const fromMatrix = (matrix = {}, existingPermissions = {}) => {
    const matrixKeys = {
      Registration: 'registration',
      Verification: 'verification',
      Absentee: 'attendance',
      'Question Paper': 'questions',
      'Band Scores': 'scores',
      Appeal: 'appeals',
      Certificate: 'certificates',
      Reports: 'reports',
      Users: 'users',
      Roles: 'roles',
    };
    const updated = { ...existingPermissions };
    Object.entries(matrixKeys).forEach(([label, key]) => {
      if (matrix[label]) {
        updated[key] = {
          read: !!matrix[label].View,
          create: !!matrix[label].Create,
          update: !!matrix[label].Update,
          delete: !!matrix[label].Delete,
        };
      }
    });
    return updated;
  };

  const handleSaveMatrix = async (matrix) => {
    if (!selectedRole) return;
    const newPermissions = fromMatrix(matrix, selectedRole.permissions);

    setRoles(prev => prev.map(r =>
      r.id === selectedRole.id ? { ...r, permissions: newPermissions } : r
    ));

    try {
      await adminService.updateRolePermissions(selectedRole.id, newPermissions);
      toast.success(`Permissions saved for ${selectedRole.name}`);
    } catch {
      toast.error('Failed to save permissions. Please try again.');
    }
  };

  if (loading && !rolesData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission Management"
        subtitle="Define module-level permissions and RBAC access policies per role"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Permissions' }]}
        icon={<ShieldCheck size={18} />}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Role selector */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-2">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Select Role</h3>
          {roles.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">No roles configured.</p>
          ) : (
            roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
                  activeRoleId === role.id
                    ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold font-semibold'
                    : 'bg-surface-bg border-surface-border text-text-secondary hover:border-brand-gold/20',
                ].join(' ')}
              >
                <p className="font-medium truncate">{role.name}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">Code: {role.code}</p>
              </button>
            ))
          )}
        </div>

        {/* Permission matrix */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          {selectedRole ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{selectedRole.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{selectedRole.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-gold/10 px-2 py-1 text-[10px] uppercase tracking-wide text-brand-gold font-medium">
                  {selectedRole.code}
                </span>
              </div>
              <PermissionMatrix
                value={toMatrix(selectedRole.permissions)}
                onSave={handleSaveMatrix}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted text-sm gap-2">
              <ShieldCheck size={32} className="opacity-20" />
              <p>Select a role from the left to manage its permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
