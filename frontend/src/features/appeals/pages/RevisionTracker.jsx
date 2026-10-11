/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { appealService } from '@/features/appeals/api';
import RecordReference from '@/components/ui/RecordReference';
import { referenceSearch } from '@/lib/recordReferences';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

const normalizeAppeal = appeal => ({
  ...appeal,
  skills: (appeal.skills || []).map(skill => skill.skill),
});

// BRD §5.6.2 Committee BR-2: Pending / Approved / Rejected, derived from the real
// appeal record - never a locally-toggled flag. A revision request is only ever one
// of these three once the committee has actually recommended a change (NO_CHANGE
// recommendations never reach this screen at all).
const trackerStatus = appeal => {
  if (appeal.chiefDecision === 'APPROVED') return 'APPROVED';
  if (appeal.chiefDecision === 'REJECTED') return 'REJECTED';
  return 'PENDING';
};

export default function RevisionTracker() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const load = canAccess(user, 'appeals', 'read_all') ? appealService.getAll() : appealService.getByUser(user?.id);
    load
      .then(response => {
        if (!active) return;
        const revisions = (response.data || []).map(normalizeAppeal).filter(appeal => appeal.committeeRecommendation === 'REVISE');
        setData(revisions);
      })
      .catch(requestError => {
        if (!active) return;
        setError(requestError.message || 'Unable to load revision requests.');
        toast.error(requestError.message || 'Unable to load revision requests.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.role, canAccess(user, 'appeals', 'read_all')]);

  const columns = [
    columnHelper.accessor(row => referenceSearch(row.id, 'RE', data.map(item => item.id)), { id: 'id', header: 'Request reference', cell: info => <RecordReference id={info.row.original.id} prefix="RE" ids={data.map(item => item.id)} className="font-mono text-xs text-text-muted" /> }),
    columnHelper.accessor(row => referenceSearch(row.applicationId, 'APP', data.map(item => item.applicationId)), { id: 'applicationId', header: 'Application reference', cell: info => <RecordReference id={info.row.original.applicationId} ids={data.map(item => item.applicationId)} className="font-mono text-xs text-brand-gold" /> }),
    columnHelper.accessor('skills', { header: 'Skills', cell: info => <span className="text-xs text-text-secondary">{info.getValue().join(', ')}</span> }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={trackerStatus(row.original)} />,
    }),
    columnHelper.accessor('submittedAt', { header: 'Submitted', cell: info => <span className="text-xs text-text-muted">{new Date(info.getValue()).toLocaleDateString()}</span> }),
    // BRD §5.6.2 Committee BR-2: an approved skill is unlocked for edit, but never by
    // the Committee Head - the Chief of Examination's own decision is what actually
    // applies it (POST :id/apply-revision, appeal.approve-gated, MFA/NDI required).
    // That separation of duties holds everywhere else in this app (process vs.
    // approve), so this stays a genuinely disabled control with the real reason
    // shown, rather than a button that looks live but does nothing for this role.
    columnHelper.display({
      id: 'edit',
      header: 'Edit',
      cell: ({ row }) => {
        const status = trackerStatus(row.original);
        if (status !== 'APPROVED') return <span className="text-xs text-text-muted">—</span>;
        const applied = row.original.status === 'COMPLETED';
        return (
          <Button
            size="xs"
            variant="ghost"
            disabled
            icon={applied ? <CheckCircle size={12} /> : undefined}
            title={applied
              ? 'Applied by the Chief of Examination - the published score already reflects this revision.'
              : 'Approved - applying the revision is the Chief of Examination\'s own action, not the Committee Head\'s.'}
          >
            {applied ? 'Applied' : 'Edit'}
          </Button>
        );
      },
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revision Status Tracker"
        subtitle="Track the real approval status of every score revision request this committee has submitted"
        breadcrumbs={[{ label: 'Re-evaluation' }, { label: 'Revision Status Tracker' }]}
        icon={<ClipboardCheck size={18} />}
      />
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search reference or full ID..."
          emptyMessage={error || 'No revision requests submitted yet'}
        />
      </div>
    </div>
  );
}
