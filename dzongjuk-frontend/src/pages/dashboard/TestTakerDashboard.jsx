import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award, FileText, AlertCircle, Calendar, ArrowRight, Download, CheckCircle, BarChart2, Edit3, Check, Headphones, MessageCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { applications, certificates, examWindows, bandScores } from '../../data/mockData';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

export default function TestTakerDashboard() {
  const { user } = useAuth();
  const myApps = applications.filter(a => a.testTakerId === user?.id || a.testTakerId === 'USR-006');
  const myCerts = certificates.slice(0, 2);
  const myScore = bandScores[0];
  const openExam = examWindows.find(e => e.status === 'open');

  const radarData = myScore ? [
    { skill: 'Writing', score: myScore.writing },
    { skill: 'Reading', score: myScore.reading },
    { skill: 'Listening', score: myScore.listening },
    { skill: 'Speaking', score: myScore.speaking },
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
          
          <button className="bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors">
            <Calendar size={14} /> Register for DSTS Examination - July 2026 <ArrowRight size={14} />
          </button>
        </div>

        <div className="relative z-10 mt-3 md:mt-0 text-center md:text-right w-full md:w-auto">
          <div className="inline-block md:block text-right">
            <div className="flex items-center justify-center md:justify-end gap-1 text-[11px] text-slate-300 mb-0.5">
              <Calendar size={12} /> Registration closes in
            </div>
            <div className="text-3xl font-bold text-brand-gold mb-0.5">
              14 <span className="text-base font-normal text-white">days</span>
            </div>
            <div className="text-[10px] text-slate-300">31 Jul 2026, 11:59 PM</div>
          </div>
        </div>
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
            <p className="text-xl font-bold text-text-primary leading-none">1</p>
            <p className="text-[9px] text-purple-600 font-medium flex items-center gap-0.5 mt-1"><ArrowRight size={9} className="-rotate-45" /> +1 this year</p>
          </div>
        </div>
        
        {/* Certificates */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Award size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Certificates</p>
            <p className="text-xl font-bold text-text-primary leading-none">2</p>
            <p className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1"><ArrowRight size={9} className="-rotate-45" /> +1 this year</p>
          </div>
        </div>

        {/* Latest Band */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <BarChart2 size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Latest Band</p>
            <div className="flex items-baseline gap-1.5 leading-none">
              <p className="text-xl font-bold text-text-primary">6.8</p>
              <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded">B2 Level</span>
            </div>
            <p className="text-[9px] text-blue-600 font-medium flex items-center gap-0.5 mt-1"><ArrowRight size={9} className="-rotate-45" /> Improved from 6.5</p>
          </div>
        </div>

        {/* Active Appeals */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Active Appeals</p>
            <p className="text-xl font-bold text-text-primary leading-none">0</p>
            <p className="text-[9px] text-text-muted font-medium mt-1">No active appeals</p>
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
          <Link to="/certificates" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 shrink-0"><Download size={13} /></div>
            <span className="truncate">Download Certificate</span>
          </Link>
          <Link to="/scores/view" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-blue-500/40 hover:bg-blue-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0"><BarChart2 size={13} /></div>
            <span className="truncate">View Result</span>
          </Link>
          <Link to="/appeals/new" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-orange-500/40 hover:bg-orange-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-500 shrink-0"><Edit3 size={13} /></div>
            <span className="truncate">Submit Appeal</span>
          </Link>
          <Link to="/questions/samples" className="flex items-center gap-2 p-2 rounded-lg bg-surface-bg/60 border border-surface-border/60 hover:border-teal-500/40 hover:bg-teal-500/5 text-[11px] font-semibold text-text-primary transition-all">
            <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 shrink-0"><FileText size={13} /></div>
            <span className="truncate">Sample Papers</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Latest Skill Scores */}
        {myScore && (
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm flex flex-col justify-between overflow-hidden h-full">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Latest Skill Scores <span className="font-normal text-text-muted normal-case ml-1">(January 2026)</span></h3>
              <Link to="/scores/view" className="text-[11px] text-brand-gold font-medium hover:underline flex items-center gap-1">View all results <ArrowRight size={10} /></Link>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center min-h-0">
              {/* Progress Bars */}
              <div className="w-full md:w-1/2 space-y-3">
                {[
                  { label: 'Writing', value: myScore.writing, color: 'bg-purple-500', icon: <Edit3 size={13} />, iconBg: 'bg-purple-100 text-purple-600', max: 9, eval: 'Good' },
                  { label: 'Reading', value: myScore.reading, color: 'bg-blue-500', icon: <BookOpen size={13} />, iconBg: 'bg-blue-100 text-blue-600', max: 9, eval: 'Very Good' },
                  { label: 'Listening', value: myScore.listening, color: 'bg-emerald-500', icon: <Headphones size={13} />, iconBg: 'bg-emerald-100 text-emerald-600', max: 9, eval: 'Good' },
                  { label: 'Speaking', value: myScore.speaking, color: 'bg-orange-500', icon: <MessageCircle size={13} />, iconBg: 'bg-orange-100 text-orange-600', max: 9, eval: 'Very Good' },
                ].map(skill => (
                  <div key={skill.label} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${skill.iconBg} flex items-center justify-center shrink-0`}>
                      {skill.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-0.5">
                        <span className="text-[11px] font-medium text-text-muted">{skill.label}</span>
                        <div className="text-right flex items-baseline gap-1">
                           <span className="text-xs font-bold text-text-primary">{skill.value.toFixed(1)}</span>
                           <span className={`text-[8px] font-medium ${skill.iconBg.split(' ')[1]} ml-2`}>{skill.eval}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden flex relative">
                        <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${(skill.value / skill.max) * 100}%` }} />
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
          
          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div className="flex justify-between items-start">
               <div>
                  <h4 className="text-base font-bold text-text-primary leading-tight">APP-2026-0001</h4>
                  <p className="text-[11px] text-text-muted">DSTS-2026-07-0001</p>
                  <p className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5"><Calendar size={10} /> Submitted on 15 Jun 2026</p>
               </div>
               <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold flex items-center gap-1 border border-emerald-200">
                 <CheckCircle size={12} /> Verified
               </div>
            </div>

            {/* Horizontal Stepper */}
            <div className="relative flex justify-between my-auto px-1 py-2">
              <div className="absolute top-3 left-0 right-0 h-1 bg-surface-border rounded-full -z-10">
                <div className="h-full bg-emerald-500 rounded-full w-[25%]" />
              </div>
              
              {[
                { step: 1, label: 'Submitted', date: '15 Jun', active: true, done: true },
                { step: 2, label: 'Verified', date: '18 Jun', active: true, done: true },
                { step: 3, label: 'Payment Pending', date: '', active: true, done: false, color: 'bg-purple-600 text-white' },
                { step: 4, label: 'Admit Card', date: '', active: false, done: false },
                { step: 5, label: 'Exam', date: '', active: false, done: false },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm ${
                    s.done ? 'bg-emerald-500 text-white' : 
                    s.color ? s.color : 'bg-surface-card border border-surface-border text-text-muted'
                  }`}>
                    {s.done ? <Check size={12} /> : s.step}
                  </div>
                  <p className={`text-[9px] font-semibold text-center leading-tight ${s.active ? 'text-text-primary' : 'text-text-muted'}`}>{s.label}</p>
                  <p className="text-[8px] text-text-muted">{s.date || '\u00A0'}</p>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-lg p-2 text-[10px] flex items-center gap-1.5 shrink-0">
               <MessageCircle size={14} className="shrink-0" />
               <span className="leading-tight">Need help? Visit our <a href="#" className="font-bold underline">Help Center</a> or contact DSTS support.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
