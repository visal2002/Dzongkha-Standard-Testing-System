import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, DollarSign, Award, Bell, LayoutDashboard, BarChart3,
  GitBranch, Save, Upload, Image, AlignLeft, ToggleLeft, ChevronRight,
  Clock, Users, FileText, CheckCircle, AlertTriangle, Palette,
  ClipboardList, Settings, Megaphone, PenLine
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const persist = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── primitives ───────────────────────────────────────────────────────────────
const inputCls = 'w-full h-9 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors';
const labelCls = 'block text-xs font-medium text-text-muted mb-1';
const sectionCls = 'bg-surface-card border border-surface-border rounded-xl overflow-hidden';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, id }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${checked ? 'bg-brand-gold' : 'bg-surface-border'}`}>
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
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60 mt-4">
      <Save size={14} />
      {loading ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border bg-surface-elevated/30">
      <Icon size={15} className="text-brand-gold shrink-0" />
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function UploadField({ label, hint }) {
  return (
    <Field label={label} hint={hint}>
      <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-surface-border bg-surface-bg cursor-pointer hover:border-brand-gold/50 transition-colors text-xs text-text-muted">
        <Upload size={13} />
        <span>Click to upload image…</span>
        <input type="file" accept="image/*" className="hidden" />
      </label>
    </Field>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ExamMasterSection() {
  const KEY = 'ops_exam';
  const [cfg, setCfg] = useState(() => load(KEY, {
    regStart: '', regEnd: '', maxCapacity: 500, waitingList: true,
    sessionName: 'DSTS January 2026', venue: '', venueAddress: '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { persist(KEY, cfg); setSaving(false); toast.success('Exam master settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
        <AlertTriangle size={13} /> Changes apply to the current and all future registration windows.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Registration Start Date">
          <input type="date" className={inputCls} value={cfg.regStart} onChange={e => set('regStart', e.target.value)} />
        </Field>
        <Field label="Registration End Date">
          <input type="date" className={inputCls} value={cfg.regEnd} onChange={e => set('regEnd', e.target.value)} />
        </Field>
        <Field label="Maximum Candidate Capacity">
          <input type="number" className={inputCls} value={cfg.maxCapacity} min="1" onChange={e => set('maxCapacity', +e.target.value)} />
        </Field>
        <Field label="Examination Session Name">
          <input className={inputCls} value={cfg.sessionName} onChange={e => set('sessionName', e.target.value)} />
        </Field>
        <Field label="Examination Venue Name">
          <input className={inputCls} value={cfg.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. RCSC Training Hall" />
        </Field>
        <Field label="Venue Address">
          <input className={inputCls} value={cfg.venueAddress} onChange={e => set('venueAddress', e.target.value)} placeholder="Thimphu, Bhutan" />
        </Field>
      </div>
      <ToggleRow id="ops-waitlist" label="Enable Waiting List" description="Candidates can join the waiting list after capacity is reached" checked={cfg.waitingList} onChange={v => set('waitingList', v)} />
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function FeeSection() {
  const KEY = 'ops_fees';
  const [cfg, setCfg] = useState(() => load(KEY, {
    registrationFee: 500, appealFeeBase: 500, appealFeePerSkill: 300,
    currency: 'Nu.', effectiveDate: '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { persist(KEY, cfg); setSaving(false); toast.success('Fee settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Currency">
          <select className={inputCls} value={cfg.currency} onChange={e => set('currency', e.target.value)}>
            <option value="Nu.">Bhutanese Ngultrum (Nu.)</option>
            <option value="INR">Indian Rupee (INR)</option>
          </select>
        </Field>
        <Field label="Registration Fee" hint="Applied to all new registrations">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">{cfg.currency}</span>
            <input type="number" className={inputCls + ' pl-10'} value={cfg.registrationFee} min="0" onChange={e => set('registrationFee', +e.target.value)} />
          </div>
        </Field>
        <Field label="Re-evaluation Fee (Base)" hint="Base fee for appeal submission">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">{cfg.currency}</span>
            <input type="number" className={inputCls + ' pl-10'} value={cfg.appealFeeBase} min="0" onChange={e => set('appealFeeBase', +e.target.value)} />
          </div>
        </Field>
        <Field label="Re-evaluation Fee Per Skill" hint="Added per skill appealed">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">{cfg.currency}</span>
            <input type="number" className={inputCls + ' pl-10'} value={cfg.appealFeePerSkill} min="0" onChange={e => set('appealFeePerSkill', +e.target.value)} />
          </div>
        </Field>
        <Field label="Fee Effective Date">
          <input type="date" className={inputCls} value={cfg.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
        </Field>
      </div>
      <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs text-text-muted">
        <strong className="text-text-secondary">Total appeal cost example:</strong> {cfg.currency} {cfg.appealFeeBase} base + {cfg.currency} {cfg.appealFeePerSkill} × (number of skills selected)
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function CertificateSection() {
  const KEY = 'ops_cert';
  const [cfg, setCfg] = useState(() => load(KEY, {
    validityMonths: 24, title: 'Certificate of Dzongkha Proficiency',
    declarationStatement: 'This is to certify that the above-named candidate has successfully completed the Dzongkha Standard Testing System (DSTS) examination conducted by the Department of Culture and Dzongkha Development (DCDD).',
    signatoryName: '', signatoryDesignation: '', paperSize: 'A4', orientation: 'landscape',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { persist(KEY, cfg); setSaving(false); toast.success('Certificate settings saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      {/* Basic */}
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Certificate Configuration</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Certificate Title">
          <input className={inputCls} value={cfg.title} onChange={e => set('title', e.target.value)} />
        </Field>
        <Field label="Certificate Validity (months)">
          <input type="number" className={inputCls} value={cfg.validityMonths} min="1" onChange={e => set('validityMonths', +e.target.value)} />
        </Field>
        <Field label="Paper Size">
          <select className={inputCls} value={cfg.paperSize} onChange={e => set('paperSize', e.target.value)}>
            {['A4', 'A3', 'Letter', 'Legal'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Orientation">
          <select className={inputCls} value={cfg.orientation} onChange={e => set('orientation', e.target.value)}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </Field>
        <Field label="Authorized Signatory Name">
          <input className={inputCls} value={cfg.signatoryName} onChange={e => set('signatoryName', e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Signatory Designation">
          <input className={inputCls} value={cfg.signatoryDesignation} onChange={e => set('signatoryDesignation', e.target.value)} placeholder="e.g. Director General, DCDD" />
        </Field>
      </div>
      <Field label="Declaration Statement">
        <textarea rows={3} className={inputCls + ' !h-auto py-2'} value={cfg.declarationStatement} onChange={e => set('declarationStatement', e.target.value)} />
      </Field>

      {/* Image uploads */}
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">Logos, Signatures & Seals</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UploadField label="Left Logo" hint="Recommended: PNG, transparent background" />
        <UploadField label="Right Logo" hint="Recommended: PNG, transparent background" />
        <UploadField label="Signature Image" hint="Authorized signatory's signature" />
        <UploadField label="Official Seal" hint="Circular seal image, PNG with transparency" />
        <UploadField label="Certificate Border Image" hint="Decorative border, PNG" />
      </div>
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function NotificationTemplatesSection() {
  const KEY = 'ops_notif';
  const TEMPLATES = [
    { key: 'registrationAck', label: 'Registration Acknowledgement', hint: 'Sent when application is submitted' },
    { key: 'verificationApproved', label: 'Verification Approved', hint: 'Sent when DCDD verifies and approves' },
    { key: 'verificationCorrection', label: 'Verification Correction Required', hint: 'Sent when DCDD returns for correction' },
    { key: 'examSchedule', label: 'Examination Schedule', hint: 'Sent with admit card & exam details' },
    { key: 'resultPublished', label: 'Result Published', hint: 'Sent when results are officially declared' },
    { key: 'appealOutcome', label: 'Appeal Outcome', hint: 'Sent when re-evaluation decision is made' },
  ];
  const [cfg, setCfg] = useState(() => load(KEY, {
    registrationAck: 'Dear {name}, your application {appId} for {examTitle} has been received. We will notify you after verification.',
    verificationApproved: 'Dear {name}, your application {appId} for {examTitle} has been verified and approved. Please proceed with payment.',
    verificationCorrection: 'Dear {name}, your application {appId} requires correction. Remarks: {remarks}. Please log in to update.',
    examSchedule: 'Dear {name}, your examination for {examTitle} is scheduled. Registration No: {regNumber}. Please bring your admit card.',
    resultPublished: 'Dear {name}, results for {examTitle} are now available. Your registration number is {regNumber}. Log in to view your score.',
    appealOutcome: 'Dear {name}, your re-evaluation appeal {appId} has been {status}. Log in to DSTS portal for details.',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { setSaving(true); setTimeout(() => { persist(KEY, cfg); setSaving(false); toast.success('Notification templates saved.'); }, 400); };

  return (
    <div className="p-5 space-y-4">
      <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs text-text-muted">
        Available placeholders: <code className="text-brand-gold">{'{name}'}</code>, <code className="text-brand-gold">{'{examTitle}'}</code>, <code className="text-brand-gold">{'{appId}'}</code>, <code className="text-brand-gold">{'{regNumber}'}</code>, <code className="text-brand-gold">{'{remarks}'}</code>, <code className="text-brand-gold">{'{status}'}</code>
      </div>
      {TEMPLATES.map(t => (
        <Field key={t.key} label={t.label} hint={t.hint}>
          <textarea rows={2} className={inputCls + ' !h-auto py-2'} value={cfg[t.key]} onChange={e => set(t.key, e.target.value)} />
        </Field>
      ))}
      <SaveBtn onClick={onSave} loading={saving} />
    </div>
  );
}

function DashboardConfigSection() {
  const KEY = 'ops_dashboard';
  const WIDGETS = [
    { key: 'totalRegistrations', label: 'Total Registrations Card' },
    { key: 'pendingVerifications', label: 'Pending Verifications Card' },
    { key: 'approvedApplications', label: 'Approved Applications Card' },
    { key: 'activeAppeals', label: 'Active Appeals Card' },
    { key: 'registrationTrendChart', label: 'Registration Trend Chart' },
    { key: 'statusDistributionChart', label: 'Status Distribution Chart' },
    { key: 'examWindowsWidget', label: 'Exam Windows Widget' },
    { key: 'recentApplicationsList', label: 'Recent Applications List' },
  ];
  const [cfg, setCfg] = useState(() => load(KEY, Object.fromEntries(WIDGETS.map(w => [w.key, true]))));
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { persist(KEY, cfg); toast.success('Dashboard configuration saved.'); };

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs text-text-muted">Toggle visibility of dashboard widgets for the DCDD dashboard view.</p>
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        {WIDGETS.map(w => (
          <ToggleRow key={w.key} id={`dash-${w.key}`} label={w.label} checked={cfg[w.key]} onChange={v => set(w.key, v)} />
        ))}
      </div>
      <SaveBtn onClick={onSave} loading={false} />
    </div>
  );
}

function ReportingConfigSection() {
  const KEY = 'ops_reporting';
  const [cfg, setCfg] = useState(() => load(KEY, {
    defaultWindow: 'all', defaultStatus: 'all',
    exportPDF: true, exportExcel: true, exportCSV: true,
    defaultPageSize: 25,
  }));
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { persist(KEY, cfg); toast.success('Reporting configuration saved.'); };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default Report Filter — Window">
          <select className={inputCls} value={cfg.defaultWindow} onChange={e => set('defaultWindow', e.target.value)}>
            <option value="all">All Windows</option>
            <option value="current">Current Window</option>
          </select>
        </Field>
        <Field label="Default Report Filter — Status">
          <select className={inputCls} value={cfg.defaultStatus} onChange={e => set('defaultStatus', e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="submitted">Submitted Only</option>
          </select>
        </Field>
        <Field label="Default Records Per Page">
          <select className={inputCls} value={cfg.defaultPageSize} onChange={e => set('defaultPageSize', +e.target.value)}>
            {[10, 25, 50, 100].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
      </div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Export Formats</p>
      <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
        <ToggleRow id="rep-pdf" label="Enable PDF Export" checked={cfg.exportPDF} onChange={v => set('exportPDF', v)} />
        <ToggleRow id="rep-excel" label="Enable Excel Export" checked={cfg.exportExcel} onChange={v => set('exportExcel', v)} />
        <ToggleRow id="rep-csv" label="Enable CSV Export" checked={cfg.exportCSV} onChange={v => set('exportCSV', v)} />
      </div>
      <SaveBtn onClick={onSave} loading={false} />
    </div>
  );
}

function WorkflowSection() {
  const KEY = 'ops_workflow';
  const [cfg, setCfg] = useState(() => load(KEY, {
    verificationSteps: ['DCDD Focal Review', 'CID Validation', 'Payment Confirmation'],
    approvalHierarchy: ['DCDD Focal', 'DCDD Admin', 'Director'],
    appealWindowDays: 7,
    resultStatus: 'draft',
  }));
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const onSave = () => { persist(KEY, cfg); toast.success('Workflow settings saved.'); };

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Verification Workflow</p>
      <div className="space-y-2">
        {cfg.verificationSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-surface-elevated border border-surface-border rounded-lg text-sm">
            <span className="w-6 h-6 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <input className={inputCls} value={step} onChange={e => {
              const steps = [...cfg.verificationSteps];
              steps[i] = e.target.value;
              set('verificationSteps', steps);
            }} />
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">Approval Hierarchy</p>
      <div className="space-y-2">
        {cfg.approvalHierarchy.map((role, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-surface-elevated border border-surface-border rounded-lg text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <input className={inputCls} value={role} onChange={e => {
              const h = [...cfg.approvalHierarchy];
              h[i] = e.target.value;
              set('approvalHierarchy', h);
            }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Appeal Submission Window (days after results)" hint="Number of days candidates can submit appeals">
          <input type="number" className={inputCls} min="1" value={cfg.appealWindowDays} onChange={e => set('appealWindowDays', +e.target.value)} />
        </Field>
        <Field label="Result Publication Status">
          <select className={inputCls} value={cfg.resultStatus} onChange={e => set('resultStatus', e.target.value)}>
            <option value="draft">Draft — Not visible to candidates</option>
            <option value="published">Published — Visible to candidates</option>
          </select>
        </Field>
      </div>

      {cfg.resultStatus === 'published' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle size={13} /> Results are currently visible to all candidates.
        </div>
      )}

      <SaveBtn onClick={onSave} loading={false} />
    </div>
  );
}

// ─── Nav Sections ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'exam',       label: 'Examination Master Settings', icon: Calendar },
  { id: 'fees',       label: 'Fee Settings',                icon: DollarSign },
  { id: 'cert',       label: 'Certificate Settings',        icon: Award },
  { id: 'notif',      label: 'Notification Templates',      icon: Bell },
  { id: 'dashboard',  label: 'Dashboard Configuration',     icon: LayoutDashboard },
  { id: 'reporting',  label: 'Reporting Configuration',     icon: BarChart3 },
  { id: 'workflow',   label: 'Examination Workflow',        icon: GitBranch },
];

const SECTION_COMPONENTS = {
  exam:      ExamMasterSection,
  fees:      FeeSection,
  cert:      CertificateSection,
  notif:     NotificationTemplatesSection,
  dashboard: DashboardConfigSection,
  reporting: ReportingConfigSection,
  workflow:  WorkflowSection,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OperationalSettings() {
  const [active, setActive] = useState('exam');
  const current = SECTIONS.find(s => s.id === active);
  const ActiveComponent = SECTION_COMPONENTS[active];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Operational Settings</h1>
        <p className="text-sm text-text-muted">Examination business rules, fees, certificates, and workflow — DCDD Administration</p>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left nav */}
        <aside className="w-56 shrink-0 flex flex-col gap-1 self-start sticky top-0">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150',
                active === s.id
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
              ].join(' ')}>
              <s.icon size={14} className="shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <SectionHeader title={current?.label} icon={current?.icon || Settings} />
            <ActiveComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
