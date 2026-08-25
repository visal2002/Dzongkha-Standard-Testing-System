/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, Eye, Plus, Scale, XCircle } from 'lucide-react';
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
});

export default function AppealList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Derived from the approved matrix, never from a role name. `approve` is the
  // Chief of Examiner's final decision and `process` the Committee Head's review
  // step; the two are separate actions, so a Committee Member - View only on
  // Re-evaluation - reaches neither, and neither role can perform the other's step.
  const canApprove = canAccess(user?.role, 'appeals', 'approve');
  const canProcess = canAccess(user?.role, 'appeals', 'process');
  const canSubmit = canAccess(user?.role, 'appeals', 'submit_own');

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

  const handleDecision = async (id, decision) => {
    try {
      await appealService.decide(id, decision, remarks || `Re-evaluation ${decision.toLowerCase()} after privileged review.`);
      toast.success(`Re-evaluation ${decision.toLowerCase()} successfully.`);
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

  const columns = [
    columnHelper.accessor('id', { header: 'Request ID', cell: info => <span className="font-mono text-xs text-text-muted">{info.getValue()}</span> }),
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
        title="Re-evaluation"
        subtitle={canApprove ? 'Review privileged score-revision requests' : 'Track payment, committee review, and final outcomes'}
        breadcrumbs={[{ label: 'Re-evaluation' }]}
        icon={<Scale size={18} />}
        action={canSubmit && (
          <Button icon={<Plus size={14} />} onClick={() => navigate('/appeals/new')}>Submit New</Button>
        )}
      />

      {error && <Alert variant="error" title="Re-evaluation unavailable">{error}</Alert>}
      {canApprove && data.some(appeal => appeal.status === 'PENDING_CHIEF_APPROVAL') && (
        <Alert variant="warning" title="Approval Required">One or more committee revision requests require a privileged decision.</Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search by request or application ID..." emptyMessage="No re-evaluation requests found" />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setRemarks(''); }}
        title={`Re-evaluation Details - ${selected?.id || ''}`}
        size="lg"
        footer={
          canApprove && selected?.status === 'PENDING_CHIEF_APPROVAL' ? (
            <>
              <Button variant="danger" onClick={() => handleDecision(selected.id, 'REJECTED')} icon={<XCircle size={13} />}>Reject</Button>
              <Button variant="success" onClick={() => handleDecision(selected.id, 'APPROVED')} icon={<CheckCircle size={13} />}>Approve Revision</Button>
            </>
          ) : <Button variant="ghost" onClick={() => { setSelected(null); setRemarks(''); }}>Close</Button>
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
            {(canProcess && selected.status === 'PENDING_COMMITTEE') || (canApprove && selected.status === 'PENDING_CHIEF_APPROVAL') ? (
              <Textarea label="Decision remarks" rows={3} value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Record the review rationale..." />
            ) : null}
            {canProcess && selected.status === 'PENDING_COMMITTEE' && (
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
