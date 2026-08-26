/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { Download, Eye, FileText, Lock, Clock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { questionService } from '@/services/questions';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const SKILL_COLORS = {
  WRITING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  READING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LISTENING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SPEAKING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const formatWindowTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

// BRD §5.4.2 BR-3: the Exam Head may access, view and download question papers only
// during the scheduled exam time set at upload. The server is the binding check (it
// rejects a download outside the window with 403 QUESTION_ACCESS_WINDOW_CLOSED) - this
// mirrors that window here so the controls reflect it before a click round-trips, and
// so a closed window reads as visibly disabled rather than a button that silently fails.
const getAccessWindow = paper => {
  if (!paper.accessAllowedFrom || !paper.accessAllowedUntil) return { locked: false };
  const now = new Date();
  const from = new Date(paper.accessAllowedFrom);
  const until = new Date(paper.accessAllowedUntil);
  if (now < from) return { locked: true, reason: `Opens ${formatWindowTime(paper.accessAllowedFrom) ?? 'soon'}` };
  if (now > until) return { locked: true, reason: `Closed ${formatWindowTime(paper.accessAllowedUntil) ?? ''}`.trim() };
  return { locked: false };
};

const saveBlob = (blob, filename, preview = false) => {
  const url = URL.createObjectURL(blob);
  if (preview) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export default function ExamDayDownloads() {
  const { data: papersData, loading } = useApi(questionService.getPapers);
  const papers = papersData || [];
  const [working, setWorking] = useState(null);

  const handleDocument = async (paper, preview = false) => {
    setWorking(`${preview ? 'preview' : 'download'}-${paper.id}`);
    try {
      const response = await questionService.downloadDocument(paper.id);
      saveBlob(response.data, paper.fileName, preview);
    } catch (error) {
      toast.error(error?.message || 'The document could not be opened');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Day Downloads"
        subtitle="View and download question papers during their scheduled exam window"
        breadcrumbs={[{ label: 'Exam Day Downloads' }]}
        icon={<Download size={18} />}
      />

      <Alert variant="warning" title="Time-Gated Access">
        Question papers can only be viewed or downloaded during the access window set when they were uploaded.
        Outside that window the controls are disabled here, and the server rejects the request even if it is
        made directly.
      </Alert>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {!papers.length && (
            <div className="py-16 text-center bg-surface-card border border-surface-border rounded-xl">
              <Download size={34} className="mx-auto mb-3 text-text-muted opacity-60" />
              <p className="text-sm font-semibold text-text-primary">No question papers assigned to you yet</p>
              <p className="text-xs text-text-muted mt-1">Papers you upload in Question Bank appear here once they exist.</p>
            </div>
          )}
          {papers.map(paper => {
            const accessWindow = getAccessWindow(paper);
            return (
              <div key={paper.id} className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-red-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-text-primary truncate">{paper.title}</p>
                    {paper.isEncrypted && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                        <Lock size={9} /> Encrypted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] ${SKILL_COLORS[paper.skill] || SKILL_COLORS.WRITING}`}>{paper.skillLabel}</span>
                    <span>{paper.fileSize}</span>
                    <span>
                      Window {formatWindowTime(paper.accessAllowedFrom) ?? '—'} – {formatWindowTime(paper.accessAllowedUntil) ?? '—'}
                    </span>
                    {paper.hasAnswerSheet && <span className="text-emerald-400">+ Answer Sheet</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={paper.status} />
                  {accessWindow.locked ? (
                    <span
                      title={`Question papers can only be opened during their scheduled access window. ${accessWindow.reason}.`}
                      className="inline-flex items-center gap-1 text-[10px] text-text-muted px-2 py-1 rounded-md border border-surface-border"
                    >
                      <Clock size={11} /> {accessWindow.reason}
                    </span>
                  ) : (
                    <>
                      <Button variant="ghost" size="xs" loading={working === `preview-${paper.id}`} icon={<Eye size={12} />} onClick={() => handleDocument(paper, true)}>View</Button>
                      <Button variant="ghost" size="xs" loading={working === `download-${paper.id}`} icon={<Download size={12} />} onClick={() => handleDocument(paper)}>Download</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
