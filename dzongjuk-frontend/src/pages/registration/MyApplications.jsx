import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { applications, examWindows } from '../../data/mockData';

export default function MyApplications() {
  const { user } = useAuth();
  const myApps = applications.filter(a => a.testTakerId === user?.id || a.testTakerId === 'USR-006');

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        subtitle="Track all your DSTS examination applications"
        breadcrumbs={[{ label: 'Registration' }, { label: 'My Applications' }]}
        icon={<FileText size={18} />}
        action={
          <Link to="/registration/windows">
            <Button icon={<Plus size={14} />}>New Application</Button>
          </Link>
        }
      />

      {myApps.length === 0 ? (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No applications yet</p>
          <p className="text-xs mt-1 mb-4">Register for an exam to get started.</p>
          <Link to="/registration/windows"><Button size="sm">Browse Exam Windows</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myApps.map(app => {
            const exam = examWindows.find(e => e.id === app.examId);
            return (
              <div key={app.id} className="bg-surface-card border border-surface-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-base font-semibold text-text-primary">{exam?.title || app.examId}</p>
                    <p className="text-xs text-text-muted mt-0.5">Application ID: {app.id}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div>
                    <p className="text-text-muted mb-0.5">Registration No.</p>
                    <p className="font-medium text-brand-gold">{app.registrationNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">Submitted</p>
                    <p className="font-medium text-text-primary">{new Date(app.submittedAt).toLocaleDateString()}</p>
                  </div>
                  {exam && (
                    <>
                      <div className="flex items-start gap-1.5">
                        <Calendar size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">Exam Date</p>
                          <p className="font-medium text-text-primary">{new Date(exam.examDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">Venue</p>
                          <p className="font-medium text-text-primary truncate">{exam.venue.split(',')[0]}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {app.remarks && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400 mb-4">
                    <span className="font-semibold">Remarks: </span>{app.remarks}
                  </div>
                )}

                {/* Status timeline */}
                <div className="pt-3 border-t border-surface-border">
                  <p className="text-[10px] font-semibold text-text-muted uppercase mb-2">Status History</p>
                  <div className="flex items-center gap-0">
                    {app.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-0">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#D4830A]" />
                          <div className="text-[9px] text-text-muted mt-1 text-center w-20">{h.status.replace(/_/g, ' ')}</div>
                        </div>
                        {i < app.statusHistory.length - 1 && <div className="w-8 h-px bg-[var(--color-surface-border)] mb-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
