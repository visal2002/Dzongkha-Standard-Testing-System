import { useState } from 'react';
import { Calendar, Users, Plus, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import { examService } from '../../services/exams';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const emptyForm = { code: '', title: '', examDate: '', venue: '', registrationStart: '', registrationEnd: '', maxCapacity: '', paymentAmount: '' };

export default function RegistrationWindows() {
  const { user } = useAuth();
  const { data: windows, loading, error, setData: setWindows, execute } = useApi(examService.getAll);
  const [showCreate, setShowCreate] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatus, setNextStatus] = useState('draft');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'dcdd' || user?.role === 'admin';

  const setField = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const createWindow = async () => {
    if (Object.values(form).some(value => value === '')) return toast.error('Complete every required field.');
    setSaving(true);
    try {
      const response = await examService.create(form);
      setWindows(current => [...(current || []), response.data]);
      setForm(emptyForm);
      setShowCreate(false);
      toast.success('Exam window created as a draft.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to create the exam window.');
    } finally { setSaving(false); }
  };

  const updateStatus = async () => {
    setSaving(true);
    try {
      const response = await examService.updateStatus(statusTarget.id, nextStatus);
      setWindows(current => current.map(item => item.id === statusTarget.id ? response.data : item));
      setStatusTarget(null);
      toast.success('Exam status updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to update the exam status.');
    } finally { setSaving(false); }
  };

  const manageStatus = window => { setStatusTarget(window); setNextStatus(window.status); };

  return (
    <div className="space-y-6">
      <PageHeader title="Examination Windows" subtitle="View and manage registration windows for DSTS examinations" breadcrumbs={[{ label: 'Registration' }]} icon={<Calendar size={18} />} action={isAdmin && <Button onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>New Exam Window</Button>} />

      {loading ? <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        : error ? <div className="bg-surface-card border border-red-500/20 rounded-xl py-12 text-center"><p className="text-sm text-red-400 mb-3">{error}</p><Button size="sm" onClick={() => execute()}>Try Again</Button></div>
        : !(windows || []).length ? <div className="bg-surface-card border border-surface-border rounded-xl py-16 text-center"><Calendar size={32} className="mx-auto text-text-muted mb-3" /><h3 className="text-base font-semibold text-text-primary">No examination windows yet</h3><p className="text-sm text-text-muted mt-1">Create the first window to begin accepting registrations.</p>{isAdmin && <Button className="mt-4" onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>Create Exam Window</Button>}</div>
        : <div className="grid gap-4">{windows.map(window => {
          const capacity = Number(window.maxCapacity || 0);
          const registered = Number(window.currentRegistrations || 0);
          const capacityPct = capacity ? registered / capacity * 100 : 0;
          return <div key={window.id} className="bg-surface-card border border-surface-border rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3"><h3 className="text-base font-semibold text-text-primary">{window.title}</h3><StatusBadge status={window.status} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Info icon={Calendar} label="Exam Date" value={formatDate(window.examDate)} />
                  <Info icon={Clock} label="Registration" value={`${formatDate(window.registrationStart, false)} – ${formatDate(window.registrationEnd, false)}`} />
                  <Info icon={MapPin} label="Venue" value={window.venue} />
                  <Info icon={Users} label="Capacity" value={`${registered}/${capacity}`} />
                </div>
                <div className="mt-4 h-1.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${Math.min(capacityPct, 100)}%` }} /></div>
                <p className="mt-2 text-xs text-text-muted">Code: {window.code} · Registration fee: Nu. {window.paymentAmount}</p>
              </div>
              {isAdmin && <Button variant="secondary" size="sm" onClick={() => manageStatus(window)}>Manage Status</Button>}
            </div>
          </div>;
        })}</div>}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Exam Window" size="lg" footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={createWindow}>Create Window</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Examination Title" value={form.title} onChange={event => setField('title', event.target.value)} placeholder="e.g. DSTS Examination — July 2026" required /></div>
          <Input label="Exam Code" value={form.code} onChange={event => setField('code', event.target.value)} placeholder="e.g. DSTS-2026-01" required />
          <Input label="Venue" value={form.venue} onChange={event => setField('venue', event.target.value)} placeholder="e.g. Royal Institute of Management" required />
          <Input label="Registration Opens" type="datetime-local" value={form.registrationStart} onChange={event => setField('registrationStart', event.target.value)} required />
          <Input label="Registration Closes" type="datetime-local" value={form.registrationEnd} onChange={event => setField('registrationEnd', event.target.value)} required />
          <Input label="Exam Date" type="datetime-local" value={form.examDate} onChange={event => setField('examDate', event.target.value)} required />
          <Input label="Maximum Capacity" type="number" min="1" value={form.maxCapacity} onChange={event => setField('maxCapacity', event.target.value)} required />
          <Input label="Registration Fee (Nu.)" type="number" min="0" value={form.paymentAmount} onChange={event => setField('paymentAmount', event.target.value)} required />
        </div>
      </Modal>

      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Manage Exam Status" size="sm" footer={<><Button variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Button><Button loading={saving} onClick={updateStatus}>Update Status</Button></>}>
        <div className="space-y-4"><p className="text-sm text-text-secondary">{statusTarget?.title}</p><Select label="Status" value={nextStatus} onChange={event => setNextStatus(event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="registration_open">Registration Open</option><option value="registration_closed">Registration Closed</option><option value="in_progress">In Progress</option><option value="results_declared">Results Declared</option><option value="archived">Archived</option><option value="cancelled">Cancelled</option></Select><p className="text-xs text-text-muted">Status changes must follow the official sequence. Invalid transitions are rejected by the server.</p></div>
      </Modal>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-1.5 text-text-secondary"><Icon size={12} className="text-brand-gold mt-0.5 shrink-0" /><div className="min-w-0"><p className="text-text-muted text-[10px]">{label}</p><p className="font-medium truncate">{value}</p></div></div>;
}

function formatDate(value, year = true) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
}
