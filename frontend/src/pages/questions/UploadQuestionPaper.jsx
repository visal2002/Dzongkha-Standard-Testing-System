/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, Lock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { examService } from '@/services/exams';
import { questionService } from '@/services/questions';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const SKILLS = ['Writing', 'Reading', 'Listening', 'Speaking'];

export default function UploadQuestionPaper() {
  const { data: examWindowsData, loading: loadingExams } = useApi(examService.getAll);
  const examWindows = examWindowsData || [];

  const [files, setFiles] = useState({ paper: null, answerSheet: null });
  const [form, setForm] = useState({ examId: '', skill: '', title: '', accessAllowedFrom: '', accessAllowedUntil: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragging, setDragging] = useState(null);
  const paperRef = useRef(null);
  const answerRef = useRef(null);
  const navigate = useNavigate();

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
    if (!files.paper) { toast.error('Please upload a question paper'); return; }
    if (!form.examId || !form.skill || !form.title || !form.accessAllowedFrom || !form.accessAllowedUntil) { toast.error('Please fill all required fields'); return; }
    if (new Date(form.accessAllowedUntil) <= new Date(form.accessAllowedFrom)) { toast.error('Access end must be after access start'); return; }
    
    setIsSubmitting(true);
    try {
      await questionService.uploadPaper({
        ...form,
        paperFile: files.paper,
        answerSheetFile: files.answerSheet
      });
      toast.success('Question paper uploaded and encrypted successfully!');
      navigate('/questions');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload question paper');
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
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Upload Question Paper"
        subtitle="Upload and encrypt examination question papers and answer sheets"
        breadcrumbs={[{ label: 'Question Papers', href: '/questions' }, { label: 'Upload' }]}
        icon={<Upload size={18} />}
      />

      <Alert variant="warning" title="Classified Upload">
        Question papers are automatically encrypted upon upload. Access is strictly controlled and logged for audit purposes.
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface-card border border-surface-border rounded-2xl p-6">
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
            hint="Authorised examiners can download from this time."
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
          <DropZone field="answerSheet" label="Answer Sheet (optional)" fileRef={answerRef} />
        </div>

        <div className="p-3 bg-surface-bg rounded-xl border border-surface-border flex items-start gap-2">
          <Lock size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-text-muted">
            <p className="font-medium text-amber-400">Encryption Notice</p>
            <p>Files will be encrypted with AES-256 before storage. Only you can access them during the examination window. After results are declared, papers will be published in Sample Papers.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={() => navigate('/questions')}>Cancel</Button>
          <Button type="submit" loading={isSubmitting} icon={<Upload size={13} />}>
            Upload & Encrypt
          </Button>
        </div>
      </form>
    </div>
  );
}
