import { useId } from 'react';
import { Textarea } from '@/components/ui/Input';

export default function DecisionRemarks({ value, onChange, required = false }) {
  const id = useId();
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">Decision remarks{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <span className={`ml-auto text-xs tabular-nums ${value.length > 0 && value.length < 3 ? 'text-amber-400' : 'text-text-muted'}`} aria-live="polite" aria-atomic="true">{value.length.toLocaleString('en')} / 3 minimum characters</span>
    </div>
    <Textarea id={id} rows={4} value={value} onChange={onChange} maxLength={4000} minLength={3} required={required} aria-required={required} aria-describedby={`${id}-guidance`} placeholder="Example: After reviewing the speaking recording against the scoring criteria, we recommend a revised score of 6.5 because the candidate demonstrated stronger fluency and pronunciation than reflected in the original score." />
    <p id={`${id}-guidance`} className="text-xs text-text-muted leading-relaxed">{required ? 'Enter at least 3 characters.' : 'Optional; if entered, use at least 3 characters.'} Explain what you reviewed and why the score should change or remain unchanged.</p>
  </div>;
}
