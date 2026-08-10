// Existing imports remain unchanged
import { useState, useEffect } from 'react';
// ... (rest of imports unchanged)
import { motion } from 'framer-motion';
import { Sun, Moon, Globe, Bell, BellOff, LogOut, ChevronRight, Palette, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function SettingRow({ icon: Icon, label, description, children, onClick }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 border-b border-surface-border last:border-0 ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
          <Icon size={15} className="text-text-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {children}
        {onClick && <ChevronRight size={14} className="text-text-muted group-hover:text-text-secondary transition-colors" />}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${checked ? 'bg-brand-gold' : 'bg-surface-border'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'dz', label: 'Dzongkha', native: 'རྫོང་ཁ' },
];

export default function SettingsPage() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Existing state hooks
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [appNotifs, setAppNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  // New state for system contact info
  const [systemEmail, setSystemEmail] = useState('');
  const [systemPhone, setSystemPhone] = useState('');
  const [systemDepartment, setSystemDepartment] = useState('');

  // Load saved system contact info on mount
  useEffect(() => {
    const saved = localStorage.getItem('system_contact_info');
    if (saved) {
      try {
        const { email, phone, department } = JSON.parse(saved);
        setSystemEmail(email || '');
        setSystemPhone(phone || '');
        setSystemDepartment(department || '');
      } catch {}
    }
  }, []);

  const handleSystemSave = () => {
    const payload = {
      email: systemEmail.trim(),
      phone: systemPhone.trim(),
      department: systemDepartment.trim(),
    };
    localStorage.setItem('system_contact_info', JSON.stringify(payload));
    toast.success('System contact information saved.');
  };
  // Language (UI only — i18n integration)
  const [language, setLanguage] = useState('en');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Signed out successfully.');
  };

  const handleLanguageChange = (code) => {
    setLanguage(code);
    // TODO: call i18n.changeLanguage(code) when full translations are available
    toast(`Language set to ${LANGUAGES.find(l => l.code === code)?.label}`, { icon: '🌐' });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">Manage your preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Appearance */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-card border border-surface-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-brand-gold" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Appearance</h2>
            </div>

            <SettingRow
              icon={isDark ? Moon : Sun}
              label="Theme"
              description={isDark ? 'Dark mode is active' : 'Light mode is active'}
            >
              <div className="flex items-center gap-1 bg-surface-bg border border-surface-border rounded-lg p-0.5">
                <button
                  onClick={() => !isDark && toggleTheme()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isDark ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  <Moon size={12} /> Dark
                </button>
                <button
                  onClick={() => isDark && toggleTheme()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${!isDark ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  <Sun size={12} /> Light
                </button>
              </div>
            </SettingRow>
          </motion.section>

          {/* Language */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface-card border border-surface-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-brand-gold" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Language</h2>
            </div>

            <SettingRow
              icon={Globe}
              label="Display Language"
              description="Choose the interface language"
            >
              <div className="flex items-center gap-1 bg-surface-bg border border-surface-border rounded-lg p-0.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${language === lang.code ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                  >
                    {lang.native}
                  </button>
                ))}
              </div>
            </SettingRow>
          </motion.section>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Notifications */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-card border border-surface-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-brand-gold" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Notifications</h2>
            </div>

            <SettingRow icon={Bell} label="In-App Notifications" description="Alerts and updates within the portal">
              <Toggle checked={appNotifs} onChange={setAppNotifs} label="Toggle in-app notifications" />
            </SettingRow>
            <SettingRow icon={Mail} label="Email Notifications" description="Receive updates to your registered email">
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Toggle email notifications" />
            </SettingRow>
            <SettingRow icon={BellOff} label="SMS Notifications" description="Receive SMS alerts for critical updates">
              <Toggle checked={smsNotifs} onChange={setSmsNotifs} label="Toggle SMS notifications" />
            </SettingRow>
          </motion.section>

          {/* Account */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface-card border border-surface-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <LogOut size={14} className="text-red-400" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Account</h2>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-3 text-red-400 hover:text-red-300 transition-colors text-sm font-medium group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut size={15} className="text-red-400" />
              </div>
              Sign out of DSTS
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.section>
        </div>
      </div>

      <p className="text-center text-[11px] text-text-muted pb-2 pt-2">
        Dzongjuk DSTS v{import.meta.env.VITE_APP_VERSION || '1.0.0'} · Department of Culture and Dzongkha Development
      </p>
    </div>
  );
}
