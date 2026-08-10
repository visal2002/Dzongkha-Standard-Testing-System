/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Plus, MapPin, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import { examService } from '../../services/exams';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function RegistrationWindows() {
  const { user } = useAuth();
  const { data: windows, loading: loadingWindows, setData: setWindows } = useApi(examService.getAll);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // holds the window being edited
  const [editForm, setEditForm] = useState({});
  const isAdmin = user?.role === 'dcdd' || user?.role === 'admin';

  const handleApply = (ew) => {
    if (ew.currentRegistrations >= ew.maxCapacity) {
      toast('You will be placed on the waitlist.', { icon: '⚠️' });
    }
    toast.success(`Application submitted for ${ew.title}!`);
  };

  const openEdit = (ew) => {
    setEditTarget(ew);
    setEditForm({ 
      ...ew,
      examDate: ew.examDate ? new Date(ew.examDate).toISOString().split('T')[0] : '',
      registrationStart: ew.registrationStart ? new Date(ew.registrationStart).toISOString().split('T')[0] : '',
      registrationEnd: ew.registrationEnd ? new Date(ew.registrationEnd).toISOString().split('T')[0] : ''
    });
  };

  const handleEditSave = () => {
    setWindows(prev => prev.map(w => w.id === editTarget.id ? { ...w, ...editForm } : w));
    toast.success('Exam window updated successfully!');
    setEditTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Windows"
        subtitle="View and manage registration windows for DSTS examinations"
        breadcrumbs={[{ label: 'Registration' }]}
        icon={<Calendar size={18} />}
        action={isAdmin && (
          <Button onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>
            New Exam Window
          </Button>
        )}
      />

      {loadingWindows ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-4">
          {(windows || []).map((ew, i) => {
          const capacityPct = (ew.currentRegistrations / ew.maxCapacity) * 100;
          const isFull = ew.currentRegistrations >= ew.maxCapacity;
          return (
            <motion.div
              key={ew.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand-gold/20 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-text-primary">{ew.title}</h3>
                    <StatusBadge status={ew.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                    <div className="flex items-start gap-1.5 text-text-secondary">
                      <Calendar size={12} className="text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-text-muted text-[10px]">Exam Date</p>
                        <p className="font-medium">{new Date(ew.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-text-secondary">
                      <Clock size={12} className="text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-text-muted text-[10px]">Registration</p>
                        <p className="font-medium">{new Date(ew.registrationStart).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – {new Date(ew.registrationEnd).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-text-secondary">
                      <MapPin size={12} className="text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-text-muted text-[10px]">Venue</p>
                        <p className="font-medium truncate">{ew.venue.split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-text-secondary">
                      <Users size={12} className="text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-text-muted text-[10px]">Capacity</p>
                        <p className="font-medium">{ew.currentRegistrations}/{ew.maxCapacity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                      <span>{ew.currentRegistrations} registered</span>
                      <span>{ew.waitlistCount > 0 ? `${ew.waitlistCount} waitlisted` : `${ew.maxCapacity - ew.currentRegistrations} seats left`}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${capacityPct >= 90 ? 'bg-red-400' : capacityPct >= 70 ? 'bg-amber-400' : 'bg-[#F59E0B]'}`}
                        style={{ width: `${Math.min(capacityPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                    <span>Registration fee: Nu. {ew.paymentAmount}</span>
                    {ew.waitlistCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400"><AlertCircle size={10} /> Waitlist active</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {user?.role === 'test_taker' && ew.status === 'open' && (
                    <Button onClick={() => handleApply(ew)} icon={<ChevronRight size={14} />} size="sm">
                      {isFull ? 'Join Waitlist' : 'Apply Now'}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="secondary" size="sm" onClick={() => openEdit(ew)}>Edit Window</Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* Create Exam Window Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Exam Window"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Exam window created!'); setShowCreate(false); }}>Create Window</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Examination Title" placeholder="e.g. DSTS Examination — July 2026" required />
          </div>
          <Input label="Exam Date" type="date" required />
          <Input label="Venue" placeholder="e.g. Royal Institute of Management" required />
          <Input label="Registration Opens" type="date" required />
          <Input label="Registration Closes" type="date" required />
          <Input label="Maximum Capacity" type="number" placeholder="e.g. 150" required />
          <Input label="Registration Fee (Nu.)" type="number" placeholder="e.g. 500" required />
        </div>
      </Modal>

      {/* Edit Exam Window Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Exam Window"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        {editTarget && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Examination Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
            </div>
            <Input label="Exam Date" type="date" value={editForm.examDate} onChange={e => setEditForm({ ...editForm, examDate: e.target.value })} required />
            <Input label="Venue" value={editForm.venue} onChange={e => setEditForm({ ...editForm, venue: e.target.value })} required />
            <Input label="Registration Opens" type="date" value={editForm.registrationStart} onChange={e => setEditForm({ ...editForm, registrationStart: e.target.value })} required />
            <Input label="Registration Closes" type="date" value={editForm.registrationEnd} onChange={e => setEditForm({ ...editForm, registrationEnd: e.target.value })} required />
            <Input label="Maximum Capacity" type="number" value={editForm.maxCapacity} onChange={e => setEditForm({ ...editForm, maxCapacity: parseInt(e.target.value, 10) })} required />
            <Input label="Registration Fee (Nu.)" type="number" value={editForm.paymentAmount} onChange={e => setEditForm({ ...editForm, paymentAmount: parseInt(e.target.value, 10) })} required />
            
            <div className="col-span-2">
              <Select label="Status" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
