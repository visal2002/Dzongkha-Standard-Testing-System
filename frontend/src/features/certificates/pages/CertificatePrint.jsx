import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { certificateService } from '@/features/certificates/api';
import { ArrowLeft, Download, FileCheck2, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import './CertificatePrint.css';

function MountainOrnament() {
  return <svg viewBox="0 0 600 120" fill="none" aria-hidden="true" className="certificate-mountains"><path d="M0 116 90 49 144 90 247 12 354 103 416 50 510 115 561 76 600 110"/><path d="m215 37 32-25 34 29-20-7-14 7-12-9-20 5M66 67l24-18 28 23-17-6-11 5-10-8-14 4"/><path d="M0 117h600"/></svg>;
}

function CertificateLoader() {
  return <section className="certificate-loading-card" aria-labelledby="certificate-loading-title">
    <div className="certificate-woven-band" aria-hidden="true" />
    <div className="certificate-loader-art" aria-hidden="true">
      <div className="certificate-loader-orbit" />
      <div className="certificate-loader-petals">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--petal-angle': `${i * 45}deg` }} />)}</div>
      <div className="certificate-loader-seal"><img src="/images/dzongjuk-seal-transparent.png" alt="" /></div>
    </div>
    <p className="certificate-eyebrow">A milestone worth celebrating</p>
    <h1 id="certificate-loading-title">Your achievement,<br/><span>beautifully certified.</span></h1>
    <div role="status" aria-live="polite" className="certificate-loading-status"><span className="certificate-status-dot" aria-hidden="true"/>Preparing your certificate</div>
    <p className="certificate-loading-copy">We’re bringing your details together into your official DSTS certificate. Your PDF will appear here when it’s ready.</p>
    <div className="certificate-loading-track" aria-hidden="true"><span /></div>
    <p className="certificate-loading-hint">The first PDF may take 10–20 seconds. Please keep this page open.</p>
    <div className="certificate-loading-footer"><ShieldCheck size={15}/><span>Securely prepared for you</span></div>
    <MountainOrnament />
  </section>;
}
export default function CertificatePrint() {
  const { id } = useParams(); const navigate = useNavigate();
  const [url, setUrl] = useState(null); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; let objectUrl; const controller = new AbortController();
    const deadline = setTimeout(() => { if (active) { active = false; controller.abort(); setError('Certificate generation took too long. Please retry.'); } }, 60000);
    const previousTitle = document.title;
    document.title = 'DSTS Certificate'; setError(''); setUrl(null);
    certificateService.download(id, { signal: controller.signal }).then(response => {
      if (!(response.data instanceof Blob) || response.data.size === 0) throw new Error('The certificate PDF is unavailable.');
      clearTimeout(deadline); objectUrl = URL.createObjectURL(response.data); if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
    }).catch(() => { clearTimeout(deadline); if (active) setError('We couldn’t prepare your certificate. Please try again, or return to your certificates.'); });
    return () => { clearTimeout(deadline); controller.abort(); active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); document.title = previousTitle; };
  }, [id, attempt]);
  return <main className="certificate-print-shell">
    <header className="certificate-print-toolbar">
      <button className="certificate-back-button" onClick={() => navigate(-1)}><ArrowLeft size={16}/><span>Back</span></button>
      <div className="certificate-toolbar-brand"><FileCheck2 size={20}/><div><strong>DSTS Certificate</strong><span>Dzongkha Standard Testing System</span></div></div>
      {url ? <a className="certificate-download-button" href={url} download="DSTS_Certificate.pdf"><Download size={16}/><span>Download PDF</span></a> : <span className="certificate-toolbar-label">Official certificate</span>}
    </header>
    {error ? <div className="certificate-loading-stage"><section className="certificate-loading-card certificate-error-card" role="alert"><div className="certificate-woven-band" aria-hidden="true"/><div className="certificate-error-icon"><AlertCircle size={30}/></div><p className="certificate-eyebrow">Let’s try that again</p><h1>Your certificate<br/>needs a moment.</h1><p className="certificate-loading-copy">{error}</p><button className="certificate-download-button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16}/>Try again</button><MountainOrnament/></section></div>
      : !url ? <div className="certificate-loading-stage"><CertificateLoader/></div>
      : <div className="certificate-pdf-frame"><iframe title="DSTS certificate PDF" src={url}/><p>If the preview isn’t supported on your device, use <a href={url} download="DSTS_Certificate.pdf">Download PDF</a>.</p></div>}
  </main>;
}
