/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Scale, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { appealService } from '@/services/appeals';
import { useApi } from '@/hooks/useApi';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ChiefDashboard() {
  const { user } = useAuth();
  const { data: appealsData, loading, setData: setAppealData } = useApi(appealService.getAll);
  const appealData = appealsData || [];
  const pending = appealData.filter(a => a.status === 'pending_chief_approval');
  const approved = appealData.filter(a => a.chiefApproval === 'approved');

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



  const handleDecision = (id, decision) => {
    setAppealData(prev => prev.map(a =>
      a.id === id
        ? { ...a, chiefApproval: decision, status: decision === 'approved' ? 'approved' : 'rejected' }
        : a
    ));
    toast.success(`Score revision ${decision === 'approved' ? 'approved' : 'rejected'} successfully`);
  };

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
        <StatCard title="Rejected" value={appealData.filter(a => a.chiefApproval === 'rejected').length} icon={<XCircle size={18} />} color="error" />
      </div>

      {/* Pending Approvals */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Pending Score Revisions</h3>
          <Link to="/appeals" className="text-xs text-brand-gold hover:text-[#FCD34D] flex items-center gap-1">All appeals <ArrowRight size={12} /></Link>
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
                  <p className="text-sm font-semibold text-text-primary">{appeal.testTakerName}</p>
                  <p className="text-xs text-text-muted">{appeal.registrationNumber} · Appeal {appeal.id}</p>
                </div>
                <StatusBadge status={appeal.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
                <span>Skills: {appeal.skills.join(', ')}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleDecision(appeal.id, 'approved')}>
                  <CheckCircle size={13} /> Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDecision(appeal.id, 'rejected')}>
                  <XCircle size={13} /> Reject
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
                <p className="text-xs font-medium text-text-primary truncate">{appeal.testTakerName}</p>
                <p className="text-[10px] text-text-muted">Skills: {appeal.skills.join(', ')} · {appeal.id}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-text-muted">Nu. {appeal.paymentAmount}</span>
                <StatusBadge status={appeal.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
