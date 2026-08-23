import { useEffect, useMemo, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { adminService } from '@/services/admin';
import { useApi } from '@/hooks/useApi';

const permissionGroup = name => {
  if (name === '*') return 'System';
  const prefix = name.split('.')[0];
  return ({ admin: 'Administration', exam: 'Examinations', registration: 'Registration', attendance: 'Attendance', question: 'Question Papers', committee: 'Committees', score: 'Scores', result: 'Results', appeal: 'Re-evaluation', certificate: 'Certificates', report: 'Reports', audit: 'Audit' })[prefix] || 'Other';
};

export default function PermissionManagement() {
  const { data: rolesData, loading: loadingRoles, setData: setRoles } = useApi(adminService.getRoles);
  const { data: permissionData, loading: loadingPermissions } = useApi(adminService.getPermissions);
  const roles = rolesData || [];
  const permissions = permissionData || [];
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const activeRoleId = selectedRoleId || roles[0]?.id;
  const selectedRole = roles.find(role => role.id === activeRoleId);

  useEffect(() => {
    setSelected(Array.isArray(selectedRole?.permissions) ? selectedRole.permissions : []);
  }, [selectedRole]);

  const grouped = useMemo(() => permissions.reduce((result, permission) => {
    const group = permissionGroup(permission.name);
    result[group] = [...(result[group] || []), permission];
    return result;
  }, {}), [permissions]);

  const toggle = name => setSelected(current => current.includes(name)
    ? current.filter(value => value !== name)
    : [...current, name]);

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await adminService.updateRolePermissions(selectedRole.id, selected);
      setRoles(current => current.map(role => role.id === selectedRole.id ? { ...role, permissions: selected } : role));
      toast.success(`Permissions saved for ${selectedRole.name}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingRoles || loadingPermissions;
  return <div className="space-y-6">
    <PageHeader title="Permission Management" subtitle="Assign the exact backend permissions enforced by DSTS services" breadcrumbs={[{ label: 'Administration' }, { label: 'Permissions' }]} icon={<ShieldCheck size={18} />} />
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-2">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Select Role</h3>
        {roles.map(role => <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${activeRoleId === role.id ? 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold' : 'border-surface-border bg-surface-bg text-text-secondary'}`}><p className="font-medium">{role.name}</p><p className="mt-0.5 font-mono text-[10px] text-text-muted">{role.code}</p></button>)}
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        {loading ? <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" /></div> : selectedRole ? <>
          <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-text-primary">{selectedRole.name}</h3><p className="mt-1 text-xs text-text-muted">{selected.length} permission{selected.length === 1 ? '' : 's'} selected</p></div><Button onClick={save} loading={saving} icon={<Save size={14} />}>Save Permissions</Button></div>
          <div className="space-y-5">{Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => <section key={group}><h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{group}</h4><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{items.map(permission => <label key={permission.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-border bg-surface-bg p-3"><input type="checkbox" className="mt-0.5" checked={selected.includes(permission.name)} onChange={() => toggle(permission.name)} /><span><span className="block font-mono text-xs text-text-primary">{permission.name}</span>{permission.description && <span className="mt-1 block text-[10px] text-text-muted">{permission.description}</span>}</span></label>)}</div></section>)}</div>
        </> : <p className="py-16 text-center text-sm text-text-muted">No roles are configured.</p>}
      </div>
    </div>
  </div>;
}
