/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, CheckSquare, FileText, Clock, Award, AlertCircle,
  TrendingUp, Calendar, ArrowRight, BarChart3, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { scoreService } from '../../services/scores';
import { applicationService } from '../../services/applications';
import { examService } from '../../services/exams';
import { useApi } from '../../hooks/useApi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const registrationTrend = [
  { month: 'Jan', applications: 45, verified: 42 },
  { month: 'Feb', applications: 62, verified: 58 },
  { month: 'Mar', applications: 38, verified: 35 },
  { month: 'Apr', applications: 78, verified: 72 },
  { month: 'May', applications: 95, verified: 88 },
  { month: 'Jun', applications: 142, verified: 118 },
];

const statusDist = [
  { name: 'Verified', value: 118, color: '#10B981' },
  { name: 'Pending', value: 15, color: '#F59E0B' },
  { name: 'Waitlisted', value: 12, color: '#3B82F6' },
  { name: 'Absent', value: 8, color: '#EF4444' },
];

const getDCDDStats = () => scoreService.getDashboardStats('dcdd');

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DCDDDashboard() {
  const { user } = useAuth();
  const { data: stats, loading: loadingStats } = useApi(getDCDDStats);
  const { data: applications, loading: loadingApps } = useApi(applicationService.getAll);
  const { data: examWindows, loading: loadingExams } = useApi(examService.getAll);

  const isLoading = loadingStats || loadingApps || loadingExams;
  const activeExam = examWindows?.find(e => e.status === 'open');
  const pendingApps = applications?.filter(a => a.status === 'submitted').length || 0;

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
        className="relative overflow-hidden bg-gradient-to-r from-[#1B2A4A] to-[#243660] border border-[#243055] rounded-2xl p-6"
      >
        <div className="absolute right-0 top-0 w-48 h-48 bg-[#F59E0B]/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative">
          <p className="text-xs text-brand-gold font-medium uppercase tracking-wider mb-1">DCDD Administration</p>
          <h1 className="text-xl font-bold text-white mb-1">Good morning, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">
            {pendingApps > 0
              ? `You have ${pendingApps} application${pendingApps > 1 ? 's' : ''} pending verification today.`
              : 'All applications are up to date. Great work!'}
          </p>
          {activeExam && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#94A3C8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active: {activeExam.title} · {activeExam.currentRegistrations}/{activeExam.maxCapacity} registered
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registrations" value={stats?.totalRegistrations ?? 0} icon={<Users size={18} />} color="gold" subtitle="Current window" />
        <StatCard title="Pending Verification" value={stats?.pendingVerifications ?? 0} icon={<Clock size={18} />} color="warning" subtitle="Requires action" />
        <StatCard title="Approved Applications" value={stats?.approvedApplications ?? 0} icon={<CheckSquare size={18} />} color="success" subtitle="Ready for exam" />
        <StatCard title="Active Appeals" value={stats?.activeAppeals ?? 0} icon={<AlertCircle size={18} />} color="error" subtitle="Needs attention" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Registration Trend */}
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Registration Trend</h3>
              <p className="text-xs text-text-muted">Applications vs verified — last 6 months</p>
            </div>
            <TrendingUp size={16} className="text-brand-gold" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={registrationTrend}>
              <defs>
                <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="verGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="applications" stroke="#F59E0B" fill="url(#appGrad)" strokeWidth={2} name="Applications" />
              <Area type="monotone" dataKey="verified" stroke="#10B981" fill="url(#verGrad)" strokeWidth={2} name="Verified" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Status Distribution</h3>
          <p className="text-xs text-text-muted mb-4">Current exam window</p>
          <div className="flex justify-center mb-4">
            <PieChart width={160} height={160}>
              <Pie data={statusDist} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2">
            {statusDist.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-text-secondary">{d.name}</span>
                </div>
                <span className="font-semibold text-text-primary">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Recent Applications */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Applications</h3>
            <Link to="/verification" className="text-xs text-brand-gold hover:text-[#FCD34D] transition-colors flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(applications || []).slice(0, 4).map(app => (
              <div key={app.id} className="flex items-center justify-between gap-3 py-2 border-b border-surface-border/50 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">
                    {app.testTakerName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{app.testTakerName}</p>
                    <p className="text-[10px] text-text-muted">{app.id}</p>
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Exam Windows */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Exam Windows</h3>
            <Link to="/registration/windows" className="text-xs text-brand-gold hover:text-[#FCD34D] transition-colors flex items-center gap-1">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(examWindows || []).map(ew => (
              <div key={ew.id} className="p-3 bg-surface-bg rounded-xl border border-surface-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-text-primary leading-tight">{ew.title}</p>
                  <StatusBadge status={ew.status} />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-text-muted">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(ew.examDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {ew.currentRegistrations}/{ew.maxCapacity}</span>
                </div>
                <div className="mt-2 h-1 bg-[var(--color-surface-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full transition-all"
                    style={{ width: `${(ew.currentRegistrations / ew.maxCapacity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
