const variants = {
  default: 'bg-[#1E2D4A] text-[#94A3C8] border border-[#243055]',
  gold: 'bg-[#D4830A]/15 text-[#F0A030] border border-brand-gold/30',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export default function Badge({ children, variant = 'default', size = 'md', dot = false, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-medium rounded-full',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={[
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' ? 'bg-emerald-400' :
          variant === 'warning' ? 'bg-amber-400' :
          variant === 'error' ? 'bg-red-400' :
          variant === 'gold' ? 'bg-[#D4830A]' :
          variant === 'info' ? 'bg-blue-400' : 'bg-current'
        ].join(' ')} />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'error' },
    open: { label: 'Open', variant: 'success' },
    closed: { label: 'Closed', variant: 'error' },
    upcoming: { label: 'Upcoming', variant: 'info' },
    completed: { label: 'Completed', variant: 'default' },
    pending: { label: 'Pending', variant: 'warning' },
    submitted: { label: 'Submitted', variant: 'info' },
    under_review: { label: 'Under Review', variant: 'warning' },
    verified: { label: 'Verified', variant: 'teal' },
    approved: { label: 'Approved', variant: 'success' },
    returned: { label: 'Returned', variant: 'warning' },
    rejected: { label: 'Rejected', variant: 'error' },
    absent: { label: 'Absent', variant: 'error' },
    published: { label: 'Published', variant: 'success' },
    pending_committee: { label: 'Pending Review', variant: 'warning' },
    revision_requested: { label: 'Revision Requested', variant: 'purple' },
    pending_chief_approval: { label: 'Pending Approval', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    unpaid: { label: 'Unpaid', variant: 'error' },
    draft: { label: 'Draft', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    waitlisted: { label: 'Waitlisted', variant: 'warning' },
  };
  const config = map[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}
