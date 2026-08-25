/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Scale } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { appealService } from '@/services/appeals';
import { scoreService } from '@/services/scores';
import toast from 'react-hot-toast';

const SKILLS = ['WRITING', 'READING', 'LISTENING', 'SPEAKING'];
const STEPS = ['Select Skills', 'Provide Reason', 'Review'];
const skillLabel = skill => skill[0] + skill.slice(1).toLowerCase();

export default function SubmitAppeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [results, setResults] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [reason, setReason] = useState('');
  const [feeRule, setFeeRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [resultResponse, feeResponse] = await Promise.all([
          scoreService.getMyScores(user?.id),
          appealService.getActiveFee(),
        ]);
        const published = (resultResponse.data || []).filter(result => result.score);
        if (!active) return;
        setResults(published);
        setSelectedApplicationId(published[0]?.applicationId || '');
        setFeeRule(feeResponse.data);
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load re-evaluation eligibility.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.id]);

  const selectedResult = results.find(result => result.applicationId === selectedApplicationId);
  const fee = selectedSkills.length * Number(feeRule?.amountPerSkill || 0);

  const toggleSkill = skill => {
    setSelectedSkills(previous => previous.includes(skill)
      ? previous.filter(value => value !== skill)
      : [...previous, skill]);
  };

  const handleSubmit = async () => {
    if (!selectedResult) return;
    setSubmitting(true);
    try {
      await appealService.submit({
        applicationId: selectedResult.applicationId,
        examId: selectedResult.examId,
        skills: selectedSkills,
        reason,
      });
      toast.success('Re-evaluation request submitted. Payment confirmation is pending.');
      navigate('/appeals');
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to submit the re-evaluation request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-text-muted">Loading published results and re-evaluation fee...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Submit Re-evaluation" subtitle="Request re-evaluation of published scores" icon={<Scale size={18} />} />
        <Alert variant="error" title="Re-evaluation unavailable">{error}</Alert>
      </div>
    );
  }

  if (!selectedResult) {
    return (
      <div className="space-y-6">
        <PageHeader title="Submit Re-evaluation" subtitle="Request re-evaluation of published scores" icon={<Scale size={18} />} />
        <Alert variant="warning" title="No Results Available">A published result is required before a re-evaluation request can be submitted.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Submit Re-evaluation"
        subtitle="Request re-evaluation of published DSTS scores"
        breadcrumbs={[{ label: 'Re-evaluation', href: '/appeals' }, { label: 'Submit New' }]}
        icon={<Scale size={18} />}
      />

      <Alert variant="info" title="Payment provider pending">
        Submission creates a payment-pending re-evaluation request. It reaches the Examination Committee only after the configured payment integration confirms the exact fee.
      </Alert>

      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index < step ? 'bg-emerald-500 text-white' : index === step ? 'bg-[#D4830A] text-white' : 'bg-[var(--color-surface-border)] text-text-muted'}`}>
              {index < step ? <CheckCircle size={14} /> : index + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${index === step ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
            {index < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${index < step ? 'bg-emerald-500' : 'bg-[var(--color-surface-border)]'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        {step === 0 && (
          <div className="space-y-5">
            <Select label="Published result" value={selectedApplicationId} onChange={event => { setSelectedApplicationId(event.target.value); setSelectedSkills([]); }}>
              {results.map(result => <option key={result.applicationId} value={result.applicationId}>{result.applicationId} / {result.examId}</option>)}
            </Select>
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Select Skills for Re-evaluation</h3>
              <p className="text-sm text-text-muted">Approved fee: {feeRule.currency} {Number(feeRule.amountPerSkill).toFixed(2)} per selected skill.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKILLS.map(skill => {
                const score = Number(selectedResult.score.scores[skill]);
                const selected = selectedSkills.includes(skill);
                return (
                  <button key={skill} onClick={() => toggleSkill(skill)} className={`p-4 rounded-xl border text-left transition-all ${selected ? 'bg-brand-gold/10 border-brand-gold/40' : 'bg-surface-bg border-surface-border hover:border-brand-gold/20'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-text-primary">{skillLabel(skill)}</p>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-brand-gold bg-[#D4830A]' : 'border-surface-border'}`}>
                        {selected && <CheckCircle size={12} className="text-white" />}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-brand-gold">{score.toFixed(2)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Published score</p>
                  </button>
                );
              })}
            </div>
            <div className="p-3 bg-surface-bg rounded-xl border border-surface-border flex items-center justify-between">
              <span className="text-sm text-text-secondary">{selectedSkills.length} skill(s) selected</span>
              <span className="text-lg font-bold text-brand-gold">{feeRule.currency} {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-end"><Button disabled={!selectedSkills.length} onClick={() => setStep(1)}>Continue</Button></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Textarea label="Reason for Re-evaluation" rows={6} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why the selected skills should be re-evaluated..." required />
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400">The committee re-evaluates offline. Scores remain unchanged unless a selected-skill revision receives privileged approval and is later applied by the Result service.</p>
            </div>
            <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button disabled={reason.length < 20} onClick={() => setStep(2)}>Continue</Button></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="p-4 bg-surface-bg rounded-xl border border-surface-border">
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Selected skills</p>
              <div className="flex flex-wrap gap-1.5">{selectedSkills.map(skill => <span key={skill} className="text-xs bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-full px-2 py-0.5">{skillLabel(skill)}</span>)}</div>
            </div>
            <div className="p-4 bg-surface-bg rounded-xl border border-surface-border"><p className="text-xs font-semibold text-text-muted uppercase mb-2">Reason</p><p className="text-sm text-text-primary">{reason}</p></div>
            <div className="p-4 bg-[#D4830A]/5 border border-brand-gold/20 rounded-xl flex items-center justify-between"><span className="text-sm font-medium text-text-primary">Payment required after submission</span><span className="text-2xl font-bold text-brand-gold">{feeRule.currency} {fee.toFixed(2)}</span></div>
            <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button loading={submitting} onClick={handleSubmit} icon={<Scale size={13} />}>Submit Re-evaluation</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
