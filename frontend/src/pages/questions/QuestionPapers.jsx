/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock, FileText, Download, Eye, Upload, Trash2, LibraryBig, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { questionService } from '@/services/questions';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { canAccess } from '@/features/rbac/accessMatrix';

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
// mirrors that window in the list so the buttons reflect it before a click round-trips.
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

export default function QuestionPapers() {
  const { user } = useAuth();
  const { data: papersData, loading, setData: setPapers } = useApi(questionService.getPapers);
  const papers = papersData || [];
  
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(null);
  // Reaching this page at all already requires Question Upload `read`, enforced by
  // the route guard, so the listing itself needs no further check.
  const canManage = canAccess(user?.role, 'questions', 'manage');
  // Reading the repository is not the same as opening what is in it. Question Upload
  // "Read" shows the paper's metadata; only a role with Full access may open the
  // encrypted question paper or answer sheet, which the BRD reserves for the Exam
  // Head until the scheduled window. This hides the control - the binding check is
  // `question.secure.download` on the server.
  const canOpenDocument = canAccess(user?.role, 'questions', 'secure_read');

  const handleDelete = async () => {
    try {
      await questionService.deletePaper(deleting.id);
      setPapers(prev => prev.filter(p => p.id !== deleting.id));
      toast.success('Question paper removed');
    } catch (e) {
      toast.error('Failed to remove question paper');
    } finally {
      setDeleting(null);
    }
  };

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

  const handlePublishSample = async paper => {
    setWorking(`publish-${paper.id}`);
    try {
      const updated = await questionService.publishSample(paper.id);
      const published = updated?.data ?? updated;
      setPapers(current => current.map(item => item.id === paper.id ? published : item));
      toast.success('Question paper published to Sample Papers');
    } catch (error) {
      toast.error(error?.message || 'Sample paper could not be published');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Papers"
        subtitle="Encrypted examination papers and answer sheets"
        breadcrumbs={[{ label: 'Question Papers' }]}
        icon={<BookOpen size={18} />}
        action={canManage && (
          <Link to="/questions/upload">
            <Button icon={<Upload size={14} />}>Upload Paper</Button>
          </Link>
        )}
      />

      <Alert variant="warning" title="Classified Documents">
        Question papers are encrypted at rest. Access is restricted to the Exam Head during the examination period only.
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['WRITING', 'READING', 'LISTENING', 'SPEAKING'].map(skill => {
          const count = papers.filter(p => p.skill === skill).length;
          return (
            <div key={skill} className={`p-3 rounded-xl border ${SKILL_COLORS[skill]}`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs opacity-80">{`${skill.charAt(0)}${skill.slice(1).toLowerCase()}`}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
      <>
      {/* Papers list */}
      <div className="grid gap-3">
        {!papers.length && (
          <div className="py-16 text-center bg-surface-card border border-surface-border rounded-xl">
            <BookOpen size={34} className="mx-auto mb-3 text-text-muted opacity-60" />
            <p className="text-sm font-semibold text-text-primary">No question papers uploaded</p>
            <p className="text-xs text-text-muted mt-1">Upload the secured PDF documents for an examination window to begin.</p>
          </div>
        )}
        {papers.map(paper => {
          const accessWindow = canOpenDocument ? getAccessWindow(paper) : { locked: false };
          return (
          <div key={paper.id} className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-400" />
            </div>

            {/* Info */}
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
                <span>By {paper.uploadedByName}</span>
                <span>{new Date(paper.uploadedAt).toLocaleDateString()}</span>
                {paper.hasAnswerSheet && <span className="text-emerald-400">+ Answer Sheet</span>}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={paper.status} />
              {canOpenDocument && (
                accessWindow.locked ? (
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
                )
              )}
              {canManage && (
                <>
                  {paper.status === 'READY' && (
                    <Button
                      variant="outline"
                      size="xs"
                      loading={working === `publish-${paper.id}`}
                      icon={<LibraryBig size={12} />}
                      onClick={() => handlePublishSample(paper)}
                    >
                      Publish Sample
                    </Button>
                  )}
                  <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleting(paper)} className="text-red-400 hover:text-red-300" />
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>
      </>
      )}

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Question Paper"
        message={`Are you sure you want to delete "${deleting?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
