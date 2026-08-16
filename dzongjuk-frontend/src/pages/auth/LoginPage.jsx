/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ChevronLeft, User, Mail, Lock, CreditCard, Calendar, Phone, ArrowLeft, AlertTriangle, X, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const NDI_ASSETS = {
  qrLogo: '/images/NDI/QRlogo.svg',
  scanIcon: '/images/NDI/scaniconimg.svg',
  playButton: '/images/NDI/PlayButton.svg',
  mailIcon: '/images/NDI/Mail.svg',
  callIcon: '/images/NDI/Call.svg',
  centerLogo: '/images/NDI Bhutan Logo.ico',
};

function NdiQrFrame({ qrUrl, isLoading, error, onRetry, label = 'Bhutan NDI QR code' }) {
  return (
    <div className="ndi-scanner-qr-frame" aria-label={label}>
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
          <AlertTriangle size={32} className="mb-3 text-amber-500" />
          <p className="mb-4 text-xs font-medium leading-5 text-slate-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-[#5AC994] px-5 py-1.5 text-xs font-semibold text-[#38ad78] transition hover:bg-white"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#5AC994]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-xs font-semibold">Loading Scanner...</span>
        </div>
      ) : qrUrl ? (
        <QRCodeSVG
          value={qrUrl}
          size={178}
          level="H"
          marginSize={1}
          imageSettings={{ src: NDI_ASSETS.centerLogo, width: 36, height: 36, excavate: true }}
          title={label}
        />
      ) : (
        <img src={NDI_ASSETS.qrLogo} alt={label} className="h-44.5 w-44.5 object-contain" />
      )}
    </div>
  );
}

function NdiInstructions({ status }) {
  return (
    <div className="ndi-scanner-instructions">
      <p>1. Open Bhutan NDI Wallet on your phone</p>
      <p className="flex flex-wrap items-center justify-center gap-x-1.5">
        <span>2. Tap the scan button</span>
        <img src={NDI_ASSETS.scanIcon} alt="Scan" className="h-6 w-6" />
        <span>located on the</span>
        <span className="basis-full sm:basis-auto">menu bar and scan the QR code</span>
      </p>
      {status === 'PENDING' && (
        <p className="pt-1 text-xs font-semibold text-[#38ad78]" aria-live="polite">
          Waiting for approval in your wallet...
        </p>
      )}
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
        <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#34A853" d="M3.6 2.6c-.4.3-.6.8-.6 1.4v16c0 .6.2 1.1.6 1.4L13 12 3.6 2.6Z" />
          <path fill="#FBBC04" d="m16 9-3 3 3 3 3.6-2c1.2-.7 1.2-1.3 0-2L16 9Z" />
          <path fill="#4285F4" d="m3.6 2.6 12.5 6.5L13 12 3.6 2.6Z" />
          <path fill="#EA4335" d="M3.6 21.4 13 12l3.1 2.9-12.5 6.5Z" />
        </svg>
        <span>
          <span className="block text-[8px] font-semibold uppercase leading-none text-white/90">GET IT ON</span>
          <span className="block text-[17px] font-semibold leading-5">Google Play</span>
        </span>
      </a>

      <a
        href="https://apps.apple.com/bt/app/bhutan-ndi/id1645493166"
        target="_blank"
        rel="noreferrer"
        className="ndi-store-badge"
        aria-label="Download Bhutan NDI Wallet on the App Store"
      >
        <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.84 1.46-.62.72-1.16 1.88-1.01 3 .01 0 .04.01.07.01 1.08 0 2.18-.55 2.79-1.37z" />
        </svg>
        <span>
          <span className="block text-[8px] font-semibold leading-none text-white/90">Download on the</span>
          <span className="block text-[17px] font-semibold leading-5">App Store</span>
        </span>
      </a>
    </div>
  );
}

