/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, Download, ExternalLink, Eye, Plus, RefreshCw, RotateCcw, Scale, Send, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Stepper } from '@/components/ui';
import { Textarea } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { appealService } from '@/services/appeals';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();
const SCORE_OPTIONS = Array.from({ length: 19 }, (_, index) => (index * 0.5 + 1).toFixed(1));

// Re-evaluation pipeline, mirrored from the AppealStatus states the backend can return
// (backend/libs/contracts/src/index.ts). Purely presentational - the request's real
// status still drives every actual decision.
const PIPELINE_STEPS = ['Payment', 'Committee Review', 'Chief of Examiner Approval', 'Outcome'];
const pipelineStepIndex = status => {
  if (['NO_CHANGE', 'REJECTED', 'APPROVED_PENDING_SCORE_UPDATE', 'COMPLETED'].includes(status)) return 3;
  if (status === 'PENDING_CHIEF_APPROVAL') return 2;
  if (['PAYMENT_COMPLETED', 'PENDING_COMMITTEE', 'REVISION_REQUESTED'].includes(status)) return 1;
  return 0;
};

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
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  // Keyed by skill (e.g. 'WRITING') rather than one value for the whole request - BRD
  // §5.6.2 Committee BR-2 requires only the selected and approved skills to be updated.
  const [skillDecisions, setSkillDecisions] = useState({});
  // Committee Head's proposed score per appealed skill, for a REVISE recommendation.
  // Pre-filled with the published score on open, so "unchanged" is the visible default
  // and submitting requires deliberately adjusting at least one skill.
  const [proposedScores, setProposedScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  // Derived from the approved matrix, never from a role name. `approve` is the
  // Chief of Examiner's final decision and `process` the Committee Head's review
  // step; the two are separate actions, so a Committee Member - View only on
  // Re-evaluation - reaches neither, and neither role can perform the other's step.
  const canApprove = canAccess(user?.role, 'appeals', 'approve');
  const canProcess = canAccess(user?.role, 'appeals', 'process');
  const canSubmit = canAccess(user?.role, 'appeals', 'submit_own');
  const decisionsComplete = selected?.skills?.every(skill => skillDecisions[skill]) ?? false;
  const reviseChanged = selected?.skills?.some(skill => proposedScores[skill] !== undefined && Number(proposedScores[skill]) !== selected.originalScores[skill]) ?? false;
  const isCommitteeMember = user?.role === 'committee_member';
  const pendingCommitteeCount = data.filter(appeal => appeal.status === 'PENDING_COMMITTEE').length;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Only a role that may read everyone's appeals gets the organisation-wide list.
      const response = canAccess(user?.role, 'appeals', 'read_all')
        ? await appealService.getAll()
        : await appealService.getByUser(user.id);
      setData((response.data || []).map(normalizeAppeal));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load re-evaluation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id, user?.role]);

  const openAppeal = appeal => {
    setSelected(appeal);
    // No default decision - the Chief must explicitly choose approve or reject for
    // every appealed skill before a decision can be submitted.
    setSkillDecisions({});
    // Pre-filled with the published score for every appealed skill, so a revision
    // request always starts from "unchanged" and requires a deliberate edit.
    setProposedScores(Object.fromEntries(appeal.skills.map(skill => [skill, String(appeal.originalScores[skill] ?? '')])));
  };

  const closeModal = () => {
    setSelected(null);
    setRemarks('');
    setSkillDecisions({});
    setProposedScores({});
  };

  const handleDecision = async id => {
    try {
      await appealService.decide(id, skillDecisions, remarks || 'Re-evaluation reviewed after privileged review.');
      const anyApproved = Object.values(skillDecisions).includes('APPROVED');
      toast.success(anyApproved ? 'Re-evaluation decision recorded; approved skills will be revised.' : 'Re-evaluation rejected for every appealed skill.');
      closeModal();
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
      closeModal();
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to complete committee review.');
    }
  };

  const handleReviseSubmit = async id => {
    if (remarks.length < 3 || !reviseChanged) return;
    try {
      const numericScores = Object.fromEntries(Object.entries(proposedScores).map(([skill, value]) => [skill, Number(value)]));
      await appealService.submitRevision(id, { recommendation: 'REVISE', remarks, proposedScores: numericScores });
      toast.success('Revision request submitted for Chief of Examiner approval. The published score stays locked until then.');
      closeModal();
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to submit the revision request.');
    }
  };

  // The backend already auto-applies an approved revision right after decide()
  // succeeds; this only covers the rare case that step failed (e.g. a transient
  // result-service outage), leaving the appeal at ApprovedPendingScoreUpdate.
  const handleRetryApply = async id => {
    try {
      await appealService.applyRevision(id);
      toast.success('Approved revision applied.');
      closeModal();
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to apply the approved revision yet.');
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
      toast.error(requestError.message || 'Unable to start the BIRMS re-evaluation payment.');
      setPaymentBusy(false);
    }
  };

  const refreshPayment = async appeal => {
    setPaymentBusy(true);
    try {
      const payment = await appealService.refreshPayment(appeal.id);
      toast.success(`Payment status: ${String(payment.status).replace(/_/g, ' ')}`);
      await load();
      closeModal();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to check the BIRMS payment status.');
    } finally {
      setPaymentBusy(false);
    }
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
      link.download = `${receipt.receiptNumber || 'BIRMS-re-evaluation-receipt'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to download the BIRMS receipt.');
    } finally {
      setPaymentBusy(false);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'Request ID', cell: info => <span className="font-mono text-xs text-text-muted">{info.getValue()}</span> }),
    columnHelper.accessor('applicationId', { header: 'Application', cell: info => <span className="font-mono text-xs text-brand-gold">{info.getValue()}</span> }),
    columnHelper.accessor('skills', { header: 'Skills', cell: info => <span className="text-xs text-text-secondary">{info.getValue().join(', ')}</span> }),
    // BRD §5.6.1: the Committee Member's queue must show the candidate's original
    // score alongside the flagged skill(s) and submission date without opening the
    // detail modal - the other two already have their own columns above/below.
    columnHelper.display({
      id: 'originalScore',
      header: 'Original Score',
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary">
          {Object.entries(row.original.originalScores).map(([skill, value]) => `${skill} ${value.toFixed(1)}`).join(' · ')}
        </span>
      ),
    }),
    columnHelper.accessor('paymentAmount', { header: 'Fee', cell: info => <span className="text-xs font-medium text-text-primary">{info.row.original.paymentCurrency} {Number(info.getValue()).toFixed(2)}</span> }),
    columnHelper.accessor('paymentStatus', { header: 'Payment', cell: info => <StatusBadge status={info.getValue()} /> }),
    columnHelper.accessor('status', { header: 'Status', cell: info => <StatusBadge status={info.getValue()} /> }),
    columnHelper.accessor('submittedAt', { header: 'Submitted', cell: info => <span className="text-xs text-text-muted">{new Date(info.getValue()).toLocaleDateString()}</span> }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => openAppeal(row.original)}>View</Button>,
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCommitteeMember ? 'Re-evaluation Queue' : 'Re-evaluation'}
        subtitle={
          canApprove ? 'Review privileged score-revision requests'
          : isCommitteeMember ? 'View only - track payment, committee review, and outcome status for every request'
          : 'Track payment, committee review, and final outcomes'
        }
        breadcrumbs={[{ label: isCommitteeMember ? 'Re-evaluation Queue' : 'Re-evaluation' }]}
        icon={<Scale size={18} />}
        action={canSubmit && (
          <Button icon={<Plus size={14} />} onClick={() => navigate('/appeals/new')}>Submit New</Button>
        )}
      />

      {error && <Alert variant="error" title="Re-evaluation unavailable">{error}</Alert>}
      {canApprove && data.some(appeal => appeal.status === 'PENDING_CHIEF_APPROVAL') && (
        <Alert variant="warning" title="Approval Required">One or more committee revision requests require a privileged decision.</Alert>
      )}
      {isCommitteeMember && pendingCommitteeCount > 0 && (
        <Alert variant="warning" title="Newly routed for committee review">
          {pendingCommitteeCount} re-evaluation request{pendingCommitteeCount === 1 ? '' : 's'} cleared payment and now await{pendingCommitteeCount === 1 ? 's' : ''} the Committee Head's review.
        </Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search by request or application ID..." emptyMessage="No re-evaluation requests found" />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={closeModal}
        title={`Re-evaluation Details - ${selected?.id || ''}`}
        size="lg"
        footer={
          canApprove && selected?.status === 'PENDING_CHIEF_APPROVAL' ? (
            <Button variant="success" disabled={!decisionsComplete} onClick={() => handleDecision(selected.id)} icon={<CheckCircle size={13} />}>Submit Decision</Button>
          ) : canApprove && selected?.status === 'APPROVED_PENDING_SCORE_UPDATE' ? (
            <Button variant="outline" onClick={() => handleRetryApply(selected.id)} icon={<RotateCcw size={13} />}>Retry Applying Revision</Button>
          ) : <Button variant="ghost" onClick={closeModal}>Close</Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Progress</p>
              <Stepper steps={PIPELINE_STEPS} currentStep={pipelineStepIndex(selected.status)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['Application', selected.applicationId],
                ['Examination', selected.examId],
                ['Skills', selected.skills.join(', ')],
                ['Payment', `${selected.paymentCurrency} ${Number(selected.paymentAmount).toFixed(2)} (${selected.paymentStatus})`],
                ['Submitted', new Date(selected.submittedAt).toLocaleDateString()],
                ['Status', selected.status],
              ].map(([label, value]) => <div key={label}><p className="text-text-muted mb-0.5">{label}</p><p className="font-medium text-text-primary break-all">{value}</p></div>)}
            </div>
            <div className="p-3 bg-surface-bg rounded-xl border border-surface-border"><p className="text-xs text-text-muted mb-1">Reason for Re-evaluation</p><p className="text-sm text-text-primary">{selected.reason}</p></div>
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
            {canApprove && selected.status === 'PENDING_CHIEF_APPROVAL' && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Decision per skill</p>
                <p className="text-xs text-text-muted mb-2">Choose Approve or Reject for every skill before submitting. Only approved skills receive the proposed score.</p>
                <div className="space-y-2">
                  {selected.skills.map(skill => (
                    <div key={skill} className="flex items-center justify-between gap-3 p-2.5 bg-surface-bg border border-surface-border rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary">{skill}</p>
                        <p className="text-[10px] text-text-muted">
                          {selected.originalScores[skill]?.toFixed(3)} &rarr; {selected.proposedScores[skill]?.toFixed(3)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="xs"
                          variant={skillDecisions[skill] === 'APPROVED' ? 'success' : 'ghost'}
                          icon={<CheckCircle size={12} />}
                          onClick={() => setSkillDecisions(prev => ({ ...prev, [skill]: 'APPROVED' }))}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant={skillDecisions[skill] === 'REJECTED' ? 'danger' : 'ghost'}
                          icon={<XCircle size={12} />}
                          onClick={() => setSkillDecisions(prev => ({ ...prev, [skill]: 'REJECTED' }))}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canProcess && selected.status === 'PENDING_COMMITTEE' && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Propose a revised score per skill</p>
                <p className="text-xs text-text-muted mb-2">
                  Adjust at least one appealed skill to submit a revision recommendation. The published score stays
                  locked - it only changes once the Chief of Examiner approves.
                </p>
                <div className="space-y-2">
                  {selected.skills.map(skill => (
                    <div key={skill} className="flex items-center justify-between gap-3 p-2.5 bg-surface-bg border border-surface-border rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary">{skill}</p>
                        <p className="text-[10px] text-text-muted">Published: {selected.originalScores[skill]?.toFixed(1)}</p>
                      </div>
                      <select
                        value={proposedScores[skill] ?? ''}
                        onChange={event => setProposedScores(prev => ({ ...prev, [skill]: event.target.value }))}
                        className="h-8 px-2 rounded-lg bg-surface-card border border-surface-border text-text-primary text-xs shrink-0"
                      >
                        {SCORE_OPTIONS.map(score => <option key={score} value={score}>{score}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(canProcess && selected.status === 'PENDING_COMMITTEE') || (canApprove && selected.status === 'PENDING_CHIEF_APPROVAL') ? (
              <Textarea label="Decision remarks" rows={3} value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Record the review rationale..." />
            ) : null}
            {canProcess && selected.status === 'PENDING_COMMITTEE' && (
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" disabled={remarks.length < 3} onClick={() => handleNoChange(selected.id)}>Complete as No Change</Button>
                <Button disabled={remarks.length < 3 || !reviseChanged} onClick={() => handleReviseSubmit(selected.id)} icon={<Send size={13} />}>Submit Revision Request</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
