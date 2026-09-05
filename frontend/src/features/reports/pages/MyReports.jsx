/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * My Records - the Test Taker's "view own" Reports surface from the approved matrix.
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
 *
 * It also deliberately does not duplicate the standalone My Results / Certificates
 * screens with full per-category tables - it is an export surface (PDF/CSV) over a
 * single combined history, not a third place to browse the same records.
 */
import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Award, BarChart3, Download, FileSpreadsheet, FileText, Scale } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { applicationService } from '@/features/registration/api';
import { scoreService } from '@/features/scores/api';
import { appealService } from '@/features/appeals/api';
import { certificateService } from '@/features/certificates/api';
import MyRecordsDocument from './MyRecordsPdf';

const asList = value => (Array.isArray(value) ? value : []);

const formatDate = value => (value ? new Date(value).toLocaleDateString() : '—');

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toCsv = rows => {
  const header = ['Date', 'Type', 'Reference', 'Status'];
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [header, ...rows.map(row => [row.date, row.type, row.reference, row.status])]
    .map(row => row.map(escape).join(','))
    .join('\r\n');
};

export default function MyReports() {
  const { user } = useAuth();
  const { data: applications, loading: loadingApps } = useApi(applicationService.getByUser, true, [user?.id]);
  const { data: results, loading: loadingResults } = useApi(scoreService.getMyScores, true, [user?.id]);
  const { data: appeals, loading: loadingAppeals } = useApi(appealService.getByUser, true, [user?.id]);
  const { data: certificates, loading: loadingCerts } = useApi(certificateService.getByUser, true, [user?.id]);
  const [exporting, setExporting] = useState(null);

  const myApplications = asList(applications);
  const myResults = asList(results);
  const myAppeals = asList(appeals);
  const myCertificates = asList(certificates);

  const loading = loadingApps || loadingResults || loadingAppeals || loadingCerts;
  const publishedResults = myResults.filter(result => String(result.status || '').toLowerCase() === 'published');

  const historyRows = [
    ...myApplications.map(application => ({
      date: application.submittedAt || application.createdAt,
      type: 'Application',
      reference: application.registrationNumber || application.id,
      status: application.status,
    })),
    ...publishedResults.map(result => ({
      date: result.publishedAt || result.updatedAt || result.createdAt,
      type: 'Result',
      reference: result.applicationId,
      status: result.status,
    })),
    ...myAppeals.map(appeal => ({
      date: appeal.submittedAt || appeal.createdAt,
      type: 'Re-evaluation',
      reference: appeal.id,
      status: appeal.status,
    })),
    ...myCertificates.map(certificate => ({
      date: certificate.issuedAt,
      type: 'Certificate',
      reference: certificate.certificateNumber || certificate.id,
      status: certificate.status,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const exportCsv = () => {
    const csv = toCsv(historyRows.map(row => ({ ...row, date: formatDate(row.date) })));
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `my-records-${user?.id || 'export'}.csv`);
  };

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      const blob = await pdf(
        <MyRecordsDocument
          userName={user?.name || 'Test Taker'}
          generatedAt={new Date().toLocaleString()}
          rows={historyRows.map(row => ({ ...row, date: formatDate(row.date) }))}
        />
      ).toBlob();
      downloadBlob(blob, `my-records-${user?.id || 'export'}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Records"
        subtitle="Export a record of your own applications, results, re-evaluations, and certificates"
        breadcrumbs={[{ label: 'My Records' }]}
        icon={<BarChart3 size={18} />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<FileSpreadsheet size={13} />} disabled={loading} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button size="sm" icon={<Download size={13} />} loading={exporting === 'pdf'} disabled={loading} onClick={exportPdf}>
              Export PDF
            </Button>
          </div>
        }
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

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Combined history</h3>
          <p className="text-xs text-text-muted mt-0.5">Every application, result, re-evaluation, and certificate on your account, most recent first.</p>
        </div>
        {loading ? (
          <p className="py-8 text-center text-xs text-text-muted">Loading your records...</p>
        ) : historyRows.length === 0 ? (
          <p className="py-8 text-center text-xs text-text-muted">You have no records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Date', 'Type', 'Reference', 'Status'].map(label => (
                    <th key={label} className="pb-3 pr-4 text-left text-xs font-medium text-text-muted">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, index) => (
                  <tr key={index} className="border-b border-surface-border/40">
                    <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(row.date)}</td>
                    <td className="py-3 pr-4 text-text-primary">{row.type}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-brand-gold">{row.reference}</td>
                    <td className="py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
