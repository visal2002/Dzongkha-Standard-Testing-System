/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { Award, Download, QrCode, Search, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { certificateService } from '../../services/certificates';
import { API_BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';

const skillOrder = ['WRITING', 'READING', 'LISTENING', 'SPEAKING'];

function CertificateCard({ cert }) {
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const scores = cert.scoreSnapshot?.scores ?? {};
  const active = cert.status === 'ACTIVE' && new Date(cert.validUntil) > new Date();
  const verificationUrl = `${API_BASE_URL}/public/certificates/verify/${cert.verificationToken}`;

  const download = async () => {
    try {
      setDownloading(true);
      const response = await certificateService.download(cert.id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cert.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Certificate downloaded securely.');
    } catch (error) { toast.error(error.message || 'Certificate download failed.'); }
    finally { setDownloading(false); }
  };

  return (
    <>
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-brand-gold/30 transition-all">
        <div className="bg-gradient-to-r from-[#174D63] to-[#0B2E3D] p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-medium">Dzongkha Standard Testing System</p>
              <p className="text-white text-sm font-semibold mt-0.5">{cert.certificateNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[10px]">Approved band</p>
              <p className="text-2xl font-black text-white">{cert.cefrLevel || cert.bandLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase font-medium mb-1">Certificate holder</p>
              <p className="text-base font-bold text-text-primary">{cert.holderName}</p>
              <p className="text-xs text-text-muted mt-0.5">{cert.registrationNumber}</p>
            </div>
            <StatusBadge status={cert.status.toLowerCase()} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {skillOrder.map(skill => (
              <div key={skill} className="text-center p-2 bg-surface-bg rounded-lg border border-surface-border">
                <p className="text-sm font-bold text-brand-gold">{scores[skill] ?? '-'}</p>
                <p className="text-[9px] text-text-muted capitalize mt-0.5">{skill.toLowerCase()}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-text-muted">Issued: {new Date(cert.issuedAt).toLocaleDateString()}</p>
              <p className={active ? 'text-emerald-400' : 'text-red-400'}>Valid until: {new Date(cert.validUntil).toLocaleDateString()}</p>
            </div>
            <p className="font-semibold text-text-primary">Overall: {cert.scoreSnapshot?.overallScore ?? '-'}</p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-surface-border">
            <Button variant="primary" size="sm" icon={<Download size={13} />} className="flex-1" disabled={!active || downloading} onClick={download}>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button variant="secondary" size="sm" icon={<QrCode size={13} />} onClick={() => setShowQR(true)}>QR</Button>
          </div>
        </div>
      </div>

      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Certificate verification QR" size="sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-white rounded-2xl shadow-lg"><QRCodeSVG value={verificationUrl} size={180} fgColor="#163748" /></div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">{cert.certificateNumber}</p>
            <p className="text-xs text-text-muted mt-1">The public check reveals validity only, not holder identity or scores.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400"><Shield size={12} /><span>Signed DSTS verification token</span></div>
        </div>
      </Modal>
    </>
  );
}

export default function CertificateList() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(undefined);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    certificateService.getByUser().then(result => setCertificates(result?.data ?? []))
      .catch(error => toast.error(error.message || 'Could not load certificates.')).finally(() => setLoading(false));
  }, []);

  const filtered = certificates.filter(cert =>
    cert.holderName.toLowerCase().includes(search.toLowerCase()) ||
    cert.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
    cert.certificateNumber.toLowerCase().includes(search.toLowerCase())
  );

  const verify = async () => {
    const token = verifyInput.trim().split('/').filter(Boolean).at(-1);
    try {
      setVerifying(true);
      const result = await certificateService.verifyQr(token);
      setVerifyResult(result.data);
    } catch { setVerifyResult(null); }
    finally { setVerifying(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Certificates" subtitle="Secure certificate downloads and privacy-safe QR verification" breadcrumbs={[{ label: 'Certificates' }]} icon={<Award size={18} />} />

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2"><Shield size={15} className="text-brand-gold" /> Verify certificate</p>
        <p className="text-xs text-text-muted mb-3">Paste the signed QR URL or token. Registration numbers and CID values are intentionally not accepted for public lookup.</p>
        <div className="flex gap-2">
          <div className="flex-1"><Input placeholder="Paste signed QR URL or token" value={verifyInput} onChange={event => setVerifyInput(event.target.value)} icon={<Search size={14} />} /></div>
          <Button onClick={verify} disabled={!verifyInput.trim() || verifying}>{verifying ? 'Checking...' : 'Verify'}</Button>
        </div>
        {verifyResult !== undefined && (
          <div className={`mt-3 p-3 rounded-xl border text-sm ${verifyResult?.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {verifyResult ? `${verifyResult.certificateNumber}: ${verifyResult.status}. Valid until ${new Date(verifyResult.validUntil).toLocaleDateString()}.` : 'No certificate matches this signed verification token.'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-72"><Input placeholder="Search your certificates" value={search} onChange={event => setSearch(event.target.value)} icon={<Search size={14} />} /></div>
        <p className="text-xs text-text-muted ml-auto">{filtered.length} certificate{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? <div className="text-center py-16 text-text-muted">Loading certificates...</div> : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted"><Award size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm font-medium text-text-primary">No certificates available</p><p className="text-xs mt-1">Certificates appear after authorized issuance from declared results.</p></div>
      ) : <div className="grid grid-cols-1 gap-8 w-full">{filtered.map(cert => <CertificateCard key={cert.id} cert={cert} />)}</div>}
    </div>
  );
}
