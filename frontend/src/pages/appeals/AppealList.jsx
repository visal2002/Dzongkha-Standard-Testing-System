/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, Download, ExternalLink, Eye, RefreshCw, Scale, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { appealService } from '@/services/appeals';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

const normalizeAppeal = appeal => ({
  ...appeal,
  skills: (appeal.skills || []).map(skill => skill.skill),
  originalScores: Object.fromEntries((appeal.skills || []).map(skill => [skill.skill, Number(skill.originalScore)])),
  proposedScores: Object.fromEntries((appeal.skills || []).filter(skill => skill.proposedScore !== null).map(skill => [skill.skill, Number(skill.proposedScore)])),
  paymentAmount: appeal.payment?.amount || '0.00',
  paymentCurrency: appeal.payment?.currency || 'BTN',
  paymentStatus: appeal.payment?.status || 'UNKNOWN',
  paymentReference: appeal.payment?.providerReference || null,
  paymentAdviceNo: appeal.payment?.paymentAdviceNo || null,
  paymentRedirectUrl: appeal.payment?.paymentRedirectUrl || null,
  paymentReceiptNo: appeal.payment?.paymentReceiptNo || null,
});

export default function AppealList() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const isChief = user?.role === 'chief_executive';
  const isCommittee = user?.role === 'committee_head';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = user?.role === 'test_taker'
        ? await appealService.getByUser(user.id)
        : await appealService.getAll();
      setData((response.data || []).map(normalizeAppeal));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load appeals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id, user?.role]);

  const handleDecision = async (id, decision) => {
    try {
      await appealService.decide(id, decision, remarks || `Appeal ${decision.toLowerCase()} after privileged review.`);
      toast.success(`Appeal ${decision.toLowerCase()} successfully.`);
      setSelected(null);
      setRemarks('');
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to record the decision.');
    }
  };

  const handleNoChange = async id => {
    if (remarks.length < 3) return;
    try {
      await appealService.submitRevision(id, { recommendation: 'NO_CHANGE', remarks });
      toast.success('No-change review completed.');
      setSelected(null);
      setRemarks('');
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to complete committee review.');
    }
  };

  const continuePayment = async appeal => {
    setPaymentBusy(true);
    try {
      const payment = appeal.paymentRedirectUrl
        ? { redirectUrl: appeal.paymentRedirectUrl }
        : await appealService.createPaymentAdvice(appeal.id);
      if (!payment.redirectUrl) throw new Error('BIRMS did not provide a payment page.');
      window.location.assign(payment.redirectUrl);
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to start the BIRMS appeal payment.');
      setPaymentBusy(false);
    }
  };

  const refreshPayment = async appeal => {
    setPaymentBusy(true);
    try {
      const payment = await appealService.refreshPayment(appeal.id);
      toast.success(`Payment status: ${String(payment.status).replace(/_/g, ' ')}`);
      await load();
      setSelected(null);
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to check the BIRMS payment status.');
    } finally { setPaymentBusy(false); }
  };

  const downloadReceipt = async appeal => {
    setPaymentBusy(true);
    try {
      const receipt = await appealService.getPaymentReceipt(appeal.id);
      if (!receipt.base64Pdf) throw new Error('BIRMS did not return a receipt file.');
      const bytes = Uint8Array.from(atob(receipt.base64Pdf.replace(/\s/g, '')), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receipt.receiptNumber || 'BIRMS-appeal-receipt'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to download the BIRMS receipt.');
    } finally { setPaymentBusy(false); }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'Appeal ID', cell: info => <span className="font-mono text-xs text-text-muted">{info.getValue()}</span> }),
    columnHelper.accessor('applicationId', { header: 'Application', cell: info => <span className="font-mono text-xs text-brand-gold">{info.getValue()}</span> }),
    columnHelper.accessor('skills', { header: 'Skills', cell: info => <span className="text-xs text-text-secondary">{info.getValue().join(', ')}</span> }),
    columnHelper.accessor('paymentAmount', { header: 'Fee', cell: info => <span className="text-xs font-medium text-text-primary">{info.row.original.paymentCurrency} {Number(info.getValue()).toFixed(2)}</span> }),
    columnHelper.accessor('paymentStatus', { header: 'Payment', cell: info => <StatusBadge status={info.getValue()} /> }),
    columnHelper.accessor('status', { header: 'Status', cell: info => <StatusBadge status={info.getValue()} /> }),
    columnHelper.accessor('submittedAt', { header: 'Submitted', cell: info => <span className="text-xs text-text-muted">{new Date(info.getValue()).toLocaleDateString()}</span> }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => setSelected(row.original)}>View</Button>,
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appeals & Re-evaluations"
        subtitle={isChief ? 'Review privileged score-revision requests' : 'Track payment, committee review, and final outcomes'}
        breadcrumbs={[{ label: 'Appeals' }]}
        icon={<Scale size={18} />}
      />

      {error && <Alert variant="error" title="Appeals unavailable">{error}</Alert>}
      {isChief && data.some(appeal => appeal.status === 'PENDING_CHIEF_APPROVAL') && (
        <Alert variant="warning" title="Approval Required">One or more committee revision requests require a privileged decision.</Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search by appeal or application ID..." emptyMessage="No appeals found" />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setRemarks(''); }}
        title={`Appeal Details - ${selected?.id || ''}`}
        size="lg"
        footer={
          isChief && selected?.status === 'PENDING_CHIEF_APPROVAL' ? (
            <>
              <Button variant="danger" onClick={() => handleDecision(selected.id, 'REJECTED')} icon={<XCircle size={13} />}>Reject</Button>
              <Button variant="success" onClick={() => handleDecision(selected.id, 'APPROVED')} icon={<CheckCircle size={13} />}>Approve Revision</Button>
            </>
          ) : <Button variant="ghost" onClick={() => { setSelected(null); setRemarks(''); }}>Close</Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['Application', selected.applicationId],
                ['Examination', selected.examId],
                ['Skills Appealed', selected.skills.join(', ')],
                ['Payment', `${selected.paymentCurrency} ${Number(selected.paymentAmount).toFixed(2)} (${selected.paymentStatus})`],
                ['Submitted', new Date(selected.submittedAt).toLocaleDateString()],
                ['Status', selected.status],
              ].map(([label, value]) => <div key={label}><p className="text-text-muted mb-0.5">{label}</p><p className="font-medium text-text-primary break-all">{value}</p></div>)}
            </div>
            <div className="p-3 bg-surface-bg rounded-xl border border-surface-border"><p className="text-xs text-text-muted mb-1">Reason for Appeal</p><p className="text-sm text-text-primary">{selected.reason}</p></div>
            {user?.role === 'test_taker' && (
              <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Payment through BIRMS</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">Re-evaluation/Appeal for recheck of Exam Paper</p>
                    {selected.paymentAdviceNo && <p className="mt-1 text-[10px] text-text-muted">Payment advice: {selected.paymentAdviceNo}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['INITIATED', 'FAILED'].includes(selected.paymentStatus) && (
                      <Button size="xs" loading={paymentBusy} icon={<ExternalLink size={12} />} onClick={() => continuePayment(selected)}>
                        {selected.paymentRedirectUrl ? 'Continue Payment' : 'Pay via BIRMS'}
                      </Button>
                    )}
                    {selected.paymentReference && selected.paymentStatus !== 'PAID' && (
                      <Button size="xs" variant="outline" disabled={paymentBusy} icon={<RefreshCw size={12} />} onClick={() => refreshPayment(selected)}>Check Status</Button>
                    )}
                    {selected.paymentStatus === 'PAID' && selected.paymentReceiptNo && (
                      <Button size="xs" variant="outline" disabled={paymentBusy} icon={<Download size={12} />} onClick={() => downloadReceipt(selected)}>Receipt</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Selected-skill score snapshot</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-surface-bg border border-surface-border rounded-xl">
                  <p className="text-[10px] text-text-muted mb-1 font-medium">Published scores</p>
                  {Object.entries(selected.originalScores).map(([skill, value]) => <div key={skill} className="flex justify-between text-xs"><span>{skill}</span><strong>{value.toFixed(3)}</strong></div>)}
                </div>
                {Object.keys(selected.proposedScores).length > 0 && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-[10px] text-amber-400 mb-1 font-medium">Committee proposal, not yet applied</p>
                    {Object.entries(selected.proposedScores).map(([skill, value]) => <div key={skill} className="flex justify-between text-xs"><span>{skill}</span><strong>{value.toFixed(3)}</strong></div>)}
                  </div>
                )}
              </div>
            </div>
            {(isCommittee && selected.status === 'PENDING_COMMITTEE') || (isChief && selected.status === 'PENDING_CHIEF_APPROVAL') ? (
              <Textarea label="Decision remarks" rows={3} value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Record the review rationale..." />
            ) : null}
            {isCommittee && selected.status === 'PENDING_COMMITTEE' && (
              <div className="space-y-2">
                <Button disabled={remarks.length < 3} onClick={() => handleNoChange(selected.id)}>Complete as No Change</Button>
                <p className="text-xs text-text-muted">Selected-skill revision entry remains available through the secured API until the committee score-entry UI is completed.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
