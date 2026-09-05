/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ChevronLeft, User, Calendar,
  ArrowLeft, Lock, Phone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import LanguageToggle from '@/components/LanguageToggle';
import toast from 'react-hot-toast';
import NdiProofModal from '../components/NdiProofModal';
import { useNdiProofSession } from '../useNdiProofSession';

const NDI_STATUS_MESSAGES = {
  REJECTED: 'The proof request was declined in Bhutan NDI Wallet.',
  EXPIRED: 'This QR code has expired. Please try again.',
  CANCELLED: 'This Bhutan NDI login was cancelled.',
  FAILED: 'Bhutan NDI could not validate this identity.',
};

// Highest education level — same list the exam application form (ApplicationForm.jsx) uses.
const EDUCATION_LEVELS = ['Below Class X', 'Class X', 'Class XII', 'Certificate', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'];

// ─── Shared input style ───────────────────────────────────────────────────────
const INPUT_CLS = 'w-full h-12 px-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors';
const INPUT_ICON_CLS = 'w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors';

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [activeTab, setActiveTab]       = useState('signin');
  const [registerMode, setRegisterMode] = useState('choice'); // 'choice' | 'form'

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

  const { login, register, isLoading } = useAuth();
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

  // Bhutan NDI proof request behind the modal. `keepPanelOnFailure` holds the
  // scanner frame on screen when no QR could be issued, so the modal explains the
  // failure in place instead of closing.
  const ndi = useNdiProofSession({
    successMessageKey: 'auth.welcome',
    statusMessages: NDI_STATUS_MESSAGES,
    unavailableMessage: 'NDI service is currently unreachable.',
    keepPanelOnFailure: true,
  });

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
                      onClick={ndi.start}
                      disabled={isLoading || ndi.isLoading}
                      className="w-full h-12 inline-flex items-center justify-center gap-2.5 rounded-full text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#124143' }}
                    >
                      {ndi.isLoading ? (
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
        {ndi.request && (
          <NdiProofModal
            login={ndi.request}
            status={ndi.status}
            error={ndi.error}
            onClose={ndi.reset}
            onRetry={() => { ndi.reset(); void ndi.start(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
