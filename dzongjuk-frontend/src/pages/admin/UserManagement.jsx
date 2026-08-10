import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Users, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { adminService } from '../../services/admin';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

export default function UserManagement() {
  const { data: usersData, loading, setData: setUsers } = useApi(adminService.getUsers);
  const { data: rolesData } = useApi(adminService.getRoles);
  const users = usersData || [];
  const systemRoles = rolesData || [];

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', cid: '', roles: [] });

  const handleCreate = () => {
    if (!form.name || !form.email || form.roles.length === 0) {
      toast.error('Please fill all required fields and select at least one role');
      return;
    }
    const roleNames = form.roles.map(code => systemRoles.find(r => r.code === code)?.name || code);
    setUsers(prev => [...prev, {
      id: `USR-${Date.now()}`,
      name: form.name,
      email: form.email,
      cid: form.cid || '—',
      role: roleNames.join(', '),
      roleCode: form.roles[0],
      roles: form.roles,
      status: 'active',
      lastLogin: new Date().toISOString()
    }]);
    toast.success(`User "${form.name}" created successfully`);
    setShowCreate(false);
    setForm({ name: '', email: '', cid: '', roles: [] });
  };

  const handleOpenEdit = (user) => {
    const userRoleCodes = user.roles || (user.roleCode ? [user.roleCode] : []);
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      cid: user.cid === '—' ? '' : user.cid,
      roles: userRoleCodes
    });
  };

  const handleSaveEdit = () => {
    if (!editingUser || !form.name || !form.email || form.roles.length === 0) {
      toast.error('Name, email, and at least one role are required');
      return;
    }
    const roleNames = form.roles.map(code => systemRoles.find(r => r.code === code)?.name || code);
    setUsers(prev => prev.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: form.name,
          email: form.email,
          cid: form.cid || '—',
          role: roleNames.join(', '),
          roleCode: form.roles[0],
          roles: form.roles
        };
      }
      return u;
    }));
    toast.success(`User "${form.name}" updated successfully`);
    setEditingUser(null);
    setForm({ name: '', email: '', cid: '', roles: [] });
  };

  const handleToggleRoleSelection = (code) => {
    setForm(prev => {
      const exists = prev.roles.includes(code);
      if (exists) {
        return { ...prev, roles: prev.roles.filter(c => c !== code) };
      }
      return { ...prev, roles: [...prev.roles, code] };
    });
  };

  const handleToggleStatus = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
    toast.success('User status updated');
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'User',
      cell: i => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-bold text-sm shrink-0">{i.getValue()[0]}</div>
          <div>
            <p className="text-xs font-medium text-text-primary">{i.getValue()}</p>
            <p className="text-[10px] text-text-muted">{i.row.original.email}</p>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('cid', { header: 'CID', cell: i => <span className="font-mono text-xs text-text-muted">{i.getValue()}</span> }),
    columnHelper.accessor('role', {
      header: 'Assigned Role(s)',
      cell: i => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {i.getValue().split(', ').map(r => (
            <span key={r} className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-gold/10 text-brand-gold border border-brand-gold/20">{r}</span>
          ))}
        </div>
      )
    }),
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('lastLogin', { header: 'Last Login', cell: i => <span className="text-xs text-text-muted">{new Date(i.getValue()).toLocaleString()}</span> }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" icon={<Edit2 size={12} />} onClick={() => handleOpenEdit(row.original)}>Edit</Button>
          <button
            onClick={() => handleToggleStatus(row.original.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${row.original.status === 'active' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
          >
            {row.original.status === 'active' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
            {row.original.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleting(row.original)} className="text-red-400" />
        </div>
      )
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create, manage, and assign system roles and permissions to all DSTS users"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        icon={<Users size={18} />}
        action={
          <Button onClick={() => {
            setForm({ name: '', email: '', cid: '', roles: [] });
            setShowCreate(true);
          }} icon={<Plus size={14} />}>Add User</Button>
        }
      />

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={users} columns={columns} searchPlaceholder="Search users by name, email, or role..." onExport={() => toast.success('Exporting users list...')} />
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New System User" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create User</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Full Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jigme Dorji" />
          </div>
          <Input label="Email Address" type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jigme@example.com" />
          <Input label="CID Number" value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} placeholder="11101001001" hint="Optional" />
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Shield size={12} className="text-brand-gold" />
              Assign Role(s) <span className="text-red-400">*</span> (Select one or multiple)
            </label>
            <div className="grid grid-cols-2 gap-2 border border-surface-border rounded-xl p-3 bg-surface-bg">
              {systemRoles.map(r => {
                const isSelected = form.roles.includes(r.code);
                return (
                  <label key={r.code} className="flex items-center gap-2 cursor-pointer text-xs p-1.5 rounded hover:bg-surface-card transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRoleSelection(r.code)}
                      className="rounded border-surface-border text-brand-gold focus:ring-brand-gold/40"
                    />
                    <span className={isSelected ? 'font-semibold text-brand-gold' : 'text-text-primary'}>{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit User — ${editingUser?.name}`} size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Full Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <Input label="Email Address" type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="CID Number" value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} />
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Shield size={12} className="text-brand-gold" />
              Assigned Role(s) (Select one or multiple)
            </label>
            <div className="grid grid-cols-2 gap-2 border border-surface-border rounded-xl p-3 bg-surface-bg">
              {systemRoles.map(r => {
                const isSelected = form.roles.includes(r.code);
                return (
                  <label key={r.code} className="flex items-center gap-2 cursor-pointer text-xs p-1.5 rounded hover:bg-surface-card transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRoleSelection(r.code)}
                      className="rounded border-surface-border text-brand-gold focus:ring-brand-gold/40"
                    />
                    <span className={isSelected ? 'font-semibold text-brand-gold' : 'text-text-primary'}>{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => { setUsers(prev => prev.filter(u => u.id !== deleting.id)); toast.success('User deleted'); setDeleting(null); }}
        title="Delete User"
        message={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        confirmLabel="Delete User"
      />
    </div>
  );
}
