/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scale, CheckCircle, XCircle, Clock, ArrowRight, Users, Award, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { appealService } from '@/features/appeals/api';
import { reportService } from '@/features/reports/api';
import { useApi } from '@/hooks/useApi';
import Button from '@/components/ui/Button';

export default function ChiefDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: appealsData, loading: appealsLoading } = useApi(appealService.getAll);
  const { data: summary, loading: summaryLoading } = useApi(reportService.getSummary);
  const { data: scoreReport, loading: scoreLoading } = useApi(reportService.getScoreDistribution);

  const loading = appealsLoading || summaryLoading || scoreLoading;

  // Normalises the raw skill rows into names, matching how AppealList.jsx reads the
  // same /appeals response.
  const appealData = (appealsData || []).map(appeal => ({
    ...appeal,
    skillNames: (appeal.skills || []).map(skill => skill.skill),
  }));
  const pending = appealData.filter(a => a.status === 'PENDING_CHIEF_APPROVAL');

  const throughput = summary?.totalApplications > 0 
    ? Math.round((summary.totalCertificates / summary.totalApplications) * 100)
    : 0;
    
  const bands = scoreReport?.bands || [];

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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-[#1B2A4A] to-[#0D3A2A] border border-emerald-900/30 rounded-2xl p-6"
      >
        <div className="relative">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">Chief Executive Portal</p>
          <h1 className="text-xl font-bold text-white mb-1">Good morning, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">
            {pending.length > 0
              ? `${pending.length} score revision request${pending.length > 1 ? 's' : ''} awaiting your approval.`
              : 'No pending approvals. All appeal decisions are up to date.'}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registrations" value={summary?.totalApplications ?? 0} icon={<Users size={18} />} color="blue" />
        <StatCard title="Active Appeals" value={summary?.activeAppeals ?? 0} icon={<Scale size={18} />} color="warning" />
        <StatCard title="Resolved Appeals" value={appealData.filter(a => a.status === 'COMPLETED').length} icon={<CheckCircle size={18} />} color="success" />
        <StatCard title="Cert. Throughput" value={`${throughput}%`} icon={<Award size={18} />} color="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Pending Score Revisions</h3>
            <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/appeals')}>All appeals</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pending.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                <p className="text-sm font-medium text-text-primary">All caught up!</p>
                <p className="text-xs mt-1">No revision requests pending your approval.</p>
              </div>
            ) : pending.map(appeal => (
              <div key={appeal.id} className="p-4 bg-surface-bg border border-amber-500/20 rounded-xl mb-3">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary font-mono">{appeal.id}</p>
                    <p className="text-xs text-text-muted">Application {appeal.applicationId}</p>
                  </div>
                  <StatusBadge status={appeal.status} />
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-text-secondary">
                  <span>Skills: {appeal.skillNames.join(', ')}</span>
                  <Button variant="success" size="xs" icon={<CheckCircle size={12} />} onClick={() => navigate('/appeals')}>
                    Review &amp; Decide
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Band Score Distribution */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text-primary">Band Distribution</h3>
          </div>
          {bands.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-text-muted">
              <p className="text-sm font-medium">No published band scores yet.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {bands.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-bg rounded-lg border border-surface-border">
                  <span className="text-sm font-semibold text-text-primary">Level {b.band}</span>
                  <span className="text-xs font-medium text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">{b.count} candidates</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

