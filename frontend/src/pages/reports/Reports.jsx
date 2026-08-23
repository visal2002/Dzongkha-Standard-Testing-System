/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { BarChart3, Download, Filter, Calendar, TrendingUp, Users, Award, Scale } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { reportService } from '../../services/reports';
import { examService } from '../../services/exams';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { canAccess } from '../../config/accessMatrix';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color || '#F59E0B' }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const registrationMonthly = [
  { month: 'Jan', applications: 45, verified: 42, approved: 38 },
  { month: 'Feb', applications: 62, verified: 58, approved: 55 },
  { month: 'Mar', applications: 38, verified: 35, approved: 30 },
  { month: 'Apr', applications: 78, verified: 72, approved: 68 },
  { month: 'May', applications: 95, verified: 88, approved: 82 },
  { month: 'Jun', applications: 142, verified: 118, approved: 110 },
];

const skillAvgMonthly = [
  { month: 'Jan', writing: 5.8, reading: 6.2, listening: 5.5, speaking: 6.0 },
  { month: 'Feb', writing: 6.0, reading: 6.4, listening: 5.8, speaking: 6.2 },
  { month: 'Mar', writing: 5.5, reading: 6.0, listening: 5.2, speaking: 5.8 },
  { month: 'Apr', writing: 6.2, reading: 6.5, listening: 6.0, speaking: 6.5 },
  { month: 'May', writing: 6.4, reading: 6.8, listening: 6.2, speaking: 6.7 },
  { month: 'Jun', writing: 6.5, reading: 7.0, listening: 6.0, speaking: 7.5 },
];

const bandDistribution = [
  { name: 'C2', value: 2, color: '#7C3AED' },
  { name: 'C1', value: 8, color: '#3B82F6' },
  { name: 'B2', value: 18, color: '#0D9488' },
  { name: 'B1', value: 12, color: '#10B981' },
  { name: 'A2', value: 5, color: '#F59E0B' },
  { name: 'A1', value: 2, color: '#EF4444' },
];

const appealTrend = [
  { month: 'Jan', submitted: 3, approved: 2, rejected: 1 },
  { month: 'Feb', submitted: 5, approved: 3, rejected: 2 },
  { month: 'Mar', submitted: 2, approved: 1, rejected: 1 },
  { month: 'Apr', submitted: 4, approved: 3, rejected: 1 },
  { month: 'May', submitted: 6, approved: 4, rejected: 2 },
  { month: 'Jun', submitted: 2, approved: 1, rejected: 0 },
];

const PREDEFINED_REPORTS = [
  { id: 'reg-summary', label: 'Registration Summary', icon: Users, description: 'Total applications by status, dzongkhag, and exam window' },
  { id: 'verification', label: 'Verification Status Report', icon: Filter, description: 'Applications pending, verified, approved, and returned' },
  { id: 'band-dist', label: 'Band Score Distribution', icon: BarChart3, description: 'CEFR level distribution across all candidates' },
  { id: 'appeal-track', label: 'Appeal Tracking Report', icon: Scale, description: 'Status of all re-evaluation requests and decisions' },
  { id: 'cert-validity', label: 'Certificate Validity Report', icon: Award, description: 'Active, expiring, and expired certificate inventory' },
  { id: 'exam-schedule', label: 'Examination Schedule', icon: Calendar, description: 'All exam windows with registration and capacity data' },
];

