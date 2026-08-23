/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { BookOpen, Download, Eye, FileText } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { questionService } from '../../services/questions';
import toast from 'react-hot-toast';

const SKILL_COLORS = {
  Writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Reading: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Listening: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Speaking: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  WRITING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  READING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LISTENING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SPEAKING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export default function SamplePapers() {
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    questionService.getSamples()
      .then((response) => {
        if (!active) return;
        setPublished(response.data.map((paper) => {
          const documents = Array.isArray(paper.documents) ? paper.documents : [];
          const questionDocument = documents.find(document => document.type === 'QUESTION_PAPER');
          return {
            ...paper,
            fileSize: questionDocument ? formatBytes(questionDocument.sizeBytes) : (paper.fileSize ?? '—'),
            hasAnswerSheet: documents.length > 0
              ? documents.some(document => document.type === 'ANSWER_SHEET')
              : (paper.hasAnswerSheet ?? false),
            uploadedAt: paper.createdAt || paper.uploadedAt,
          };
        }));
      })
      .catch((error) => toast.error(error.message || 'Unable to load sample papers.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openSample = async (paper, type = 'question', download = false) => {
    const previewWindow = download ? null : window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    try {
      const response = await questionService.downloadSample(paper.id, type);
      const url = URL.createObjectURL(response.data);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${paper.id}-${type}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Sample paper downloaded.');
      } else if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        throw new Error('The preview popup was blocked. Allow popups and try again.');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      toast.error(error.message || 'Unable to open sample paper.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Question Papers"
        subtitle="Past examination papers available for candidate practice"
        breadcrumbs={[{ label: 'Question Papers', href: '/questions' }, { label: 'Sample Papers' }]}
        icon={<BookOpen size={18} />}
      />

      <div className="p-4 bg-[#D4830A]/5 border border-brand-gold/20 rounded-xl text-sm text-text-secondary">
        <p className="font-medium text-brand-gold mb-1">Study Resource</p>
        <p>These are past examination papers made available after results were declared. Use them to understand the question format, difficulty level, and time requirements.</p>
      </div>

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
              <Button variant="ghost" size="sm" icon={<Eye size={13} />} onClick={() => openSample(paper)}>Preview</Button>
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => openSample(paper, 'question', true)}>Download</Button>
            </div>
          </div>
        ))}
      </div>

      {!loading && published.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No sample papers available yet</p>
          <p className="text-xs mt-1">Papers are published after examination results are declared.</p>
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-text-muted">Loading sample papers...</div>}
    </div>
  );
}
