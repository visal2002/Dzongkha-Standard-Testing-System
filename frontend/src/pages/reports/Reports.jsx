/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { BarChart3, Download, Filter, Calendar, TrendingUp, Users, Award, Scale, ScrollText } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { reportService } from '@/services/reports';
import { examService } from '@/services/exams';
import { applicationService } from '@/services/applications';
import { appealService } from '@/services/appeals';
import { auditService } from '@/services/audit';
import { useApi } from '@/hooks/useApi';
import {
  monthlyCounts, monthlyAverages, toPieSlices, hasChartData, CEFR_BAND_COLORS,
} from '@/utils/analytics';
import ChartEmpty from '@/components/ui/ChartEmpty';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color || '#F59E0B' }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const PREDEFINED_REPORTS = [
  { id: 'reg-summary', label: 'Registration Summary', icon: Users, description: 'Total applications by status, dzongkhag, and exam window' },
  { id: 'verification', label: 'Verification Status Report', icon: Filter, description: 'Applications pending, verified, approved, and returned' },
  { id: 'band-dist', label: 'Band Score Distribution', icon: BarChart3, description: 'CEFR level distribution across all candidates' },
  { id: 'appeal-track', label: 'Appeal Tracking Report', icon: Scale, description: 'Status of all re-evaluation requests and decisions' },
  { id: 'cert-validity', label: 'Certificate Validity Report', icon: Award, description: 'Active, expiring, and expired certificate inventory' },
  { id: 'exam-schedule', label: 'Examination Schedule', icon: Calendar, description: 'All exam windows with registration and capacity data' },
  // Reads the same immutable audit-event projection the System Administrator's
  // dedicated Audit Logs screen uses (BRD §7.3); this tile just exports it as CSV, it
  // does not add the dedicated screen itself to any role that doesn't already have it.
  { id: 'audit-logs', label: 'System Audit Logs', icon: ScrollText, description: 'Immutable audit trail of role, permission, and workflow events', kind: 'audit' },
];

