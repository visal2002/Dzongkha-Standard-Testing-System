/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Calendar, MapPin, CreditCard, Download, ExternalLink, RefreshCw, XCircle, Edit2, User, Mail, Phone, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { applicationService } from '@/services/applications';
import { examService } from '@/services/exams';
import toast from 'react-hot-toast';

// Cancellation is only meaningful before DCDD verification begins - the backend
// enforces the same cutoff (409 once review has started), this just avoids offering
// the button for a status where it would always fail.
const CANCELLABLE_STATUSES = ['submitted', 'waitlisted'];

const dzongkhags = ['Bumthang', 'Chhukha', 'Dagana', 'Gasa', 'Haa', 'Lhuentse', 'Mongar', 'Paro', 'Pemagatshel', 'Punakha', 'Samdrup Jongkhar', 'Samtse', 'Sarpang', 'Thimphu', 'Trashigang', 'Trashiyangtse', 'Trongsa', 'Tsirang', 'Wangdue Phodrang', 'Zhemgang'];
const educationLevels = ['Below Class X', 'Class X', 'Class XII', 'Certificate', 'Diploma', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate', 'Other'];

// Matches ApplicationForm.jsx's submission schema exactly, minus `cid` - the identity
// key is immutable once an application exists, so resubmission never carries it.
const resubmitSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: z.string().min(1, 'Gender is required.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().trim().min(8, 'Contact number is required.'),
  dzongkhag: z.string().min(1, 'Dzongkhag is required.'),
  gewog: z.string().trim().min(2, 'Gewog is required.'),
  education: z.string().trim().min(2, 'Education level is required.'),
  institution: z.string().trim().min(2, 'Institution is required.'),
  employmentStatus: z.string().min(1, 'Employment status is required.'),
  organization: z.string().trim().optional(),
});

