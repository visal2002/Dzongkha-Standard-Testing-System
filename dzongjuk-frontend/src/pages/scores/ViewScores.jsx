import { createColumnHelper } from '@tanstack/react-table';
import { BarChart3, Award } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { bandScores } from '../../data/mockData';

const columnHelper = createColumnHelper();

const getBandLevel = (avg) => {
  if (avg >= 8.5) return { level: 'C2', color: 'text-purple-400' };
  if (avg >= 7.0) return { level: 'C1', color: 'text-blue-400' };
  if (avg >= 5.5) return { level: 'B2', color: 'text-teal-400' };
  if (avg >= 4.0) return { level: 'B1', color: 'text-emerald-400' };
  if (avg >= 2.5) return { level: 'A2', color: 'text-amber-400' };
  return { level: 'A1', color: 'text-red-400' };
};

const ScoreCell = ({ value }) => {
  const color = value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-semibold text-sm ${color}`}>{value.toFixed(1)}</span>;
};

export default function ViewScores() {
  const columns = [
    columnHelper.accessor('registrationNumber', {
      header: 'Reg. Number',
      cell: i => <span className="font-mono text-xs font-medium text-brand-gold">{i.getValue()}</span>
    }),
    columnHelper.accessor('testTakerName', {
      header: 'Test Taker',
      cell: i => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">{i.getValue()[0]}</div>
          <p className="text-xs font-medium text-text-primary">{i.getValue()}</p>
        </div>
      )
    }),
    columnHelper.accessor('writing', { header: 'Writing', cell: i => <ScoreCell value={i.getValue()} /> }),
    columnHelper.accessor('reading', { header: 'Reading', cell: i => <ScoreCell value={i.getValue()} /> }),
    columnHelper.accessor('listening', { header: 'Listening', cell: i => <ScoreCell value={i.getValue()} /> }),
    columnHelper.accessor('speaking', { header: 'Speaking', cell: i => <ScoreCell value={i.getValue()} /> }),
    columnHelper.accessor('average', {
      header: 'Average',
      cell: i => {
        const { level, color } = getBandLevel(i.getValue());
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">{i.getValue().toFixed(2)}</span>
            <span className={`text-xs font-bold ${color}`}>{level}</span>
          </div>
        );
      }
    }),
    columnHelper.accessor('status', { header: 'Status', cell: i => <StatusBadge status={i.getValue()} /> }),
    columnHelper.accessor('enteredAt', {
      header: 'Entered On',
      cell: i => <span className="text-xs text-text-muted">{new Date(i.getValue()).toLocaleDateString()}</span>
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Band Scores"
        subtitle="View published band scores for all test takers"
        breadcrumbs={[{ label: 'Scores' }, { label: 'View Scores' }]}
        icon={<BarChart3 size={18} />}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Scored', value: bandScores.length, color: 'text-brand-gold' },
          { label: 'Avg. Writing', value: (bandScores.reduce((s, b) => s + b.writing, 0) / bandScores.length).toFixed(1), color: 'text-teal-400' },
          { label: 'Avg. Reading', value: (bandScores.reduce((s, b) => s + b.reading, 0) / bandScores.length).toFixed(1), color: 'text-blue-400' },
          { label: 'Avg. Speaking', value: (bandScores.reduce((s, b) => s + b.speaking, 0) / bandScores.length).toFixed(1), color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable data={bandScores} columns={columns} searchPlaceholder="Search by name or reg. number..." onExport={() => {}} />
      </div>

      {/* CEFR Guide */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Award size={15} className="text-brand-gold" /> CEFR Band Reference</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { level: 'C2', range: '8.5–9.0', label: 'Mastery', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { level: 'C1', range: '7.0–8.0', label: 'Effective Op.', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { level: 'B2', range: '5.5–6.5', label: 'Vantage', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
            { level: 'B1', range: '4.0–5.0', label: 'Threshold', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { level: 'A2', range: '2.5–3.5', label: 'Waystage', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { level: 'A1', range: '1.0–2.0', label: 'Breakthrough', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
          ].map(b => (
            <div key={b.level} className={`p-2.5 rounded-xl border text-center ${b.color}`}>
              <p className="text-lg font-bold">{b.level}</p>
              <p className="text-[10px] opacity-80">{b.range}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
