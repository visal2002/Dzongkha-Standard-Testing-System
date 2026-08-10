import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock, FileText, Download, Eye, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { questionPapers } from '../../data/mockData';
import toast from 'react-hot-toast';

const SKILL_COLORS = {
  Writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Reading: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Listening: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Speaking: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function QuestionPapers() {
  const { user } = useAuth();
  const [papers, setPapers] = useState(questionPapers);
  const [deleting, setDeleting] = useState(null);
  const isExamHead = user?.role === 'exam_head' || user?.role === 'admin';

  const handleDelete = () => {
    setPapers(prev => prev.filter(p => p.id !== deleting.id));
    toast.success('Question paper removed');
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Papers"
        subtitle="Encrypted examination papers and answer sheets"
        breadcrumbs={[{ label: 'Question Papers' }]}
        icon={<BookOpen size={18} />}
        action={isExamHead && (
          <Link to="/questions/upload">
            <Button icon={<Upload size={14} />}>Upload Paper</Button>
          </Link>
        )}
      />

      <Alert variant="warning" title="Classified Documents">
        Question papers are encrypted at rest. Access is restricted to the Chief of Examination during the examination period only.
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Writing', 'Reading', 'Listening', 'Speaking'].map(skill => {
          const count = papers.filter(p => p.skill === skill).length;
          return (
            <div key={skill} className={`p-3 rounded-xl border ${SKILL_COLORS[skill]}`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs opacity-80">{skill}</p>
            </div>
          );
        })}
      </div>

      {/* Papers list */}
      <div className="grid gap-3">
        {papers.map(paper => (
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
                <span className={`px-2 py-0.5 rounded-full border text-[10px] ${SKILL_COLORS[paper.skill]}`}>{paper.skill}</span>
                <span>{paper.fileSize}</span>
                <span>By {paper.uploadedByName}</span>
                <span>{new Date(paper.uploadedAt).toLocaleDateString()}</span>
                {paper.hasAnswerSheet && <span className="text-emerald-400">+ Answer Sheet</span>}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={paper.status} />
              {isExamHead && (
                <>
                  <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => toast.success('Opening document...')}>View</Button>
                  <Button variant="ghost" size="xs" icon={<Download size={12} />} onClick={() => toast.success('Downloading...')}>Download</Button>
                  <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleting(paper)} className="text-red-400 hover:text-red-300" />
                </>
              )}
            </div>
          </div>
        ))}
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
