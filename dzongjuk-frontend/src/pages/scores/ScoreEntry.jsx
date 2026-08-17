import { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, ClipboardList, Save } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { Select } from '../../components/ui/Input';
import { examService } from '../../services/exams';
import { scoreService } from '../../services/scores';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

const SKILLS = ['writing', 'reading', 'listening', 'speaking'];
const SKILL_LABELS = { writing: 'Writing', reading: 'Reading', listening: 'Listening', speaking: 'Speaking' };
const SCORES = Array.from({ length: 19 }, (_, index) => (index * 0.5 + 1).toFixed(1));
const columnHelper = createColumnHelper();

export default function ScoreEntry() {
  const { data: exams, loading: loadingExams } = useApi(examService.getAll);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [committee, setCommittee] = useState(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [scoring, setScoring] = useState(null);
  const [scores, setScores] = useState({ writing: '', reading: '', listening: '', speaking: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedExamId && exams?.length) setSelectedExamId(exams[0].id);
  }, [exams, selectedExamId]);

  useEffect(() => {
    if (!selectedExamId) return;
    let active = true;
    setLoadingWorkflow(true);
    Promise.all([scoreService.getCandidates(selectedExamId), scoreService.getCommittee(selectedExamId)])
      .then(([candidateResponse, committeeResponse]) => {
        if (!active) return;
        setCandidates(candidateResponse.data || []);
        setCommittee(committeeResponse.data || null);
      })
      .catch(error => {
        if (!active) return;
        setCandidates([]);
        setCommittee(null);
        toast.error(error?.message || 'Unable to load the scoring workflow');
      })
      .finally(() => { if (active) setLoadingWorkflow(false); });
    return () => { active = false; };
  }, [selectedExamId]);

  const selectedExam = (exams || []).find(exam => exam.id === selectedExamId);
  const committeeMembers = committee?.members || [];

  const handleSubmit = async () => {
    if (Object.values(scores).some(value => !value)) {
      toast.error('Please enter scores for all four skills');
      return;
    }
    setSubmitting(true);
    try {
      const values = Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Number(value)]));
      const response = await scoreService.submit(selectedExamId, [{ applicationId: scoring.applicationId, ...values }]);
      const submittedScore = response.data?.[0];
      setCandidates(current => current.map(candidate => candidate.applicationId === scoring.applicationId
        ? { ...candidate, scoreStatus: String(submittedScore?.status || 'SUBMITTED').toLowerCase(), scoreSheet: submittedScore }
        : candidate));
      toast.success(`Scores submitted for ${scoring.testTakerName}`);
      setScoring(null);
      setScores({ writing: '', reading: '', listening: '', speaking: '' });
    } catch (error) {
      toast.error(error?.message || 'Unable to submit scores');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    columnHelper.accessor('applicationId', { header: 'Application ID', cell: info => <span className="font-mono text-xs text-brand-gold">{info.getValue().slice(0, 12)}</span> }),
    columnHelper.accessor('testTakerName', { header: 'Test Taker' }),
    columnHelper.accessor('cid', { header: 'Identity', cell: info => <span className="font-mono text-xs text-text-muted">{String(info.getValue()).slice(0, 16)}</span> }),
    columnHelper.accessor('status', { header: 'Eligibility', cell: info => <span className="text-xs text-emerald-400 capitalize">{info.getValue()}</span> }),
    columnHelper.accessor('scoreStatus', {
      header: 'Score Entry',
      cell: info => ['submitted', 'published', 'revised'].includes(info.getValue())
        ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> {info.getValue()}</span>
        : <span className="text-xs text-amber-400">Pending</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const submitted = ['submitted', 'published', 'revised'].includes(row.original.scoreStatus);
        return <Button size="xs" disabled={submitted || row.original.status !== 'eligible'} icon={<ClipboardList size={12} />} onClick={() => setScoring(row.original)}>{submitted ? 'Submitted' : 'Enter Scores'}</Button>;
      },
    }),
  ];

  const average = Object.values(scores).every(Boolean)
    ? (Object.values(scores).reduce((sum, value) => sum + Number(value), 0) / 4).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Band Score Entry" subtitle="Enter examination band scores for eligible test takers" breadcrumbs={[{ label: 'Scores' }, { label: 'Score Entry' }]} icon={<ClipboardList size={18} />} />
      <Alert variant="info" title="Committee Head Access Only">Only the designated Committee Head can enter and submit band scores. Committee members have view-only access.</Alert>

      <div className="max-w-md">
        <Select label="Examination Window" value={selectedExamId} onChange={event => setSelectedExamId(event.target.value)} disabled={loadingExams}>
          <option value="">Select examination</option>
          {(exams || []).map(exam => <option key={exam.id} value={exam.id}>{exam.title} · {exam.code}</option>)}
        </Select>
      </div>

      {loadingExams || loadingWorkflow ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="bg-surface-card border border-surface-border rounded-xl p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">{selectedExam?.title || 'Exam Committee'}</p>
            <div className="flex flex-wrap gap-2">
              {committeeMembers.map(member => (
                <div key={member.id} className={`px-3 py-1.5 rounded-full border text-xs ${member.isHead ? 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold' : 'bg-surface-bg border-surface-border text-text-secondary'}`}>
                  {member.name || `User ${member.userId.slice(0, 8)}`} {member.isHead && '(Head)'}
                </div>
              ))}
              {!committeeMembers.length && <p className="text-xs text-amber-400">No committee has been configured for this examination.</p>}
            </div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-xl p-5">
            <DataTable data={candidates} columns={columns} searchPlaceholder="Search eligible candidates..." />
          </div>
        </>
      )}

      <Modal isOpen={!!scoring} onClose={() => setScoring(null)} title={`Enter Band Scores — ${scoring?.testTakerName}`} size="md" footer={<><Button variant="ghost" onClick={() => setScoring(null)}>Cancel</Button><Button onClick={handleSubmit} loading={submitting} icon={<Save size={13} />}>Submit Scores</Button></>}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-bg rounded-xl border border-surface-border text-xs"><p className="text-text-muted">Application ID</p><p className="font-mono text-brand-gold">{scoring?.applicationId}</p></div>
          <p className="text-xs text-text-muted">Enter scores from 1.0 to 9.0 in increments of 0.5 for each skill:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SKILLS.map(skill => <div key={skill}><label className="text-sm font-medium text-text-secondary block mb-1.5">{SKILL_LABELS[skill]}</label><select value={scores[skill]} onChange={event => setScores(current => ({ ...current, [skill]: event.target.value }))} className="w-full h-9 px-3 rounded-lg bg-surface-bg border border-surface-border text-text-primary text-sm"><option value="">Select score</option>{SCORES.map(score => <option key={score} value={score}>{score}</option>)}</select></div>)}
          </div>
          {average && <div className="p-3 bg-[#F59E0B]/5 border border-brand-gold/20 rounded-xl flex justify-between"><span className="text-sm text-text-secondary">Overall Average</span><span className="text-xl font-bold text-brand-gold">{average}</span></div>}
        </div>
      </Modal>
    </div>
  );
}
