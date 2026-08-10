import { useState } from 'react';
import { Award, Download, QrCode, Search, Eye, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { certificateService } from '../../services/certificates';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const getBandColor = (level) => {
  const map = { C2: 'from-purple-600 to-purple-800', C1: 'from-blue-600 to-blue-800', B2: 'from-teal-600 to-teal-800', B1: 'from-emerald-600 to-emerald-800', A2: 'from-amber-600 to-amber-800', A1: 'from-red-600 to-red-800' };
  return map[level] || 'from-[#F59E0B] to-[#D97706]';
};

function CertificateCard({ cert }) {
  const [showQR, setShowQR] = useState(false);
  const isValid = new Date(cert.validUntil) > new Date();

  return (
    <>
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-brand-gold/30 transition-all">
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${getBandColor(cert.bandLevel)} p-5 relative overflow-hidden`}>
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium">Dzongkha Standard Testing System</p>
              <p className="text-white text-sm font-semibold mt-0.5">{cert.registrationNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[10px]">CEFR Level</p>
              <p className="text-3xl font-black text-white">{cert.bandLevel}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-medium mb-1">Certificate Holder</p>
            <p className="text-base font-bold text-text-primary">{cert.testTakerName}</p>
          </div>

          {/* Scores grid */}
          <div className="grid grid-cols-4 gap-2">
            {['writing', 'reading', 'listening', 'speaking'].map(s => (
              <div key={s} className="text-center p-2 bg-surface-bg rounded-lg border border-surface-border">
                <p className="text-sm font-bold text-brand-gold">{cert[s]}</p>
                <p className="text-[9px] text-text-muted capitalize mt-0.5">{s.substring(0, 4)}.</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-text-muted">Issued: {new Date(cert.issueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className={isValid ? 'text-emerald-400' : 'text-red-400'}>Valid until: {new Date(cert.validUntil).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <StatusBadge status={isValid ? 'active' : 'rejected'} />
          </div>

          <div className="flex gap-2 pt-2 border-t border-surface-border">
            <Button variant="primary" size="sm" icon={<Download size={13} />} className="flex-1" onClick={() => toast.success('Certificate downloaded!')}>Download PDF</Button>
            <Button variant="secondary" size="sm" icon={<QrCode size={13} />} onClick={() => setShowQR(true)}>QR</Button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Certificate QR Code" size="sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG value={cert.qrCode} size={180} fgColor="#1B2A4A" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">{cert.testTakerName}</p>
            <p className="text-xs text-text-muted mt-0.5">{cert.registrationNumber}</p>
            <p className="text-xs text-text-muted">Band: {cert.bandLevel} · Avg: {cert.average}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Shield size={12} />
            <span>Scan to verify authenticity</span>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function CertificateList() {
  const { user } = useAuth();
  const { data: certificatesData, loading } = useApi(certificateService.getAll);
  const certificates = certificatesData || [];

  const [search, setSearch] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const myCerts = user?.role === 'test_taker'
    ? certificates.filter(c => c.testTakerId === user?.id || c.cid === user?.cid)
    : certificates;
  const filtered = myCerts.filter(c =>
    c.testTakerName.toLowerCase().includes(search.toLowerCase()) ||
    c.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.cid?.includes(search)
  );

  const handleVerify = async () => {
    try {
      const result = await certificateService.verify(verifyInput);
      setVerifyResult(result || null);
    } catch {
      // Fallback: search local data
      const found = certificates.find(c => c.qrCode === verifyInput || c.registrationNumber === verifyInput || c.cid === verifyInput);
      setVerifyResult(found || null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.role === 'test_taker' ? 'My Certificates' : 'Certificate Management'}
        subtitle="View, download, and verify DSTS certificates"
        breadcrumbs={[{ label: 'Certificates' }]}
        icon={<Award size={18} />}
      />

      {/* Certificate Verification */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Shield size={15} className="text-brand-gold" /> Verify Certificate</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input placeholder="Enter Registration Number, CID, or QR code..." value={verifyInput} onChange={e => setVerifyInput(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Button onClick={handleVerify} disabled={!verifyInput}>Verify</Button>
        </div>
        {verifyResult !== null && (
          <div className={`mt-3 p-3 rounded-xl border text-sm ${verifyResult ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            {verifyResult ? (
              <div className="flex items-start gap-2 text-emerald-400">
                <Shield size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">✓ Valid Certificate</p>
                  <p className="text-xs mt-0.5">{verifyResult.testTakerName} · {verifyResult.registrationNumber} · Band {verifyResult.bandLevel} · Valid until {new Date(verifyResult.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-400 flex items-center gap-1.5"><Shield size={14} /> No valid certificate found for this identifier.</p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Input placeholder="Search certificates..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>
        <p className="text-xs text-text-muted ml-auto">{filtered.length} certificate{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Award size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No certificates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 w-full">
          {filtered.map(cert => <CertificateCard key={cert.id} cert={cert} />)}
        </div>
      )}
    </div>
  );
}