export default function Reports() {
  const { user } = useAuth();
  const canGenerate = canAccess(user?.role, 'reports', 'manage');
  const { data: summary, loading } = useApi(reportService.getSummary);
  const { data: examWindowsData } = useApi(examService.getAll);
  const examWindows = examWindowsData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive reporting across all DSTS modules"
        breadcrumbs={[{ label: 'Reports' }]}
        icon={<BarChart3 size={18} />}
        action={canGenerate ?
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => toast.success('Generating report...')}>
            Export PDF
          </Button>
          : null}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={loading ? '...' : (summary?.totalApplications ?? 0)} icon={<Users size={18} />} color="gold" />
        <StatCard title="Band Scores Entered" value={loading ? '...' : (summary?.totalScores ?? 0)} icon={<BarChart3 size={18} />} color="teal" />
        <StatCard title="Certificates Issued" value={loading ? '...' : (summary?.totalCertificates ?? 0)} icon={<Award size={18} />} color="success" />
        <StatCard title="Active Appeals" value={loading ? '...' : (summary?.activeAppeals ?? 0)} icon={<Scale size={18} />} color="warning" />
      </div>

      <Tabs defaultValue="overview">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="registration">Registration</Tab>
          <Tab value="scores">Scores</Tab>
          <Tab value="appeals">Appeals</Tab>
          <Tab value="predefined">Standard Reports</Tab>
        </TabList>

        <div className="mt-4 space-y-4">
          {/* Overview */}
          <TabPanel value="overview">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-surface-card border border-surface-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Registration Trend — 2026</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={registrationMonthly}>
                    <defs>
                      <linearGradient id="gradApp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradVer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="applications" stroke="#F59E0B" fill="url(#gradApp)" strokeWidth={2} name="Applications" />
                    <Area type="monotone" dataKey="verified" stroke="#10B981" fill="url(#gradVer)" strokeWidth={2} name="Verified" />
                    <Area type="monotone" dataKey="approved" stroke="#3B82F6" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Approved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-surface-card border border-surface-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">CEFR Band Distribution</h3>
                <div className="flex items-center gap-4">
                  <PieChart width={180} height={180}>
                    <Pie data={bandDistribution} cx={85} cy={85} innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                      {bandDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="space-y-2 flex-1">
                    {bandDistribution.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                          <span className="text-text-secondary font-medium">{d.name}</span>
                        </div>
                        <span className="font-bold text-text-primary">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Registration */}
          <TabPanel value="registration">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Application Status Breakdown</h3>
                <div className="flex gap-2">
                  <Select style={{ width: 140, height: 32 }}><option>All Windows</option>{examWindows.map(e => <option key={e.id}>{e.title}</option>)}</Select>
                  {canGenerate && <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => toast.success('Exporting...')}>CSV</Button>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={registrationMonthly} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="applications" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Total" barSize={20} />
                  <Bar dataKey="verified" fill="#10B981" radius={[3, 3, 0, 0]} name="Verified" barSize={20} />
                  <Bar dataKey="approved" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Approved" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabPanel>

          {/* Scores */}
          <TabPanel value="scores">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Average Score by Skill — Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={skillAvgMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[4, 9]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="writing" stroke="#3B82F6" strokeWidth={2} dot={false} name="Writing" />
                  <Line type="monotone" dataKey="reading" stroke="#10B981" strokeWidth={2} dot={false} name="Reading" />
                  <Line type="monotone" dataKey="listening" stroke="#7C3AED" strokeWidth={2} dot={false} name="Listening" />
                  <Line type="monotone" dataKey="speaking" stroke="#F59E0B" strokeWidth={2} dot={false} name="Speaking" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabPanel>

          {/* Appeals */}
          <TabPanel value="appeals">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Appeal Outcomes — Monthly</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={appealTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="submitted" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Submitted" barSize={20} />
                  <Bar dataKey="approved" fill="#10B981" radius={[3, 3, 0, 0]} name="Approved" barSize={20} />
                  <Bar dataKey="rejected" fill="#EF4444" radius={[3, 3, 0, 0]} name="Rejected" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabPanel>

          {/* Predefined Reports */}
          <TabPanel value="predefined">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PREDEFINED_REPORTS.map(r => (
                <button
                  key={r.id}
                  onClick={() => toast.success(`Generating "${r.label}"...`)}
                  disabled={!canGenerate}
                  className="text-left p-4 bg-surface-card border border-surface-border rounded-xl hover:border-brand-gold/30 hover:bg-[var(--color-surface-card-hover)] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                      <r.icon size={16} />
                    </div>
                    <Download size={14} className="text-text-muted group-hover:text-brand-gold transition-colors mt-1" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary mb-1">{r.label}</p>
                  <p className="text-xs text-text-muted">{r.description}</p>
                </button>
              ))}
            </div>
          </TabPanel>
        </div>
      </Tabs>
    </div>
  );
}
