import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Users, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import { systemUsers, systemRoles } from '../../data/mockData';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

export default function UserManagement() {
  const [users, setUsers] = useState(systemUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', cid: '', role: '' });

  const handleCreate = () => {
    if (!form.name || !form.email || !form.role) { toast.error('Please fill all required fields'); return; }
    const role = systemRoles.find(r => r.code === form.role);
    setUsers(prev => [...prev, {
      id: `USR-${Date.now()}`, name: form.name, email: form.email, cid: form.cid || '—',
      role: role?.name || form.role, roleCode: form.role, status: 'active', lastLogin: new Date().toISOString()
    }]);
    toast.success(`User ${form.name} created`);
    setShowCreate(false);
    setForm({ name: '', email: '', cid: '', role: '' });
  };

  const handleToggle = (id) => {
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
    columnHelper.accessor('role', { header: 'Role', cell: i => <span className="text-xs text-text-secondary">{i.getValue()}</span> }),
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('lastLogin', { header: 'Last Login', cell: i => <span className="text-xs text-text-muted">{new Date(i.getValue()).toLocaleString()}</span> }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" icon={<Edit2 size={12} />}>Edit</Button>
          <button
            onClick={() => handleToggle(row.original.id)}
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
        subtitle="Create, manage, and control access for all DSTS system users"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        icon={<Users size={18} />}
        action={<Button onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>Add User</Button>}
      />

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={users} columns={columns} searchPlaceholder="Search users..." onExport={() => toast.success('Exporting...')} />
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create User</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Full Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <Input label="Email Address" type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="CID Number" value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} hint="Leave blank if not applicable" />
          <div className="col-span-2">
            <Select label="System Role" required value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="">Select role...</option>
              {systemRoles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => { setUsers(prev => prev.filter(u => u.id !== deleting.id)); toast.success('User deleted'); setDeleting(null); }}
        title="Delete User"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete User"
      />
    </div>
  );
}
