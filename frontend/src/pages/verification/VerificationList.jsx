/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, CreditCard, Eye, RotateCcw, Send } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import Input, { Textarea, Select } from '@/components/ui/Input';
import { verificationService } from '@/services/verification';
import { applicationService } from '@/services/applications';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';

const columnHelper = createColumnHelper();

export default function VerificationList() {
  const location = useLocation();
  const { user } = useAuth();
  const canManage = canAccess(user?.role, 'verification', 'manage');
  const showAllApplications = location.pathname === '/registration/applications';
  const loadApplications = showAllApplications ? applicationService.getAll : verificationService.getPendingApplications;
  const { data: dataArray, loading, error, setData, execute } = useApi(loadApplications);
  const data = dataArray || [];
  
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentApplication, setPaymentApplication] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ status: 'paid', method: 'Bank Transfer', reference: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [notifyingId, setNotifyingId] = useState(null);

  const handleNotify = async (app) => {
    setNotifyingId(app.id);
    try {
      await applicationService.notify(app.id);
      toast.success(`Notification sent to ${app.testTakerName} (registration number, exam time and venue)`);
    } catch (err) {
      toast.error(err?.message || 'Failed to send notification');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleAction = async (action, app) => {
    const statusMap = { review: 'under_review', verify: 'verified', return: 'returned' };
    const labelMap = { review: 'placed under review', verify: 'verified', return: 'returned' };
    
    try {
       if (action === 'review') await verificationService.startReview(app.id);
       if (action === 'verify') await verificationService.verify(app.id, {});
       if (action === 'return') await verificationService.returnApplication(app.id, returnRemarks);
       
       setData(prev => prev.map(a =>
         a.id === app.id ? { ...a, status: statusMap[action] } : a
       ));
       toast.success(`Application ${labelMap[action]} successfully`);
    } catch (err) {
       toast.error(`Failed to ${action} application.`);
    } finally {
       setConfirmAction(null);
       setSelected(null);
       if (action === 'return') setReturnRemarks('');
    }
  };

  const handlePayment = async () => {
    if (paymentForm.status === 'paid' && !paymentForm.reference.trim()) {
      toast.error('Enter the payment transaction reference');
      return;
    }
    setSavingPayment(true);
    try {
      const response = await applicationService.recordPayment(paymentApplication.id, paymentForm);
      const updated = response?.data ?? response;
      setData(current => current.map(application => application.id === updated.id ? updated : application));
      toast.success(paymentForm.status === 'waived' ? 'Registration fee waived' : 'Payment recorded successfully');
      setPaymentApplication(null);
      setPaymentForm({ status: 'paid', method: 'Bank Transfer', reference: '' });
    } catch (error) {
      toast.error(error?.message || 'Unable to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const filteredData = statusFilter ? data.filter(a => a.status === statusFilter) : data;

  const columns = useMemo(() => [
    columnHelper.accessor('id', { header: 'Application ID', cell: i => <span className="font-mono text-xs text-text-muted">{i.getValue()}</span> }),
    columnHelper.accessor('testTakerName', {
      header: 'Applicant',
      cell: i => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">{i.getValue()[0]}</div>
          <div>
            <p className="text-xs font-medium text-text-primary">{i.getValue()}</p>
            <p className="text-[10px] text-text-muted">{i.row.original.cid}</p>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('dzongkhag', { header: 'Dzongkhag' }),
    columnHelper.accessor('education', { header: 'Education' }),
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('paymentStatus', { header: 'Payment', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('submittedAt', {
      header: 'Submitted',
      cell: i => <span className="text-xs text-text-muted">{new Date(i.getValue()).toLocaleDateString()}</span>
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => setSelected(app)}>View</Button>
            {canManage && ['initiated', 'failed'].includes(app.paymentStatus) && (
              <Button variant="outline" size="xs" icon={<CreditCard size={12} />} onClick={() => setPaymentApplication(app)}>Record Payment</Button>
            )}
            {canManage && app.status === 'submitted' && (
              <>
                <Button variant="secondary" size="xs" onClick={() => handleAction('review', app)}>Start Review</Button>
              </>
            )}
            {canManage && app.status === 'under_review' && (
              <>
                <Button variant="success" size="xs" icon={<CheckCircle size={12} />} onClick={() => { setSelected(app); setConfirmAction('verify'); }}>Verify</Button>
                <Button variant="warning" size="xs" icon={<RotateCcw size={12} />} onClick={() => { setSelected(app); setConfirmAction('return'); }}>Return</Button>
              </>
            )}
            {canManage && app.status === 'verified' && (
              <Button variant="outline" size="xs" icon={<Send size={12} />} loading={notifyingId === app.id} onClick={() => handleNotify(app)}>Notify</Button>
            )}
          </div>
        );
      }
    }),
  ], [canManage, notifyingId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={showAllApplications ? 'Registration Applications' : 'Application Verification'}
        subtitle={showAllApplications ? 'View all submitted examination applications' : 'Review and verify test taker applications'}
        breadcrumbs={[{ label: 'Registration' }, { label: 'Verification' }]}
        icon={<CheckCircle size={18} />}
      />

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="py-12 text-center"><p className="text-sm text-red-400 mb-3">{error}</p><Button size="sm" onClick={() => execute()}>Try Again</Button></div>
        ) : (
          <DataTable
            data={filteredData}
          columns={columns}
          searchPlaceholder="Search applicants..."
          toolbar={
            <Select style={{ width: 140, height: 32 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
              <option value="absent">Absent</option>
            </Select>
          }
        />
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected && !confirmAction} onClose={() => setSelected(null)} title="Application Details" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ['Full Name', selected.testTakerName],
                ['CID', selected.cid],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['DOB', new Date(selected.dob).toLocaleDateString()],
                ['Gender', selected.gender],
                ['Dzongkhag', selected.dzongkhag],
                ['Gewog', selected.gewog],
                ['Education', selected.education],
                ['Institution', selected.institution],
                ['Employment', selected.employmentStatus],
                ['Organization', selected.organization || '—'],
                ['Exam', selected.examId],
                ['Payment', `Nu. ${selected.paymentAmount} (${selected.paymentStatus})`],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-text-muted mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-text-primary">{val}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Documents</p>
              <div className="space-y-2">
                {selected.documents.map(doc => (
                  <div key={doc.name} className="flex items-center justify-between p-2.5 bg-surface-bg rounded-lg border border-surface-border">
                    <span className="text-xs text-text-primary">{doc.name}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            </div>
            {canManage && selected.status === 'under_review' && (
              <div className="flex gap-2 pt-2 border-t border-surface-border">
                <Button variant="success" size="sm" onClick={() => setConfirmAction('verify')} icon={<CheckCircle size={13} />}>Verify Application</Button>
                <Button variant="warning" size="sm" onClick={() => setConfirmAction('return')} icon={<RotateCcw size={13} />}>Return for Correction</Button>
              </div>
            )}
            {canManage && selected.status === 'verified' && (
              <div className="flex gap-2 pt-2 border-t border-surface-border">
                <Button variant="outline" size="sm" loading={notifyingId === selected.id} onClick={() => handleNotify(selected)} icon={<Send size={13} />}>
                  Send Notification
                </Button>
                <p className="text-xs text-text-muted self-center">Registration number, exam time and venue — SMS and email</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmAction === 'verify'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleAction(confirmAction, selected)}
        title="Verify Application"
        message={`Are you sure you want to verify this application for ${selected?.testTakerName}?`}
        confirmLabel="Verify"
        variant="success"
      />

      <Modal
        isOpen={!!paymentApplication}
        onClose={() => setPaymentApplication(null)}
        title="Record Registration Payment"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentApplication(null)}>Cancel</Button>
            <Button loading={savingPayment} icon={<CreditCard size={13} />} onClick={handlePayment}>Save Payment</Button>
          </>
        }
      >
        {paymentApplication && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border bg-surface-bg p-3 text-sm">
              <p className="text-text-muted">Applicant</p>
              <p className="font-semibold text-text-primary">{paymentApplication.testTakerName}</p>
              <p className="mt-2 text-text-muted">Amount</p>
              <p className="text-lg font-bold text-brand-gold">{paymentApplication.paymentCurrency} {Number(paymentApplication.paymentAmount).toFixed(2)}</p>
            </div>
            <Select label="Payment Outcome" value={paymentForm.status} onChange={event => setPaymentForm(current => ({ ...current, status: event.target.value }))}>
              <option value="paid">Paid</option>
              <option value="waived">Fee Waived</option>
            </Select>
            <Select label="Payment Method" value={paymentForm.method} onChange={event => setPaymentForm(current => ({ ...current, method: event.target.value }))}>
              <option>Bank Transfer</option>
              <option>mBoB</option>
              <option>ePay</option>
              <option>Cash Counter</option>
              <option>Administrative Waiver</option>
            </Select>
            {paymentForm.status === 'paid' && (
              <Input label="Transaction Reference" required value={paymentForm.reference} onChange={event => setPaymentForm(current => ({ ...current, reference: event.target.value }))} placeholder="Enter bank or gateway reference" />
            )}
            <p className="text-xs text-text-muted">Only record a payment after checking the bank or payment-provider confirmation.</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmAction === 'return'}
        onClose={() => setConfirmAction(null)}
        title="Return Application"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="warning" onClick={() => handleAction('return', selected)}>Return Application</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Returning application for <strong className="text-text-primary">{selected?.testTakerName}</strong>. Please provide a reason:</p>
          <Textarea label="Remarks / Reason for Return" rows={3} value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)} placeholder="Describe what needs to be corrected..." required />
        </div>
      </Modal>
    </div>
  );
}
