/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { UserX, CheckCircle, Users, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { attendanceService } from '@/features/attendance/api';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/features/rbac/accessMatrix';

const columnHelper = createColumnHelper();
const SKILLS = ['WRITING', 'READING', 'LISTENING', 'SPEAKING'];

export default function AttendanceList() {
  const { user } = useAuth();
  const canManage = canAccess(user?.role, 'attendance', 'manage');
  const { data: appsData, loading, error, execute } = useApi(attendanceService.getEligible);
  const eligibleApps = appsData || [];
  const [data, setLocalData] = useState([]);
  
  // Sync local state when api data loads
  const effectiveData = appsData ? (data.length ? data : eligibleApps) : [];
  const [markingApp, setMarkingApp] = useState(null);
  const [absentSkills, setAbsentSkills] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  const filteredData = statusFilter === 'absent'
    ? effectiveData.filter(a => a.status === 'absent')
    : statusFilter === 'present'
    ? effectiveData.filter(a => a.status !== 'absent')
    : effectiveData;

  const handleMarkAbsent = async () => {
    if (!absentSkills.length) {
      toast.error('Select at least one missed skill.');
      return;
    }
    try {
      await attendanceService.markAbsent(markingApp.id, absentSkills);
      const updated = effectiveData.map(a =>
        a.id === markingApp.id ? { ...a, status: 'absent', absentSkills } : a
      );
      setLocalData(updated);
      toast.success(`${markingApp.testTakerName} marked as absent`);
    } catch {
      toast.error('Failed to mark absent');
    } finally {
      setMarkingApp(null);
      setAbsentSkills([]);
    }
  };

  const toggleSkill = (skill) => {
    setAbsentSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const columns = useMemo(() => [
    columnHelper.accessor('registrationNumber', {
      header: 'Reg. Number',
      cell: i => <span className="font-mono text-xs font-medium text-brand-gold">{i.getValue() || '—'}</span>
    }),
    columnHelper.accessor('testTakerName', {
      header: 'Test Taker',
      cell: i => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">{i.getValue()[0]}</div>
          <div>
            <p className="text-xs font-medium text-text-primary">{i.getValue()}</p>
            <p className="text-[10px] text-text-muted">{i.row.original.cid}</p>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('dzongkhag', { header: 'Dzongkhag' }),
    columnHelper.accessor('status', {
      header: 'Attendance',
      cell: i => {
        const val = i.getValue();
        const app = i.row.original;
        if (val === 'absent') {
          return (
            <div>
              <StatusBadge status="absent" />
              {app.absentSkills && <p className="text-[10px] text-red-400 mt-0.5">{app.absentSkills.join(', ')}</p>}
            </div>
          );
        }
        return <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> Present</span>;
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const app = row.original;
        if (!canManage) return <span className="text-xs text-text-muted">Read only</span>;
        if (app.status === 'absent') return <span className="text-xs text-text-muted">Already absent</span>;
        return (
          <Button variant="danger" size="xs" icon={<UserX size={12} />} onClick={() => setMarkingApp(app)}>
            Mark Absent
          </Button>
        );
      }
    }),
  ], [canManage]);

  const absentCount = effectiveData.filter(a => a.status === 'absent').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        subtitle="Record exam attendance and mark absentees"
        breadcrumbs={[{ label: 'Attendance' }]}
        icon={<Users size={18} />}
      />

      {absentCount > 0 && (
        <Alert variant="warning" title={`${absentCount} Absentee${absentCount > 1 ? 's' : ''} Recorded`}>
          Absent test takers cannot have band scores entered. They must re-register for a future examination.
        </Alert>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="py-12 text-center"><p className="text-sm text-red-400 mb-3">{error}</p><Button size="sm" onClick={() => execute()}>Try Again</Button></div>
        ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          searchPlaceholder="Search by name or reg. number..."
          toolbar={
            <Select style={{ width: 140, height: 32 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </Select>
          }
        />
        )}
      </div>

      {/* Mark Absent Modal */}
      <Modal
        isOpen={!!markingApp}
        onClose={() => { setMarkingApp(null); setAbsentSkills([]); }}
        title="Mark as Absent"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setMarkingApp(null); setAbsentSkills([]); }}>Cancel</Button>
            <Button variant="danger" disabled={!absentSkills.length} onClick={handleMarkAbsent} icon={<UserX size={13} />}>Confirm Absent</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Marking as absent will prevent band score entry for this test taker. This action is recorded with a timestamp.
          </Alert>
          <p className="text-sm text-text-primary">
            Marking <strong>{markingApp?.testTakerName}</strong> as absent. Select the skills they failed to complete:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SKILLS.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={[
                  'p-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                  absentSkills.includes(skill)
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-surface-bg border-surface-border text-text-secondary',
                ].join(' ')}
              >
                {absentSkills.includes(skill) ? '✗' : '○'} {skill}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            If absent for any one skill, the entire test is considered incomplete.
          </p>
        </div>
      </Modal>
    </div>
  );
}
