import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Edit2, Plus, Shield, ToggleLeft, ToggleRight, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { adminService } from '@/services/admin';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';

const columnHelper = createColumnHelper();
const emptyForm = { name: '', email: '', cid: '', password: '', roles: [] };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const canManage = canAccess(currentUser?.role, 'users', 'manage');
  const { data: usersData, loading, setData: setUsers } = useApi(adminService.getUsers);
  const { data: rolesData } = useApi(adminService.getRoles);
  const users = usersData || [];
  const systemRoles = rolesData || [];
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const toggleRole = code => setForm(previous => ({
    ...previous,
    roles: previous.roles.includes(code) ? previous.roles.filter(value => value !== code) : [...previous.roles, code],
  }));

  const validate = includePassword => {
    if (!form.name || !form.email || !form.cid || form.roles.length === 0 || (includePassword && form.password.length < 12)) {
      toast.error(`Name, email, CID, ${includePassword ? 'a 12-character password, ' : ''}and at least one role are required`);
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validate(true)) return;
    try {
      const response = await adminService.createUser({ fullName: form.name, email: form.email, cid: form.cid, password: form.password, roleCodes: form.roles });
      setUsers(previous => [response?.data || response, ...previous]);
      toast.success(`User "${form.name}" created successfully`);
      setShowCreate(false);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error?.message || 'Failed to create user');
    }
  };

  const openEdit = user => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, cid: user.cid === '—' ? '' : user.cid, password: '', roles: user.roles || (user.roleCode ? [user.roleCode] : []) });
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !validate(false)) return;
    try {
      const response = await adminService.updateUser(editingUser.id, { fullName: form.name, email: form.email, cid: form.cid, roleCodes: form.roles });
      const updated = response?.data || response;
      setUsers(previous => previous.map(user => user.id === editingUser.id ? updated : user));
      toast.success(`User "${form.name}" updated successfully`);
      setEditingUser(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error?.message || 'Failed to update user');
    }
  };

  const handleToggleStatus = async target => {
    const status = target.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.setUserStatus(target.id, status);
      setUsers(previous => previous.map(user => user.id === target.id ? { ...user, status } : user));
      toast.success('User status updated');
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteUser(deleting.id);
      setUsers(previous => previous.filter(user => user.id !== deleting.id));
      toast.success('User deleted');
      setDeleting(null);
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const columns = useMemo(() => {
    const base = [
      columnHelper.accessor('name', { header: 'User', cell: info => <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-bold text-sm">{info.getValue()?.[0]}</div><div><p className="text-xs font-medium text-text-primary">{info.getValue()}</p><p className="text-[10px] text-text-muted">{info.row.original.email}</p></div></div> }),
      columnHelper.accessor('cid', { header: 'CID', cell: info => <span className="font-mono text-xs text-text-muted">{info.getValue() || '—'}</span> }),
      columnHelper.accessor('role', { header: 'Assigned Role(s)', cell: info => <div className="flex flex-wrap gap-1">{String(info.getValue() || 'Unassigned').split(', ').map(role => <span key={role} className="px-2 py-0.5 rounded text-[10px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20">{role}</span>)}</div> }),
      columnHelper.accessor('status', { header: 'Status', cell: info => <StatusBadge status={info.getValue()} /> }),
      columnHelper.accessor('lastLogin', { header: 'Last Login', cell: info => <span className="text-xs text-text-muted">{info.getValue() ? new Date(info.getValue()).toLocaleString() : '—'}</span> }),
    ];
    if (canManage) base.push(columnHelper.display({ id: 'actions', header: 'Actions', cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="xs" icon={<Edit2 size={12} />} onClick={() => openEdit(row.original)}>Edit</Button><button onClick={() => handleToggleStatus(row.original)} className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400">{row.original.status === 'active' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}{row.original.status === 'active' ? 'Deactivate' : 'Activate'}</button><Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleting(row.original)} className="text-red-400" /></div> }));
    return base;
  }, [canManage, systemRoles]);

  const roleSelector = <div className="col-span-2 space-y-2"><label className="text-xs font-semibold text-text-secondary flex items-center gap-1"><Shield size={12} className="text-brand-gold" />Assign Role(s) <span className="text-red-400">*</span></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-surface-border rounded-xl p-3 bg-surface-bg">{systemRoles.map(role => <label key={role.code} className="flex items-center gap-2 cursor-pointer text-xs p-1.5 rounded"><input type="checkbox" checked={form.roles.includes(role.code)} onChange={() => toggleRole(role.code)} /><span className={form.roles.includes(role.code) ? 'font-semibold text-brand-gold' : 'text-text-primary'}>{role.name}</span></label>)}</div></div>;

  return <div className="space-y-6">
    <PageHeader title="User Management" subtitle={canManage ? 'Create, update, assign roles, deactivate, and delete DSTS users' : 'Read-only user directory based on the approved access matrix'} breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]} icon={<Users size={18} />} action={canManage ? <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} icon={<Plus size={14} />}>Add User</Button> : null} />
    <div className="bg-surface-card border border-surface-border rounded-xl p-5"><DataTable data={users} columns={columns} loading={loading} searchPlaceholder="Search users by name, email, or role..." /></div>
    <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New System User" size="md" footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate}>Create User</Button></>}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="col-span-1 sm:col-span-2"><Input label="Full Name" required value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></div><Input label="Email Address" type="email" required value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /><Input label="CID Number" required value={form.cid} onChange={event => setForm(previous => ({ ...previous, cid: event.target.value }))} /><div className="col-span-1 sm:col-span-2"><Input label="Temporary Password" type="password" required value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} hint="At least 12 characters; the user should change it after first sign-in." /></div>{roleSelector}</div></Modal>
    <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit User — ${editingUser?.name}`} size="md" footer={<><Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button><Button onClick={handleSaveEdit}>Save Changes</Button></>}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="col-span-1 sm:col-span-2"><Input label="Full Name" required value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></div><Input label="Email Address" type="email" required value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /><Input label="CID Number" required value={form.cid} onChange={event => setForm(previous => ({ ...previous, cid: event.target.value }))} />{roleSelector}</div></Modal>
    <ConfirmModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete User" message={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`} confirmLabel="Delete User" />
  </div>;
}
