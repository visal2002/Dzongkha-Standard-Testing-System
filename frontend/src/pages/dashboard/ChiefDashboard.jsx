/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scale, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { appealService } from '@/services/appeals';
import { useApi } from '@/hooks/useApi';
import Button from '@/components/ui/Button';

export default function ChiefDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: appealsData, loading } = useApi(appealService.getAll);
  // Normalises the raw skill rows into names, matching how AppealList.jsx reads the
  // same /appeals response.
  const appealData = (appealsData || []).map(appeal => ({
    ...appeal,
    skillNames: (appeal.skills || []).map(skill => skill.skill),
  }));
  const pending = appealData.filter(a => a.status === 'PENDING_CHIEF_APPROVAL');
  const approved = appealData.filter(a => a.chiefDecision === 'APPROVED');
  const rejected = appealData.filter(a => a.chiefDecision === 'REJECTED');

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
        <StatCard title="Total Appeals" value={appealData.length} icon={<Scale size={18} />} color="gold" />
        <StatCard title="Pending Approval" value={pending.length} icon={<Clock size={18} />} color="warning" />
        <StatCard title="Approved" value={approved.length} icon={<CheckCircle size={18} />} color="success" />
        <StatCard title="Rejected" value={rejected.length} icon={<XCircle size={18} />} color="error" />
      </div>

      {/* Pending Approvals */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Pending Score Revisions</h3>
          <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/appeals')}>All appeals</Button>
        </div>
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
                {/* Each skill's approve/reject decision is made on the Re-evaluation
                    screen, which has the score detail this compact card doesn't. */}
                <Button variant="success" size="xs" icon={<CheckCircle size={12} />} onClick={() => navigate('/appeals')}>
                  Review &amp; Decide
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* All Appeals */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">All Appeals History</h3>
        <div className="space-y-3">
          {appealData.map(appeal => (
            <div key={appeal.id} className="flex items-center justify-between gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate font-mono">{appeal.id}</p>
                <p className="text-[10px] text-text-muted">Skills: {appeal.skillNames.join(', ')} · Application {appeal.applicationId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-text-muted">{appeal.payment?.currency || 'BTN'} {Number(appeal.payment?.amount || 0).toFixed(2)}</span>
                <StatusBadge status={appeal.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
