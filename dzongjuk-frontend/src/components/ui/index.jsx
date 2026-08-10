/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/* Barrel export for all UI components */
export { default as Button } from './Button';
export { default as Badge, StatusBadge } from './Badge';
export { default as Input, Select, Textarea } from './Input';
export { default as Modal } from './Modal';
export { default as Table } from './Table';

/* === Card === */
export function Card({ children, glass = false, className = '', ...props }) {
  return (
    <div className={`card ${glass ? 'card-glass' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
export function CardHeader({ children, className = '' }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}
export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}


/* === StatCard === */
export function StatCard({ icon: Icon, label, value, trend, trendDir, color = 'var(--color-primary-500)' }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      {Icon && (
        <div className="stat-icon" style={{ background: `${color}18`, color }}>
          <Icon size={24} />
        </div>
      )}
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {trend && (
          <div className={`stat-trend ${trendDir || ''}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

/* === Tabs === */
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="badge badge-neutral" style={{ marginLeft: '6px' }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* === Spinner === */
export function Spinner({ size = 24 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="animate-spin" style={{
        width: size, height: size,
        border: '3px solid var(--surface-border)',
        borderTopColor: 'var(--color-primary-500)',
        borderRadius: '50%'
      }} />
    </div>
  );
}



/* === Avatar === */
export function Avatar({ name, size = 'md', src, className = '' }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  const colors = ['#F59E0B', '#0D9488', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div
      className={`avatar avatar-${size} ${className}`}
      style={!src ? { background: colors[colorIdx], color: 'white' } : {}}
      title={name}
    >
      {src ? <img src={src} alt={name} /> : initials}
    </div>
  );
}



/* === Stepper === */
export function Stepper({ steps = [], currentStep = 0 }) {
  return (
    <div className="stepper">
      {steps.map((step, i) => (
        <div key={i} className={`stepper-item ${i < currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}`}>
          <div className="stepper-circle">
            {i < currentStep ? '✓' : i + 1}
          </div>
          <span className="stepper-label">{step}</span>
        </div>
      ))}
    </div>
  );
}



/* === FileUpload === */
export function FileUpload({ label, accept, onChange, value, hint }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) onChange?.(files[0]);
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div
        className="file-upload-zone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-${label}`)?.click()}
      >
        <input
          id={`file-${label}`}
          type="file"
          accept={accept}
          onChange={e => onChange?.(e.target.files[0])}
          style={{ display: 'none' }}
        />
        {value ? (
          <p style={{ color: 'var(--text-primary)' }}>📄 {value.name || value}</p>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Drop file here or <span style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>browse</span>
            </p>
            {hint && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{hint}</p>}
          </>
        )}
      </div>
    </div>
  );
}


