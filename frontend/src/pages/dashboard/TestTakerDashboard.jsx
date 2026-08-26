/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award, FileText, AlertCircle, Calendar, ArrowRight, Download, CheckCircle, BarChart2, Edit3, Check, Headphones, MessageCircle, BookOpen, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { applicationService } from '@/services/applications';
import { certificateService } from '@/services/certificates';
import { examService } from '@/services/exams';
import { appealService } from '@/services/appeals';
import { findOpenExamWindow } from '@/utils/examWindows';
import { StatusBadge } from '@/components/ui/Badge';
import { scoreService } from '@/services/scores';
import { useApi } from '@/hooks/useApi';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

// Statuses a re-evaluation request has already reached an outcome at - matches
// AppealList.jsx's pipeline mapping, so "active" here means the same thing it
// means on the Re-evaluation screen itself.
const APPEAL_TERMINAL_STATUSES = ['NO_CHANGE', 'REJECTED', 'APPROVED_PENDING_SCORE_UPDATE', 'COMPLETED'];

/**
 * Wording for a single skill band, on the same 1-9 scale the scoring rule uses, so the
 * label always reflects the score beside it.
 */
const bandDescriptor = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 8.5) return 'Expert';
  if (value >= 7.5) return 'Advanced';
  if (value >= 6.5) return 'Proficient';
  if (value >= 5) return 'Independent';
  if (value >= 3.5) return 'Basic';
  return 'Foundation';
};

/** The registration journey shown on the dashboard stepper, in order. */
const APPLICATION_STEPS = [
  { key: 'submitted', label: 'Submitted', statuses: ['submitted', 'under_review', 'returned'] },
  { key: 'verified', label: 'Verified', statuses: ['verified', 'approved'] },
  { key: 'payment', label: 'Payment', statuses: ['paid'] },
  { key: 'admit_card', label: 'Admit Card', statuses: ['admit_card_issued'] },
  { key: 'exam', label: 'Exam', statuses: ['completed', 'absent'] },
];

/**
 * How far along the stepper an application has reached. Payment is read from the
 * payment status rather than the application status, because the two advance
 * independently in the registration workflow.
 */
const stepIndexFor = (application) => {
  if (!application) return -1;
  const status = String(application.status || '').toLowerCase();
  if (['completed', 'absent'].includes(status)) return 4;
  if (application.admitCardIssuedAt) return 3;
  if (String(application.paymentStatus || '').toLowerCase() === 'paid') return 2;
  if (['verified', 'approved'].includes(status)) return 1;
  return 0;
};

