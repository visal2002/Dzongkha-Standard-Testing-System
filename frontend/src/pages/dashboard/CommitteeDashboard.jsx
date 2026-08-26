/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, Scale, CalendarDays, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { scoreService } from '@/services/scores';
import { appealService } from '@/services/appeals';
import { useApi } from '@/hooks/useApi';
import { hasChartData } from '@/utils/analytics';
import { findOpenExamWindow } from '@/utils/examWindows';
import { examService } from '@/services/exams';
import ChartEmpty from '@/components/ui/ChartEmpty';
import { useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/** CEFR ladder, so empty levels still occupy their slot on the axis. */
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-medium text-text-primary">{label}: {payload[0]?.value} candidates</p>
    </div>
  );
};

export default function CommitteeDashboard() {
  const { user } = useAuth();
  const isHead = user?.role === 'committee_head';
  const { data: appeals, loading: loadingAppeals } = useApi(appealService.getAll);
  const { data: examWindows, loading: loadingExams } = useApi(examService.getAll);

  // The committee belongs to a real exam window: prefer the one open for registration,
  // otherwise the most recently listed window. Nothing is loaded until one exists.
  const activeExam = useMemo(
    () => findOpenExamWindow(examWindows) || (examWindows || [])[0] || null,
    [examWindows],
  );

  const { data: committee, loading: loadingCommittee, execute: loadCommittee } = useApi(scoreService.getCommittee, false);
  const { data: bandScores, loading: loadingScores, execute: loadScores } = useApi(scoreService.getByExam, false);
  const { data: candidates, loading: loadingCandidates, execute: loadCandidates } = useApi(scoreService.getCandidates, false);

  useEffect(() => {
    if (!activeExam?.id) return;
    loadCommittee(activeExam.id).catch(() => undefined);
    loadScores(activeExam.id).catch(() => undefined);
    loadCandidates(activeExam.id).catch(() => undefined);
  }, [activeExam?.id, loadCommittee, loadScores, loadCandidates]);

  // The API returns the committee record; the roster lives on `members`.
  const committeeMembers = useMemo(() => committee?.members || [], [committee]);

  const isLoading = loadingAppeals || loadingExams || (Boolean(activeExam) && (loadingCommittee || loadingScores || loadingCandidates));

  // Distribution is counted from the band scores the committee has actually entered.
  const scoreDistData = useMemo(() => {
    const counts = new Map(CEFR_LEVELS.map(level => [level, 0]));
    for (const score of bandScores || []) {
      const level = String(score.cefrLevel || '').toUpperCase();
      if (counts.has(level)) counts.set(level, counts.get(level) + 1);
    }
    return [...counts.entries()].map(([band, count]) => ({ band, count }));
  }, [bandScores]);

  const hasScoreDist = hasChartData(scoreDistData, ['count']);

  // Re-evaluation requests that have cleared payment and are awaiting the Committee
  // Head's review - the moment they become the committee's concern. Status casing
  // ('PENDING_COMMITTEE') mirrors AppealList.jsx and the real AppealStatus values the
  // backend returns.
  const pendingCommitteeCount = useMemo(
    () => (appeals || []).filter(appeal => appeal.status === 'PENDING_COMMITTEE').length,
    [appeals],
  );

  // "Active or upcoming" for the Committee Head covers the whole re-evaluation
  // pipeline it still has a stake in - requests waiting on its own review, and ones
  // it has already forwarded that are still awaiting the Chief's decision - not just
  // the newly-routed subset committee_member's own alert cares about above.
  const activeAppealsCount = useMemo(
    () => (appeals || []).filter(appeal => ['PENDING_COMMITTEE', 'PENDING_CHIEF_APPROVAL'].includes(appeal.status)).length,
    [appeals],
  );

  // Pending/complete are counted against every eligible candidate for the exam, not
  // just the sheets that already exist - a candidate with no sheet at all is still a
  // pending score sheet.
  const submittedCandidateCount = useMemo(
    () => (candidates || []).filter(candidate => ['submitted', 'published', 'revised'].includes(candidate.scoreStatus)).length,
    [candidates],
  );
  const totalCandidateCount = candidates?.length ?? 0;
  const pendingScoreSheetCount = Math.max(totalCandidateCount - submittedCandidateCount, 0);
  const completionPercent = totalCandidateCount ? Math.round((submittedCandidateCount / totalCandidateCount) * 100) : 0;

  // There is no committee-meeting entity in this system - band-score review and
  // re-evaluation work runs against the examination calendar itself, so this surfaces
  // real upcoming exam dates from the exam windows already loaded above rather than
  // inventing a meeting schedule with no backend behind it.
  const upcomingExamDates = useMemo(() => {
    const now = Date.now();
    return (examWindows || [])
      .filter(window => window.examDate && new Date(window.examDate).getTime() >= now)
      .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
      .slice(0, 5);
  }, [examWindows]);

  const scoresLink = isHead ? '/scores/summary' : '/scores/band-scores';

  if (isLoading) {
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
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-[#1B2A4A] to-[#0D2B3A] border border-blue-900/30 rounded-2xl p-6"
      >
        <div className="relative">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">
            {isHead ? 'Committee Head' : 'Committee Member'} Portal
          </p>
          <h1 className="text-xl font-bold text-white mb-1">Hello, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">
            {isHead ? 'Manage band score entry and review appeal requests.' : 'View submitted band scores for your exam committee.'}
          </p>
        </div>
      </motion.div>

      {/* Alerts */}
      {!isHead && pendingCommitteeCount > 0 && (
        <Alert variant="warning" title="Newly routed for committee review">
          {pendingCommitteeCount} re-evaluation request{pendingCommitteeCount === 1 ? '' : 's'} cleared payment and now await{pendingCommitteeCount === 1 ? 's' : ''} the Committee Head's review.
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isHead && <StatCard title="Pending Score Sheets" value={pendingScoreSheetCount} icon={<ClipboardList size={18} />} color="gold" />}
        {isHead && <StatCard title="Evaluations Complete" value={`${completionPercent}%`} icon={<CheckCircle size={18} />} color="success" />}
        {!isHead && <StatCard title="Scores Entered" value={bandScores?.length ?? 0} icon={<ClipboardList size={18} />} color="gold" />}
        {!isHead && <StatCard title="Published" value={bandScores?.filter(b => b.status === 'published').length ?? 0} icon={<CheckCircle size={18} />} color="success" />}
        <StatCard title="Committee Members" value={committeeMembers.length} icon={<Users size={18} />} color="info" />
        <StatCard
          title={isHead ? 'Active Re-evaluations' : 'Pending Committee Review'}
          value={isHead ? activeAppealsCount : pendingCommitteeCount}
          icon={<Scale size={18} />}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Score Distribution */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Score Distribution</h3>
          <p className="text-xs text-text-muted mb-4">CEFR band levels across entered scores</p>
          {!hasScoreDist ? (
            <ChartEmpty height={180} message="No band scores entered yet" />
          ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreDistData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis dataKey="band" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Candidates" />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Recent Scores */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Band Scores</h3>
            <Link to={scoresLink} className="text-xs text-brand-gold hover:text-[#FCD34D] flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-2.5">
            {(bandScores || []).length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No band scores recorded for this exam window yet.</p>
            )}
            {(bandScores || []).map(bs => (
              <div key={bs.id} className="flex items-center justify-between gap-3 py-2 border-b border-surface-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{bs.testTakerName}</p>
                  <p className="text-[10px] text-text-muted">{bs.registrationNumber}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-gold">{Number(bs.average || 0).toFixed(1)}</p>
                    <p className="text-[10px] text-text-muted">avg</p>
                  </div>
                  <StatusBadge status={bs.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Committee Members. No "Manage" link here for the Committee Head - the v2
          Committee Head sidebar decision withdrew committee constitution from this
          role (a Committee Head assembling and designating themselves does not make
          organisational sense; see outOfMatrix.js 'committeeSetup'), so /scores/committee
          is no longer reachable by this role at all. */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Examination Committee</h3>
        <div className="flex flex-wrap gap-3">
          {committeeMembers.length === 0 && (
            <p className="text-xs text-text-muted py-2">No committee has been assigned to this exam window yet.</p>
          )}
          {committeeMembers.map(m => {
            const displayName = m.name || `User ${m.userId.slice(0, 8)}`;
            return (
              <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-bg border border-surface-border rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${m.isHead ? 'bg-brand-gold/10 text-brand-gold' : 'bg-blue-500/10 text-blue-400'}`}>
                  {displayName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">{displayName}</p>
                  <p className="text-[10px] text-text-muted">{m.role}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review calendar - real exam-window dates, not a fabricated meeting schedule.
          See the `upcomingExamDates` comment above for why. */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Upcoming Examination Dates</h3>
          <p className="text-xs text-text-muted">Band-score review and re-evaluation activity follows these dates</p>
        </div>
        <div className="space-y-2.5">
          {upcomingExamDates.length === 0 && (
            <p className="text-xs text-text-muted py-4 text-center">No upcoming examination dates are scheduled yet.</p>
          )}
          {upcomingExamDates.map(window => (
            <div key={window.id} className="flex items-center justify-between gap-3 py-2 border-b border-surface-border/40 last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <CalendarDays size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{window.title}</p>
                  <p className="text-[10px] text-text-muted">{window.code}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-text-secondary shrink-0">
                {new Date(window.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
