import { BarChart3, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/Card';
import { scoreService } from '../../services/scores';
import { useApi } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>)}
    </div>
  );
};

export default function ScoreSummary() {
  const { data: bandScoresData, loading } = useApi(scoreService.getAll);
  const bandScores = bandScoresData || [];

  const totalScored = bandScores.length;
  const overallAvg = totalScored ? (bandScores.reduce((s, b) => s + b.average, 0) / totalScored).toFixed(2) : 0;
  const highestScore = totalScored ? Math.max(...bandScores.map(b => b.average)) : 0;
  const lowestScore = totalScored ? Math.min(...bandScores.map(b => b.average)) : 0;

  const skillAvg = (skill) => totalScored ? (bandScores.reduce((s, b) => s + b[skill], 0) / totalScored) : 0;

  const skillData = [
    { skill: 'Writing', avg: skillAvg('writing') },
    { skill: 'Reading', avg: skillAvg('reading') },
    { skill: 'Listening', avg: skillAvg('listening') },
    { skill: 'Speaking', avg: skillAvg('speaking') },
  ];

  const radarData = skillData.map(d => ({ skill: d.skill, score: d.avg * 10 }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Score Summary"
        subtitle="Statistical overview of band scores for January 2026"
        breadcrumbs={[{ label: 'Scores' }, { label: 'Summary' }]}
        icon={<BarChart3 size={18} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scored" value={totalScored} icon={<Users size={18} />} color="gold" />
        <StatCard title="Overall Average" value={overallAvg} icon={<BarChart3 size={18} />} color="teal" subtitle="All skills combined" />
        <StatCard title="Highest Score" value={highestScore.toFixed(1)} icon={<TrendingUp size={18} />} color="success" />
        <StatCard title="Lowest Score" value={lowestScore.toFixed(1)} icon={<TrendingUp size={18} />} color="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Skill Averages */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Average Score by Skill</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={skillData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis dataKey="skill" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 9]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Skills Profile (Group)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-surface-border)" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <Radar name="Avg Score" dataKey="score" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual scores table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Individual Scores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Test Taker', 'Writing', 'Reading', 'Listening', 'Speaking', 'Average', 'Level'].map(h => (
                  <th key={h} className="pb-2 text-left text-xs font-medium text-text-muted pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bandScores.map(bs => {
                const level = bs.average >= 7 ? 'C1' : bs.average >= 5.5 ? 'B2' : 'B1';
                const levelColor = bs.average >= 7 ? 'text-blue-400' : bs.average >= 5.5 ? 'text-teal-400' : 'text-emerald-400';
                return (
                  <tr key={bs.id} className="border-b border-surface-border/40 hover:bg-surface-bg transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-text-primary">{bs.testTakerName}</td>
                    {['writing', 'reading', 'listening', 'speaking'].map(skill => (
                      <td key={skill} className="py-2.5 pr-4">
                        <span className={bs[skill] >= 7 ? 'text-emerald-400 font-semibold' : bs[skill] >= 5 ? 'text-amber-400 font-semibold' : 'text-red-400 font-semibold'}>{bs[skill]}</span>
                      </td>
                    ))}
                    <td className="py-2.5 pr-4 font-bold text-brand-gold">{bs.average.toFixed(2)}</td>
                    <td className={`py-2.5 font-bold ${levelColor}`}>{level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
