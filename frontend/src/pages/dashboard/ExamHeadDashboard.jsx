/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, FileText, Lock, ArrowRight, FileSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { questionService } from '../../services/questions';
import { scoreService } from '../../services/scores';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';

export default function ExamHeadDashboard() {
  const { user } = useAuth();
  const { data: questionPapers, loading: loadingQP } = useApi(questionService.getAll);
  const { data: bandScores, loading: loadingScores } = useApi(scoreService.getAll);

  const isLoading = loadingQP || loadingScores;

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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-[#1B2A4A] to-[#2A1B3A] border border-brand-gold/20 rounded-2xl p-6"
      >
        <div className="relative">
          <p className="text-xs text-brand-gold font-medium uppercase tracking-wider mb-1">Chief of Examination</p>
          <h1 className="text-xl font-bold text-white mb-1">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">Manage question papers and oversee examination documents securely.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Question Papers" value={questionPapers?.length ?? 0} icon={<BookOpen size={18} />} color="gold" />
        <StatCard title="Encrypted Files" value={questionPapers?.filter(q => q.isEncrypted).length ?? 0} icon={<Lock size={18} />} color="warning" />
        <StatCard title="Published" value={questionPapers?.filter(q => q.status === 'published').length ?? 0} icon={<FileText size={18} />} color="success" />
        <StatCard title="Total Scores" value={bandScores?.length ?? 0} icon={<FileSearch size={18} />} color="info" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Upload area */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Upload</h3>
          <div className="border-2 border-dashed border-surface-border rounded-xl p-8 text-center hover:border-brand-gold/40 transition-colors">
            <Upload size={28} className="mx-auto mb-3 text-text-muted" />
            <p className="text-sm font-medium text-text-primary mb-1">Upload Question Paper</p>
            <p className="text-xs text-text-muted mb-3">PDF files only · Max 50MB · Encrypted at rest</p>
            <Link to="/questions/upload">
              <Button variant="primary" size="sm" icon={<Upload size={13} />}>Upload Paper</Button>
            </Link>
          </div>
        </div>

        {/* Recent uploads */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Uploads</h3>
            <Link to="/questions" className="text-xs text-brand-gold hover:text-[#FCD34D] flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            {(questionPapers || []).map(qp => (
              <div key={qp.id} className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">{qp.title}</p>
                  <p className="text-[10px] text-text-muted">{qp.fileSize} · {qp.skill}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {qp.isEncrypted && <Lock size={11} className="text-amber-400" />}
                  <StatusBadge status={qp.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
