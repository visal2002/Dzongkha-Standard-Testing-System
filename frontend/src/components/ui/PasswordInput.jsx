import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = forwardRef(function PasswordInput({ className = '', type: _type, id, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const fieldName = props['aria-label'] || 'password';
  return <div className="relative">
    <input {...props} id={inputId} ref={ref} type={visible ? 'text' : 'password'} className={className + ' pr-10'} />
    <button type="button" disabled={props.disabled} aria-label={(visible ? 'Hide ' : 'Show ') + fieldName} aria-pressed={visible} aria-controls={inputId}
      onClick={() => setVisible(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded disabled:opacity-50">
      {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
    </button>
  </div>;
});
export default PasswordInput;
