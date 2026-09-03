import { useEffect, useState } from 'react';
import { Crown, Plus, Save, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { examService } from '@/features/exams/api';
import { scoreService } from '@/features/scores/api';
import { adminService } from '@/features/admin/api';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

export default function CommitteeSetup() {
  const { data: exams, loading: loadingExams } = useApi(examService.getAll);
  const { data: usersData } = useApi(adminService.getCommitteeRoster);
  const [examId, setExamId] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const users = usersData || [];

  useEffect(() => { if (!examId && exams?.length) setExamId(exams[0].id); }, [examId, exams]);
  useEffect(() => {
    if (!examId) return;
    let active = true;
    setLoading(true);
    scoreService.getCommittee(examId)
      .then(response => { if (active) setMembers(response.data?.members || []); })
      .catch(error => { if (active && error?.status === 404) setMembers([]); else if (active) toast.error(error?.message || 'Unable to load committee'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId]);

  const userName = userId => users.find(user => user.id === userId)?.name || `User ${userId.slice(0, 8)}`;
  const head = members.find(member => member.role === 'HEAD');

  const addMember = () => {
    if (!selectedUser) return toast.error('Select a user');
    if (members.some(member => member.userId === selectedUser)) return toast.error('User is already in this committee');
    if (selectedRole === 'HEAD' && head) return toast.error('Only one Committee Head is allowed');
    setMembers(current => [...current, { id: `new-${selectedUser}`, userId: selectedUser, role: selectedRole }]);
    setSelectedUser('');
    setSelectedRole('MEMBER');
    setShowAdd(false);
  };

  const save = async () => {
    if (!head) return toast.error('Assign exactly one Committee Head before saving');
    setSaving(true);
    try {
      const ordered = [head.userId, ...members.filter(member => member.role !== 'HEAD').map(member => member.userId)];
      const response = await scoreService.saveCommittee(examId, ordered);
      const saved = response?.data ?? response;
      setMembers(saved?.members || members);
      toast.success('Examination committee saved');
    } catch (error) {
      toast.error(error?.message || 'Unable to save committee');
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <PageHeader title="Committee Setup" subtitle="Assign the Committee Head and score-review members" breadcrumbs={[{ label: 'Scores' }, { label: 'Committee Setup' }]} icon={<Users size={18} />} action={<div className="flex gap-2"><Button variant="outline" icon={<Plus size={14} />} onClick={() => setShowAdd(true)} disabled={!examId}>Add Member</Button><Button icon={<Save size={14} />} loading={saving} onClick={save} disabled={!members.length}>Save Committee</Button></div>} />
    <div className="max-w-md"><Select label="Examination Window" value={examId} onChange={event => setExamId(event.target.value)} disabled={loadingExams}><option value="">Select examination</option>{(exams || []).map(exam => <option key={exam.id} value={exam.id}>{exam.title} · {exam.code}</option>)}</Select></div>
    {!head && <Alert variant="warning" title="Committee Head Required">Add one Committee Head before saving. Score entry remains locked until the committee is configured.</Alert>}
    {loading ? <div className="py-12 text-center text-text-muted">Loading committee...</div> : <div className="space-y-3">{members.map(member => <div key={member.id || member.userId} className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.role === 'HEAD' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-blue-500/10 text-blue-400'}`}>{member.role === 'HEAD' ? <Crown size={18} /> : <Users size={18} />}</div><div className="flex-1"><p className="text-sm font-semibold text-text-primary">{userName(member.userId)}</p><p className="text-xs text-text-muted">{member.role === 'HEAD' ? 'Committee Head · can enter and submit scores' : 'Committee Member · view-only'}</p></div><Button variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={() => setMembers(current => current.filter(item => item.userId !== member.userId))}>Remove</Button></div>)}{!members.length && <div className="p-12 text-center border border-dashed border-surface-border rounded-xl text-sm text-text-muted">No committee members assigned.</div>}</div>}
    <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Committee Member" size="sm" footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={addMember}>Add Member</Button></>}><div className="space-y-4"><Select label="System User" value={selectedUser} onChange={event => setSelectedUser(event.target.value)}><option value="">Choose user</option>{users.filter(user => !members.some(member => member.userId === user.id)).map(user => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</Select><Select label="Committee Role" value={selectedRole} onChange={event => setSelectedRole(event.target.value)}><option value="HEAD">Committee Head</option><option value="MEMBER">Committee Member</option></Select></div></Modal>
  </div>;
}