function NdiSupport() {
  return (
    <div className="ndi-support">
      <p>Get Support</p>
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

function NdiScannerPanel({
  qrUrl,
  deepLinkUrl,
  isLoading,
  error,
  status,
  onRetry,
  className = '',
}) {
  return (
    <section className={['ndi-scanner-panel', className].join(' ')}>
      <h1 className="ndi-scanner-title">
        Scan with <span>Bhutan NDI</span> Wallet
      </h1>

      <NdiQrFrame
        qrUrl={qrUrl}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        label="Bhutan NDI scanner QR code"
      />

      {!error && <NdiInstructions status={status} />}

      <a
        href="https://www.youtube.com/@bhutanndi"
        target="_blank"
        rel="noreferrer"
        className="ndi-video-guide"
      >
        <span>Watch video guide</span>
        <img src={NDI_ASSETS.playButton} alt="" aria-hidden="true" />
      </a>

      <p className="ndi-download-copy">
        Don't have the Bhutan NDI Wallet?{' '}
        <a href="https://www.bhutanndi.com" target="_blank" rel="noreferrer">
          Download Now!
        </a>
      </p>

      <StoreBadges />
      <NdiSupport />
    </section>
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
        <NdiScannerPanel
          qrUrl={login.proofRequestUrl}
          deepLinkUrl={login.deepLinkUrl}
          isLoading={false}
          error={error}
          status={status}
          onRetry={onRetry}
          className="shadow-none"
        />
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signin');
  const [registerMode, setRegisterMode] = useState('choice'); // 'choice' | 'form'

  // NDI API State
  const [isNdiLoading, setIsNdiLoading] = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiLogin, setNdiLogin] = useState(null);
  const [ndiLoginStatus, setNdiLoginStatus] = useState('IDLE');
  const pollInFlight = useRef(false);
  const [ndiRegistration, setNdiRegistration] = useState(null);
  const [ndiRegistrationStatus, setNdiRegistrationStatus] = useState('IDLE');
  const registrationPollInFlight = useRef(false);

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

  const { login, register, loginWithNDI, checkNDILogin, cancelNDILogin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle tab query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setActiveTab('register');
    }
  }, [location]);

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
    const result = await register({
      fullName: regName,
      cid: regCid,
      dateOfBirth: regDob,
      phone: regPhone,
      email: regEmail,
      password: regPassword,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setUserId(regEmail.trim().toLowerCase());
    setPassword('');
    setRegName('');
    setRegCid('');
    setRegDob('');
    setRegPhone('');
    setRegEmail('');
    setRegPassword('');
    setActiveTab('signin');
    toast.success('Account created. You can now sign in.');
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

  const startNdiRegistration = useCallback(async () => {
    setIsNdiLoading(true);
    setNdiErrorMessage(null);
    setNdiRegistration(null);
    setNdiRegistrationStatus('IDLE');
    try {
      const result = await loginWithNDI();
      if (!result.success) {
        setNdiErrorMessage(result.error || 'NDI registration is currently unavailable.');
        setNdiRegistrationStatus('FAILED');
        return;
      }
      setNdiRegistration(result);
      setNdiRegistrationStatus('PENDING');
    } catch (err) {
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable. Please try again.');
      setNdiRegistrationStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  }, [loginWithNDI]);

  useEffect(() => {
    if (!ndiRegistration?.pollToken || ndiRegistrationStatus !== 'PENDING') return undefined;
    let stopped = false;
    const poll = async () => {
      if (registrationPollInFlight.current || stopped) return;
      registrationPollInFlight.current = true;
      try {
        const result = await checkNDILogin(ndiRegistration.pollToken);
        if (stopped) return;
        if (result.status === 'VALIDATED') {
          setNdiRegistrationStatus('VALIDATED');
          toast.success(`Account created. Welcome, ${result.user.name}!`);
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiRegistrationStatus(result.status);
          const messages = {
            REJECTED: 'The registration request was declined in Bhutan NDI Wallet.',
            EXPIRED: 'This registration QR code has expired. Please create a new one.',
            CANCELLED: 'This Bhutan NDI registration was cancelled.',
            FAILED: 'Bhutan NDI could not verify or create this account.',
          };
          setNdiErrorMessage(messages[result.status] || 'Bhutan NDI registration could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiRegistrationStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check Bhutan NDI registration status.');
        }
      } finally {
        registrationPollInFlight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiRegistration, ndiRegistrationStatus, checkNDILogin, navigate]);

  const useRegistrationForm = () => {
    if (ndiRegistration?.pollToken && ndiRegistrationStatus === 'PENDING') void cancelNDILogin(ndiRegistration.pollToken);
    setNdiRegistration(null);
    setNdiRegistrationStatus('IDLE');
    setNdiErrorMessage(null);
    setRegisterMode('form');
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
              <div>
                {activeTab === 'signin' && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
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

                      <Button type="submit" fullWidth size="lg" loading={isLoading} className="rounded-full h-12 tracking-wider text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#124143' }}>
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
                    transition={{ duration: 0.2 }}
                  >
                    {registerMode === 'choice' ? (
                      <div className="flex flex-col gap-4">
                        <div className="text-center mb-2">
                          <h2 className="text-lg font-semibold text-slate-800">Choose Registration Method</h2>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => navigate('/ndi-register')}
                          className="h-14 px-6 py-3 rounded-full text-white font-semibold transition-all flex items-center justify-center gap-2.5 shadow-md hover:opacity-90"
                          style={{ backgroundColor: '#124143' }}
                        >
                          <img src="/images/NDI Bhutan Logo.ico" alt="NDI" className="h-6 w-6 object-contain" />
                          <span>Register with Bhutan NDI</span>
                        </button>

                        <div className="flex items-center gap-3 my-1">
                          <hr className="flex-1 border-slate-200" />
                          <span className="text-xs text-slate-400 uppercase tracking-[0.35em] font-medium">or</span>
                          <hr className="flex-1 border-slate-200" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setRegisterMode('form')}
                          className="h-14 px-6 py-3 rounded-full text-white font-semibold transition-all hover:opacity-90"
                          style={{ backgroundColor: '#124143' }}
                        >
                          Register without NDI
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Header banner to switch back to choice */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setRegisterMode('choice')}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <ArrowLeft size={14} />
                            <span>Back to Method Selection</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/ndi-register')}
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
                                inputMode="numeric"
                                pattern="[0-9]{11}"
                                minLength={11}
                                maxLength={11}
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
                                inputMode="tel"
                                pattern="[0-9+ -]{7,16}"
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
                                placeholder="At least 12 characters"
                                minLength={12}
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

                          <Button type="submit" fullWidth size="lg" loading={isLoading} className="rounded-full h-12 tracking-wider text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#124143' }}>
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
              </div>
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

export function NdiLoginPage() {
  const [isNdiLoading, setIsNdiLoading] = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiLogin, setNdiLogin] = useState(null);
  const [ndiLoginStatus, setNdiLoginStatus] = useState('IDLE');
  const pollInFlight = useRef(false);
  const { loginWithNDI, checkNDILogin, cancelNDILogin } = useAuth();
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
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable. Please try again.');
      setNdiLoginStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  }, [loginWithNDI]);

  useEffect(() => {
    void startNdiLogin();
  }, [startNdiLogin]);

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
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiLogin, ndiLoginStatus, checkNDILogin, navigate]);

  const returnToLogin = () => {
    if (ndiLogin?.pollToken && ndiLoginStatus === 'PENDING') void cancelNDILogin(ndiLogin.pollToken);
    navigate('/login');
  };

  return (
    <main className="ndi-scanner-page">
      <button type="button" onClick={returnToLogin} className="ndi-scanner-back">
        <ChevronLeft size={18} />
        Back to Login
      </button>
      <NdiScannerPanel
        qrUrl={ndiLogin?.proofRequestUrl}
        deepLinkUrl={ndiLogin?.deepLinkUrl}
        isLoading={isNdiLoading}
        error={ndiErrorMessage}
        status={ndiLoginStatus}
        onRetry={startNdiLogin}
      />
    </main>
  );
}

export function NdiRegistrationPage() {
  const [isNdiLoading, setIsNdiLoading] = useState(false);
  const [ndiErrorMessage, setNdiErrorMessage] = useState(null);
  const [ndiRegistration, setNdiRegistration] = useState(null);
  const [ndiRegistrationStatus, setNdiRegistrationStatus] = useState('IDLE');
  const registrationPollInFlight = useRef(false);
  const { loginWithNDI, checkNDILogin, cancelNDILogin } = useAuth();
  const navigate = useNavigate();

  const startNdiRegistration = useCallback(async () => {
    setIsNdiLoading(true);
    setNdiErrorMessage(null);
    setNdiRegistration(null);
    setNdiRegistrationStatus('IDLE');
    try {
      const result = await loginWithNDI();
      if (!result.success) {
        setNdiErrorMessage(result.error || 'NDI registration is currently unavailable.');
        setNdiRegistrationStatus('FAILED');
        return;
      }
      setNdiRegistration(result);
      setNdiRegistrationStatus('PENDING');
    } catch (err) {
      setNdiErrorMessage(err.message || 'Bhutan NDI is currently unavailable. Please try again.');
      setNdiRegistrationStatus('FAILED');
    } finally {
      setIsNdiLoading(false);
    }
  }, [loginWithNDI]);

  useEffect(() => {
    void startNdiRegistration();
  }, [startNdiRegistration]);

  useEffect(() => {
    if (!ndiRegistration?.pollToken || ndiRegistrationStatus !== 'PENDING') return undefined;
    let stopped = false;
    const poll = async () => {
      if (registrationPollInFlight.current || stopped) return;
      registrationPollInFlight.current = true;
      try {
        const result = await checkNDILogin(ndiRegistration.pollToken);
        if (stopped) return;
        if (result.status === 'VALIDATED') {
          setNdiRegistrationStatus('VALIDATED');
          toast.success(`Account created. Welcome, ${result.user.name}!`);
          navigate('/dashboard');
        } else if (result.status !== 'PENDING') {
          setNdiRegistrationStatus(result.status);
          const messages = {
            REJECTED: 'The registration request was declined in Bhutan NDI Wallet.',
            EXPIRED: 'This registration QR code has expired. Please create a new one.',
            CANCELLED: 'This Bhutan NDI registration was cancelled.',
            FAILED: 'Bhutan NDI could not verify or create this account.',
          };
          setNdiErrorMessage(messages[result.status] || 'Bhutan NDI registration could not be completed.');
        }
      } catch (err) {
        if (!stopped) {
          setNdiRegistrationStatus('FAILED');
          setNdiErrorMessage(err.message || 'Unable to check Bhutan NDI registration status.');
        }
      } finally {
        registrationPollInFlight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [ndiRegistration, ndiRegistrationStatus, checkNDILogin, navigate]);

  const returnToLogin = () => {
    if (ndiRegistration?.pollToken && ndiRegistrationStatus === 'PENDING') void cancelNDILogin(ndiRegistration.pollToken);
    navigate('/login');
  };

  return (
    <main className="ndi-scanner-page">
      <button type="button" onClick={returnToLogin} className="ndi-scanner-back">
        <ChevronLeft size={18} />
        Back
      </button>
      <NdiScannerPanel
        qrUrl={ndiRegistration?.proofRequestUrl}
        deepLinkUrl={ndiRegistration?.deepLinkUrl}
        isLoading={isNdiLoading}
        error={ndiErrorMessage}
        status={ndiRegistrationStatus}
        onRetry={startNdiRegistration}
      />
    </main>
  );
}
