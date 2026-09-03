/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Input, { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { auditService } from '@/services/audit';
import { useApi } from '@/hooks/useApi';

const columnHelper = createColumnHelper();

function StatusPill({ status }) {
  if (!status) return <span className="text-text-muted">—</span>;
  const isSuccess = String(status).toLowerCase() === 'success';
  return <Badge variant={isSuccess ? 'success' : 'error'}>{status}</Badge>;
}

export default function AuditLogs() {
  const [filters, setFilters] = useState({ action: '', actorUserId: '', from: '', to: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [exporting, setExporting] = useState(false);
  const { data, loading, execute } = useApi(auditService.getEvents, false);
  const events = data?.items || [];

  // `execute` is stable (useApi memoizes it against `apiFunc` alone when no default
  // args are given), so this only refetches when the applied filters actually change,
  // not on every render.
  useEffect(() => {
    execute({ pageSize: 100, ...appliedFilters }).catch(() => {});
  }, [execute, appliedFilters]);

  const applyFilters = () => {
    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    setAppliedFilters(next);
  };

  const clearFilters = () => {
    setFilters({ action: '', actorUserId: '', from: '', to: '' });
    setAppliedFilters({});
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await auditService.exportCsv(appliedFilters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dzongjuk-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to export audit log.');
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('actorUserId', { header: 'User ID', cell: info => <span className="font-mono text-xs text-text-primary">{info.getValue() || '—'}</span> }),
    columnHelper.accessor('role', { header: 'Role', cell: info => <span className="text-text-secondary">{info.getValue() || '—'}</span> }),
    columnHelper.accessor('ipAddress', { header: 'IP Address', cell: info => <span className="font-mono text-xs text-text-muted">{info.getValue() || '—'}</span> }),
    columnHelper.accessor('occurredAt', { header: 'Timestamp', cell: info => <span className="text-xs text-text-muted">{new Date(info.getValue()).toLocaleString()}</span> }),
    columnHelper.accessor('action', { header: 'Event', cell: info => <span className="font-medium text-text-primary">{info.getValue()}</span> }),
    columnHelper.accessor('status', { header: 'Status', cell: info => <StatusPill status={info.getValue()} /> }),
  ], []);

  return <div className="space-y-6">
    <PageHeader title="System Audit Logs" subtitle="Searchable, immutable audit trail for compliance verification" breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Logs' }]} icon={<ScrollText size={18} />} />

    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <Input label="Event" placeholder="e.g. Role Change" value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))} />
        <Input label="User ID" placeholder="e.g. USR-001" value={filters.actorUserId} onChange={e => setFilters(p => ({ ...p, actorUserId: e.target.value }))} />
        <Input type="date" label="From" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
        <Input type="date" label="To" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
        <div className="flex gap-2">
          <Button onClick={applyFilters} size="md">Apply</Button>
          <Button variant="ghost" onClick={clearFilters} size="md">Clear</Button>
        </div>
      </div>
    </div>

    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <DataTable
        data={events}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search this page of results..."
        emptyMessage="No audit events match these filters"
        onExport={handleExport}
      />
      {exporting && <p className="text-xs text-text-muted mt-2">Preparing export…</p>}
    </div>
  </div>;
}