export default function TestTakerDashboard() {
  const { user } = useAuth();
  const { data: applications, loading: loadingApps } = useApi(applicationService.getByUser, true, [user?.id]);
  const { data: certificates, loading: loadingCerts } = useApi(certificateService.getByUser, true, [user?.id]);
  const { data: examWindows, loading: loadingExams } = useApi(examService.getAll);
  const { data: bandScores, loading: loadingScores } = useApi(scoreService.getMyScores, true, [user?.id]);
  const { data: appeals, loading: loadingAppeals } = useApi(appealService.getByUser, true, [user?.id]);

  const isLoading = loadingApps || loadingCerts || loadingExams || loadingScores || loadingAppeals;

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

  // `/applications/my` is already scoped to the signed-in user; the filter is a guard,
  // not a lookup, so it must never widen to a fixed account id.
  const myApps = (applications || []).filter(a => !a.testTakerId || a.testTakerId === user?.id);
  const myCerts = certificates || [];
  const myAppeals = appeals || [];
  const myScore = (bandScores || [])[0];
  const normalizedScore = myScore ? {
    writing: myScore.writing ?? myScore.score?.scores?.WRITING ?? 0,
    reading: myScore.reading ?? myScore.score?.scores?.READING ?? 0,
    listening: myScore.listening ?? myScore.score?.scores?.LISTENING ?? 0,
    speaking: myScore.speaking ?? myScore.score?.scores?.SPEAKING ?? 0,
  } : null;
  const overallBand = normalizedScore
    ? (normalizedScore.writing + normalizedScore.reading + normalizedScore.listening + normalizedScore.speaking) / 4
    : null;
  const openExam = findOpenExamWindow(examWindows);

  // The banner advertises the window that is genuinely open, and counts down to its own
  // registration deadline, rather than naming a fixed exam sitting.
  const latestApp = [...myApps].sort((a, b) => (
    new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0)
  ))[0] || null;
  const latestAppSubmittedAt = latestApp?.submittedAt || latestApp?.createdAt
    ? new Date(latestApp.submittedAt || latestApp.createdAt)
    : null;
  const latestAppExam = latestApp ? (examWindows || []).find(exam => exam.id === latestApp.examId) : null;
  const currentStepIndex = stepIndexFor(latestApp);

  // Exams Taken counts applications that actually reached the exam stage, whether or
  // not the candidate sat it - "Taken" here means "the exam sitting happened", the
  // same completed/absent statuses the stepper itself treats as the final step.
  const examsTakenCount = myApps.filter(a => ['completed', 'absent'].includes(String(a.status || '').toLowerCase())).length;
  const activeAppealsCount = myAppeals.filter(a => !APPEAL_TERMINAL_STATUSES.includes(a.status)).length;

  const registrationClosesAt = openExam?.registrationEnd ? new Date(openExam.registrationEnd) : null;
  const daysToClose = registrationClosesAt
    ? Math.max(0, Math.ceil((registrationClosesAt.getTime() - Date.now()) / 86400000))
    : null;

  const radarData = normalizedScore ? [
    { skill: 'Writing', score: normalizedScore.writing },
    { skill: 'Reading', score: normalizedScore.reading },
    { skill: 'Listening', score: normalizedScore.listening },
    { skill: 'Speaking', score: normalizedScore.speaking },
  ] : [];

  return (
    <div className="space-y-6 w-full">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl p-4 flex flex-col md:flex-row items-center justify-between shadow-md shrink-0"
        style={{
          background: 'linear-gradient(to right, #201e43 0%, #462c68 50%, #8b4c73 100%)',
        }}
      >
        <div className="absolute inset-0 right-0 bg-no-repeat bg-right-bottom opacity-70 bg-contain" style={{ backgroundImage: 'url(/images/dashboard-bg.jpg)' }} />
        
        <div className="relative z-10 w-full md:w-1/2">
          <p className="text-[9px] text-brand-gold uppercase tracking-widest font-semibold mb-1">MY DSTS PORTAL</p>
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">Kuzuzangpo la, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-xs text-slate-300 mb-3">Continue your Dzongkha proficiency journey.</p>
          
          {openExam ? (
            <Link
              to={`/registration/apply/${openExam.id}`}
              className="bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold text-xs px-4 py-1.5 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Calendar size={14} /> Register for {openExam.title} <ArrowRight size={14} />
            </Link>
          ) : (
            <p className="text-xs text-slate-300">
              No exam window is open right now.
            </p>
          )}
        </div>

        {registrationClosesAt && (
          <div className="relative z-10 mt-3 md:mt-0 text-center md:text-right w-full md:w-auto">
            <div className="inline-block md:block text-right">
              <div className="flex items-center justify-center md:justify-end gap-1 text-[11px] text-slate-300 mb-0.5">
                <Calendar size={12} /> Registration closes in
              </div>
              <div className="text-3xl font-bold text-brand-gold mb-0.5">
                {daysToClose} <span className="text-base font-normal text-white">{daysToClose === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="text-[10px] text-slate-300">
                {registrationClosesAt.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* Exams Taken */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Exams Taken</p>
            <p className="text-xl font-bold text-text-primary leading-none">{examsTakenCount}</p>
            <p className="text-[9px] text-text-muted font-medium mt-1">{myApps.length} application{myApps.length === 1 ? '' : 's'} total</p>
          </div>
        </div>

        {/* Certificates */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Award size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Certificates</p>
            <p className="text-xl font-bold text-text-primary leading-none">{myCerts.length}</p>
            <p className="text-[9px] text-text-muted font-medium mt-1">{myCerts.length > 0 ? 'Across all exam attempts' : 'None issued yet'}</p>
          </div>
        </div>

        {/* Latest Band */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <BarChart2 size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Latest Band</p>
            {overallBand ? (
              <div className="flex items-baseline gap-1.5 leading-none">
                <p className="text-xl font-bold text-text-primary">{overallBand.toFixed(1)}</p>
                <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded">{bandDescriptor(overallBand)}</span>
              </div>
            ) : (
              <p className="text-xl font-bold text-text-primary leading-none">—</p>
            )}
            <p className="text-[9px] text-text-muted font-medium mt-1">{overallBand ? 'Latest published result' : 'No result published yet'}</p>
          </div>
        </div>

        {/* Active Re-evaluations */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Active Re-evaluations</p>
            <p className="text-xl font-bold text-text-primary leading-none">{activeAppealsCount}</p>
            <p className="text-[9px] text-text-muted font-medium mt-1">{activeAppealsCount === 0 ? 'No active re-evaluations' : 'Awaiting outcome'}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-sm shrink-0">
        <h3 className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Link to="/registration/windows" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-purple-500/40 hover:bg-purple-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 shrink-0"><Calendar size={13} /></div>
            <span className="truncate">Register for Exam</span>
          </Link>
          {myCerts.length > 0 ? (
            <Link to="/certificates" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-[11px] font-semibold text-text-primary transition-all">
              <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 shrink-0"><Download size={13} /></div>
              <span className="truncate">Download Certificate</span>
            </Link>
          ) : (
            <div title="No certificate has been issued yet" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/30 border border-surface-border/40 text-[11px] font-semibold text-text-muted cursor-not-allowed">
              <div className="w-7 h-7 rounded-md bg-surface-border/40 flex items-center justify-center text-text-muted shrink-0"><Download size={13} /></div>
              <span className="truncate">No Certificate Yet</span>
            </div>
          )}
          <Link to="/scores/view" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-blue-500/40 hover:bg-blue-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0"><BarChart2 size={13} /></div>
            <span className="truncate">View Result</span>
          </Link>
          <Link to="/appeals/new" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-orange-500/40 hover:bg-orange-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-500 shrink-0"><Edit3 size={13} /></div>
            <span className="truncate">Submit Re-evaluation</span>
          </Link>
          <Link to="/questions/samples" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-teal-500/40 hover:bg-teal-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 shrink-0"><FileText size={13} /></div>
            <span className="truncate">Sample Question Papers</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 gap-2.5">
        {/* Latest Skill Scores */}
        {normalizedScore && (
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm flex flex-col justify-between overflow-hidden h-full">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Latest Skill Scores</h3>
              <Link to="/scores/view" className="text-[11px] text-brand-gold font-medium hover:underline flex items-center gap-1">View all results <ArrowRight size={10} /></Link>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center min-h-0">
              {/* Progress Bars */}
              <div className="w-full md:w-1/2 space-y-3">
                {[
                  { label: 'Writing', value: normalizedScore.writing, color: 'bg-purple-500', icon: <Edit3 size={13} />, iconBg: 'bg-purple-100 text-purple-600', max: 9 },
                  { label: 'Reading', value: normalizedScore.reading, color: 'bg-blue-500', icon: <BookOpen size={13} />, iconBg: 'bg-blue-100 text-blue-600', max: 9 },
                  { label: 'Listening', value: normalizedScore.listening, color: 'bg-emerald-500', icon: <Headphones size={13} />, iconBg: 'bg-emerald-100 text-emerald-600', max: 9 },
                  { label: 'Speaking', value: normalizedScore.speaking, color: 'bg-orange-500', icon: <MessageCircle size={13} />, iconBg: 'bg-orange-100 text-orange-600', max: 9 },
                ].map(skill => (
                  <div key={skill.label} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${skill.iconBg} flex items-center justify-center shrink-0`}>
                      {skill.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-0.5">
                        <span className="text-[11px] font-medium text-text-muted">{skill.label}</span>
                        <div className="text-right flex items-baseline gap-1">
                           <span className="text-xs font-bold text-text-primary">{Number(skill.value || 0).toFixed(1)}</span>
                           <span className={`text-[8px] font-medium ${skill.iconBg.split(' ')[1]} ml-2`}>{bandDescriptor(skill.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden flex relative">
                        <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${(Number(skill.value || 0) / skill.max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Radar Chart */}
              <div className="w-full md:w-1/2 h-full flex flex-col justify-center min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="58%" data={radarData}>
                    <PolarGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 9]} tick={false} axisLine={false} />
                    <Radar name="Previous" dataKey="score" stroke="#94a3b8" fill="transparent" strokeWidth={1} strokeDasharray="3 3" />
                    <Radar name="Current" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-[9px] text-text-muted font-medium shrink-0">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-0 border-t-2 border-dashed border-slate-400"></div> Previous Exam</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-0.5 bg-purple-500"></div> Current Exam</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Applications */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm flex flex-col justify-between overflow-hidden h-full">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">My Applications</h3>
            <Link to="/my-applications" className="text-[11px] text-brand-gold font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
          </div>

          {!latestApp ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-6">
              <FileText size={18} className="text-text-muted opacity-60" />
              <p className="text-[11px] text-text-muted">You have not submitted an application yet.</p>
              {openExam && (
                <Link to={`/registration/apply/${openExam.id}`} className="text-[11px] text-brand-gold font-medium hover:underline">
                  Register for {openExam.title}
                </Link>
              )}
            </div>
          ) : (
          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div className="flex justify-between items-start">
               <div>
                  <h4 className="text-base font-bold text-text-primary leading-tight">{latestApp.id}</h4>
                  {latestApp.registrationNumber && (
                    <p className="text-[11px] text-text-muted">{latestApp.registrationNumber}</p>
                  )}
                  {latestAppSubmittedAt && (
                    <p className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> Submitted on {latestAppSubmittedAt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
               </div>
               <StatusBadge status={latestApp.status} />
            </div>

            {/* Horizontal Stepper — driven by the application's real status */}
            <div className="relative flex justify-between my-auto px-1 py-2">
              <div className="absolute top-3 left-0 right-0 h-1 bg-surface-border rounded-full -z-10">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(Math.max(0, currentStepIndex) / (APPLICATION_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              {APPLICATION_STEPS.map((step, index) => {
                const done = index < currentStepIndex;
                const active = index <= currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm ${
                      done ? 'bg-emerald-500 text-white'
                        : index === currentStepIndex ? 'bg-purple-600 text-white'
                        : 'bg-surface-card border border-surface-border text-text-muted'
                    }`}>
                      {done ? <Check size={12} /> : index + 1}
                    </div>
                    <p className={`text-[9px] font-semibold text-center leading-tight ${active ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-lg p-2 text-[10px] flex items-center gap-1.5 shrink-0">
               <MessageCircle size={14} className="shrink-0" />
               <span className="leading-tight">Need help? Contact DSTS support at <a href="mailto:support@dsts.bt" className="font-bold underline">support@dsts.bt</a>.</span>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
