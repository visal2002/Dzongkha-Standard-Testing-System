/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, action, breadcrumbs, icon }) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      {breadcrumbs && (
        <nav className="flex items-center gap-1 text-xs text-text-muted">
          <Link to="/dashboard" className="hover:text-text-primary transition-colors flex items-center gap-1">
            <Home size={12} />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-text-primary transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-text-secondary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text-primary leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
}
