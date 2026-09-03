/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Horizontal progress stepper.
 *
 * Replaces the version that used to live in the `components/ui` barrel, which
 * rendered `stepper`/`stepper-item`/`stepper-circle` class names that no longer
 * exist in index.css - so the multi-step registration form and the appeal pipeline
 * both drew unstyled markup. Same props, styled with the design-system tokens the
 * rest of the UI kit uses.
 *
 * @param {{ steps?: string[], currentStep?: number }} props
 */
export default function Stepper({ steps = [], currentStep = 0 }) {
  return (
    <ol className="flex items-start gap-2 overflow-x-auto">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        return (
          <li key={step} className="flex flex-1 min-w-[7rem] items-start gap-2">
            <div className="flex flex-1 flex-col items-center gap-2 text-center">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isComplete ? 'border-brand-gold bg-brand-gold text-brand-navy' : '',
                  isActive ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : '',
                  !isComplete && !isActive ? 'border-surface-border bg-surface-card text-text-muted' : '',
                ].join(' ')}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <span className={`text-xs leading-tight ${isActive ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mt-4 h-px flex-1 ${isComplete ? 'bg-brand-gold' : 'bg-surface-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
