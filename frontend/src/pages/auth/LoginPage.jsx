/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ChevronLeft, User, Calendar,
  ArrowLeft, AlertTriangle, X, Lock, Phone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import LanguageToggle from '@/components/LanguageToggle';
import toast from 'react-hot-toast';

// ─── NDI Asset paths ──────────────────────────────────────────────────────────
const NDI_ASSETS = {
  qrLogo:      '/images/NDI/QRlogo.svg',
  scanIcon:    '/images/NDI/scaniconimg.svg',
  playButton:  '/images/NDI/PlayButton.svg',
  mailIcon:    '/images/NDI/Mail.svg',
  callIcon:    '/images/NDI/Call.svg',
  centerLogo:  '/images/NDI/ButtonNDILogo.svg',
};

// ─── NDI Sub-components ───────────────────────────────────────────────────────

/**
 * Turns a raw error string into a human explanation of *why* NDI is not working,
 * so the failure state can keep the normal scanner layout and simply say what broke.
 */
function describeNdiError(error) {
  const raw = typeof error === 'string' ? error.trim() : '';
  const hints = [
    {
      match: /network|failed to fetch|err_network|econnrefused|connection|offline/i,
      title: "Can't reach the Bhutan NDI service",
      detail: 'Your device could not connect to the server. Check your internet connection, then try again.',
    },
    {
      match: /timeout|timed out|etimedout/i,
      title: 'The Bhutan NDI service took too long to respond',
      detail: 'The request timed out before a QR code was issued. Please try again in a moment.',
    },
    {
      match: /expired/i,
      title: 'This QR code has expired',
      detail: 'QR codes stay valid for a few minutes only. Generate a new one to continue.',
    },
    {
      match: /declined|rejected/i,
      title: 'The request was declined in your wallet',
      detail: 'Open Bhutan NDI Wallet again and approve the request to continue.',
    },
    {
      match: /cancel/i,
      title: 'This Bhutan NDI request was cancelled',
      detail: 'Nothing was shared. You can start a new request whenever you are ready.',
    },
    {
      match: /unavailable|not configured|maintenance|503|502|500/i,
      title: 'Bhutan NDI is not responding right now',
      detail: 'The identity service is temporarily unavailable. Please try again shortly.',
    },
    {
      match: /validate|verify|identity/i,
      title: 'Bhutan NDI could not verify this identity',
      detail: 'The credential in your wallet could not be validated for this account.',
    },
  ];

  const hint = hints.find(h => h.match.test(raw));
  if (hint) {
    return { title: hint.title, detail: hint.detail, raw: raw && raw !== hint.detail ? raw : null };
  }
  return {
    title: 'Bhutan NDI login could not be completed',
    detail: raw || 'An unexpected error stopped the request.',
    raw: null,
  };
}

const NDI_RETRY_BTN_STYLE = {
  border: '1px solid #5AC994',
  borderRadius: '999px',
  padding: '6px 18px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#38ad78',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background .15s',
};

function NdiQrFrame({ qrUrl, isLoading, error, label = 'Bhutan NDI QR code' }) {
  const { t } = useTranslation();
  return (
    <div className="ndi-scanner-qr-frame" aria-label={label}>
      {error ? (
        // Keep the exact framing of the working state: the QR placeholder stays in
        // place, dimmed, with a small badge marking it as unavailable. The reason
        // itself is shown below the instructions so the layout never collapses.
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <img
            src={NDI_ASSETS.qrLogo}
            alt=""
            aria-hidden="true"
            style={{ width:170, height:170, objectFit:'contain', filter:'grayscale(1)', opacity:0.18 }}
          />
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', padding:'14px', textAlign:'center' }}>
            <AlertTriangle size={28} style={{ color:'#f59e0b' }} />
            <p style={{ margin:0, fontSize:'12px', fontWeight:700, color:'#334155' }}>{t('auth.qr_unavailable')}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'10px', color:'#5AC994' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid currentColor', borderTopColor:'transparent', animation:'spin 0.7s linear infinite' }} />
          <span style={{ fontSize:'11px', fontWeight:600 }}>{t('auth.loading_scanner')}</span>
        </div>
      ) : qrUrl ? (
        <QRCodeSVG
          value={qrUrl}
          size={170}
          level="H"
          marginSize={1}
          imageSettings={{ src: NDI_ASSETS.centerLogo, width: 34, height: 34, excavate: true }}
          title={label}
        />
      ) : (
        <img src={NDI_ASSETS.qrLogo} alt={label} style={{ width:170, height:170, objectFit:'contain' }} />
      )}
    </div>
  );
}

