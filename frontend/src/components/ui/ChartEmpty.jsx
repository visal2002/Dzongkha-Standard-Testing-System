/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { BarChart3 } from 'lucide-react';

/**
 * Placeholder shown where a chart would be when the underlying records contain
 * nothing to plot. Charts render real data or say there is none — they never fall
 * back to illustrative numbers.
 */
export default function ChartEmpty({ height = 200, message = 'No data to display yet', hint }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border text-center"
      style={{ height }}
      role="status"
    >
      <BarChart3 size={20} className="text-text-muted opacity-60" />
      <p className="text-xs font-medium text-text-secondary">{message}</p>
      {hint && <p className="text-[11px] text-text-muted max-w-xs px-4">{hint}</p>}
    </div>
  );
}
