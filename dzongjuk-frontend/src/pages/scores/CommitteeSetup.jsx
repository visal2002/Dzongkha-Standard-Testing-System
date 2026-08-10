import { useState } from 'react';
import { Users, Plus, Trash2, Crown, UserCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { committeeMembers, examWindows, systemUsers } from '../../data/mockData';
import toast from 'react-hot-toast';

export default function CommitteeSetup() {
  const [members, setMembers] = useState(committeeMembers);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const handleAdd = () => {
    if (!selectedUser) { toast.error('Please select a user'); return; }
    const user = systemUsers.find(u => u.id === selectedUser);
    if (!user) return;
    if (members.some(m => m.userId === selectedUser)) { toast.error('User already in committee'); return; }
    if (selectedRole === 'head' && members.some(m => m.isHead)) { toast.error('A Committee Head is already assigned'); return; }
    setMembers(prev => [...prev, {
      id: `CM-${Date.now()}`, examId: 'EXM-2026-001', userId: selectedUser,
      name: user.name, role: selectedRole === 'head' ? 'Committee Head' : 'Committee Member',
      isHead: selectedRole === 'head', addedAt: new Date().toISOString()
    }]);
    toast.success(`${user.name} added to committee`);
    setShowAdd(false);
    setSelectedUser('');
    setSelectedRole('member');
  };

  const handleRemove = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    toast.success('Member removed from committee');
  };

  const head = members.find(m => m.isHead);
  const regularMembers = members.filter(m => !m.isHead);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Committee Setup"
        subtitle="Constitute the examination committee and designate the Committee Head"
        breadcrumbs={[{ label: 'Scores' }, { label: 'Committee Setup' }]}
        icon={<Users size={18} />}
        action={<Button onClick={() => setShowAdd(true)} icon={<Plus size={14} />}>Add Member</Button>}
      />

      {!head && (
        <Alert variant="warning" title="No Committee Head Assigned">
          A Committee Head must be designated before band scores can be entered.
        </Alert>
      )}

      {/* Active Exam */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-xs text-text-muted mb-1">Constituting committee for</p>
        <p className="text-sm font-semibold text-text-primary">DSTS Examination — January 2026</p>
      </div>

      {/* Committee Head */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Committee Head (Chief of Examiner)</p>
        {head ? (
          <div className="flex items-center gap-4 p-4 bg-[#F59E0B]/5 border border-brand-gold/20 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-lg font-bold shrink-0">{head.name[0]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-text-primary">{head.name}</p>
                <span className="flex items-center gap-1 text-[10px] text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded-full"><Crown size={9} /> Head</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">Authorized to enter and submit band scores</p>
              <p className="text-[10px] text-text-muted">Added {new Date(head.addedAt).toLocaleDateString()}</p>
            </div>
            <Button variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={() => handleRemove(head.id)}>Remove</Button>
          </div>
        ) : (
          <div className="p-4 bg-surface-bg border border-dashed border-surface-border rounded-xl text-center text-text-muted text-sm">
            No Committee Head assigned. Click "Add Member" and select "Committee Head".
          </div>
        )}
      </div>

      {/* Committee Members */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Committee Members ({regularMembers.length})</p>
        <div className="space-y-2">
          {regularMembers.map(m => (
            <div key={m.id} className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold shrink-0">{m.name[0]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{m.name}</p>
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full"><UserCheck size={9} /> Member</span>
                </div>
                <p className="text-xs text-text-muted">View-only access to submitted scores</p>
              </div>
              <Button variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={() => handleRemove(m.id)}>Remove</Button>
            </div>
          ))}
          {regularMembers.length === 0 && (
            <div className="p-4 text-center text-text-muted text-sm border border-dashed border-surface-border rounded-xl">No members added yet</div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Committee Member"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Select User" required value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">Choose a user...</option>
            {systemUsers.filter(u => !members.some(m => m.userId === u.id)).map(u => (
              <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
            ))}
          </Select>
          <Select label="Role in Committee" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
            <option value="member">Committee Member (view-only)</option>
            <option value="head">Committee Head (can enter scores)</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
