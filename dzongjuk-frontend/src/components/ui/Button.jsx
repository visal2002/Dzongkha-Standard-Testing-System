import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-brand-gold hover:bg-brand-gold-dark text-white shadow-md shadow-brand-gold/20',
  secondary: 'bg-brand-navy hover:bg-brand-navy-light text-white border border-surface-border',
  ghost: 'bg-transparent hover:bg-brand-navy text-text-secondary hover:text-white',
  danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md shadow-[#EF4444]/20',
  success: 'bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-[#10B981]/20',
  outline: 'bg-transparent border border-brand-gold text-brand-gold hover:bg-brand-gold/10',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
  xl: 'h-11 px-6 text-base gap-2.5',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconRight,
    className = '',
    onClick,
    type = 'button',
    fullWidth = false,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        'focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:ring-offset-1 focus:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        'rounded-lg',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span className="truncate">{children}</span>}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </motion.button>
  );
});

export default Button;
