/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { examService } from '@/services/exams';
import { scoreService } from '@/services/scores';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

const ScoreCell = ({ value }) => (
  <span className="text-sm text-text-primary">{Number(value ?? 0).toFixed(1)}</span>
);

const columns = [
  columnHelper.accessor('registrationNumber', {
    header: 'Registration No.',
    cell: info => <span className="font-mono text-xs font-medium text-brand-gold">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('testTakerName', {
    header: 'Candidate',
    cell: info => <span className="text-sm text-text-primary">{info.getValue()}</span>,
  }),
  columnHelper.accessor('writing', { header: 'Writing', cell: info => <ScoreCell value={info.getValue()} /> }),
  columnHelper.accessor('reading', { header: 'Reading', cell: info => <ScoreCell value={info.getValue()} /> }),
  columnHelper.accessor('listening', { header: 'Listening', cell: info => <ScoreCell value={info.getValue()} /> }),
  columnHelper.accessor('speaking', { header: 'Speaking', cell: info => <ScoreCell value={info.getValue()} /> }),
  columnHelper.accessor('average', {
    header: 'Overall',
    cell: info => <span className="text-sm font-bold text-brand-gold">{info.getValue() ? Number(info.getValue()).toFixed(2) : 'Pending'}</span>,
  }),
  columnHelper.accessor('cefrLevel', {
    header: 'Band',
    cell: info => {
      const row = info.row.original;
      return <span className="text-xs font-semibold text-text-primary">{info.getValue()} / {row.bandLabel}</span>;
    },
  }),
  columnHelper.accessor('status', { header: 'Status', cell: info => <StatusBadge status={info.getValue()} /> }),
];

/**
 * Committee Member's dedicated read-only band-score screen (BRD §5.5.2 BR-2/BR-3).
 * Every cell below is plain text - there is no input, select, or submit control tied
 * to a candidate's score anywhere on this page, and the backend independently
 * refuses this role's JWT on every score-write endpoint (`score.enter`/`score.submit`
 * are not among the permissions the committee_member role is seeded with - see
 * backend/database/migrations/0001_initial.sql), so hiding the controls here is a
 * usability courtesy, not the enforcement boundary.
 */
export default function ViewBandScores() {
  const { data: exams, loading: loadingExams } = useApi(examService.getAll);
  const [examId, setExamId] = useState('');
  const [scores, setScores] = useState([]);
  const [committee, setCommittee] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!examId && exams?.length) setExamId(exams[0].id); }, [examId, exams]);

  useEffect(() => {
    if (!examId) return;
    let active = true;
    setLoading(true);
    Promise.all([scoreService.getByExam(examId), scoreService.getCommittee(examId)])
      .then(([scoresResponse, committeeResponse]) => {
        if (!active) return;
        setScores(scoresResponse.data || []);
        setCommittee(committeeResponse.data || null);
      })
      .catch(error => {
        if (!active) return;
        setScores([]);
        setCommittee(null);
        toast.error(error?.message || 'Unable to load band scores for this examination.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId]);

  const submitted = scores.filter(score => ['submitted', 'published', 'revised'].includes(score.status));
  const calculated = submitted.filter(score => score.average > 0);
  const average = calculated.length ? calculated.reduce((sum, score) => sum + score.average, 0) / calculated.length : 0;
  const committeeMembers = committee?.members || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="View Band Scores"
        subtitle="Read-only view of submitted score sheets for your exam committee"
        breadcrumbs={[{ label: 'Scores' }, { label: 'View Band Scores' }]}
        icon={<BarChart3 size={18} />}
      />

      <Alert variant="info" title="View-only access">
        Committee Member access is view-only on Band Scores. Every score below is exactly as submitted by the
        Committee Head; there is no field here to enter, edit, or revise a score.
      </Alert>

      <div className="max-w-md">
        <Select label="Search by Exam ID" value={examId} onChange={event => setExamId(event.target.value)} disabled={loadingExams}>
          <option value="">Select examination</option>
          {(exams || []).map(exam => <option key={exam.id} value={exam.id}>{exam.title} · {exam.code}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Score Sheets" value={scores.length} icon={<Users size={18} />} color="gold" />
        <StatCard title="Submitted" value={submitted.length} icon={<BarChart3 size={18} />} color="teal" />
        <StatCard title="Overall Average" value={average.toFixed(2)} icon={<TrendingUp size={18} />} color="success" />
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable
          data={scores}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search by candidate registration number..."
          emptyMessage={examId ? 'No score sheets are available for this examination.' : 'Select an examination to view its score sheets.'}
        />
      </div>

      {/* BRD §5.5.2 BR-3: the committee that reviewed this examination's score sheets,
          shown beneath the table above so it is visible against every score sheet on
          this screen. */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Examination Committee</h3>
          <p className="text-xs text-text-muted">Reviewed every score sheet shown above</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {committeeMembers.length === 0 && (
            <p className="text-xs text-text-muted py-2">No committee has been assigned to this examination yet.</p>
          )}
          {committeeMembers.map(member => (
            <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-bg border border-surface-border rounded-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${member.isHead ? 'bg-brand-gold/10 text-brand-gold' : 'bg-blue-500/10 text-blue-400'}`}>
                {member.name[0]}
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary">{member.name}</p>
                <p className="text-[10px] text-text-muted">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
