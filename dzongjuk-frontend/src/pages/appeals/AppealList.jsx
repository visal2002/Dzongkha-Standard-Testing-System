import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Scale, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { appeals } from '../../data/mockData';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

export default function AppealList() {
  const { user } = useAuth();
  const [data, setData] = useState(appeals);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');

  const isChief = user?.role === 'chief_executive';
  const isCommittee = user?.role === 'committee_head';

  const handleApprove = (id, decision) => {
    setData(prev => prev.map(a => a.id === id ? { ...a, chiefApproval: decision, status: decision === 'approved' ? 'approved' : 'rejected' } : a));
    toast.success(`Appeal ${decision === 'approved' ? 'approved' : 'rejected'} successfully`);
    setSelected(null);
  };

  const handleCommitteeReview = (id) => {
    setData(prev => prev.map(a => a.id === id ? { ...a, status: 'revision_requested', committeeRemarks: remarks } : a));
    toast.success('Score revision request submitted to Chief Executive');
    setSelected(null);
    setRemarks('');
  };

  const columns = [
    columnHelper.accessor('id', { header: 'Appeal ID', cell: i => <span className="font-mono text-xs text-text-muted">{i.getValue()}</span> }),
    columnHelper.accessor('testTakerName', {
      header: 'Test Taker',
      cell: i => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">{i.getValue()[0]}</div>
          <div>
            <p className="text-xs font-medium text-text-primary">{i.getValue()}</p>
            <p className="text-[10px] text-text-muted">{i.row.original.registrationNumber}</p>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('skills', { header: 'Skills', cell: i => <span className="text-xs text-text-secondary">{i.getValue().join(', ')}</span> }),
    columnHelper.accessor('paymentAmount', { header: 'Fee', cell: i => <span className="text-xs font-medium text-text-primary">Nu. {i.getValue()}</span> }),
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('submittedAt', { header: 'Submitted', cell: i => <span className="text-xs text-text-muted">{new Date(i.getValue()).toLocaleDateString()}</span> }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => setSelected(row.original)}>View</Button>
          {isChief && row.original.status === 'pending_chief_approval' && (
            <>
              <Button variant="success" size="xs" icon={<CheckCircle size={12} />} onClick={() => handleApprove(row.original.id, 'approved')}>Approve</Button>
              <Button variant="danger" size="xs" icon={<XCircle size={12} />} onClick={() => handleApprove(row.original.id, 'rejected')}>Reject</Button>
            </>
          )}
        </div>
      )
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appeals & Re-evaluations"
        subtitle={isChief ? 'Review and approve score revision requests' : 'Track re-evaluation appeals and committee decisions'}
        breadcrumbs={[{ label: 'Appeals' }]}
        icon={<Scale size={18} />}
      />

      {isChief && data.filter(a => a.status === 'pending_chief_approval').length > 0 && (
        <Alert variant="warning" title="Approval Required">
          {data.filter(a => a.status === 'pending_chief_approval').length} appeal(s) require your decision.
        </Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={data} columns={columns} searchPlaceholder="Search by test taker..." />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setRemarks(''); }}
        title={`Appeal Details — ${selected?.id}`}
        size="lg"
        footer={
          isChief && selected?.status === 'pending_chief_approval' ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="danger" onClick={() => handleApprove(selected.id, 'rejected')} icon={<XCircle size={13} />}>Reject</Button>
              <Button variant="success" onClick={() => handleApprove(selected.id, 'approved')} icon={<CheckCircle size={13} />}>Approve Revision</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => { setSelected(null); setRemarks(''); }}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Test Taker', selected.testTakerName],
                ['CID', selected.cid],
                ['Registration No.', selected.registrationNumber],
                ['Skills Appealed', selected.skills.join(', ')],
                ['Payment', `Nu. ${selected.paymentAmount} (${selected.paymentStatus})`],
                ['Submitted', new Date(selected.submittedAt).toLocaleDateString()],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-text-muted mb-0.5">{l}</p>
                  <p className="font-medium text-text-primary">{v}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-surface-bg rounded-xl border border-surface-border">
              <p className="text-xs text-text-muted mb-1">Reason for Appeal</p>
              <p className="text-sm text-text-primary">{selected.reason}</p>
            </div>
            {selected.originalScores && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Score Comparison</p>
                <div className="flex gap-3">
                  <div className="flex-1 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] text-red-400 mb-1 font-medium">Original Scores</p>
                    {Object.entries(selected.originalScores).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs"><span className="capitalize text-text-muted">{k}</span><span className="font-bold text-red-400">{v}</span></div>
                    ))}
                  </div>
                  {selected.revisedScores && (
                    <div className="flex-1 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <p className="text-[10px] text-emerald-400 mb-1 font-medium">Revised Scores</p>
                      {Object.entries(selected.revisedScores).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs"><span className="capitalize text-text-muted">{k}</span><span className="font-bold text-emerald-400">{v}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2"><StatusBadge status={selected.status} /><span className="text-xs text-text-muted">Current status</span></div>
            {isCommittee && selected.status === 'pending_committee' && (
              <div className="space-y-3 pt-2 border-t border-surface-border">
                <Textarea label="Committee Remarks" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe the re-evaluation findings..." />
                <Button onClick={() => handleCommitteeReview(selected.id)}>Request Score Revision</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
