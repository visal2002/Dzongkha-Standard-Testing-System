import { useEffect, useState } from 'react';
import { humanizeStatus } from '@/lib/statusLabels';
import { useParams } from 'react-router-dom';
import { certificateService } from '@/features/certificates/api';
export default function CertificateVerify() {
 const { token } = useParams(); const [result, setResult] = useState(null); const [error, setError] = useState('');
 useEffect(() => { let active = true; setResult(null); setError(''); certificateService.verifyQr(token).then(response => { if (active) setResult(response.data ?? response); }).catch(() => { if (active) setError('This certificate verification link is invalid or unavailable.'); }); return () => { active = false; }; }, [token]);
 return <main className="min-h-screen bg-slate-100 text-slate-900 p-6 flex items-center justify-center"><section className="bg-white rounded-xl shadow p-8 max-w-lg w-full"><h1 className="text-xl font-bold">DSTS Certificate Verification</h1>
 {error ? <p role="alert" className="mt-4 text-red-700">{error}</p> : !result ? <p className="mt-4">Checking certificate...</p> : <div className="mt-4 space-y-2"><p className={result.valid ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{result.valid ? 'Valid certificate' : 'Certificate is not valid'}</p><p>Certificate: {result.certificateNumber}</p><p>Status: {humanizeStatus(result.status)}</p><p>Issued: {new Date(result.issuedAt).toLocaleDateString()}</p><p>Valid until: {new Date(result.validUntil).toLocaleDateString()}</p><p className="text-sm text-slate-500">Holder identity and scores are private.</p></div>}
 </section></main>;
}
