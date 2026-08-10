import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, onClick, padding = true }) {
  const base = [
    'bg-surface-card border border-surface-border rounded-xl',
    padding ? 'p-4 sm:p-5' : '',
    hover ? 'cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-surface-card-hover hover:shadow-lg hover:shadow-black/20' : '',
    className,
  ].join(' ');

  if (hover || onClick) {
    return (
      <motion.div
        className={base}
        whileHover={{ y: -2 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }
  return <div className={base}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, icon, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary text-sm leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const StatCard = React.memo(function StatCard({ title, value, delta, icon, color = 'gold', subtitle, loading = false }) {
  const colors = {
    gold: { bg: 'bg-brand-gold/10', text: 'text-brand-gold', border: 'border-brand-gold/20' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };
  const c = colors[color] || colors.gold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-card border border-surface-border rounded-xl p-4 sm:p-5 flex items-start justify-between gap-3 sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{title}</p>
        {loading ? (
          <div className="h-8 w-20 bg-surface-border rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        )}
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        {delta !== undefined && (
          <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% from last period
          </p>
        )}
      </div>
      {icon && (
        <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} shrink-0`}>
          {icon}
        </div>
      )}
    </motion.div>
  );
});