function NdiInstructions({ status, error, onRetry }) {
  const { t } = useTranslation();
  const reason = error ? describeNdiError(error) : null;
  return (
    <div className="ndi-scanner-instructions">
      <p>{t('auth.ndi_step1')}</p>
      <p style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'4px 6px' }}>
        <span>{t('auth.ndi_step2_a')}</span>
        <img src={NDI_ASSETS.scanIcon} alt="Scan" style={{ width:22, height:22, display:'inline-block' }} />
        <span>{t('auth.ndi_step2_b')}</span>
      </p>

      {reason ? (
        // Same slot the "Waiting for approval..." line uses, so the failure state
        // keeps the working design and only explains what went wrong.
        <div
          style={{ paddingTop:'8px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}
          role="alert"
          aria-live="polite"
        >
          <p style={{ fontSize:'12px', fontWeight:700, color:'#b45309' }}>{reason.title}</p>
          <p style={{ fontSize:'12px', fontWeight:500, color:'#64748b', lineHeight:1.45 }}>{reason.detail}</p>
          {reason.raw && (
            <p style={{ fontSize:'11px', fontWeight:500, color:'#94a3b8', lineHeight:1.4 }}>Details: {reason.raw}</p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{ ...NDI_RETRY_BTN_STYLE, marginTop:'2px' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('auth.try_again')}
            </button>
          )}
        </div>
      ) : status === 'PENDING' ? (
        <p style={{ paddingTop:'6px', fontSize:'12px', fontWeight:600, color:'#38ad78' }} aria-live="polite">
          {t('auth.waiting_approval')}
        </p>
      ) : null}
    </div>
  );
}

