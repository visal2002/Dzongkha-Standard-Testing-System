import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const Input = forwardRef(function Input(
  { label, error, hint, icon, iconRight, className = '', required, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={[
            'w-full h-9 px-3 rounded-lg text-sm',
            'bg-surface-bg border text-text-primary',
            'placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-[#D4830A]/40 focus:border-brand-gold',
            'transition-colors duration-150',
            error ? 'border-red-500/60' : 'border-surface-border',
            icon ? 'pl-9' : '',
            iconRight ? 'pr-9' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
});

export default Input;

export function Textarea({ label, error, hint, className = '', required, rows = 4, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm resize-none',
          'bg-surface-bg border text-text-primary',
          'placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-[#D4830A]/40 focus:border-brand-gold',
          'transition-colors duration-150',
          error ? 'border-red-500/60' : 'border-surface-border',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} />{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className = '', required, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        className={[
          'w-full h-9 px-3 rounded-lg text-sm appearance-none',
          'bg-surface-bg border text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-[#D4830A]/40 focus:border-brand-gold',
          'transition-colors duration-150',
          error ? 'border-red-500/60' : 'border-surface-border',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} />{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
