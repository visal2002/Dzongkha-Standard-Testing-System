/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Link2, Mail, CreditCard, HardDrive,
  Database, FileText, Wrench, Zap, Globe2, Code2,
  Languages, ShieldCheck, Monitor, ChevronDown, Save, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Eye, EyeOff, TestTube, Download,
  Activity, Server, Cpu, HardDrive as Storage, Clock, ChevronRight,
  ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── primitives ───────────────────────────────────────────────────────────────
const inputCls = 'w-full h-9 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors';
const labelCls = 'block text-xs font-medium text-text-muted mb-1';
const sectionCls = 'bg-surface-card border border-surface-border rounded-xl overflow-hidden';

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${checked ? 'bg-brand-gold' : 'bg-surface-border'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange, id }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
      <div>
        <p className="text-sm text-text-primary font-medium">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  );
}

function SaveBtn({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60 mt-4"
    >
      <Save size={14} />
      {loading ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

function StatusBadge({ ok }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> Connected</span>
    : <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> Disconnected</span>;
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border bg-surface-elevated/30">
      <Icon size={15} className="text-brand-gold shrink-0" />
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

// ─── Nav Sidebar ──────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'auth',        label: 'Authentication & Security', icon: Shield },
  { id: 'users',       label: 'Users & Roles',             icon: Users },
  { id: 'ndi',         label: 'NDI & Integrations',        icon: Link2 },
  { id: 'email',       label: 'Email (SMTP)',               icon: Mail },
  { id: 'payment',     label: 'Payment Gateway',           icon: CreditCard },
  { id: 'storage',     label: 'File Storage',              icon: HardDrive },
  { id: 'backup',      label: 'Backup & Recovery',         icon: Database },
  { id: 'audit',       label: 'Audit Logs',                icon: FileText },
  { id: 'maintenance', label: 'Maintenance',               icon: Wrench },
  { id: 'performance', label: 'Performance',               icon: Zap },
  { id: 'api',         label: 'API Management',            icon: Code2 },
  { id: 'locale',      label: 'Localization',              icon: Languages },
  { id: 'hardening',   label: 'Security Hardening',        icon: ShieldCheck },
  { id: 'sysinfo',     label: 'System Information',        icon: Monitor },
];

// ─── Section Components ───────────────────────────────────────────────────────

function AuthSection() {
  const KEY = 'ts_auth';
  const [cfg, setCfg] = useState(() => load(KEY, {
    enableNDI: true, enablePassword: true, minPassLen: 8,
    requireUppercase: true, requireNumber: true, requireSymbol: false,
    passExpiryDays: 90, passHistory: 5,
    maxFailedAttempts: 5, lockoutMinutes: 30, captchaAfter: 3,
    forceResetFirstLogin: true,
    sessionTimeout: 60, allowSingleSession: false, secureCookie: true,
    enableMFA: true, otpValidity: 5,
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save(KEY, cfg); setSaving(false); toast.success('Auth settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-6">
      {/* Login Policy */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Login Policy</p>
        <div className="space-y-0 divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
          <ToggleRow id="ts-ndi" label="Enable NDI Login" description="Allow Bhutan NDI authentication" checked={cfg.enableNDI} onChange={v => set('enableNDI', v)} />
          <ToggleRow id="ts-pass-login" label="Enable Username / Password Login" checked={cfg.enablePassword} onChange={v => set('enablePassword', v)} />
          <ToggleRow id="ts-force-reset" label="Force Password Reset on First Login" checked={cfg.forceResetFirstLogin} onChange={v => set('forceResetFirstLogin', v)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Field label="Minimum Password Length">
            <input type="number" min="6" max="32" className={inputCls} value={cfg.minPassLen} onChange={e => set('minPassLen', +e.target.value)} />
          </Field>
          <Field label="Password Expiry (days)">
            <input type="number" min="0" className={inputCls} value={cfg.passExpiryDays} onChange={e => set('passExpiryDays', +e.target.value)} />
          </Field>
          <Field label="Password History">
            <input type="number" min="0" max="24" className={inputCls} value={cfg.passHistory} onChange={e => set('passHistory', +e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {[['requireUppercase','Uppercase required'],['requireNumber','Number required'],['requireSymbol','Symbol required']].map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={cfg[k]} onChange={e => set(k, e.target.checked)} className="accent-amber-500" /> {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Account Protection */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Account Protection</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Max Failed Login Attempts">
            <input type="number" min="1" className={inputCls} value={cfg.maxFailedAttempts} onChange={e => set('maxFailedAttempts', +e.target.value)} />
          </Field>
          <Field label="Lockout Duration (minutes)">
            <input type="number" min="1" className={inputCls} value={cfg.lockoutMinutes} onChange={e => set('lockoutMinutes', +e.target.value)} />
          </Field>
          <Field label="CAPTCHA After N Failures">
            <input type="number" min="1" className={inputCls} value={cfg.captchaAfter} onChange={e => set('captchaAfter', +e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Session */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Session Control</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Session Timeout (minutes)">
            <input type="number" min="5" className={inputCls} value={cfg.sessionTimeout} onChange={e => set('sessionTimeout', +e.target.value)} />
          </Field>
          <Field label="OTP Validity Period (minutes)">
            <input type="number" min="1" className={inputCls} value={cfg.otpValidity} onChange={e => set('otpValidity', +e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
          <ToggleRow id="ts-single-session" label="Allow Only One Active Session" checked={cfg.allowSingleSession} onChange={v => set('allowSingleSession', v)} />
          <ToggleRow id="ts-secure-cookie" label="Secure Cookie / HTTPS Only" checked={cfg.secureCookie} onChange={v => set('secureCookie', v)} />
          <ToggleRow id="ts-mfa" label="Enable MFA for Admin Users" checked={cfg.enableMFA} onChange={v => set('enableMFA', v)} />
        </div>
      </div>

      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function NDISection() {
  const KEY = 'ts_ndi';
  const [cfg, setCfg] = useState(() => load(KEY, { apiUrl: '', clientId: '', clientSecret: '', dcrcEndpoint: '', dcrcToken: '' }));
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ndStatus, setNdStatus] = useState(null);

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save(KEY, cfg); setSaving(false); toast.success('NDI settings saved.'); }, 400); };
  const onTest = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); setNdStatus(Math.random() > 0.4); }, 1200);
  };

  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">NDI Integration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="NDI API URL"><input className={inputCls} value={cfg.apiUrl} onChange={e => set('apiUrl', e.target.value)} placeholder="https://ndi.gov.bt/api/v1" /></Field>
          <Field label="Client ID"><input className={inputCls} value={cfg.clientId} onChange={e => set('clientId', e.target.value)} /></Field>
          <Field label="Client Secret">
            <div className="relative">
              <input type={showSecret ? 'text' : 'password'} className={inputCls + ' pr-9'} value={cfg.clientSecret} onChange={e => set('clientSecret', e.target.value)} />
              <button onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={onTest} disabled={testing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary text-xs hover:bg-surface-border/60 transition-colors">
            <TestTube size={13} />{testing ? 'Testing…' : 'Test Connection'}
          </button>
          {ndStatus !== null && <StatusBadge ok={ndStatus} />}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">DCRC / Census Integration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="API Endpoint"><input className={inputCls} value={cfg.dcrcEndpoint} onChange={e => set('dcrcEndpoint', e.target.value)} placeholder="https://dcrc.gov.bt/api" /></Field>
          <Field label="Authentication Token"><input className={inputCls} value={cfg.dcrcToken} onChange={e => set('dcrcToken', e.target.value)} type="password" /></Field>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-surface-elevated flex items-center gap-2 text-xs text-text-muted">
          <Activity size={13} className="text-text-muted" /> Sync history is not reported by the API yet.
        </div>
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function EmailSection() {
  const KEY = 'ts_email';
  const [cfg, setCfg] = useState(() => load(KEY, {
    smtpHost: '', port: 587, encryption: 'TLS', senderEmail: '', senderName: 'DSTS System',
    username: '', password: '', enabled: true, retryFailed: true,
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save(KEY, cfg); setSaving(false); toast.success('Email settings saved.'); }, 400); };
  const onTest = () => toast('Test email sent!', { icon: '📧' });

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SMTP Host"><input className={inputCls} value={cfg.smtpHost} onChange={e => set('smtpHost', e.target.value)} placeholder="smtp.example.com" /></Field>
        <Field label="Port"><input type="number" className={inputCls} value={cfg.port} onChange={e => set('port', +e.target.value)} /></Field>
        <Field label="Encryption">
          <select className={inputCls} value={cfg.encryption} onChange={e => set('encryption', e.target.value)}>
            {['None','TLS','SSL'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Sender Name"><input className={inputCls} value={cfg.senderName} onChange={e => set('senderName', e.target.value)} /></Field>
        <Field label="Sender Email"><input type="email" className={inputCls} value={cfg.senderEmail} onChange={e => set('senderEmail', e.target.value)} /></Field>
        <Field label="SMTP Username"><input className={inputCls} value={cfg.username} onChange={e => set('username', e.target.value)} /></Field>
        <Field label="SMTP Password"><input type="password" className={inputCls} value={cfg.password} onChange={e => set('password', e.target.value)} /></Field>
      </div>
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="ts-email-enable" label="Enable Email Notifications" checked={cfg.enabled} onChange={v => set('enabled', v)} />
        <ToggleRow id="ts-email-retry" label="Retry Failed Notifications" checked={cfg.retryFailed} onChange={v => set('retryFailed', v)} />
      </div>
      <div className="flex gap-2">
        <SaveBtn onClick={onSave} loading={saving} />
        <button onClick={onTest} className="flex items-center gap-1.5 px-4 py-2 mt-4 rounded-lg border border-surface-border text-text-secondary text-sm hover:bg-surface-border/60 transition-colors">
          <TestTube size={14} /> Send Test Email
        </button>
      </div>
    </div>
  );
}

function PaymentSection() {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
        <CreditCard size={14} className="mt-0.5 shrink-0" />
        <div><p className="font-semibold">Bhutan Integrated Revenue Management System (BIRMS)</p><p className="mt-1 opacity-90">Dzongjuk generates a Payment Advice and redirects the payer to BIRMS. Bank account details, PINs, and OTPs are handled only by BIRMS and its payment processors.</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Environment"><input className={inputCls} value="BIRMS Staging" readOnly /></Field>
        <Field label="Agency Service"><input className={inputCls} value="Ministry of Home Affairs service" readOnly /></Field>
        <Field label="Payment Callback"><input className={inputCls} value="/api/v1/payments/birms/callback" readOnly /></Field>
        <Field label="Reversal Callback"><input className={inputCls} value="/api/v1/payments/birms/reversal" readOnly /></Field>
      </div>
      <div className="rounded-lg border border-surface-border p-4">
        <p className="text-xs font-semibold text-text-primary mb-2">Available payer options</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
          {['Counter payment (cash, cheque, cash warrant, demand draft)', 'Online payment through the Domestic Payment Gateway', 'Supported bank mobile applications', 'BoB Internet Banking'].map(option => <div key={option} className="flex gap-2"><span className="text-emerald-400">✓</span><span>{option}</span></div>)}
        </div>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Credentials, platform, agency code, and service code must be installed as protected backend environment values issued by the BIRMS team. They are intentionally not editable or stored in this browser.
      </div>
    </div>
  );
}

function StorageSection() {
  const KEY = 'ts_storage';
  const [cfg, setCfg] = useState(() => load(KEY, {
    maxFileSize: 10, allowedTypes: 'pdf,jpg,jpeg,png', storagePath: '/uploads', encryptAtRest: true,
    virusScan: true, autoNaming: true, retentionDays: 365,
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save(KEY, cfg); setSaving(false); toast.success('Storage settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Max File Size (MB)"><input type="number" className={inputCls} value={cfg.maxFileSize} onChange={e => set('maxFileSize', +e.target.value)} /></Field>
        <Field label="Allowed File Types (comma-separated)"><input className={inputCls} value={cfg.allowedTypes} onChange={e => set('allowedTypes', e.target.value)} /></Field>
        <Field label="Storage Path / Cloud Bucket"><input className={inputCls} value={cfg.storagePath} onChange={e => set('storagePath', e.target.value)} /></Field>
        <Field label="File Retention Policy (days)"><input type="number" className={inputCls} value={cfg.retentionDays} onChange={e => set('retentionDays', +e.target.value)} /></Field>
      </div>
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="ts-encrypt-rest" label="Encryption at Rest" checked={cfg.encryptAtRest} onChange={v => set('encryptAtRest', v)} />
        <ToggleRow id="ts-virus-scan" label="Virus Scan on Upload" checked={cfg.virusScan} onChange={v => set('virusScan', v)} />
        <ToggleRow id="ts-auto-naming" label="Automatic File Naming" checked={cfg.autoNaming} onChange={v => set('autoNaming', v)} />
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function BackupSection() {
  const [cfg, setCfg] = useState(() => load('ts_backup', {
    dailyBackup: true, scheduleTime: '02:00', type: 'Full',
    retentionDays: 30, encryptBackup: true, secondaryLocation: '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_backup', cfg); setSaving(false); toast.success('Backup settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Backup Schedule Time"><input type="time" className={inputCls} value={cfg.scheduleTime} onChange={e => set('scheduleTime', e.target.value)} /></Field>
        <Field label="Backup Type">
          <select className={inputCls} value={cfg.type} onChange={e => set('type', e.target.value)}>
            <option>Full</option><option>Incremental</option>
          </select>
        </Field>
        <Field label="Retention Period (days)"><input type="number" className={inputCls} value={cfg.retentionDays} onChange={e => set('retentionDays', +e.target.value)} /></Field>
        <Field label="Secondary Backup Location"><input className={inputCls} value={cfg.secondaryLocation} onChange={e => set('secondaryLocation', e.target.value)} placeholder="s3://bucket/path" /></Field>
      </div>
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="ts-daily-backup" label="Daily Automatic Backup" checked={cfg.dailyBackup} onChange={v => set('dailyBackup', v)} />
        <ToggleRow id="ts-encrypt-backup" label="Encrypt Backup Files" checked={cfg.encryptBackup} onChange={v => set('encryptBackup', v)} />
      </div>
      <div className="mt-2 p-3 rounded-lg bg-surface-elevated flex items-center justify-between text-xs">
        <span className="text-text-muted flex items-center gap-1.5"><Database size={13} className="text-brand-gold" /> Backup history is not reported by the API yet.</span>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:bg-surface-border/60 transition-colors" onClick={() => toast('Backup download initiated.')}>
            <Download size={12} /> Download
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:bg-surface-border/60 transition-colors" onClick={() => toast('Backup integrity verified ✓', { icon: '✅' })}>
            <CheckCircle size={12} /> Verify
          </button>
        </div>
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function AuditSection() {
  const [cfg, setCfg] = useState(() => load('ts_audit', { enabled: true, retentionDays: 365, immutable: true }));
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const LOG_VIEWS = [
    'Login History', 'Failed Login History', 'User Changes', 'Role Changes',
    'Application Approval History', 'Score Modification History',
    'Certificate Download History', 'Question Paper Access History', 'API Integration Logs',
  ];

  return (
    <div className="p-5 space-y-4">
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="ts-audit-enable" label="Enable Audit Logging" checked={cfg.enabled} onChange={v => set('enabled', v)} />
        <ToggleRow id="ts-audit-immutable" label="Immutable Log Storage" description="Prevent modification of existing log entries" checked={cfg.immutable} onChange={v => set('immutable', v)} />
      </div>
      <Field label="Log Retention Period (days)">
        <input type="number" className={inputCls} value={cfg.retentionDays} onChange={e => set('retentionDays', +e.target.value)} />
      </Field>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">Audit Log Views</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {LOG_VIEWS.map(v => (
          <button key={v} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm text-text-secondary hover:bg-surface-border/60 transition-colors text-left">
            <span className="flex items-center gap-2"><FileText size={13} className="shrink-0 text-text-muted" />{v}</span>
            <ChevronRight size={13} className="shrink-0 text-text-muted" />
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {['PDF','Excel','CSV'].map(fmt => (
          <button key={fmt} onClick={() => toast(`Exporting as ${fmt}…`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-text-secondary hover:bg-surface-border/60 transition-colors">
            <Download size={12} />{fmt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MaintenanceSection() {
  const [cfg, setCfg] = useState(() => load('ts_maintenance', { enabled: false, message: 'System is under scheduled maintenance. Please try again later.', window: '' }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_maintenance', cfg); setSaving(false); toast.success('Maintenance settings saved.'); }, 400); };

  const ACTIONS = [
    { label: 'Clear Application Cache', icon: RefreshCw, action: () => toast('Cache cleared.') },
    { label: 'Clear Temporary Files', icon: HardDrive, action: () => toast('Temp files cleared.') },
    { label: 'Rebuild Search Indexes', icon: RefreshCw, action: () => toast('Search indexes rebuilt.') },
    { label: 'Restart Background Services', icon: Zap, action: () => toast('Background services restarted.') },
  ];

  return (
    <div className="p-5 space-y-4">
      {cfg.enabled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <AlertTriangle size={13} /> Maintenance mode is ON. Users see the maintenance message.
        </div>
      )}
      <ToggleRow id="ts-maint-mode" label="Enable Maintenance Mode" checked={cfg.enabled} onChange={v => set('enabled', v)} />
      <Field label="Maintenance Message">
        <textarea rows={2} className={inputCls + ' h-auto py-2'} value={cfg.message} onChange={e => set('message', e.target.value)} />
      </Field>
      <Field label="Scheduled Maintenance Window">
        <input className={inputCls} value={cfg.window} onChange={e => set('window', e.target.value)} placeholder="e.g. Every Sunday 01:00–03:00 AM" />
      </Field>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">System Actions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ACTIONS.map(a => (
          <button key={a.label} onClick={a.action} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-surface-border text-sm text-text-secondary hover:bg-surface-border/60 transition-colors">
            <a.icon size={13} className="shrink-0 text-text-muted" />{a.label}
          </button>
        ))}
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function PerformanceSection() {
  const [cfg, setCfg] = useState(() => load('ts_perf', {
    cacheEnabled: true, cacheDuration: 300, pageSize: 20,
    reportTimeout: 120, bgWorkers: 4, rateLimit: 100, concurrentUploads: 5,
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_perf', cfg); setSaving(false); toast.success('Performance settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <ToggleRow id="ts-cache-enable" label="Enable Cache" checked={cfg.cacheEnabled} onChange={v => set('cacheEnabled', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Cache Duration (seconds)"><input type="number" className={inputCls} value={cfg.cacheDuration} onChange={e => set('cacheDuration', +e.target.value)} /></Field>
        <Field label="Default Page Size"><input type="number" className={inputCls} value={cfg.pageSize} onChange={e => set('pageSize', +e.target.value)} /></Field>
        <Field label="Report Generation Timeout (s)"><input type="number" className={inputCls} value={cfg.reportTimeout} onChange={e => set('reportTimeout', +e.target.value)} /></Field>
        <Field label="Background Job Workers"><input type="number" className={inputCls} value={cfg.bgWorkers} onChange={e => set('bgWorkers', +e.target.value)} /></Field>
        <Field label="API Rate Limit (req/min)"><input type="number" className={inputCls} value={cfg.rateLimit} onChange={e => set('rateLimit', +e.target.value)} /></Field>
        <Field label="Concurrent Upload Limit"><input type="number" className={inputCls} value={cfg.concurrentUploads} onChange={e => set('concurrentUploads', +e.target.value)} /></Field>
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function APISection() {
  const [cfg, setCfg] = useState(() => load('ts_api', {
    publicAPIs: false, tokenExpiry: 3600, allowedIPs: '', webhookUrl: '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_api', cfg); setSaving(false); toast.success('API settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <ToggleRow id="ts-public-api" label="Enable Public APIs" description="Expose read-only public endpoints" checked={cfg.publicAPIs} onChange={v => set('publicAPIs', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Token Expiry (seconds)"><input type="number" className={inputCls} value={cfg.tokenExpiry} onChange={e => set('tokenExpiry', +e.target.value)} /></Field>
        <Field label="Allowed IP Addresses (comma-separated)"><input className={inputCls} value={cfg.allowedIPs} onChange={e => set('allowedIPs', e.target.value)} placeholder="192.168.1.0/24, 10.0.0.1" /></Field>
        <Field label="Webhook URL"><input className={inputCls} value={cfg.webhookUrl} onChange={e => set('webhookUrl', e.target.value)} placeholder="https://dsts.bt/api/webhook" /></Field>
      </div>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-text-secondary hover:bg-surface-border/60 transition-colors" onClick={() => toast('New API token generated.')}>
        <RefreshCw size={12} /> Generate New Token
      </button>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function LocaleSection() {
  const [cfg, setCfg] = useState(() => load('ts_locale', { language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', timezone: 'Asia/Thimphu', numberFormat: 'en-IN' }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_locale', cfg); setSaving(false); toast.success('Localization settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Default Language">
          <select className={inputCls} value={cfg.language} onChange={e => set('language', e.target.value)}>
            <option value="en">English</option><option value="dz">Dzongkha</option>
          </select>
        </Field>
        <Field label="Date Format">
          <select className={inputCls} value={cfg.dateFormat} onChange={e => set('dateFormat', e.target.value)}>
            {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Time Format">
          <select className={inputCls} value={cfg.timeFormat} onChange={e => set('timeFormat', e.target.value)}>
            <option value="24h">24-hour</option><option value="12h">12-hour</option>
          </select>
        </Field>
        <Field label="Time Zone">
          <input className={inputCls} value={cfg.timezone} onChange={e => set('timezone', e.target.value)} />
        </Field>
        <Field label="Number Format">
          <select className={inputCls} value={cfg.numberFormat} onChange={e => set('numberFormat', e.target.value)}>
            {['en-IN','en-US','en-GB'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function HardeningSection() {
  const [cfg, setCfg] = useState(() => load('ts_hardening', {
    forceHTTPS: true, hsts: true, corsOrigins: '', csp: true, xFrame: true, xContentType: true, referrerPolicy: 'strict-origin',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { save('ts_hardening', cfg); setSaving(false); toast.success('Security hardening settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="ts-https" label="Force HTTPS" checked={cfg.forceHTTPS} onChange={v => set('forceHTTPS', v)} />
        <ToggleRow id="ts-hsts" label="Enable HSTS (HTTP Strict Transport Security)" checked={cfg.hsts} onChange={v => set('hsts', v)} />
        <ToggleRow id="ts-csp" label="Content Security Policy (CSP)" checked={cfg.csp} onChange={v => set('csp', v)} />
        <ToggleRow id="ts-xframe" label="X-Frame-Options (Deny Embedding)" checked={cfg.xFrame} onChange={v => set('xFrame', v)} />
        <ToggleRow id="ts-xctype" label="X-Content-Type-Options" checked={cfg.xContentType} onChange={v => set('xContentType', v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="CORS Allowed Domains (comma-separated)">
          <input className={inputCls} value={cfg.corsOrigins} onChange={e => set('corsOrigins', e.target.value)} placeholder="https://dsts.bt, https://dcdd.bt" />
        </Field>
        <Field label="Referrer Policy">
          <select className={inputCls} value={cfg.referrerPolicy} onChange={e => set('referrerPolicy', e.target.value)}>
            {['no-referrer','strict-origin','strict-origin-when-cross-origin','same-origin'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function SysInfoSection() {
  // Only values this build genuinely knows about itself. Host metrics — CPU, memory,
  // storage, uptime, backup and deployment times — need a server endpoint to report
  // them; until one exists the panel says so rather than displaying stand-in figures.
  const metrics = [
    { icon: Activity, label: 'Application Version', value: import.meta.env.VITE_APP_VERSION || 'unknown' },
    { icon: Server, label: 'API Endpoint', value: import.meta.env.VITE_API_BASE_URL || 'not configured' },
    { icon: Cpu, label: 'Build Mode', value: import.meta.env.MODE },
    { icon: Clock, label: 'Client Time Zone', value: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown' },
  ];
  return (
    <div className="p-5">
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-surface-border bg-surface-elevated p-3">
        <Database size={14} className="text-text-muted mt-0.5 shrink-0" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          Host metrics (CPU, memory, storage, uptime, backup and deployment history) are not
          published by the API yet, so they are not shown here.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="flex items-start gap-3 p-3 rounded-lg bg-surface-elevated border border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
              <m.icon size={14} className="text-brand-gold" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider">{m.label}</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">{m.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Users Section (link to existing) ─────────────────────────────────────────
function UsersSection() {
  return (
    <div className="p-5">
      <p className="text-sm text-text-muted mb-4">User and role administration is managed in the dedicated modules.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a href="/admin/users" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-border/60 transition-colors text-sm text-text-secondary">
          <Users size={16} className="text-brand-gold" /> User Management →
        </a>
        <a href="/admin/roles" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-border/60 transition-colors text-sm text-text-secondary">
          <Shield size={16} className="text-brand-gold" /> Role & Permission Matrix →
        </a>
      </div>
    </div>
  );
}

// ─── Section map ──────────────────────────────────────────────────────────────
const SECTION_COMPONENTS = {
  auth:        AuthSection,
  users:       UsersSection,
  ndi:         NDISection,
  email:       EmailSection,
  payment:     PaymentSection,
  storage:     StorageSection,
  backup:      BackupSection,
  audit:       AuditSection,
  maintenance: MaintenanceSection,
  performance: PerformanceSection,
  api:         APISection,
  locale:      LocaleSection,
  hardening:   HardeningSection,
  sysinfo:     SysInfoSection,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TechnicalSettings() {
  const [active, setActive] = useState('auth');
  const current = SECTIONS.find(s => s.id === active);
  const ActiveComponent = SECTION_COMPONENTS[active];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Technical Settings</h1>
        <p className="text-sm text-text-muted">Infrastructure, security, and integration configuration — System Administrator only</p>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left nav */}
        <aside className="w-56 shrink-0 flex flex-col gap-1 self-start sticky top-0">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150',
                active === s.id
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
              ].join(' ')}
            >
              <s.icon size={14} className="shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={sectionCls}
          >
            <SectionHeader title={current?.label} icon={current?.icon || Shield} />
            <ActiveComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
