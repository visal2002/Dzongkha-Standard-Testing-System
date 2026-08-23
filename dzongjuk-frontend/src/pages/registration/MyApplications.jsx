/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Calendar, MapPin, CreditCard, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { applicationService } from '../../services/applications';
import { examService } from '../../services/exams';
import toast from 'react-hot-toast';

export default function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myApps, setMyApps] = useState([]);
  const [examWindows, setExamWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentBusy, setPaymentBusy] = useState(null);

  const reloadApplications = async () => {
    const response = await applicationService.getByUser(user?.id);
    setMyApps(response.data);
  };

  const continuePayment = async app => {
    setPaymentBusy(app.id);
    try {
      const payment = app.paymentRedirectUrl
        ? { redirectUrl: app.paymentRedirectUrl }
        : await applicationService.createPaymentAdvice(app.id);
      if (!payment.redirectUrl) throw new Error('BIRMS did not provide a payment page.');
      window.location.assign(payment.redirectUrl);
    } catch (error) {
      toast.error(error.message || 'Unable to start BIRMS payment.');
      setPaymentBusy(null);
    }
  };

  const refreshPayment = async app => {
    setPaymentBusy(app.id);
    try {
      const payment = await applicationService.refreshPayment(app.id);
      toast.success(`Payment status: ${String(payment.status).replace(/_/g, ' ')}`);
      await reloadApplications();
    } catch (error) {
      toast.error(error.message || 'Unable to check BIRMS payment status.');
    } finally { setPaymentBusy(null); }
  };

  const downloadReceipt = async app => {
    setPaymentBusy(app.id);
    try {
      const receipt = await applicationService.getPaymentReceipt(app.id);
      if (!receipt.base64Pdf) throw new Error('BIRMS did not return a receipt file.');
      const binary = atob(receipt.base64Pdf.replace(/\s/g, ''));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receipt.receiptNumber || 'BIRMS-receipt'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || 'Unable to download the BIRMS receipt.');
    } finally { setPaymentBusy(null); }
  };

  useEffect(() => {
    let active = true;
    Promise.all([applicationService.getByUser(user?.id), examService.getAll()])
      .then(([applicationResponse, examResponse]) => {
        if (!active) return;
        setMyApps(applicationResponse.data);
        setExamWindows(examResponse.data);
      })
      .catch((error) => toast.error(error.message || 'Unable to load applications.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        subtitle="Track all your DSTS examination applications"
        breadcrumbs={[{ label: 'Registration' }, { label: 'My Applications' }]}
        icon={<FileText size={18} />}
        action={
          <Button icon={<Plus size={14} />} onClick={() => navigate('/registration/windows')}>
            New Application
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16 text-sm text-text-muted">Loading applications...</div>
      ) : myApps.length === 0 ? (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">No applications yet</p>
          <p className="text-xs mt-1 mb-4">Register for an exam to get started.</p>
          <Button size="sm" onClick={() => navigate('/registration/windows')}>Browse Exam Windows</Button>
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

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
                  <div>
                    <p className="text-text-muted mb-0.5">Registration No.</p>
                    <p className="font-medium text-brand-gold">{app.registrationNumber || '—'}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CreditCard size={12} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-text-muted mb-1">Payment ({app.paymentCurrency})</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{Number(app.paymentAmount).toFixed(2)}</span>
                        <StatusBadge status={app.paymentStatus} />
                      </div>
                    </div>
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

                {Number(app.paymentAmount) > 0 && (
                  <div className="mb-4 rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Payment through BIRMS</p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          Choose counter payment, online payment, supported bank mobile apps, or internet banking on the secure BIRMS page.
                        </p>
                        {app.paymentAdviceNo && <p className="mt-1 text-[10px] text-text-muted">Payment Advice: {app.paymentAdviceNo}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['initiated', 'failed', 'cancelled', 'reversed'].includes(app.paymentStatus) && app.status === 'verified' && (
                          <Button size="xs" loading={paymentBusy === app.id} icon={<ExternalLink size={12} />} onClick={() => continuePayment(app)}>
                            {app.paymentRedirectUrl ? 'Continue Payment' : 'Pay via BIRMS'}
                          </Button>
                        )}
                        {app.paymentReference && app.paymentStatus !== 'paid' && (
                          <Button size="xs" variant="outline" disabled={paymentBusy === app.id} icon={<RefreshCw size={12} />} onClick={() => refreshPayment(app)}>Check Status</Button>
                        )}
                        {app.paymentStatus === 'paid' && app.paymentReceiptNo && (
                          <Button size="xs" variant="outline" disabled={paymentBusy === app.id} icon={<Download size={12} />} onClick={() => downloadReceipt(app)}>Receipt</Button>
                        )}
                        {app.status !== 'verified' && app.paymentStatus !== 'paid' && (
                          <span className="self-center text-[11px] font-medium text-text-muted">Available after application verification</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status timeline */}
                <div className="pt-3 border-t border-surface-border">
                  <p className="text-[10px] font-semibold text-text-muted uppercase mb-2">Status History</p>
                  <div className="flex items-center gap-0">
                    {(app.statusHistory?.length ? app.statusHistory : [{ status: app.status }]).map((h, i, history) => (
                      <div key={i} className="flex items-center gap-0">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#D4830A]" />
                          <div className="text-[9px] text-text-muted mt-1 text-center w-20">{h.status.replace(/_/g, ' ')}</div>
                        </div>
                        {i < history.length - 1 && <div className="w-8 h-px bg-[var(--color-surface-border)] mb-3" />}
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
