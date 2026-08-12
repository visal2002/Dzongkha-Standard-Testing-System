/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ChevronLeft, User, Mail, Lock, CreditCard, Calendar, Phone, PlayCircle, Scan, ArrowLeft, AlertTriangle, X, Smartphone, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import {
  BhutanNDIButton,
  BhutanNDIDeeplinkModal,
  BhutanNDIQRScanModal,
  BhutanNDICombinedModal,
} from '../../components/ui/BhutanNDI';
import toast from 'react-hot-toast';

const IS_NDI_PREVIEW = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

function NdiQrCode({ qrUrl, isLoading, error, onErrorClose, onError }) {
  return (
    <div className="relative border-4 border-(--ndi-primary) rounded-3xl p-3 bg-white shadow-sm flex flex-col items-center justify-center min-w-50 min-h-50">
      {error ? (
        <div className="flex flex-col items-center text-center p-2 w-44">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3 text-amber-500 shadow-inner">
            <AlertTriangle size={28} className="text-amber-500 fill-amber-100" />
          </div>
          <div className="text-slate-600 text-xs font-medium mb-4 wrap-break-word leading-relaxed w-full">
            {error}
          </div>
          <button
            type="button"
            onClick={onErrorClose}
            className="px-5 py-1.5 rounded-full border border-[#3ec49c] text-[#299d7b] hover:bg-emerald-50 text-xs font-semibold transition-colors focus:outline-none"
          >
            Close
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center text-[#3ec49c] space-y-3 p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
          <span className="text-xs font-medium">Loading Scanner...</span>
        </div>
      ) : qrUrl ? (
        <div className="relative w-44 h-44 bg-white flex items-center justify-center">
          <img
            src={qrUrl}
            alt="NDI QR Code Scanner"
            className="w-full h-full object-contain rounded-xl"
            onError={() => onError && onError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON")}
          />
        </div>
      ) : (
        <div className="relative w-44 h-44 bg-white flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
            {/* Top Left Corner */}
            <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="11" y="11" width="14" height="14" rx="2" fill="currentColor" />
            {/* Top Right Corner */}
            <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="75" y="11" width="14" height="14" rx="2" fill="currentColor" />
            {/* Bottom Left Corner */}
            <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="11" y="75" width="14" height="14" rx="2" fill="currentColor" />

            {/* QR Data Dots Pattern */}
            <rect x="36" y="7" width="5" height="5" rx="1" />
            <rect x="46" y="7" width="5" height="5" rx="1" />
            <rect x="56" y="7" width="5" height="5" rx="1" />
            <rect x="36" y="17" width="5" height="5" rx="1" />
            <rect x="46" y="17" width="5" height="5" rx="1" />

            <rect x="7" y="36" width="5" height="5" rx="1" />
            <rect x="17" y="36" width="5" height="5" rx="1" />
            <rect x="27" y="36" width="5" height="5" rx="1" />
            <rect x="36" y="36" width="5" height="5" rx="1" />
            <rect x="56" y="36" width="5" height="5" rx="1" />
            <rect x="66" y="36" width="5" height="5" rx="1" />
            <rect x="76" y="36" width="5" height="5" rx="1" />
            <rect x="86" y="36" width="5" height="5" rx="1" />

            <rect x="7" y="46" width="5" height="5" rx="1" />
            <rect x="27" y="46" width="5" height="5" rx="1" />
            <rect x="66" y="46" width="5" height="5" rx="1" />
            <rect x="86" y="46" width="5" height="5" rx="1" />

            <rect x="7" y="56" width="5" height="5" rx="1" />
            <rect x="17" y="56" width="5" height="5" rx="1" />
            <rect x="27" y="56" width="5" height="5" rx="1" />
            <rect x="66" y="56" width="5" height="5" rx="1" />
            <rect x="76" y="56" width="5" height="5" rx="1" />
            <rect x="86" y="56" width="5" height="5" rx="1" />

            <rect x="36" y="76" width="5" height="5" rx="1" />
            <rect x="46" y="76" width="5" height="5" rx="1" />
            <rect x="56" y="76" width="5" height="5" rx="1" />
            <rect x="76" y="76" width="5" height="5" rx="1" />
            <rect x="86" y="76" width="5" height="5" rx="1" />

            <rect x="36" y="86" width="5" height="5" rx="1" />
            <rect x="56" y="86" width="5" height="5" rx="1" />
            <rect x="66" y="86" width="5" height="5" rx="1" />
            <rect x="86" y="86" width="5" height="5" rx="1" />
          </svg>

          {/* Center NDI Badge Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#1b3d39] border-4 border-(--ndi-primary) p-1 shadow-md flex items-center justify-center">
              <img src="/images/NDI Bhutan Logo.ico" alt="NDI" className="w-8 h-8 object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NdiProofModal({ login, status, error, onClose, onRetry }) {
  if (!login) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ndi-login-title">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-h-[95vh] w-full max-w-147.5 overflow-y-auto rounded-4xl bg-[#F8F8F8] px-6 py-8 text-center shadow-2xl sm:px-12"
      >
        <button type="button" onClick={onClose} aria-label="Close Bhutan NDI login" className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700">
          <X size={20} />
        </button>
        <h2 id="ndi-login-title" className="mb-7 text-lg font-semibold text-black">
          <span className="hidden sm:inline">Scan with </span><span className="sm:hidden">Login with </span><span className="text-[#5AC994]">Bhutan NDI</span> Wallet
        </h2>
        {IS_NDI_PREVIEW && (
          <div className="mx-auto mb-5 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium leading-5 text-amber-800">
            Preview mode: wallet approval is simulated for interface testing. No identity data is verified.
          </div>
        )}
        {login.deepLinkUrl && (
          <>
            <a href={login.deepLinkUrl} className="mx-auto mb-5 inline-flex h-12.5 w-full max-w-75 items-center justify-center gap-2 rounded-lg bg-[#5AC994] px-5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:hidden">
              <Smartphone size={18} /> Open Bhutan NDI Wallet
            </a>
            <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-[#8d8d8d] sm:hidden"><span className="h-px flex-1 bg-[#A1A0A0]" />OR<span className="h-px flex-1 bg-[#A1A0A0]" /></div>
          </>
        )}
        {error ? (
          <div className="mx-auto mb-7 flex min-h-55 max-w-sm flex-col items-center justify-center rounded-3xl border border-amber-200 bg-white p-6">
            <AlertTriangle size={38} className="mb-3 text-amber-500" />
            <p className="mb-5 text-sm leading-6 text-slate-600">{error}</p>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border-2 border-[#5AC994] px-5 py-2 text-sm font-medium text-[#38ad78] hover:bg-[#5AC994] hover:text-white"><RefreshCw size={16} /> Try again</button>
          </div>
        ) : (
          <div className="mx-auto mb-7 w-fit rounded-3xl border-4 border-[#5AC994] bg-white p-3 shadow-sm">
            <QRCodeSVG value={login.proofRequestUrl} size={190} level="H" marginSize={1} imageSettings={{ src: '/images/NDI Bhutan Logo.ico', width: 38, height: 38, excavate: true }} title="Bhutan NDI login QR code" />
          </div>
        )}
        {!error && (
          <div className="mb-7 space-y-2 text-sm font-medium leading-5 text-[#A1A0A0]">
            <p>1. Open Bhutan NDI Wallet on your phone</p>
            <p className="flex flex-wrap items-center justify-center gap-1.5">2. Tap the Scan button <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5AC994] text-white"><Scan size={14} /></span> and scan the QR code</p>
            {status === 'PENDING' && <p className="pt-2 text-xs text-[#38ad78]" aria-live="polite">Waiting for approval in your wallet...</p>}
          </div>
        )}
        <a href="https://www.youtube.com/@bhutanndi" target="_blank" rel="noreferrer" className="mx-auto mb-7 inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-[#5AC994] px-5 text-sm font-medium text-[#38ad78] transition hover:bg-[#5AC994] hover:text-white">Watch video guide <PlayCircle size={17} /></a>
        <p className="mb-3 text-sm text-[#A1A0A0]">Don't have the Bhutan NDI Wallet? <a href="https://www.bhutanndi.com" target="_blank" rel="noreferrer" className="font-semibold text-[#5AC994] hover:underline">Download Now!</a></p>
        <p className="mb-2 mt-7 text-sm font-semibold text-[#5AC994]">Get Support</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-700">
          <a href="mailto:ndifeedback@dhi.bt" className="inline-flex items-center gap-1.5 hover:text-[#38ad78]"><Mail size={16} className="text-[#5AC994]" />ndifeedback@dhi.bt</a>
          <a href="tel:1199" className="inline-flex items-center gap-1.5 hover:text-[#38ad78]"><Phone size={16} className="text-[#5AC994]" />1199</a>
        </div>
      </motion.div>
    </div>
  );
}

export function NdiLoginPage() {
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate();

  const openWallet = () => window.open('https://www.bhutanndi.com', '_blank');
  const openGuide = () => window.open('https://www.youtube.com/@bhutanndi', '_blank');

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-(--ndi-primary)">
                    Bhutan NDI Integration
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold text-slate-950">
                    Login with Bhutan NDI Wallet
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Back to portal
                </button>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Use Bhutan NDI to sign in securely and verify access with the official NDI Wallet experience.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <BhutanNDIButton variant="filled" onClick={() => setActiveModal('combined')} />
                <BhutanNDIButton variant="outline" onClick={() => setActiveModal('deeplink')} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('qr')}
                  className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-(--ndi-primary) hover:shadow-lg"
                >
                  <p className="text-sm font-semibold text-slate-900">Open website QR scan popup</p>
                  <p className="mt-2 text-sm text-(--ndi-text-secondary)">
                    Preview the QR scan flow for desktop users.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('deeplink')}
                  className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-(--ndi-primary) hover:shadow-lg"
                >
                  <p className="text-sm font-semibold text-slate-900">Open mobile deeplink popup</p>
                  <p className="mt-2 text-sm text-(--ndi-text-secondary)">
                    Preview the mobile deep link pattern for NDI Wallet launch.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-4xl border border-slate-200 bg-(--ndi-popup-bg) p-6 shadow-sm">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-(--ndi-primary) mb-3">
                Scan with Bhutan NDI Wallet
              </p>
              <div className="mb-6 flex items-center justify-center">
                <img src="/images/NDI/QRlogo.svg" alt="QR code placeholder" className="h-44 w-44 object-contain" />
              </div>
              <p className="text-sm leading-6 text-(--ndi-text-secondary)">
                Tap the scan button located on the menu bar and scan the QR code
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <button
                type="button"
                onClick={openWallet}
                className="inline-flex h-12.5 items-center justify-center rounded-[14px] bg-(--ndi-primary) px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow-lg"
              >
                Open Bhutan NDI Wallet
              </button>
              <button
                type="button"
                onClick={openGuide}
                className="inline-flex h-12.5 items-center justify-center rounded-[14px] border-2 border-(--ndi-primary) bg-white px-6 text-sm font-semibold text-(--ndi-primary) transition hover:bg-(--ndi-primary) hover:text-white"
              >
                Watch Video Guide
              </button>
              <p className="text-sm text-(--ndi-text-secondary)">
                Don’t have the Bhutan NDI Wallet?{' '}
                <a href="https://www.bhutanndi.com" target="_blank" rel="noreferrer" className="font-semibold text-(--ndi-primary) hover:underline">
                  Download Now!
                </a>
              </p>
              <div className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5">
                <p className="text-lg font-semibold text-(--ndi-primary)">Get Support</p>
                <div className="space-y-3">
                  <a href="mailto:ndifeedback@dhi.bt" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-(--ndi-popup-bg) px-4 py-3 text-sm transition hover:border-(--ndi-primary) hover:text-(--ndi-primary)">
                    <img src="/images/NDI/Mail.svg" alt="Email icon" className="h-5 w-5" />
                    ndifeedback@dhi.bt
                  </a>
                  <a href="tel:1199" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-(--ndi-popup-bg) px-4 py-3 text-sm transition hover:border-(--ndi-primary) hover:text-(--ndi-primary)">
                    <img src="/images/NDI/Call.svg" alt="Phone icon" className="h-5 w-5" />
                    1199
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BhutanNDIDeeplinkModal
        isOpen={activeModal === 'deeplink'}
        onClose={() => setActiveModal(null)}
        onOpenWallet={openWallet}
        onWatchGuide={openGuide}
      />
      <BhutanNDIQRScanModal
        isOpen={activeModal === 'qr'}
        onClose={() => setActiveModal(null)}
        onWatchGuide={openGuide}
      />
      <BhutanNDICombinedModal
        isOpen={activeModal === 'combined'}
        onClose={() => setActiveModal(null)}
        onOpenWallet={openWallet}
        onWatchGuide={openGuide}
      />
    </div>
  );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signin');
  const [registerMode, setRegisterMode] = useState('ndi'); // 'ndi' | 'form'

  // NDI API State
  const [ndiQrUrl, setNdiQrUrl] = useState(null);
  const [isNdiLoading, setIsNdiLoading] = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiLogin, setNdiLogin] = useState(null);
  const [ndiLoginStatus, setNdiLoginStatus] = useState('IDLE');
  const pollInFlight = useRef(false);

  // Sign-in state
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regCid, setRegCid] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  const { login, loginWithNDI, checkNDILogin, cancelNDILogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(userId, password);
    if (result.success) {
      toast.success(`Welcome, ${result.user.name}!`);
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    toast('Registration completed successfully!', { icon: '🎉' });
  };

  const handleNDI = async () => {
    setIsNdiLoading(true);
    setNdiErrorMessage(null);
    try {
      const result = await loginWithNDI();
      if (result.success) {
        setNdiLogin(result);
        setNdiLoginStatus('PENDING');
      } else {
        setNdiErrorMessage(result.error || 'NDI service is currently unreachable.');
        setNdiLogin({ proofRequestUrl: 'https://invalid.local', deepLinkUrl: null });
        setNdiLoginStatus('FAILED');
      }
    } catch (err) {
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable. Please try again.');
      setNdiLogin({ proofRequestUrl: 'https://invalid.local', deepLinkUrl: null });
      setNdiLoginStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  };

  useEffect(() => {
    if (!ndiLogin?.pollToken || ndiLoginStatus !== 'PENDING') return undefined;
    let stopped = false;
    const poll = async () => {
      if (pollInFlight.current || stopped) return;
      pollInFlight.current = true;
      try {
        const result = await checkNDILogin(ndiLogin.pollToken);
        if (stopped) return;
        if (result.status === 'VALIDATED') {
          setNdiLoginStatus('VALIDATED');
          toast.success(`Welcome, ${result.user.name}!`);
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiLoginStatus(result.status);
          const messages = {
            REJECTED: 'The proof request was declined in Bhutan NDI Wallet.',
            EXPIRED: 'This QR code has expired. Please create a new one.',
            CANCELLED: 'This Bhutan NDI login was cancelled.',
            FAILED: 'Bhutan NDI could not validate this identity or no account is linked to it.',
          };
          setNdiErrorMessage(messages[result.status] || 'Bhutan NDI login could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiLoginStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check Bhutan NDI login status.');
        }
      } finally {
        pollInFlight.current = false;
      }
    };
    poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiLogin, ndiLoginStatus, checkNDILogin, navigate]);

  const closeNdiLogin = () => {
    if (ndiLogin?.pollToken && ndiLoginStatus === 'PENDING') void cancelNDILogin(ndiLogin.pollToken);
    setNdiLogin(null);
    setNdiLoginStatus('IDLE');
    setNdiErrorMessage(null);
  };

  const tabs = [
    { id: 'signin', label: 'Sign In' },
    { id: 'register', label: 'Register' },
  ];

  return (
    <div
      className="min-h-screen flex bg-cover bg-center relative"
      style={{ backgroundImage: `url('/images/home page background.png')` }}
    >
      <div className="absolute inset-0 bg-slate-950/60 z-0 backdrop-blur-sm" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        {/* Back button */}
        <div className="absolute top-6 left-6 z-20">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 shadow-sm shadow-black/20 transition hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
            Home
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 overflow-hidden">

            {/* ── Logo + Title (always visible, above tabs) ── */}
            <div className="flex flex-col items-center gap-3 pt-6 px-6 pb-4">
              <img
                src="/images/logo of DCDD.png"
                alt="DCDD Logo"
                className="h-14 w-auto object-contain rounded-2xl shadow-lg shadow-slate-800/40"
              />
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                  Dzongkha Standard Testing System
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === 'signin' ? 'Select your login method' : 'Create a new account'}
                </p>
              </div>
            </div>

            {/* ── Tab switcher ── */}
            <div className="flex border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === tab.id
                      ? 'text-teal-600'
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="p-6">

              <AnimatePresence mode="wait">
                {activeTab === 'signin' && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* NDI Login */}
                    <div className="mb-5">
                      <button
                        onClick={handleNDI}
                        disabled={isLoading || isNdiLoading}
                        className="w-full h-12 inline-flex items-center justify-center gap-2.5 rounded-full text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#124143' }}
                      >
                        <img src="/images/NDI Bhutan Logo.ico" alt="NDI" className="h-8 w-8 object-contain" />
                        <span className="tracking-wider font-medium">Login with Bhutan NDI</span>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                      <hr className="flex-1 border-slate-200" />
                      <span className="text-xs text-slate-400 uppercase tracking-[0.35em]">or sign in with credentials</span>
                      <hr className="flex-1 border-slate-200" />
                    </div>

                    {/* Sign-in form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">CID / Email / User ID</label>
                        <input
                          type="text"
                          value={userId}
                          onChange={e => setUserId(e.target.value)}
                          placeholder="Enter your CID, email, or User ID"
                          required
                          className="w-full h-12 px-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            className="w-full h-12 px-4 pr-12 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Remember me + Forgot password */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border border-slate-300 bg-white accent-teal-500 cursor-pointer"
                          />
                          <span className="text-sm text-slate-600">Remember me</span>
                        </label>
                        <button
                          type="button"
                          className="text-sm font-medium text-teal-600 hover:text-teal-500 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button type="submit" fullWidth size="lg" loading={isLoading} className="rounded-full! h-12! tracking-wider text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#214042' }}>
                        Sign in to DSTS
                      </Button>
                    </form>
                  </motion.div>
                )}

                {activeTab === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {registerMode === 'ndi' ? (
                      <div className="flex flex-col items-center text-center">
                        <h2 className="text-slate-700 font-bold text-base mb-4">
                          Scan with <span className="text-[#3ec49c]">Bhutan NDI</span> Wallet.
                        </h2>

                        {/* QR Code Container */}
                        <div className="mb-4">
                          <NdiQrCode
                            qrUrl={ndiQrUrl}
                            isLoading={isNdiLoading}
                            error={ndiErrorMessage}
                            onErrorClose={() => setNdiErrorMessage(null)}
                            onError={(err) => setNdiErrorMessage(err)}
                          />
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2 text-xs text-slate-500 font-medium max-w-xs mb-4">
                          <p>1. &nbsp; Open Bhutan NDI Wallet on your phone</p>
                          <p className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span>2. Tap the Scan button</span>
                            <span className="inline-flex items-center justify-center bg-[#3ec49c] text-white rounded-full p-1 w-5 h-5 shadow-sm">
                              <Scan size={12} />
                            </span>
                            <span>located on the menu bar and scan the QR code</span>
                          </p>
                        </div>

                        {/* Watch video guide button */}
                        <button
                          type="button"
                          onClick={() => window.open('https://www.youtube.com/@bhutanndi', '_blank')}
                          className="px-6 py-2.5 rounded-full border border-[#3ec49c] text-[#299d7b] hover:bg-emerald-50 text-sm font-semibold inline-flex items-center gap-2 transition-colors mb-5"
                        >
                          Watch video guide
                          <PlayCircle size={18} className="text-[#3ec49c]" />
                        </button>

                        {/* Download Prompt */}
                        <p className="text-xs text-slate-500 mb-3">
                          Don't have the Bhutan NDI Wallet?{' '}
                          <a
                            href="https://www.bhutanndi.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#3ec49c] font-bold hover:underline"
                          >
                            Download Now!
                          </a>
                        </p>

                        {/* App Badges */}
                        <div className="flex items-center gap-3 mb-4">
                          {/* Google Play */}
                          <a
                            href="https://play.google.com/store/search?q=NDI%20Bhutan&c=apps&hl=en"
                            target="_blank"
                            rel="noreferrer"
                            className="bg-black hover:bg-slate-900 text-white rounded-xl px-3 py-1.5 inline-flex items-center gap-2 text-left transition-colors shadow-sm"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L18.81,13.96C20.39,13.04 20.39,10.96 18.81,10.04L16.81,8.88L14.8,10.89L16.81,15.12M4.6,1.4L14.07,10.88L15.93,9.02L5.84,0.31C5.23,0 4.6,0.2 4.6,1.4M4.6,22.6C4.6,23.8 5.23,24 5.84,23.69L15.93,14.98L14.07,13.12L4.6,22.6Z" />
                            </svg>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-300 leading-none">GET IT ON</div>
                              <div className="text-xs font-semibold leading-tight">Google Play</div>
                            </div>
                          </a>

                          {/* App Store */}
                          <a
                            href="https://apps.apple.com/bt/app/bhutan-ndi/id1645493166"
                            target="_blank"
                            rel="noreferrer"
                            className="bg-black hover:bg-slate-900 text-white rounded-xl px-3 py-1.5 inline-flex items-center gap-2 text-left transition-colors shadow-sm"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.84 1.46-.62.72-1.16 1.88-1.01 3 .01 0 .04.01.07.01 1.08 0 2.18-.55 2.79-1.37z" />
                            </svg>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-300 leading-none">Download on the</div>
                              <div className="text-xs font-semibold leading-tight">App Store</div>
                            </div>
                          </a>
                        </div>

                        {/* Get Support */}
                        <div className="text-center mb-5">
                          <p className="text-xs font-bold text-[#3ec49c]">Get Support</p>
                          <div className="flex items-center justify-center gap-4 text-xs text-slate-600 mt-1.5">
                            <a href="mailto:ndifeedback@dhi.bt" className="inline-flex items-center gap-1 hover:text-[#3ec49c] transition-colors">
                              <Mail size={14} className="text-[#3ec49c]" />
                              <span>ndifeedback@dhi.bt</span>
                            </a>
                            <a href="tel:1199" className="inline-flex items-center gap-1 hover:text-[#3ec49c] transition-colors">
                              <Phone size={14} className="text-[#3ec49c]" />
                              <span>1199</span>
                            </a>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full flex items-center gap-3 mb-4">
                          <hr className="flex-1 border-slate-200" />
                          <span className="text-xs text-slate-400 font-medium">or</span>
                          <hr className="flex-1 border-slate-200" />
                        </div>

                        {/* Register without NDI button */}
                        <button
                          type="button"
                          onClick={() => setRegisterMode('form')}
                          className="w-full py-3 px-4 rounded-full border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          Register without NDI
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Header banner to switch back to NDI */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setRegisterMode('ndi')}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <ArrowLeft size={14} />
                            <span>Back to NDI</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterMode('ndi')}
                            className="inline-flex items-center gap-1.5 text-xs text-[#299d7b] hover:text-[#218366] font-semibold transition-colors bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"
                          >
                            <img src="/images/NDI Bhutan Logo.ico" alt="NDI" className="w-4 h-4 object-contain" />
                            Register with NDI
                          </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                            <div className="relative">
                              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={regName}
                                onChange={e => setRegName(e.target.value)}
                                placeholder="Enter your full name"
                                required
                                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">CID No.</label>
                            <div className="relative">
                              <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={regCid}
                                onChange={e => setRegCid(e.target.value)}
                                placeholder="Enter 11-digit CID No."
                                required
                                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Date of Birth</label>
                            <div className="relative">
                              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="date"
                                value={regDob}
                                onChange={e => setRegDob(e.target.value)}
                                required
                                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Contact No.</label>
                            <div className="relative">
                              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="tel"
                                value={regPhone}
                                onChange={e => setRegPhone(e.target.value)}
                                placeholder="Enter mobile number"
                                required
                                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Email Address</label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={regEmail}
                                onChange={e => setRegEmail(e.target.value)}
                                placeholder="name@dsts.bt"
                                required
                                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                            <div className="relative">
                              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type={showRegPass ? 'text' : 'password'}
                                value={regPassword}
                                onChange={e => setRegPassword(e.target.value)}
                                placeholder="Create a password"
                                required
                                className="w-full h-12 pl-10 pr-12 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegPass(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <Button type="submit" fullWidth size="lg" loading={isLoading} className="rounded-full! h-12! tracking-wider text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#214042' }}>
                            Create Account
                          </Button>

                          <p className="text-center text-xs text-slate-500 mt-2">
                            Already have an account?{' '}
                            <button type="button" onClick={() => setActiveTab('signin')} className="text-teal-600 hover:text-teal-500 font-medium transition-colors">
                              Sign In
                            </button>
                          </p>
                        </form>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-300 leading-relaxed">
            <p>© {new Date().getFullYear()} Department of Culture and Dzongkha Development</p>
            <p>Ministry of Home Affairs &bull; Powered by GovTech Bhutan</p>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {ndiLogin && (
          <NdiProofModal
            login={ndiLogin}
            status={ndiLoginStatus}
            error={ndiErrorMessage}
            onClose={closeNdiLogin}
            onRetry={() => { closeNdiLogin(); void handleNDI(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
