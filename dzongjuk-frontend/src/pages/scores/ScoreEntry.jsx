/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { ClipboardList, Save, CheckCircle, Info } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { applicationService } from '../../services/applications';
import { scoreService } from '../../services/scores';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const SKILLS = ['writing', 'reading', 'listening', 'speaking'];
const SKILL_LABELS = { writing: 'Writing', reading: 'Reading', listening: 'Listening', speaking: 'Speaking' };
const SCORES = Array.from({ length: 19 }, (_, i) => (i * 0.5 + 1).toFixed(1));

const columnHelper = createColumnHelper();

export default function ScoreEntry() {
  const { data: applications, loading: loadingApps } = useApi(applicationService.getAll);
  const { data: committeeMembers, loading: loadingCommittee } = useApi(scoreService.getCommittee, true, ['EXM-001']);
  
  const eligibles = (applications || []).filter(a => a.status === 'approved' || a.status === 'verified');
  const [data, setData] = useState([]);
  
  // Update data when applications load
  useEffect(() => {
    if (applications) {
      setData(applications.filter(a => a.status === 'approved' || a.status === 'verified'));
    }
  }, [applications]);

  const [scoring, setScoring] = useState(null);
  const [scores, setScores] = useState({ writing: '', reading: '', listening: '', speaking: '' });
  const [submitted, setSubmitted] = useState([]);

  const isLoading = loadingApps || loadingCommittee;

  const handleSubmit = () => {
    if (Object.values(scores).some(v => !v)) {
      toast.error('Please enter scores for all four skills');
      return;
    }
    const avg = (Object.values(scores).reduce((s, v) => s + parseFloat(v), 0) / 4).toFixed(2);
    setSubmitted(prev => [...prev, scoring.id]);
    toast.success(`Band scores submitted for ${scoring.testTakerName}. Average: ${avg}`);
    setScoring(null);
    setScores({ writing: '', reading: '', listening: '', speaking: '' });
  };

  const columns = [
    columnHelper.accessor('registrationNumber', {
      header: 'Reg. Number',
      cell: i => <span className="font-mono text-xs font-medium text-brand-gold">{i.getValue() || '—'}</span>
    }),
    columnHelper.accessor('testTakerName', {
      header: 'Test Taker',
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
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.display({
      id: 'score_status',
      header: 'Score Entry',
      cell: ({ row }) => {
        const isSubmitted = submitted.includes(row.original.id);
        return isSubmitted
          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> Submitted</span>
          : <span className="text-xs text-amber-400">Pending</span>;
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const isSubmitted = submitted.includes(row.original.id);
        return (
          <Button
            variant={isSubmitted ? 'ghost' : 'primary'}
            size="xs"
            disabled={isSubmitted}
            icon={<ClipboardList size={12} />}
            onClick={() => { setScoring(row.original); setScores({ writing: '', reading: '', listening: '', speaking: '' }); }}
          >
            {isSubmitted ? 'Submitted' : 'Enter Scores'}
          </Button>
        );
      }
    }),
  ];

  const avg = Object.values(scores).every(v => v)
    ? (Object.values(scores).reduce((s, v) => s + parseFloat(v), 0) / 4).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Band Score Entry"
        subtitle="Enter examination band scores for eligible test takers"
        breadcrumbs={[{ label: 'Scores' }, { label: 'Score Entry' }]}
        icon={<ClipboardList size={18} />}
      />

      <Alert variant="info" title="Committee Head Access Only">
        Only the designated Committee Head can enter and submit band scores. Committee members have view-only access.
      </Alert>

      {isLoading ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Committee info */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-sm font-semibold text-text-primary mb-3">Exam Committee — January 2026</p>
        <div className="flex flex-wrap gap-2">
          {(committeeMembers || []).map(m => (
            <div key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${m.isHead ? 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold' : 'bg-surface-bg border-surface-border text-text-secondary'}`}>
              <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center font-bold text-[10px]">{m.name[0]}</div>
              {m.name} {m.isHead && '(Head)'}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={data} columns={columns} searchPlaceholder="Search test takers..." />
      </div>
      </>
      )}

      {/* Score Entry Modal */}
      <Modal
        isOpen={!!scoring}
        onClose={() => setScoring(null)}
        title={`Enter Band Scores — ${scoring?.testTakerName}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScoring(null)}>Cancel</Button>
            <Button onClick={handleSubmit} icon={<Save size={13} />}>Submit Scores</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-bg rounded-xl border border-surface-border grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-text-muted">Registration No.</p><p className="font-medium text-brand-gold">{scoring?.registrationNumber}</p></div>
            <div><p className="text-text-muted">CID</p><p className="font-medium text-text-primary">{scoring?.cid}</p></div>
          </div>
          <p className="text-xs text-text-muted">Enter scores from 1.0 to 9.0 in increments of 0.5 for each skill:</p>
          <div className="grid grid-cols-2 gap-4">
            {SKILLS.map(skill => (
              <div key={skill}>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">{SKILL_LABELS[skill]}</label>
                <select
                  value={scores[skill]}
                  onChange={e => setScores(prev => ({ ...prev, [skill]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-surface-bg border border-surface-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-brand-gold"
                >
                  <option value="">Select score</option>
                  {SCORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
          {avg && (
            <div className="p-3 bg-[#F59E0B]/5 border border-brand-gold/20 rounded-xl flex items-center justify-between">
              <span className="text-sm text-text-secondary">Overall Average Band Score</span>
              <span className="text-xl font-bold text-brand-gold">{avg}</span>
            </div>
          )}
          <div className="p-3 bg-surface-bg rounded-xl border border-surface-border">
            <p className="text-[10px] font-semibold text-text-muted uppercase mb-1">Committee Signatories</p>
            <div className="flex flex-wrap gap-1">
              {(committeeMembers || []).map(m => (
                <span key={m.id} className="text-xs text-text-muted px-2 py-0.5 bg-[var(--color-surface-border)] rounded-full">{m.name}</span>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