function StoreBadges() {
  return (
    <div className="ndi-store-badges">
      <a
        href="https://play.google.com/store/search?q=NDI%20Bhutan&c=apps&hl=en"
        target="_blank"
        rel="noreferrer"
        className="ndi-store-badge"
        aria-label="Get Bhutan NDI Wallet on Google Play"
      >
        <svg style={{ width:26, height:26, flexShrink:0 }} viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#34A853" d="M3.6 2.6c-.4.3-.6.8-.6 1.4v16c0 .6.2 1.1.6 1.4L13 12 3.6 2.6Z" />
          <path fill="#FBBC04" d="m16 9-3 3 3 3 3.6-2c1.2-.7 1.2-1.3 0-2L16 9Z" />
          <path fill="#4285F4" d="m3.6 2.6 12.5 6.5L13 12 3.6 2.6Z" />
          <path fill="#EA4335" d="M3.6 21.4 13 12l3.1 2.9-12.5 6.5Z" />
        </svg>
        <span>
          <span style={{ display:'block', fontSize:'8px', fontWeight:600, textTransform:'uppercase', lineHeight:1, color:'rgba(255,255,255,0.85)' }}>GET IT ON</span>
          <span style={{ display:'block', fontSize:'16px', fontWeight:600, lineHeight:'1.2' }}>Google Play</span>
        </span>
      </a>

      <a
        href="https://apps.apple.com/bt/app/bhutan-ndi/id1645493166"
        target="_blank"
        rel="noreferrer"
        className="ndi-store-badge"
        aria-label="Download Bhutan NDI Wallet on the App Store"
      >
        <svg style={{ width:26, height:26, flexShrink:0 }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.84 1.46-.62.72-1.16 1.88-1.01 3 .01 0 .04.01.07.01 1.08 0 2.18-.55 2.79-1.37z" />
        </svg>
        <span>
          <span style={{ display:'block', fontSize:'8px', fontWeight:600, lineHeight:1, color:'rgba(255,255,255,0.85)' }}>Download on the</span>
          <span style={{ display:'block', fontSize:'16px', fontWeight:600, lineHeight:'1.2' }}>App Store</span>
        </span>
      </a>
    </div>
  );
}

function NdiSupport() {
  const { t } = useTranslation();
  return (
    <div className="ndi-support">
      <p>{t('auth.get_support')}</p>
      <div>
        <a href="mailto:ndifeedback@dhi.bt">
          <img src={NDI_ASSETS.mailIcon} alt="" aria-hidden="true" />
          <span>ndifeedback@dhi.bt</span>
        </a>
        <a href="tel:1199">
          <img src={NDI_ASSETS.callIcon} alt="" aria-hidden="true" />
          <span>1199</span>
        </a>
      </div>
    </div>
  );
}

/**
 * The central NDI scanner panel — matches the reference design.
 * Used both as a full-page panel and inside the modal.
 */
function NdiScannerPanel({ qrUrl, isLoading, error, status, onRetry, embedded = false }) {
  const { t } = useTranslation();
  return (
    <section className={embedded ? 'ndi-scanner-panel ndi-scanner-panel-embedded' : 'ndi-scanner-panel'}>
      <h1 className="ndi-scanner-title">
        {t('auth.scan_title')}
      </h1>

      <NdiQrFrame
        qrUrl={qrUrl}
        isLoading={isLoading}
        error={error}
        label="Bhutan NDI scanner QR code"
      />

      <NdiInstructions status={status} error={error} onRetry={onRetry} />

      <a
        href="https://www.youtube.com/@bhutanndi"
        target="_blank"
        rel="noreferrer"
        className="ndi-video-guide"
      >
        <span>{t('auth.watch_video')}</span>
        <img src={NDI_ASSETS.playButton} alt="" aria-hidden="true" />
      </a>

      <p className="ndi-download-copy">
        {t('auth.dont_have_wallet')}{' '}
        <a href="https://www.bhutanndi.com" target="_blank" rel="noreferrer">
          {t('auth.download_now')}
        </a>
      </p>

      <StoreBadges />
      <NdiSupport />
    </section>
  );
}

/** NDI login modal shown over the main LoginPage */
function NdiProofModal({ login, status, error, onClose, onRetry }) {
  const { t } = useTranslation();
  if (!login) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ndi-modal-title"
      style={{
        position:'fixed', inset:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'12px',
        background:'rgba(2,6,23,0.72)',
        backdropFilter:'blur(4px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        style={{
          position:'relative',
          width:'100%',
          maxWidth:'520px',
          maxHeight:'94vh',
          overflowY:'auto',
          borderRadius:'32px',
          background:'#F8F8F8',
          boxShadow:'0 32px 80px rgba(0,0,0,0.28)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('auth.close_ndi')}
          style={{
            position:'absolute', top:16, right:16, zIndex:1,
            width:36, height:36, borderRadius:'50%',
            border:'none', background:'rgba(0,0,0,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#64748b', transition:'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.06)'}
        >
          <X size={18} />
        </button>
        <NdiScannerPanel
          qrUrl={login.proofRequestUrl}
          isLoading={false}
          error={error}
          status={status}
          onRetry={onRetry}
          embedded
        />
      </motion.div>
    </div>
  );
}

// Highest education level — same list the exam application form (ApplicationForm.jsx) uses.
const EDUCATION_LEVELS = ['Below Class X', 'Class X', 'Class XII', 'Certificate', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'];

// ─── Shared input style ───────────────────────────────────────────────────────
const INPUT_CLS = 'w-full h-12 px-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors';
const INPUT_ICON_CLS = 'w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors';

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [activeTab, setActiveTab]       = useState('signin');
  const [registerMode, setRegisterMode] = useState('choice'); // 'choice' | 'form'

  // NDI modal state
  const [isNdiLoading, setIsNdiLoading]     = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiLogin, setNdiLogin]             = useState(null);
  const [ndiLoginStatus, setNdiLoginStatus] = useState('IDLE');
  const pollInFlight = useRef(false);

  // Sign-in form state
  const [userId, setUserId]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register form state. Email and password are deliberately NOT collected here -
  // the new Test Taker sets both from their profile after signing in.
  const [regCid, setRegCid]         = useState('');
  const [regName, setRegName]       = useState('');
  const [regDob, setRegDob]         = useState('');
  const [regGender, setRegGender]   = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEducation, setRegEducation] = useState('');

  const { login, register, loginWithNDI, checkNDILogin, cancelNDILogin, isLoading } = useAuth();
  const { t } = useTranslation();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Sync tab with ?tab=register query param
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'register') setActiveTab('register');
  }, [location]);

  // ── Sign-in handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) return;
    const result = await login(userId.trim(), password);
    if (result.success) {
      toast.success(t('auth.welcome_back', { name: result.user.name }));
      navigate('/dashboard');
    } else {
      toast.error(result.error || t('auth.login_failed'));
    }
  };

  // ── Register handler ──
  const handleRegister = async (e) => {
    e.preventDefault();
    const result = await register({
      fullName:         regName,
      cid:              regCid,
      dateOfBirth:      regDob,
      gender:           regGender,
      contactNumber:    regContact,
      education:        regEducation,
    });
    if (!result.success) {
      toast.error(result.error || t('auth.registration_failed'));
      return;
    }
    const assignedUserId = result.user?.userId;
    setRegCid(''); setRegName(''); setRegDob('');
    setRegGender(''); setRegContact(''); setRegEducation('');
    if (assignedUserId) {
      toast.success(t('auth.welcome_userid', { userId: assignedUserId }), { duration: 8000 });
    } else {
      toast.success(t('auth.registration_success'));
    }
    // Registration signs the account in; go straight into the app rather than back
    // to the sign-in tab. New Test Takers are routed to their profile by the photo gate.
    navigate('/dashboard');
  };

  // ── NDI login handler ──
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
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable.');
      setNdiLogin({ proofRequestUrl: 'https://invalid.local', deepLinkUrl: null });
      setNdiLoginStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  };

  // NDI poll loop
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
          toast.success(t('auth.welcome', { name: result.user.name }));
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiLoginStatus(result.status);
          const msgs = {
            REJECTED: 'The proof request was declined in Bhutan NDI Wallet.',
            EXPIRED:  'This QR code has expired. Please try again.',
            CANCELLED:'This Bhutan NDI login was cancelled.',
            FAILED:   'Bhutan NDI could not validate this identity.',
          };
          setNdiErrorMessage(msgs[result.status] || 'NDI login could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiLoginStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check NDI login status.');
        }
      } finally {
        pollInFlight.current = false;
      }
    };
    poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiLogin, ndiLoginStatus, checkNDILogin, navigate, t]);

  const closeNdiLogin = () => {
    if (ndiLogin?.pollToken && ndiLoginStatus === 'PENDING') void cancelNDILogin(ndiLogin.pollToken);
    setNdiLogin(null);
    setNdiLoginStatus('IDLE');
    setNdiErrorMessage(null);
  };

  const isFullScreenForm = activeTab === "register" && registerMode === "form";

  const tabs = [
    { id: 'signin',   label: t('auth.tab_signin') },
    { id: 'register', label: t('auth.tab_register') },
  ];

  return (
    <div className="min-h-screen flex relative bg-white">

      <div className={`relative z-10 flex-1 flex overflow-y-auto ${isFullScreenForm ? "items-stretch p-0" : "items-start justify-center p-6 pt-20 lg:p-12 lg:pt-24"}`}>
        {/* Back to home */}
        <div className="absolute top-6 left-6 z-20">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 shadow-sm transition hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
            {t('auth.back_home')}
          </button>
        </div>

        {/* Language toggle */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageToggle tone="light" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full ${isFullScreenForm ? "max-w-none" : "max-w-md"}`}
        >
          <div className={`bg-white shadow-xl shadow-slate-300/40 overflow-hidden ${isFullScreenForm ? "min-h-screen flex flex-col rounded-none border-0" : "rounded-3xl border border-slate-200"}`}>

            {/* Logo + title */}
            <div className="flex flex-col items-center gap-3 pt-7 px-6 pb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#124143] shadow-lg shadow-[#124143]/30 ring-4 ring-[#124143]/10">
                <img
                  src="/images/Dzongjuk logo.png"
                  alt="Dzongjuk Logo"
                  className="h-14 w-14 object-contain filter-[brightness(0)_invert(1)]"
                />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {t('app.subtitle')}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === 'signin' ? t('auth.subtitle_signin') : t('auth.subtitle_register')}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-slate-200">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setRegisterMode('choice'); }}
                  className={`relative flex-1 py-3.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="login-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className={isFullScreenForm ? "flex-1 flex flex-col lg:justify-center px-6 py-8 sm:px-10 lg:px-16 xl:px-24" : "p-6"}>

              {/* ── Sign In ── */}
              {activeTab === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* NDI Login button */}
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={handleNDI}
                      disabled={isLoading || isNdiLoading}
                      className="w-full h-12 inline-flex items-center justify-center gap-2.5 rounded-full text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#124143' }}
                    >
                      {isNdiLoading ? (
                        <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <img src="/images/NDI/ButtonNDILogo.svg" alt="NDI" className="h-7 w-7 object-contain" />
                      )}
                      <span className="tracking-wide font-medium">{t('auth.ndi_login_btn')}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <hr className="flex-1 border-slate-200" />
                    <span className="text-xs text-slate-400 uppercase tracking-[0.3em]">{t('auth.divider_or_credentials')}</span>
                    <hr className="flex-1 border-slate-200" />
                  </div>

                  {/* Credential form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">
                        {t('auth.label_userid')}
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userId}
                          onChange={e => setUserId(e.target.value)}
                          placeholder={t('auth.placeholder_userid')}
                          required
                          className={INPUT_ICON_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">{t('auth.label_password')}</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder={t('auth.placeholder_password')}
                          required
                          className="w-full h-12 pl-10 pr-12 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={showPass ? t('auth.hide_password') : t('auth.show_password')}
                        >
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-teal-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600">{t('auth.remember_me')}</span>
                      </label>
                      <button
                        type="button"
                        className="text-sm font-medium text-teal-600 hover:text-teal-500 transition-colors"
                      >
                        {t('auth.forgot_password')}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      loading={isLoading}
                      className="rounded-full h-12 tracking-wide text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#124143' }}
                    >
                      {t('auth.signin_btn')}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* ── Register ── */}
              {activeTab === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {registerMode === 'choice' ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-center text-sm text-slate-500 mb-1">
                        {t('auth.register_choice_prompt')}
                      </p>

                      <button
                        type="button"
                        onClick={() => navigate('/ndi-register')}
                        className="h-14 px-6 rounded-full text-white font-semibold flex items-center justify-center gap-2.5 shadow-md hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#124143' }}
                      >
                        <img src="/images/NDI/ButtonNDILogo.svg" alt="NDI" className="h-6 w-6 object-contain" />
                        <span>{t('auth.register_with_ndi')}</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <hr className="flex-1 border-slate-200" />
                        <span className="text-xs text-slate-400 uppercase tracking-[0.3em] font-medium">{t('auth.or')}</span>
                        <hr className="flex-1 border-slate-200" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setRegisterMode('form')}
                        className="h-14 px-6 rounded-full border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all"
                      >
                        {t('auth.register_without_ndi')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Back + NDI shortcut header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => setRegisterMode('choice')}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <ArrowLeft size={14} />
                          <span>{t('auth.back_to_method')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/ndi-register')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#299d7b] hover:text-[#218366] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full transition-colors"
                        >
                          <img src="/images/NDI/ButtonNDILogo.svg" alt="NDI" className="w-4 h-4 object-contain" />
                          {t('auth.register_with_ndi_short')}
                        </button>
                      </div>

                      <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                        {/* CID */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_cid')}</label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={regCid}
                              onChange={e => setRegCid(e.target.value.replace(/\D/g, ''))}
                              placeholder={t('auth.placeholder_cid')}
                              inputMode="numeric"
                              pattern="[0-9]{11}"
                              minLength={11}
                              maxLength={11}
                              title={t('auth.title_cid')}
                              required
                              className={INPUT_ICON_CLS}
                            />
                          </div>
                        </div>

                        {/* Full Name */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_full_name')}</label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={regName}
                              onChange={e => setRegName(e.target.value)}
                              placeholder={t('auth.placeholder_full_name')}
                              required
                              className={INPUT_ICON_CLS}
                            />
                          </div>
                        </div>

                        {/* Date of Birth */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_dob')}</label>
                          <div className="relative">
                            <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={regDob}
                              onChange={e => setRegDob(e.target.value)}
                              required
                              className={INPUT_ICON_CLS}
                            />
                          </div>
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_gender')}</label>
                          <select
                            value={regGender}
                            onChange={e => setRegGender(e.target.value)}
                            required
                            className={INPUT_CLS}
                          >
                            <option value="">{t('auth.select_gender')}</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>

                        {/* Contact No. */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_contact')}</label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              value={regContact}
                              onChange={e => setRegContact(e.target.value)}
                              placeholder={t('auth.placeholder_contact')}
                              inputMode="numeric"
                              pattern="[0-9]{8}"
                              minLength={8}
                              maxLength={8}
                              required
                              className={INPUT_ICON_CLS}
                            />
                          </div>
                        </div>

                        {/* Qualification */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">{t('auth.label_qualification')}</label>
                          <select
                            value={regEducation}
                            onChange={e => setRegEducation(e.target.value)}
                            required
                            className={INPUT_CLS}
                          >
                            <option value="">{t('auth.select_qualification')}</option>
                            {EDUCATION_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                          </select>
                        </div>

                        <p className="md:col-span-2 xl:col-span-3 -mt-1 text-xs text-slate-500">
                          {t('auth.profile_note')}
                        </p>

                        <Button
                          type="submit"
                          fullWidth
                          size="lg"
                          loading={isLoading}
                          className="md:col-span-2 xl:col-span-3 mt-2 sm:max-w-sm sm:mx-auto rounded-full h-12 tracking-wide text-white hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#124143' }}
                        >
                          {t('auth.submit_registration')}
                        </Button>

                        <p className="md:col-span-2 xl:col-span-3 text-center text-xs text-slate-500">
                          {t('auth.already_have_account')}{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('signin')}
                            className="text-teal-600 hover:text-teal-500 font-medium transition-colors"
                          >
                            {t('auth.tab_signin')}
                          </button>
                        </p>
                      </form>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 text-center text-xs text-slate-500 leading-relaxed space-y-0.5">
            <p>{t('auth.footer_dept', { year: new Date().getFullYear() })}</p>
            <p>{t('auth.footer_ministry')}</p>
          </div>
        </motion.div>
      </div>

      {/* NDI Proof Modal */}
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

// ─── Standalone NDI Login Page (/ndi-login) ───────────────────────────────────
export function NdiLoginPage() {
  const [isNdiLoading, setIsNdiLoading]       = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiLogin, setNdiLogin]               = useState(null);
  const [ndiLoginStatus, setNdiLoginStatus]   = useState('IDLE');
  const pollInFlight = useRef(false);

  const { loginWithNDI, checkNDILogin, cancelNDILogin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const startNdiLogin = useCallback(async () => {
    setIsNdiLoading(true);
    setNdiErrorMessage(null);
    setNdiLogin(null);
    setNdiLoginStatus('IDLE');
    try {
      const result = await loginWithNDI();
      if (!result.success) {
        setNdiErrorMessage(result.error || 'NDI service is currently unreachable.');
        setNdiLoginStatus('FAILED');
        return;
      }
      setNdiLogin(result);
      setNdiLoginStatus('PENDING');
    } catch (err) {
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable.');
      setNdiLoginStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  }, [loginWithNDI]);

  useEffect(() => { void startNdiLogin(); }, [startNdiLogin]);

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
          toast.success(t('auth.welcome', { name: result.user.name }));
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiLoginStatus(result.status);
          const msgs = {
            REJECTED: 'The proof request was declined in Bhutan NDI Wallet.',
            EXPIRED:  'This QR code has expired. Please try again.',
            CANCELLED:'This Bhutan NDI login was cancelled.',
            FAILED:   'Bhutan NDI could not validate this identity.',
          };
          setNdiErrorMessage(msgs[result.status] || 'NDI login could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiLoginStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check NDI login status.');
        }
      } finally {
        pollInFlight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiLogin, ndiLoginStatus, checkNDILogin, navigate, t]);

  const returnToLogin = () => {
    if (ndiLogin?.pollToken && ndiLoginStatus === 'PENDING') void cancelNDILogin(ndiLogin.pollToken);
    navigate('/login');
  };

  return (
    <main className="ndi-scanner-page">
      <button type="button" onClick={returnToLogin} className="ndi-scanner-back">
        <ChevronLeft size={18} />
        {t('auth.back_to_login')}
      </button>
      <NdiScannerPanel
        qrUrl={ndiLogin?.proofRequestUrl}
        isLoading={isNdiLoading}
        error={ndiErrorMessage}
        status={ndiLoginStatus}
        onRetry={startNdiLogin}
      />
    </main>
  );
}

// ─── Standalone NDI Registration Page (/ndi-register) ────────────────────────
export function NdiRegistrationPage() {
  const [isNdiLoading, setIsNdiLoading]           = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage]     = useState(null);
  const [ndiRegistration, setNdiRegistration]     = useState(null);
  const [ndiRegistrationStatus, setNdiRegStatus]  = useState('IDLE');
  const pollInFlight = useRef(false);

  const { loginWithNDI, checkNDILogin, cancelNDILogin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const startNdiRegistration = useCallback(async () => {
    setIsNdiLoading(true);
    setNdiErrorMessage(null);
    setNdiRegistration(null);
    setNdiRegStatus('IDLE');
    try {
      const result = await loginWithNDI();
      if (!result.success) {
        setNdiErrorMessage(result.error || 'NDI registration is currently unavailable.');
        setNdiRegStatus('FAILED');
        return;
      }
      setNdiRegistration(result);
      setNdiRegStatus('PENDING');
    } catch (err) {
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable.');
      setNdiRegStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  }, [loginWithNDI]);

  useEffect(() => { void startNdiRegistration(); }, [startNdiRegistration]);

  useEffect(() => {
    if (!ndiRegistration?.pollToken || ndiRegistrationStatus !== 'PENDING') return undefined;
    let stopped = false;
    const poll = async () => {
      if (pollInFlight.current || stopped) return;
      pollInFlight.current = true;
      try {
        const result = await checkNDILogin(ndiRegistration.pollToken);
        if (stopped) return;
        if (result.status === 'VALIDATED') {
          setNdiRegStatus('VALIDATED');
          toast.success(t('auth.account_created', { name: result.user.name }));
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiRegStatus(result.status);
          const msgs = {
            REJECTED: 'The registration request was declined in Bhutan NDI Wallet.',
            EXPIRED:  'This registration QR code has expired. Please try again.',
            CANCELLED:'This Bhutan NDI registration was cancelled.',
            FAILED:   'Bhutan NDI could not verify or create this account.',
          };
          setNdiErrorMessage(msgs[result.status] || 'NDI registration could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiRegStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check NDI registration status.');
        }
      } finally {
        pollInFlight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiRegistration, ndiRegistrationStatus, checkNDILogin, navigate, t]);

  const returnToLogin = () => {
    if (ndiRegistration?.pollToken && ndiRegistrationStatus === 'PENDING')
      void cancelNDILogin(ndiRegistration.pollToken);
    navigate('/login');
  };

  return (
    <main className="ndi-scanner-page">
      <button type="button" onClick={returnToLogin} className="ndi-scanner-back">
        <ChevronLeft size={18} />
        {t('auth.back_to_login')}
      </button>
      <NdiScannerPanel
        qrUrl={ndiRegistration?.proofRequestUrl}
        isLoading={isNdiLoading}
        error={ndiErrorMessage}
        status={ndiRegistrationStatus}
        onRetry={startNdiRegistration}
      />
    </main>
  );
}