export default function Reports() {
  const { user } = useAuth();
  const canGenerate = canAccess(user?.role, 'reports', 'manage');
  const { data: summary, loading } = useApi(reportService.getSummary);
  const { data: examWindowsData } = useApi(examService.getAll);
  const { data: applications } = useApi(applicationService.getAll);
  const { data: appeals } = useApi(appealService.getAll);
  const { data: scoreReport } = useApi(reportService.getScoreDistribution);
  const examWindows = examWindowsData || [];
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format, dataset = 'summary', label = 'report') => {
    try {
      setExporting(true);
      toast.loading(`Generating ${label} (${format.toUpperCase()})...`, { id: 'export-job' });
      // In this system, we use createExport and then download it.
      const job = await reportService.createExport(format, { dataset, fields: [] });
      
      // If the backend has a worker, we'd poll here. We will attempt a slight delay then download.
      setTimeout(async () => {
        try {
          await reportService.downloadExport(job.id, `${label.replace(/\s+/g, '_').toLowerCase()}.${format}`);
          toast.success(`${label} downloaded successfully!`, { id: 'export-job' });
        } catch (downloadErr) {
          toast.error(`Export failed: ${downloadErr.message}`, { id: 'export-job' });
        } finally {
          setExporting(false);
        }
      }, 1500);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`, { id: 'export-job' });
      setExporting(false);
    }
  };

  // Audit export is a direct, synchronous CSV download (reporting-service's
  // /audit/export), not the async report-job pipeline the other predefined reports
  // use - a real file with real data either way, just a different backend shape.
  const handleAuditExport = async () => {
    setExporting(true);
    try {
      const blob = await auditService.exportCsv({});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dzongjuk-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('System Audit Logs exported successfully!');
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Every chart below is aggregated from records the API returned. When an environment
  // has no data the chart says so rather than drawing a representative curve.
  const registrationMonthly = useMemo(() => monthlyCounts(applications, {
    dateOf: application => application.submittedAt || application.createdAt,
    series: {
      applications: () => true,
      verified: application => ['verified', 'approved'].includes(application.status),
      approved: application => application.status === 'approved',
    },
  }), [applications]);

  const skillAvgMonthly = useMemo(() => monthlyAverages(applications, {
    dateOf: application => application.scoredAt || application.updatedAt || application.createdAt,
    metrics: {
      writing: application => application.scores?.writing,
      reading: application => application.scores?.reading,
      listening: application => application.scores?.listening,
      speaking: application => application.scores?.speaking,
    },
  }), [applications]);

  const bandDistribution = useMemo(() => toPieSlices(
    Object.fromEntries((scoreReport?.bands || []).map(entry => [entry.band, entry.count])),
    CEFR_BAND_COLORS,
  ), [scoreReport]);

  const appealTrend = useMemo(() => monthlyCounts(appeals, {
    dateOf: appeal => appeal.submittedAt || appeal.createdAt,
    series: {
      submitted: () => true,
      approved: appeal => ['approved_pending_score_update', 'completed'].includes(String(appeal.status || '').toLowerCase()),
      rejected: appeal => ['rejected', 'no_change'].includes(String(appeal.status || '').toLowerCase()),
    },
  }), [appeals]);

  const hasRegistrationTrend = hasChartData(registrationMonthly, ['applications', 'verified', 'approved']);
  const hasSkillTrend = skillAvgMonthly.some(row => ['writing', 'reading', 'listening', 'speaking'].some(key => row[key] !== null));
  const hasAppealTrend = hasChartData(appealTrend, ['submitted', 'approved', 'rejected']);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive reporting across all DSTS modules"
        breadcrumbs={[{ label: 'Reports' }]}
        icon={<BarChart3 size={18} />}
        action={canGenerate ?
          <Button variant="secondary" icon={<Download size={14} />} disabled={exporting} onClick={() => handleExport('pdf', 'summary', 'Overview Report')}>
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
                <h3 className="text-sm font-semibold text-text-primary mb-4">Registration Trend — last 6 months</h3>
                {!hasRegistrationTrend ? (
                  <ChartEmpty height={220} message="No applications submitted in the last six months" />
                ) : (
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
                )}
              </div>

              <div className="bg-surface-card border border-surface-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">CEFR Band Distribution</h3>
                {bandDistribution.length === 0 ? (
                  <ChartEmpty height={180} message="No published band scores yet" />
                ) : (
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
                )}
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
                  {canGenerate && <Button variant="secondary" size="sm" disabled={exporting} icon={<Download size={13} />} onClick={() => handleExport('csv', 'registration', 'Registration Status')}>CSV</Button>}
                </div>
              </div>
              {!hasRegistrationTrend ? (
                <ChartEmpty height={260} message="No applications to break down yet" />
              ) : (
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
              )}
            </div>
          </TabPanel>

          {/* Scores */}
          <TabPanel value="scores">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Average Score by Skill — Monthly Trend</h3>
              {!hasSkillTrend ? (
                <ChartEmpty
                  height={260}
                  message="No skill scores available for this period"
                  hint="Averages appear once band scores are published for the exam windows in range."
                />
              ) : (
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
              )}
            </div>
          </TabPanel>

          {/* Appeals */}
          <TabPanel value="appeals">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Appeal Outcomes — Monthly</h3>
              {!hasAppealTrend ? (
                <ChartEmpty height={260} message="No appeals submitted in the last six months" />
              ) : (
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
              )}
            </div>
          </TabPanel>

          {/* Predefined Reports */}
          <TabPanel value="predefined">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PREDEFINED_REPORTS.map(r => (
                <button
                  key={r.id}
                  onClick={() => (r.kind === 'audit' ? handleAuditExport() : handleExport('pdf', r.id, r.label))}
                  disabled={!canGenerate || exporting}
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
