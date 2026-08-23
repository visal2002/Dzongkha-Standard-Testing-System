/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const variants = {
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    icon: CheckCircle,
    title: 'text-emerald-300',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    icon: AlertTriangle,
    title: 'text-amber-300',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/20 text-red-400',
    icon: AlertCircle,
    title: 'text-red-300',
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    icon: Info,
    title: 'text-blue-300',
  },
};

export default function Alert({ variant = 'info', title, children, dismissible = false, className = '' }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const v = variants[variant] || variants.info;
  const Icon = v.icon;
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${v.container} ${className}`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${v.title} mb-0.5`}>{title}</p>}
        {children && <p className="text-sm opacity-90">{children}</p>}
      </div>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
