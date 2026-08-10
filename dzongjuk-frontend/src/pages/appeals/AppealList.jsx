import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Scale, CheckCircle, XCircle, Eye, FileText, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { appealService } from '../../services/appeals';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

export default function AppealList() {
  const { user } = useAuth();
  const { data: appealsData, loading, setData } = useApi(appealService.getAll);
  const data = appealsData || [];
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [revisedInput, setRevisedInput] = useState({});

  const isChief = user?.role === 'chief_executive';
  const isCommitteeHead = user?.role === 'committee_head';
  const isCommitteeMember = user?.role === 'committee_member';

  const handleApprove = async (id, decision) => {
    try {
      await appealService.decide(id, decision, remarks);
      setData(prev => prev.map(a => {
        if (a.id === id) {
          const newHistory = [
            ...a.statusHistory,
            { status: decision === 'approved' ? 'approved' : 'rejected', timestamp: new Date().toISOString(), by: user?.name || 'Chief Executive', remarks: remarks || undefined }
          ];
          return {
            ...a,
            chiefApproval: decision,
            status: decision === 'approved' ? 'approved' : 'rejected',
            chiefRemarks: remarks || (decision === 'approved' ? 'Score revision approved' : 'Score revision rejected'),
            statusHistory: newHistory
          };
        }
        return a;
      }));
      toast.success(`Appeal score revision ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`);
    } catch (e) {
      toast.error('Failed to update appeal status.');
    } finally {
      setSelected(null);
      setRemarks('');
    }
  };

  const handleCommitteeHeadSubmit = async (id) => {
    try {
      const revisedScores = { ...(selected.revisedScores || selected.originalScores), ...revisedInput };
      await appealService.submitRevision(id, { revisedScores, committeeRemarks: remarks });
      
      setData(prev => prev.map(a => {
        if (a.id === id) {
          const newHistory = [
            ...a.statusHistory,
            { status: 'pending_chief_approval', timestamp: new Date().toISOString(), by: user?.name || 'Committee Head', remarks: remarks || 'Score revision requested' }
          ];
          return {
            ...a,
            status: 'pending_chief_approval',
            committeeRemarks: remarks || 'Manual re-evaluation conducted. Score revision requested.',
            revisedScores,
            statusHistory: newHistory
          };
        }
        return a;
      }));
      toast.success('Score revision request submitted to Chief Executive for final approval.');
    } catch (e) {
      toast.error('Failed to submit score revision request.');
    } finally {
      setSelected(null);
      setRemarks('');
      setRevisedInput({});
    }
  };

  const handleMemberSaveNotes = (id) => {
    setData(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, memberNotes: remarks };
      }
      return a;
    }));
    toast.success('Offline re-evaluation notes saved.');
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
          <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => {
            setSelected(row.original);
            setRemarks(row.original.committeeRemarks || row.original.memberNotes || '');
            if (row.original.originalScores) {
              setRevisedInput(row.original.revisedScores || row.original.originalScores);
            }
          }}>View</Button>
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
        subtitle={
          isChief
            ? 'Review and approve score revision requests submitted by Committee Head'
            : isCommitteeHead
            ? 'Conduct manual re-evaluations and submit formal score revision requests'
            : isCommitteeMember
            ? 'Review appeal requests and record offline re-evaluation observations'
            : 'Track re-evaluation appeals and committee decisions'
        }
        breadcrumbs={[{ label: 'Appeals' }]}
        icon={<Scale size={18} />}
      />

      {isChief && data.filter(a => a.status === 'pending_chief_approval').length > 0 && (
        <Alert variant="warning" title="Chief Executive Approval Required">
          {data.filter(a => a.status === 'pending_chief_approval').length} appeal score revision request(s) are awaiting your formal decision.
        </Alert>
      )}

      {isCommitteeHead && data.filter(a => a.status === 'pending_committee').length > 0 && (
        <Alert variant="info" title="Re-evaluations Pending">
          {data.filter(a => a.status === 'pending_committee').length} appeal(s) require committee re-evaluation.
        </Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <DataTable data={data} columns={columns} searchPlaceholder="Search by test taker or CID..." />
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setRemarks(''); setRevisedInput({}); }}
        title={`Appeal Details — ${selected?.id}`}
        size="lg"
        footer={
          isChief && selected?.status === 'pending_chief_approval' ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="danger" onClick={() => handleApprove(selected.id, 'rejected')} icon={<XCircle size={13} />}>Reject Revision</Button>
              <Button variant="success" onClick={() => handleApprove(selected.id, 'approved')} icon={<CheckCircle size={13} />}>Approve & Authorize Score Update</Button>
            </>
          ) : isCommitteeHead && selected?.status === 'pending_committee' ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={() => handleCommitteeHeadSubmit(selected.id)} icon={<Send size={13} />}>Submit Revision Request to Chief Executive</Button>
            </>
          ) : isCommitteeMember ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="secondary" onClick={() => handleMemberSaveNotes(selected.id)} icon={<FileText size={13} />}>Save Re-evaluation Notes</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => { setSelected(null); setRemarks(''); setRevisedInput({}); }}>Close</Button>
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
                ['Payment Status', `Nu. ${selected.paymentAmount} (${selected.paymentStatus})`],
                ['Submitted Date', new Date(selected.submittedAt).toLocaleDateString()],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-text-muted mb-0.5">{l}</p>
                  <p className="font-medium text-text-primary">{v}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-surface-bg rounded-xl border border-surface-border">
              <p className="text-xs text-text-muted mb-1 font-semibold">Reason for Appeal</p>
              <p className="text-sm text-text-primary">{selected.reason}</p>
            </div>

            {selected.originalScores && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Skill-Wise Score Comparison</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] text-red-400 mb-2 font-semibold uppercase">Original Band Scores</p>
                    {Object.entries(selected.originalScores).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs py-1 border-b border-red-500/10 last:border-0">
                        <span className="capitalize text-text-muted">{k}</span>
                        <span className="font-bold text-red-400">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <p className="text-[10px] text-emerald-400 mb-2 font-semibold uppercase">
                      {isCommitteeHead && selected.status === 'pending_committee' ? 'Proposed Revised Scores' : 'Revised Band Scores'}
                    </p>
                    {isCommitteeHead && selected.status === 'pending_committee' ? (
                      <div className="space-y-2">
                        {selected.skills.map(skill => {
                          const key = skill.toLowerCase();
                          return (
                            <div key={key} className="flex items-center justify-between gap-2">
                              <span className="text-xs text-text-muted capitalize">{skill}</span>
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                max="9"
                                value={revisedInput[key] ?? selected.originalScores[key] ?? 5.0}
                                onChange={e => setRevisedInput(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                                className="w-16 h-7 px-2 text-xs bg-surface-card border border-surface-border rounded text-text-primary font-bold"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : selected.revisedScores ? (
                      Object.entries(selected.revisedScores).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs py-1 border-b border-emerald-500/10 last:border-0">
                          <span className="capitalize text-text-muted">{k}</span>
                          <span className="font-bold text-emerald-400">{v}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted italic">Pending committee re-evaluation</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-surface-border">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-text-muted">Current Appeal Status</span>
              </div>
            </div>

            {(isCommitteeHead || isCommitteeMember || isChief) && (
              <div className="space-y-3 pt-2 border-t border-surface-border">
                <Textarea
                  label={
                    isCommitteeHead
                      ? "Committee Re-evaluation Findings & Remarks"
                      : isCommitteeMember
                      ? "Offline Re-evaluation Observations (View/Member Access)"
                      : "Chief Executive Review Comments"
                  }
                  rows={3}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Enter detailed notes or decision justification..."
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
