/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, Lock, ShieldAlert, FileText, Circle, LibraryBig, Trash2, Info } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { examService } from '@/services/exams';
import { questionService } from '@/services/questions';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const SKILLS = ['Writing', 'Reading', 'Listening', 'Speaking'];
const SKILL_COLORS = {
  WRITING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  READING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LISTENING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SPEAKING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const EMPTY_FORM = { examId: '', skill: '', title: '', accessAllowedFrom: '', accessAllowedUntil: '' };

export default function UploadQuestionPaper() {
  const { data: examWindowsData, loading: loadingExams } = useApi(examService.getAll);
  const examWindows = examWindowsData || [];
  const { data: papersData, loading: loadingPapers, setData: setPapers } = useApi(questionService.getPapers);
  const papers = papersData || [];

  const [files, setFiles] = useState({ paper: null, answerSheet: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [working, setWorking] = useState(null);
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
    const file = e.dataTransfer.files[0];
    handleFile(field, file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // BRD §5.4.2 BR-1: the question paper and the answer sheet are uploaded as two
    // separate documents, both required - a paper with only one is not complete.
    // The backend rejects a submission missing either file; this check just gives
    // the examiner the reason before the round trip.
    if (!files.paper) { toast.error('Please attach the question paper'); return; }
    if (!files.answerSheet) { toast.error('Please attach the answer sheet'); return; }
    if (!form.examId || !form.skill || !form.title || !form.accessAllowedFrom || !form.accessAllowedUntil) { toast.error('Please fill all required fields'); return; }
    if (new Date(form.accessAllowedUntil) <= new Date(form.accessAllowedFrom)) { toast.error('Access end must be after access start'); return; }

    setIsSubmitting(true);
    try {
      const uploaded = await questionService.uploadPaper({
        ...form,
        paperFile: files.paper,
        answerSheetFile: files.answerSheet,
      });
      const paper = uploaded?.data ?? uploaded;
      setPapers(current => [paper, ...(current || [])]);
      toast.success('Question paper uploaded and encrypted successfully!');
      setForm(EMPTY_FORM);
      setFiles({ paper: null, answerSheet: null });
    } catch (error) {
      toast.error(error?.message || 'Failed to upload question paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await questionService.deletePaper(deleting.id);
      setPapers(prev => (prev || []).filter(p => p.id !== deleting.id));
      toast.success('Question paper removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove question paper');
    } finally {
      setDeleting(null);
    }
  };

  // BRD §5.4.2 BR-4 describes sample papers as an automatic transition once results
  // are declared for an exam - not an Exam Head action. There is currently no
  // automatic trigger anywhere in the system; the only way a Ready paper ever
  // becomes a released sample is this manual publish call. It is kept here (rather
  // than removed and leaving papers stuck Ready forever) but is a deliberate
  // addition beyond what the BRD describes, pending DCDD confirming whether the
  // Exam Head should hold a manual override or whether an automatic trigger should
  // be built instead.
  const handlePublishSample = async paper => {
    setWorking(`publish-${paper.id}`);
    try {
      const updated = await questionService.publishSample(paper.id);
      const published = updated?.data ?? updated;
      setPapers(current => (current || []).map(item => item.id === paper.id ? published : item));
      toast.success('Question paper published to Released Sample Papers');
    } catch (error) {
      toast.error(error?.message || 'Sample paper could not be published');
    } finally {
      setWorking(null);
    }
  };

  const selectedExam = examWindows.find(item => item.id === form.examId);

  const formatDateTime = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const SummaryRow = ({ label, value, muted }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-surface-border last:border-0">
      <span className="text-xs text-text-muted shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${muted ? 'text-text-muted' : 'text-text-primary'}`}>{value}</span>
    </div>
  );

  const FileStatusRow = ({ label, file }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-surface-border last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      {file ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle size={12} /> Attached</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
          <Circle size={8} className="fill-current" /> Required
        </span>
      )}
    </div>
  );

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
          <div className="w-10 h-10 bg-[var(--color-surface-border)] rounded-xl flex items-center justify-center mx-auto mb-2">
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
        title="Question Bank"
        subtitle="Upload offline-prepared question papers and answer sheets, and manage what you've uploaded"
        breadcrumbs={[{ label: 'Question Bank' }]}
        icon={<Upload size={18} />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-5 bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Document Title"
                placeholder="e.g. DSTS Writing Test — July 2026"
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <Select
              label="Examination Window"
              required
              value={form.examId}
              onChange={e => {
                const examId = e.target.value;
                const exam = examWindows.find(item => item.id === examId);
                const examDate = exam?.examDate ? new Date(exam.examDate) : null;
                const toLocal = date => date && !Number.isNaN(date.getTime())
                  ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                  : '';
                const start = examDate ? new Date(examDate) : null;
                if (start) start.setHours(8, 0, 0, 0);
                const end = start ? new Date(start.getTime() + 10 * 60 * 60 * 1000) : null;
                setForm(p => ({ ...p, examId, accessAllowedFrom: toLocal(start), accessAllowedUntil: toLocal(end) }));
              }}
              disabled={loadingExams}
            >
              <option value="">{loadingExams ? 'Loading exams...' : 'Select exam window'}</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Secure Access Opens"
              required
              value={form.accessAllowedFrom}
              onChange={e => setForm(p => ({ ...p, accessAllowedFrom: e.target.value }))}
              hint="Exam Day Downloads unlocks from this time."
            />
            <Input
              type="datetime-local"
              label="Secure Access Closes"
              required
              value={form.accessAllowedUntil}
              min={form.accessAllowedFrom || undefined}
              onChange={e => setForm(p => ({ ...p, accessAllowedUntil: e.target.value }))}
              hint="Downloads are blocked after this time."
            />
          </div>

          <div className="space-y-3">
            <DropZone field="paper" label="Question Paper (required)" fileRef={paperRef} />
            <DropZone field="answerSheet" label="Answer Sheet (required)" fileRef={answerRef} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-surface-border">
            <Button type="submit" loading={isSubmitting} icon={<Upload size={13} />}>
              Upload & Encrypt
            </Button>
          </div>
        </form>

        <div className="space-y-5">
          <Alert variant="warning" title="Classified Upload">
            Both files are encrypted the moment you submit - before either one is written to storage - not
            afterward. Access is strictly controlled and every upload is logged for audit purposes.
          </Alert>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-brand-gold" />
              <h3 className="text-sm font-semibold text-text-primary">Upload Summary</h3>
            </div>
            <p className="text-xs text-text-muted mb-1">Review before you submit. Both documents are required.</p>
            <div className="mt-2">
              <SummaryRow label="Title" value={form.title || 'Not set'} muted={!form.title} />
              <SummaryRow label="Exam Window" value={selectedExam?.title || 'Not selected'} muted={!selectedExam} />
              <SummaryRow label="Skill Area" value={form.skill || 'Not selected'} muted={!form.skill} />
              <SummaryRow label="Access Opens" value={formatDateTime(form.accessAllowedFrom)} muted={!form.accessAllowedFrom} />
              <SummaryRow label="Access Closes" value={formatDateTime(form.accessAllowedUntil)} muted={!form.accessAllowedUntil} />
              <FileStatusRow label="Question Paper" file={files.paper} />
              <FileStatusRow label="Answer Sheet" file={files.answerSheet} />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-text-primary">Encryption Notice</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Files are encrypted with AES-256 on submission and stored only in that form. Only you can open
              them, and only during the exam's scheduled access window on Exam Day Downloads.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
              <Lock size={12} className="text-amber-400 shrink-0" />
              Uploads are logged for audit purposes.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">Your Uploaded Papers</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Papers you've uploaded, across every exam you're assigned to. View and download during the exam
          window live on Exam Day Downloads.
        </p>

        {loadingPapers ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : !papers.length ? (
          <div className="py-10 text-center text-text-muted">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No papers uploaded yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map(paper => (
              <div key={paper.id} className="flex items-center gap-3 p-3 bg-surface-bg rounded-xl border border-surface-border">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">{paper.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${SKILL_COLORS[paper.skill] || SKILL_COLORS.WRITING}`}>{paper.skillLabel}</span>
                    <span className="text-[10px] text-text-muted">{paper.fileSize}</span>
                    {paper.hasAnswerSheet
                      ? <span className="text-[10px] text-emerald-400">+ Answer Sheet</span>
                      : <span className="text-[10px] text-amber-400">Missing answer sheet</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {paper.isEncrypted && <Lock size={11} className="text-amber-400" />}
                  <StatusBadge status={paper.status} />
                  {paper.status === 'READY' && (
                    <Button
                      variant="outline"
                      size="xs"
                      title="Beyond BRD spec: §5.4.2 BR-4 describes this transition as automatic on results declaration. No automatic trigger exists yet, so this manual override stands in for it."
                      loading={working === `publish-${paper.id}`}
                      icon={<LibraryBig size={12} />}
                      onClick={() => handlePublishSample(paper)}
                    >
                      Publish Sample
                    </Button>
                  )}
                  <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleting(paper)} className="text-red-400 hover:text-red-300" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-[11px] text-text-muted bg-surface-bg border border-surface-border rounded-lg p-3">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            "Publish Sample" is only offered while a paper is Ready and only once results have been declared for
            its exam - the server blocks it otherwise. The BRD describes this transition as automatic; this
            manual control exists because no automatic trigger has been built yet.
          </span>
        </div>
      </div>

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