function ResubmitForm({ app, onCancel, onResubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
      fullName: app.testTakerName || '', dateOfBirth: app.dob || '', gender: app.gender || '',
      email: app.email || '', phone: app.phone || '', dzongkhag: app.dzongkhag || '', gewog: app.gewog || '',
      education: app.education || '', institution: app.institution || '', employmentStatus: app.employmentStatus || '',
      organization: app.organization || '',
    },
  });

  const submit = async data => {
    setSubmitting(true);
    try {
      await applicationService.resubmit(app.id, { ...data, cid: app.cid });
      toast.success('Application resubmitted for review.');
      onResubmitted();
    } catch (error) {
      toast.error(error.message || 'Unable to resubmit the application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="mt-3 p-4 bg-surface-bg border border-surface-border rounded-xl space-y-4">
      <p className="text-xs font-semibold text-text-primary">Correct the flagged details and resubmit</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Full Name" required {...register('fullName')} error={errors.fullName?.message} />
        <Input label="Date of Birth" type="date" required {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
        <Select label="Gender" required {...register('gender')} error={errors.gender?.message}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select>
        <Input label="Email" type="email" required {...register('email')} error={errors.email?.message} />
        <Input label="Contact Number" required {...register('phone')} error={errors.phone?.message} />
        <Select label="Dzongkhag" required {...register('dzongkhag')} error={errors.dzongkhag?.message}><option value="">Select dzongkhag</option>{dzongkhags.map(item => <option key={item}>{item}</option>)}</Select>
        <Input label="Gewog" required {...register('gewog')} error={errors.gewog?.message} />
        <Select label="Highest Education Level" required {...register('education')} error={errors.education?.message}><option value="">Select education level</option>{educationLevels.map(level => <option key={level} value={level}>{level}</option>)}</Select>
        <Input label="Institution" required {...register('institution')} error={errors.institution?.message} />
        <Select label="Employment Status" required {...register('employmentStatus')} error={errors.employmentStatus?.message}><option value="">Select status</option><option>Employed</option><option>Unemployed</option><option>Student</option><option>Self-employed</option></Select>
        <Input label="Organization" {...register('organization')} error={errors.organization?.message} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" loading={submitting} icon={<Save size={13} />}>Resubmit Application</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ProfileSummary() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const startEdit = () => {
    setName(user?.name || ''); setEmail(user?.email || ''); setPhone(user?.phone || '');
    setEditing(true);
  };

  const save = async e => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('Name and email are required.');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      toast.success('Profile updated successfully.');
      setEditing(false);
    } catch (error) {
      toast.error(error.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full h-9 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors";

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary">My Profile</h2>
        {!editing && <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-light transition-colors font-medium"><Edit2 size={12} /> Edit</button>}
      </div>
      {editing ? (
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="block text-xs text-text-muted mb-1">Full Name</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} required /></div>
          <div><label className="block text-xs text-text-muted mb-1">Email</label><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label className="block text-xs text-text-muted mb-1">Contact Number</label><input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+975-17XXXXXX" /></div>
          <div className="md:col-span-3 flex gap-2 pt-1">
            <Button type="submit" size="sm" loading={saving} icon={<Save size={13} />}>Save Changes</Button>
            <Button type="button" size="sm" variant="ghost" icon={<X size={13} />} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2"><User size={14} className="text-text-muted shrink-0" /><span className="text-text-primary font-medium">{user?.name}</span></div>
          <div className="flex items-center gap-2"><Mail size={14} className="text-text-muted shrink-0" /><span className="text-text-primary">{user?.email}</span></div>
          <div className="flex items-center gap-2"><Phone size={14} className="text-text-muted shrink-0" /><span className="text-text-primary">{user?.phone || '—'}</span></div>
        </div>
      )}
    </div>
  );
}

export default function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myApps, setMyApps] = useState([]);
  const [examWindows, setExamWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentBusy, setPaymentBusy] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [resubmittingId, setResubmittingId] = useState(null);

  const reloadApplications = async () => {
    const response = await applicationService.getByUser(user?.id);
    setMyApps(response.data);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await applicationService.cancel(cancelTarget.id);
      toast.success('Application cancelled.');
      setCancelTarget(null);
      await reloadApplications();
    } catch (error) {
      toast.error(error.message || 'Unable to cancel the application.');
    } finally {
      setCancelling(false);
    }
  };

  const continuePayment = async app => {
    setPaymentBusy(app.id);
    try {
      const payment = app.paymentRedirectUrl
        ? { redirectUrl: app.paymentRedirectUrl }
        : await applicationService.createPaymentAdvice(app.id);
      if (!payment.redirectUrl) throw new Error('BIRMS did not provide a payment page.');
      window.location.assign(payment.redirectUrl);
    } catch (error) {
      toast.error(error.message || 'Unable to start BIRMS payment.');
      setPaymentBusy(null);
    }
  };

  const refreshPayment = async app => {
    setPaymentBusy(app.id);
    try {
      const payment = await applicationService.refreshPayment(app.id);
      toast.success(`Payment status: ${String(payment.status).replace(/_/g, ' ')}`);
      await reloadApplications();
    } catch (error) {
      toast.error(error.message || 'Unable to check BIRMS payment status.');
    } finally { setPaymentBusy(null); }
  };

  const downloadReceipt = async app => {
    setPaymentBusy(app.id);
    try {
      const receipt = await applicationService.getPaymentReceipt(app.id);
      if (!receipt.base64Pdf) throw new Error('BIRMS did not return a receipt file.');
      const binary = atob(receipt.base64Pdf.replace(/\s/g, ''));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receipt.receiptNumber || 'BIRMS-receipt'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || 'Unable to download the BIRMS receipt.');
    } finally { setPaymentBusy(null); }
  };

  useEffect(() => {
    let active = true;
    Promise.all([applicationService.getByUser(user?.id), examService.getAll()])
      .then(([applicationResponse, examResponse]) => {
        if (!active) return;
        setMyApps(applicationResponse.data);
        setExamWindows(examResponse.data);
      })
      .catch((error) => toast.error(error.message || 'Unable to load applications.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register / My Profile"
        subtitle="Manage your DSTS examination applications and profile details"
        breadcrumbs={[{ label: 'Register / My Profile' }]}
        icon={<FileText size={18} />}
        action={
          <Button icon={<Plus size={14} />} onClick={() => navigate('/registration/windows')}>
            New Application
          </Button>
        }
      />

      <ProfileSummary />

      {loading ? (
        <div className="text-center py-16 text-sm text-text-muted">Loading applications...</div>
      ) : myApps.length === 0 ? (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No applications yet</p>
          <p className="text-xs mt-1 mb-4">Register for an exam to get started.</p>
          <Button size="sm" onClick={() => navigate('/registration/windows')}>Browse Exam Windows</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {myApps.map(app => {
            const exam = examWindows.find(e => e.id === app.examId);
            return (
              <div key={app.id} className="bg-surface-card border border-surface-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-base font-semibold text-text-primary">{exam?.title || app.examId}</p>
                    <p className="text-xs text-text-muted mt-0.5">Application ID: {app.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status} />
                    {CANCELLABLE_STATUSES.includes(app.status) && (
                      <Button size="xs" variant="outline" icon={<XCircle size={12} />} onClick={() => setCancelTarget(app)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
                  <div>
                    <p className="text-text-muted mb-0.5">Registration No.</p>
                    <p className="font-medium text-brand-gold">{app.registrationNumber || '—'}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CreditCard size={12} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-text-muted mb-1">Payment ({app.paymentCurrency})</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{Number(app.paymentAmount).toFixed(2)}</span>
                        <StatusBadge status={app.paymentStatus} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">Submitted</p>
                    <p className="font-medium text-text-primary">{new Date(app.submittedAt).toLocaleDateString()}</p>
                  </div>
                  {exam && (
                    <>
                      <div className="flex items-start gap-1.5">
                        <Calendar size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">Exam Date</p>
                          <p className="font-medium text-text-primary">{new Date(exam.examDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">Venue</p>
                          <p className="font-medium text-text-primary truncate">{exam.venue.split(',')[0]}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {app.remarks && (
                  <div className="mb-4">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                      <span className="font-semibold">DCDD correction notes: </span>{app.remarks}
                    </div>
                    {app.status === 'returned' && (
                      resubmittingId === app.id ? (
                        <ResubmitForm
                          app={app}
                          onCancel={() => setResubmittingId(null)}
                          onResubmitted={async () => { setResubmittingId(null); await reloadApplications().catch(() => {}); }}
                        />
                      ) : (
                        <Button size="xs" className="mt-2" icon={<Edit2 size={12} />} onClick={() => setResubmittingId(app.id)}>
                          Edit &amp; Resubmit
                        </Button>
                      )
                    )}
                  </div>
                )}

                {Number(app.paymentAmount) > 0 && (
                  <div className="mb-4 rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Payment through BIRMS</p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          Choose counter payment, online payment, supported bank mobile apps, or internet banking on the secure BIRMS page.
                        </p>
                        {app.paymentAdviceNo && <p className="mt-1 text-[10px] text-text-muted">Payment Advice: {app.paymentAdviceNo}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['initiated', 'failed', 'cancelled', 'reversed'].includes(app.paymentStatus) && app.status === 'verified' && (
                          <Button size="xs" loading={paymentBusy === app.id} icon={<ExternalLink size={12} />} onClick={() => continuePayment(app)}>
                            {app.paymentRedirectUrl ? 'Continue Payment' : 'Pay via BIRMS'}
                          </Button>
                        )}
                        {app.paymentReference && app.paymentStatus !== 'paid' && (
                          <Button size="xs" variant="outline" disabled={paymentBusy === app.id} icon={<RefreshCw size={12} />} onClick={() => refreshPayment(app)}>Check Status</Button>
                        )}
                        {app.paymentStatus === 'paid' && app.paymentReceiptNo && (
                          <Button size="xs" variant="outline" disabled={paymentBusy === app.id} icon={<Download size={12} />} onClick={() => downloadReceipt(app)}>Receipt</Button>
                        )}
                        {app.status !== 'verified' && app.paymentStatus !== 'paid' && (
                          <span className="self-center text-[11px] font-medium text-text-muted">Available after application verification</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status timeline */}
                <div className="pt-3 border-t border-surface-border">
                  <p className="text-[10px] font-semibold text-text-muted uppercase mb-2">Status History</p>
                  <div className="flex items-center gap-0">
                    {(app.statusHistory?.length ? app.statusHistory : [{ status: app.status }]).map((h, i, history) => (
                      <div key={i} className="flex items-center gap-0">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#D4830A]" />
                          <div className="text-[9px] text-text-muted mt-1 text-center w-20">{h.status.replace(/_/g, ' ')}</div>
                        </div>
                        {i < history.length - 1 && <div className="w-8 h-px bg-[var(--color-surface-border)] mb-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel application?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>Keep application</Button>
            <Button variant="danger" loading={cancelling} onClick={confirmCancel}>Cancel application</Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This withdraws your application for {cancelTarget && (examWindows.find(e => e.id === cancelTarget.examId)?.title || cancelTarget.examId)}.
          This cannot be undone, and you will need to submit a new application to register again.
        </p>
      </Modal>
    </div>
  );
}
