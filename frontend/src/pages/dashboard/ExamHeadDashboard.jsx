/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, FileText, Lock, ArrowRight, FileSearch, CalendarClock, UserCheck, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { questionService } from '@/services/questions';
import { examService } from '@/services/exams';
import { useApi } from '@/hooks/useApi';

// Exam windows the Exam Head still needs to think about - not yet archived, not
// cancelled, and results aren't in. Everything else is history.
const UPCOMING_STATUSES = ['draft', 'published', 'registration_open', 'registration_closed', 'in_progress'];

export default function ExamHeadDashboard() {
  const { user } = useAuth();
  const { data: questionPapers, loading: loadingQP } = useApi(questionService.getAll);
  const { data: assignments, loading: loadingAssignments } = useApi(questionService.getMyAssignments);
  const { data: examWindows, loading: loadingExams } = useApi(examService.getAll);

  const isLoading = loadingQP || loadingAssignments || loadingExams;

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

  const examsById = new Map((examWindows || []).map(exam => [exam.id, exam]));
  const upcomingExams = (examWindows || [])
    .filter(exam => UPCOMING_STATUSES.includes(exam.status))
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  const pendingAssignments = (assignments || []).filter(item => item.skillsPending?.length);
  const totalPendingSkills = pendingAssignments.reduce((sum, item) => sum + item.skillsPending.length, 0);

  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
  };
  const skillLabel = skill => skill ? `${skill.charAt(0)}${skill.slice(1).toLowerCase()}` : skill;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-[#1B2A4A] to-[#2A1B3A] border border-brand-gold/20 rounded-2xl p-6"
      >
        <div className="relative">
          <p className="text-xs text-brand-gold font-medium uppercase tracking-wider mb-1">Exam Head</p>
          <h1 className="text-xl font-bold text-white mb-1">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">Manage question papers and oversee examination documents securely.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Papers Uploaded" value={(questionPapers || []).length} icon={<BookOpen size={18} />} color="gold" />
        <StatCard title="Pending Uploads" value={totalPendingSkills} icon={<AlertTriangle size={18} />} color={totalPendingSkills ? 'warning' : 'success'} />
        {/* BRD §5.4.2 asks for a verified-applicant count for upcoming sessions, but
            GET /applications requires the `registration.application.verify`
            permission server-side and the Exam Head does not hold it (only
            question.secure.* and report.run - see migrations 0001/0002/0006).
            Granting it would also grant the verify/start-review/return actions that
            permission guards, which this role should not have. Shown disabled with
            the reason instead of calling an endpoint that would 403 - see
            RBAC-INTEGRATION-CONTRACT.md §5.6. */}
        <StatCard
          title="Verified Applicants"
          value="—"
          subtitle="Needs a read-only registration permission not yet split from Verify"
          icon={<UserCheck size={18} />}
          color="purple"
        />
        <StatCard title="Upcoming Exams" value={upcomingExams.length} icon={<CalendarClock size={18} />} color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending uploads per exam */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Pending Uploads</h3>
          <p className="text-xs text-text-muted mb-4">Exams you're assigned to that are still missing a paper for one or more skills.</p>
          {pendingAssignments.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">Nothing pending - every assigned exam has a paper for every skill.</p>
          ) : (
            <div className="space-y-2.5">
              {pendingAssignments.map(item => {
                const exam = examsById.get(item.examId);
                return (
                  <div key={item.examId} className="flex items-center justify-between gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{exam?.code || exam?.title || `Exam ${item.examId.slice(0, 8)}`}</p>
                      {exam?.title && exam.code && <p className="text-[10px] text-text-muted truncate">{exam.title}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 shrink-0">
                      {item.skillsPending.map(skill => (
                        <span key={skill} className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                          {skillLabel(skill)} Pending
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming exam windows */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Upcoming Exam Windows</h3>
          <p className="text-xs text-text-muted mb-4">Scheduled examinations, earliest first.</p>
          {upcomingExams.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">No upcoming exam windows.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingExams.slice(0, 6).map(exam => (
                <div key={exam.id} className="flex items-center justify-between gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{exam.title}</p>
                    <p className="text-[10px] text-text-muted">{formatDate(exam.examDate)}</p>
                  </div>
                  <StatusBadge status={exam.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/questions/upload" className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-brand-gold/40 transition-colors">
          <Upload size={20} className="text-brand-gold mb-2" />
          <p className="text-sm font-semibold text-text-primary">Question Bank</p>
          <p className="text-xs text-text-muted mt-1">Upload a paper - encrypted on submission.</p>
        </Link>
        <Link to="/questions/downloads" className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-brand-gold/40 transition-colors">
          <Download size={20} className="text-brand-gold mb-2" />
          <p className="text-sm font-semibold text-text-primary">Exam Day Downloads</p>
          <p className="text-xs text-text-muted mt-1">View or download during the scheduled window.</p>
        </Link>
        <Link to="/questions/samples" className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-brand-gold/40 transition-colors">
          <FileSearch size={20} className="text-brand-gold mb-2" />
          <p className="text-sm font-semibold text-text-primary">Released Sample Papers</p>
          <p className="text-xs text-text-muted mt-1">Review what's public after results are declared.</p>
        </Link>
      </div>

      {/* Recent uploads */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Recent Uploads</h3>
          <Link to="/questions/upload" className="text-xs text-brand-gold hover:text-[#FCD34D] flex items-center gap-1">Question Bank <ArrowRight size={12} /></Link>
        </div>
        {(questionPapers || []).length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No question papers uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...(questionPapers || [])]
              .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
              .slice(0, 5)
              .map(qp => (
                <div key={qp.id} className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary truncate">{qp.title}</p>
                    <p className="text-[10px] text-text-muted">{qp.fileSize} · {qp.skillLabel}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {qp.isEncrypted && <Lock size={11} className="text-amber-400" />}
                    <StatusBadge status={qp.status} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
