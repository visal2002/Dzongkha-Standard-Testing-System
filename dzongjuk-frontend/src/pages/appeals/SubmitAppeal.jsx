import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { bandScores, masterConfig } from '../../data/mockData';
import toast from 'react-hot-toast';

const SKILLS = ['Writing', 'Reading', 'Listening', 'Speaking'];
const STEPS = ['Select Skills', 'Provide Reason', 'Review & Pay'];

export default function SubmitAppeal() {
  const [step, setStep] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const myScore = bandScores[0];
  const fee = selectedSkills.length * masterConfig.appealFeePerSkill;

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast.success('Appeal submitted successfully! The committee will review your request.');
    navigate('/appeals');
  };

  if (!myScore) {
    return (
      <div className="space-y-6">
        <PageHeader title="Submit Appeal" subtitle="Request re-evaluation of your band scores" icon={<Scale size={18} />} />
        <Alert variant="warning" title="No Results Available">You must have published results to submit an appeal.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Submit Appeal"
        subtitle="Request re-evaluation of your band scores"
        breadcrumbs={[{ label: 'Appeals', href: '/appeals' }, { label: 'New Appeal' }]}
        icon={<Scale size={18} />}
      />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#D4830A] text-white' : 'bg-[var(--color-surface-border)] text-text-muted'}`}>
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-500' : 'bg-[var(--color-surface-border)]'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        {/* Step 0: Select Skills */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Select Skills for Re-evaluation</h3>
              <p className="text-sm text-text-muted">Choose which skills you want to appeal. Fee: Nu. {masterConfig.appealFeePerSkill} per skill.</p>
            </div>
            <Alert variant="info">Your current scores from January 2026 examination</Alert>
            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map(skill => {
                const scoreKey = skill.toLowerCase();
                const score = myScore[scoreKey];
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={[
                      'p-4 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-brand-gold/10 border-brand-gold/40 shadow-sm'
                        : 'bg-surface-bg border-surface-border hover:border-brand-gold/20',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-text-primary">{skill}</p>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-gold bg-[#D4830A]' : 'border-surface-border'}`}>
                        {isSelected && <CheckCircle size={12} className="text-white" />}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-brand-gold">{score}</p>
                    <p className="text-xs text-text-muted mt-0.5">out of 9.0</p>
                  </button>
                );
              })}
            </div>
            {selectedSkills.length > 0 && (
              <div className="p-3 bg-surface-bg rounded-xl border border-surface-border flex items-center justify-between">
                <span className="text-sm text-text-secondary">{selectedSkills.length} skill(s) selected · Appeal fee:</span>
                <span className="text-lg font-bold text-brand-gold">Nu. {fee}</span>
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={selectedSkills.length === 0} onClick={() => setStep(1)}>Continue →</Button>
            </div>
          </div>
        )}

        {/* Step 1: Reason */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Provide Reason for Appeal</h3>
              <p className="text-sm text-text-muted">Explain why you believe your score needs re-evaluation.</p>
            </div>
            <Textarea
              label="Reason for Re-evaluation"
              rows={5}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe why you believe your evaluation was inaccurate and any relevant context..."
              required
            />
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400">Appeals are reviewed by the Examination Committee. The final decision rests with the Chief Executive.</p>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button disabled={reason.length < 20} onClick={() => setStep(2)}>Continue →</Button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Pay */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Review & Payment</h3>
              <p className="text-sm text-text-muted">Confirm your appeal details before submitting.</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-surface-bg rounded-xl border border-surface-border">
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Skills Selected</p>
                <div className="flex flex-wrap gap-1.5">{selectedSkills.map(s => <span key={s} className="text-xs bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-full px-2 py-0.5">{s}</span>)}</div>
              </div>
              <div className="p-4 bg-surface-bg rounded-xl border border-surface-border">
                <p className="text-xs font-semibold text-text-muted uppercase mb-2">Reason</p>
                <p className="text-sm text-text-primary">{reason}</p>
              </div>
              <div className="p-4 bg-[#D4830A]/5 border border-brand-gold/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2"><CreditCard size={16} className="text-brand-gold" /><span className="text-sm font-medium text-text-primary">Total Appeal Fee</span></div>
                <span className="text-2xl font-bold text-brand-gold">Nu. {fee}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button loading={loading} onClick={handleSubmit} icon={<CreditCard size={13} />}>Pay & Submit Appeal</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
