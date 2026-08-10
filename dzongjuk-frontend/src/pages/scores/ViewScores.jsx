/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertCircle, BarChart3 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { scoreService } from '../../services/scores';

const columnHelper = createColumnHelper();

const asNumber = value => Number(value ?? 0);

const normalizeResult = result => {
  const version = result.score || {};
  const values = version.scores || result.draftScores || {};
  return {
    id: result.id,
    applicationId: result.applicationId,
    examId: result.examId,
    writing: asNumber(values.WRITING ?? values.writing),
    reading: asNumber(values.READING ?? values.reading),
    listening: asNumber(values.LISTENING ?? values.listening),
    speaking: asNumber(values.SPEAKING ?? values.speaking),
    overall: asNumber(version.overallScore),
    bandLabel: version.bandLabel || 'Pending',
    cefrLevel: version.cefrLevel || 'Pending',
    status: result.status,
    publishedAt: result.publishedAt || version.createdAt,
  };
};

const ScoreCell = ({ value }) => (
  <span className="font-semibold text-sm text-text-primary">{value.toFixed(2)}</span>
);

export default function ViewScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (user?.role !== 'test_taker') {
          if (active) setScores([]);
          return;
        }
        const response = await scoreService.getMyScores(user.id);
        if (active) setScores((response.data || []).map(normalizeResult));
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load results.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.id, user?.role]);

  const columns = [
    columnHelper.accessor('applicationId', {
      header: 'Application',
      cell: info => <span className="font-mono text-xs font-medium text-brand-gold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('writing', { header: 'Writing', cell: info => <ScoreCell value={info.getValue()} /> }),
    columnHelper.accessor('reading', { header: 'Reading', cell: info => <ScoreCell value={info.getValue()} /> }),
    columnHelper.accessor('listening', { header: 'Listening', cell: info => <ScoreCell value={info.getValue()} /> }),
    columnHelper.accessor('speaking', { header: 'Speaking', cell: info => <ScoreCell value={info.getValue()} /> }),
    columnHelper.accessor('overall', { header: 'Overall', cell: info => <ScoreCell value={info.getValue()} /> }),
    columnHelper.accessor('cefrLevel', {
      header: 'Level',
      cell: info => {
        const row = info.row.original;
        return <span className="text-xs font-semibold text-text-primary">{info.getValue()} / {row.bandLabel}</span>;
      },
    }),
    columnHelper.accessor('status', { header: 'Status', cell: info => <StatusBadge status={info.getValue()} /> }),
    columnHelper.accessor('publishedAt', {
      header: 'Published',
      cell: info => <span className="text-xs text-text-muted">{info.getValue() ? new Date(info.getValue()).toLocaleDateString() : '-'}</span>,
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.role === 'test_taker' ? 'My Results' : 'Results'}
        subtitle="Published DSTS examination results"
        breadcrumbs={[{ label: 'Scores' }, { label: 'View Results' }]}
        icon={<BarChart3 size={18} />}
      />

      <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-text-secondary">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
        <p>Scores and labels are displayed exactly as calculated by the backend's active approved rule. The official DSTS scoring formula and band mapping still require written confirmation.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable
          data={scores}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search by application ID..."
          emptyMessage={user?.role === 'test_taker' ? 'No published results are available yet' : 'Open an examination to view its committee results'}
        />
      </div>
    </div>
  );
}
