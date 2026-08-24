/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * My Reports - the Test Taker's "view own" Reports surface from the approved matrix.
 *
 * Every figure on this page comes from an endpoint that is already scoped to the
 * caller by the token subject server-side: /applications/my, /results/my,
 * /appeals/my, /certificates/my. None of them accepts a user id from the client.
 *
 * This page must never import `reportService`. Every endpoint behind it -
 * /reports/summary, /reports/registration, /reports/scores, /reports/appeals - is
 * organisation-wide, and pulling one in here would hand a Test Taker the aggregate
 * figures the matrix withholds. The organisation-wide screen is Reports.jsx, guarded
 * by `reports:read_all`.
 */
import { Award, BarChart3, FileText, Scale } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { applicationService } from '@/services/applications';
import { scoreService } from '@/services/scores';
import { appealService } from '@/services/appeals';
import { certificateService } from '@/services/certificates';

const asList = value => (Array.isArray(value) ? value : []);

const formatDate = value => (value ? new Date(value).toLocaleDateString() : '—');

function Section({ title, description, children }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ message }) {
  return <p className="py-8 text-center text-xs text-text-muted">{message}</p>;
}

export default function MyReports() {
  const { user } = useAuth();
  const { data: applications, loading: loadingApps } = useApi(applicationService.getByUser, true, [user?.id]);
  const { data: results, loading: loadingResults } = useApi(scoreService.getMyScores, true, [user?.id]);
  const { data: appeals, loading: loadingAppeals } = useApi(appealService.getByUser, true, [user?.id]);
  const { data: certificates, loading: loadingCerts } = useApi(certificateService.getByUser, true, [user?.id]);

  const myApplications = asList(applications);
  const myResults = asList(results);
  const myAppeals = asList(appeals);
  const myCertificates = asList(certificates);

  const loading = loadingApps || loadingResults || loadingAppeals || loadingCerts;
  const publishedResults = myResults.filter(result => String(result.status || '').toLowerCase() === 'published');

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reports"
        subtitle="A summary of your own registrations, results, re-evaluations, and certificates"
        breadcrumbs={[{ label: 'Reports' }, { label: 'My Reports' }]}
        icon={<BarChart3 size={18} />}
      />

      <Alert variant="info" title="Your records only">
        This page shows the records held against your own account. Organisation-wide reporting
        is restricted to DCDD and examination staff.
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Applications" value={loading ? '...' : myApplications.length} icon={<FileText size={18} />} color="gold" />
        <StatCard title="Published Results" value={loading ? '...' : publishedResults.length} icon={<BarChart3 size={18} />} color="teal" />
        <StatCard title="My Re-evaluations" value={loading ? '...' : myAppeals.length} icon={<Scale size={18} />} color="warning" />
        <StatCard title="My Certificates" value={loading ? '...' : myCertificates.length} icon={<Award size={18} />} color="success" />
      </div>

      <Section title="Registration history" description="Every application you have submitted, with its current status.">
        {loading ? <EmptyRow message="Loading your records..." />
          : myApplications.length === 0 ? <EmptyRow message="You have not submitted an application yet." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Application', 'Examination', 'Submitted', 'Status'].map(label => (
                      <th key={label} className="pb-3 pr-4 text-left text-xs font-medium text-text-muted">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myApplications.map(application => (
                    <tr key={application.id} className="border-b border-surface-border/40">
                      <td className="py-3 pr-4 font-mono text-xs text-brand-gold">{application.registrationNumber || application.id}</td>
                      <td className="py-3 pr-4 text-text-primary">{application.examTitle || application.examId || '—'}</td>
                      <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(application.submittedAt || application.createdAt)}</td>
                      <td className="py-3"><StatusBadge status={application.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Section>

      <Section title="My results" description="Band scores published against your applications.">
        {loading ? <EmptyRow message="Loading your records..." />
          : myResults.length === 0 ? <EmptyRow message="No results have been published for you yet." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Application', 'Writing', 'Reading', 'Listening', 'Speaking', 'Overall', 'Level', 'Status'].map(label => (
                      <th key={label} className="pb-3 pr-4 text-left text-xs font-medium text-text-muted">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myResults.map(result => (
                    <tr key={result.id || result.applicationId} className="border-b border-surface-border/40">
                      <td className="py-3 pr-4 font-mono text-xs text-brand-gold">{result.applicationId}</td>
                      {['writing', 'reading', 'listening', 'speaking'].map(skill => (
                        <td key={skill} className="py-3 pr-4 text-text-primary tabular-nums">{Number(result[skill] ?? 0).toFixed(1)}</td>
                      ))}
                      <td className="py-3 pr-4 font-bold text-brand-gold tabular-nums">{Number(result.average ?? result.overall ?? 0).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-text-primary">{result.cefrLevel || '—'}</td>
                      <td className="py-3"><StatusBadge status={result.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Section>

      <Section title="My re-evaluations" description="Re-evaluation requests you have submitted and their outcomes.">
        {loading ? <EmptyRow message="Loading your records..." />
          : myAppeals.length === 0 ? <EmptyRow message="You have not submitted a re-evaluation request." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Appeal', 'Application', 'Submitted', 'Status'].map(label => (
                      <th key={label} className="pb-3 pr-4 text-left text-xs font-medium text-text-muted">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myAppeals.map(appeal => (
                    <tr key={appeal.id} className="border-b border-surface-border/40">
                      <td className="py-3 pr-4 font-mono text-xs text-text-muted">{appeal.id}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-brand-gold">{appeal.applicationId}</td>
                      <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(appeal.submittedAt || appeal.createdAt)}</td>
                      <td className="py-3"><StatusBadge status={appeal.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Section>

      <Section title="My certificates" description="Certificates issued to you, and their validity.">
        {loading ? <EmptyRow message="Loading your records..." />
          : myCertificates.length === 0 ? <EmptyRow message="No certificate has been issued to you yet." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Certificate', 'Issued', 'Valid until', 'Status'].map(label => (
                      <th key={label} className="pb-3 pr-4 text-left text-xs font-medium text-text-muted">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myCertificates.map(certificate => (
                    <tr key={certificate.id} className="border-b border-surface-border/40">
                      <td className="py-3 pr-4 font-mono text-xs text-brand-gold">{certificate.certificateNumber || certificate.id}</td>
                      <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(certificate.issuedAt)}</td>
                      <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(certificate.validUntil || certificate.expiresAt)}</td>
                      <td className="py-3"><StatusBadge status={certificate.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Section>
    </div>
  );
}
