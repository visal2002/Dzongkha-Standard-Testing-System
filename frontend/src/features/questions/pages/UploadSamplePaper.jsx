/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, FileText, LibraryBig, BookOpen, Info, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { examService } from '@/features/exams/api';
import { questionService } from '@/features/questions/api';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const SKILLS = ['Writing', 'Reading', 'Listening', 'Speaking'];
const SKILL_COLORS = {
  WRITING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  READING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LISTENING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SPEAKING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const EMPTY_FORM = { examId: '', skill: '', title: '' };

export default function UploadSamplePaper() {
  const { data: examWindowsData, loading: loadingExams } = useApi(examService.getAll);
  const examWindows = examWindowsData || [];
  // Show only already-published sample papers in the management list
  const { data: papersData, loading: loadingPapers, setData: setPapers } = useApi(questionService.getSamples);
  const papers = papersData || [];

  const [files, setFiles] = useState({ paper: null, answerSheet: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const paperRef = useRef(null);
  const answerRef = useRef(null);

  const handleFile = (field, file) => {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setFiles(prev => ({ ...prev, [field]: file }));
    } else {
      toast.error('Only PDF files are accepted');
    }
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    setDragging(null);
    handleFile(field, e.dataTransfer.files[0]);
  };

  /**
   * Upload the paper to the Question Bank and immediately publish it as a sample.
   * The access window is set to a 1-hour window that is already open so the download
   * endpoint does not reject it; the binding public access gate is status=SAMPLE_PUBLISHED,
   * not the window, on the /sample-papers route.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.paper) { toast.error('Please attach the question paper'); return; }
    if (!files.answerSheet) { toast.error('Please attach the answer sheet'); return; }
    if (!form.examId || !form.skill || !form.title) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: upload to question bank (requires an access window – use a short open window)
      const now = new Date();
      const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hr ago (open)
      const windowEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

      const uploaded = await questionService.uploadPaper({
        ...form,
        accessAllowedFrom: windowStart.toISOString(),
        accessAllowedUntil: windowEnd.toISOString(),
        paperFile: files.paper,
        answerSheetFile: files.answerSheet,
      });
      const paper = uploaded?.data ?? uploaded;

      // Step 2: immediately publish as sample
      try {
        const published = await questionService.publishSample(paper.id);
        const publishedPaper = published?.data ?? published;
        if (publishedPaper) {
          setPapers(current => [publishedPaper, ...(current || [])]);
        }
      } catch {
        // If publishSample fails (e.g. results not declared), the paper still uploaded
        // to the question bank. Inform the user but don't treat it as a full failure.
        toast('Paper uploaded to Question Bank but could not be published as a sample automatically. Use the Question Bank to publish it once results are declared.', { icon: '⚠️' });
        setForm(EMPTY_FORM);
        setFiles({ paper: null, answerSheet: null });
        setIsSubmitting(false);
        return;
      }

      toast.success('Sample paper uploaded and published successfully!');
      setForm(EMPTY_FORM);
      setFiles({ paper: null, answerSheet: null });
    } catch (error) {
      toast.error(error?.message || 'Failed to upload sample paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DropZone = ({ field, label, fileRef }) => (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(field); }}
      onDragLeave={() => setDragging(null)}
      onDrop={e => handleDrop(e, field)}
      onClick={() => fileRef.current?.click()}
      className={[
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
        dragging === field ? 'border-brand-gold bg-[#F59E0B]/5' : 'border-surface-border hover:border-brand-gold/40 hover:bg-surface-bg',
        files[field] ? 'border-emerald-500/40 bg-emerald-500/5' : '',
      ].join(' ')}
    >
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(field, e.target.files[0])} />
      {files[field] ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center"><CheckCircle size={18} className="text-emerald-400" /></div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-primary truncate max-w-48">{files[field].name}</p>
            <p className="text-xs text-emerald-400">{(files[field].size / 1024 / 1024).toFixed(1)} MB · PDF</p>
          </div>
          <button onClick={e => { e.stopPropagation(); setFiles(prev => ({ ...prev, [field]: null })); }} className="p-1 hover:bg-surface-border rounded transition-colors">
            <X size={14} className="text-text-muted" />
          </button>
        </div>
      ) : (
        <div>
          <div className="w-10 h-10 bg-surface-border rounded-xl flex items-center justify-center mx-auto mb-2">
            <Upload size={18} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-0.5">{label}</p>
          <p className="text-xs text-text-muted">Drag & drop or click to browse · PDF only · Max 50MB</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Paper Management"
        subtitle="Upload and manage practice question papers for candidates"
        breadcrumbs={[{ label: 'Sample Papers', href: '/questions/samples' }, { label: 'Manage' }]}
        icon={<LibraryBig size={18} />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-5 bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Paper Title"
                placeholder="e.g. DSTS Writing Practice Paper — Series 1"
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <Select
              label="Examination Series"
              required
              value={form.examId}
              onChange={e => setForm(p => ({ ...p, examId: e.target.value }))}
              disabled={loadingExams}
            >
              <option value="">{loadingExams ? 'Loading...' : 'Select exam series'}</option>
              {examWindows.map(ew => <option key={ew.id} value={ew.id}>{ew.title}</option>)}
            </Select>
            <Select
              label="Skill Area"
              required
              value={form.skill}
              onChange={e => setForm(p => ({ ...p, skill: e.target.value }))}
            >
              <option value="">Select skill</option>
              {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <div className="space-y-3">
            <DropZone field="paper" label="Question Paper (required)" fileRef={paperRef} />
            <DropZone field="answerSheet" label="Answer Sheet (required)" fileRef={answerRef} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-surface-border">
            <Button type="submit" loading={isSubmitting} icon={<LibraryBig size={13} />}>
              Upload &amp; Publish Sample
            </Button>
          </div>
        </form>

        <div className="space-y-5">
          <Alert variant="info" title="Sample Papers">
            Sample papers are publicly accessible to all registered candidates for practice. They do not carry the same exam-day access-window restriction as Question Bank papers.
          </Alert>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-brand-gold" />
              <h3 className="text-sm font-semibold text-text-primary">Upload Flow</h3>
            </div>
            <ol className="space-y-1.5 text-xs text-text-muted list-none">
              {[
                'Paper is uploaded to the secure Question Bank.',
                'It is immediately published as a public sample.',
                'Candidates can preview and download from Sample Papers.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-brand-gold/10 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Published samples list */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Published Sample Papers</h3>
        <p className="text-xs text-text-muted mb-4">All publicly available sample papers. These are accessible to candidates without login.</p>

        {loadingPapers ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : !papers.length ? (
          <div className="py-10 text-center text-text-muted">
            <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sample papers published yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map(paper => (
              <div key={paper.id} className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">{paper.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${SKILL_COLORS[paper.skill] || SKILL_COLORS.WRITING}`}>{paper.skillLabel || paper.skill}</span>
                    <span className="text-[10px] text-text-muted">{paper.fileSize}</span>
                    {paper.hasAnswerSheet && <span className="text-[10px] text-emerald-400">+ Answer Sheet</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={paper.status} />
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Trash2 size={12} />}
                    onClick={() => setDeleting(paper)}
                    className="text-red-400 hover:text-red-300"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await questionService.deletePaper(deleting.id);
            setPapers(prev => (prev || []).filter(p => p.id !== deleting.id));
            toast.success('Sample paper removed');
          } catch {
            toast.error('Failed to remove sample paper');
          } finally {
            setDeleting(null);
          }
        }}
        title="Remove Sample Paper"
        message={`Are you sure you want to remove "${deleting?.title}" from public sample papers? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
