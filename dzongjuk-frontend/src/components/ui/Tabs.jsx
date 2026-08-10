import { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';

const TabsCtx = createContext(null);

export function Tabs({ defaultValue, value, onChange, children, className = '' }) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value !== undefined ? value : internal;
  const setActive = onChange || setInternal;
  return (
    <TabsCtx.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabList({ children, className = '' }) {
  return (
    <div className={`flex gap-0.5 bg-surface-bg border border-surface-border rounded-lg p-1 ${className}`}>
      {children}
    </div>
  );
}

export function Tab({ value, children, icon }) {
  const { active, setActive } = useContext(TabsCtx);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={[
        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'text-text-primary'
          : 'text-text-muted hover:text-text-secondary',
      ].join(' ')}
    >
      {isActive && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 bg-surface-card border border-surface-border rounded-md shadow-sm"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {children}
      </span>
    </button>
  );
}

export function TabPanel({ value, children }) {
  const { active } = useContext(TabsCtx);
  if (active !== value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
