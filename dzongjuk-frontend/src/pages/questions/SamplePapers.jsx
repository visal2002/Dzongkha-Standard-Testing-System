import { BookOpen, Download, Eye, FileText } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { questionService } from '../../services/questions';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const SKILL_COLORS = {
  Writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Reading: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Listening: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Speaking: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function SamplePapers() {
  const { data: papersData, loading } = useApi(questionService.getPapers);
  const published = (papersData || []).filter(q => q.status === 'published');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Question Papers"
        subtitle="Past examination papers available for candidate practice"
        breadcrumbs={[{ label: 'Question Papers', href: '/questions' }, { label: 'Sample Papers' }]}
        icon={<BookOpen size={18} />}
      />

      <div className="p-4 bg-[#F59E0B]/5 border border-brand-gold/20 rounded-xl text-sm text-text-secondary">
        <p className="font-medium text-brand-gold mb-1">Study Resource</p>
        <p>These are past examination papers made available after results were declared. Use them to understand the question format, difficulty level, and time requirements.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
      <div className="grid gap-3">
        {published.map(paper => (
          <div key={paper.id} className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-center gap-4 hover:border-brand-gold/20 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1 truncate">{paper.title}</p>
              <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] ${SKILL_COLORS[paper.skill]}`}>{paper.skill}</span>
                <span>{paper.fileSize}</span>
                {paper.hasAnswerSheet && <span className="text-teal-400">Includes Answer Sheet</span>}
                <span>Published {new Date(paper.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" icon={<Eye size={13} />} onClick={() => toast.success('Opening sample paper...')}>Preview</Button>
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => toast.success('Downloading...')}>Download</Button>
            </div>
          </div>
        ))}
      </div>
      )}

      {published.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No sample papers available yet</p>
          <p className="text-xs mt-1">Papers are published after examination results are declared.</p>
        </div>
      )}
    </div>
  );
}
