import { useEffect, useState } from 'react';
import { BarChart3, Megaphone, TrendingUp, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { examService } from '@/services/exams';
import { scoreService } from '@/services/scores';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ScoreSummary() {
  const { user } = useAuth();
  const { data: exams, loading: loadingExams } = useApi(examService.getAll);
  const [examId, setExamId] = useState('');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const canDeclare = ['admin', 'dcdd'].includes(user?.role);

  useEffect(() => { if (!examId && exams?.length) setExamId(exams[0].id); }, [examId, exams]);
  useEffect(() => {
    if (!examId) return;
    let active = true;
    setLoading(true);
    scoreService.getByExam(examId).then(response => { if (active) setScores(response.data || []); })
      .catch(error => { if (active) { setScores([]); toast.error(error?.message || 'Unable to load scores'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId]);

  const submitted = scores.filter(score => ['submitted', 'published', 'revised'].includes(score.status));
  const calculated = submitted.filter(score => score.average > 0);
  const average = calculated.length ? calculated.reduce((sum, score) => sum + score.average, 0) / calculated.length : 0;
  const highest = calculated.length ? Math.max(...calculated.map(score => score.average)) : 0;

  const declare = async () => {
    setDeclaring(true);
    try {
      await scoreService.publish(examId);
      setScores(current => current.map(score => ({ ...score, status: 'published' })));
      toast.success('Results declared and published to Test Takers');
    } catch (error) {
      toast.error(error?.message || 'Unable to declare results');
    } finally { setDeclaring(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="Score Summary" subtitle="Review submitted scores and formally declare results" breadcrumbs={[{ label: 'Scores' }, { label: 'Summary' }]} icon={<BarChart3 size={18} />} action={canDeclare && <Button icon={<Megaphone size={14} />} loading={declaring} disabled={!scores.length || scores.some(score => score.status === 'draft')} onClick={declare}>Declare Results</Button>} />
    <Alert variant="info" title="Declaration unlocks downstream workflows">After all eligible candidates have submitted scores, declaring results makes Test Taker scores visible and enables sample papers, re-evaluation, and certificate generation.</Alert>
    <div className="max-w-md"><Select label="Examination Window" value={examId} onChange={event => setExamId(event.target.value)} disabled={loadingExams}><option value="">Select examination</option>{(exams || []).map(exam => <option key={exam.id} value={exam.id}>{exam.title} · {exam.code}</option>)}</Select></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard title="Score Sheets" value={scores.length} icon={<Users size={18} />} color="gold" /><StatCard title="Submitted" value={submitted.length} icon={<BarChart3 size={18} />} color="teal" /><StatCard title="Overall Average" value={average.toFixed(2)} icon={<TrendingUp size={18} />} color="success" /><StatCard title="Highest Score" value={highest.toFixed(2)} icon={<TrendingUp size={18} />} color="warning" /></div>
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 overflow-x-auto">
      {loading ? <div className="py-12 text-center text-text-muted">Loading score sheets...</div> : <table className="w-full text-sm"><thead><tr className="border-b border-surface-border">{['Application', 'Writing', 'Reading', 'Listening', 'Speaking', 'Overall', 'Band', 'Status'].map(label => <th key={label} className="pb-3 text-left text-xs text-text-muted pr-4">{label}</th>)}</tr></thead><tbody>{scores.map(score => <tr key={score.id} className="border-b border-surface-border/40"><td className="py-3 pr-4 font-mono text-xs text-brand-gold">{score.applicationId.slice(0, 12)}</td>{['writing', 'reading', 'listening', 'speaking'].map(skill => <td key={skill} className="py-3 pr-4 text-text-primary">{score[skill].toFixed(1)}</td>)}<td className="py-3 pr-4 font-bold text-brand-gold">{score.average ? score.average.toFixed(2) : 'Pending'}</td><td className="py-3 pr-4 text-text-primary">{score.cefrLevel} / {score.bandLabel}</td><td className="py-3"><StatusBadge status={score.status} /></td></tr>)}{!scores.length && <tr><td colSpan="8" className="py-12 text-center text-text-muted">No score sheets are available for this examination.</td></tr>}</tbody></table>}
    </div>
  </div>;
}
