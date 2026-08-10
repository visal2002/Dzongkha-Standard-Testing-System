import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeft, Bell, Sun, Moon, Search, ChevronDown, LogOut,
  User, Settings, RefreshCw, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import Badge from '../ui/Badge';

const ROLE_SWITCHER = [
  { email: 'system.admin@demo.com', label: 'System Admin' },
  { email: 'dcdd.admin@demo.com', label: 'DCDD Admin' },
  { email: 'exam.head@demo.com', label: 'Exam Head' },
  { email: 'committee.head@demo.com', label: 'Committee Head' },
  { email: 'chief.executive@demo.com', label: 'Chief Executive' },
  { email: 'test.taker@demo.com', label: 'Test Taker' },
  { email: 'member@dsts.bt', label: 'Committee Member' },
];

function NotificationPanel({ notifications: items = [], onClose }) {
  const unread = items.filter(n => !n.read);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),20rem)] bg-surface-card border border-surface-border rounded-xl shadow-2xl shadow-black/30 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <p className="text-sm font-semibold text-text-primary">Notifications</p>
        {unread.length > 0 && <Badge variant="gold" size="sm">{unread.length} new</Badge>}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-text-muted">No notifications</div>
        ) : items.map(n => (
          <div key={n.id} className={`px-4 py-3 border-b border-surface-border/50 flex gap-3 ${!n.read ? 'bg-brand-gold/5' : ''}`}>
            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? 'bg-brand-gold' : 'bg-surface-border'}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary leading-tight">{n.title}</p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2">
        <button className="text-xs text-brand-gold hover:text-brand-gold-light transition-colors" onClick={onClose}>
          View all notifications →
        </button>
      </div>
    </motion.div>
  );
}

function UserMenu({ onClose }) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),16rem)] bg-surface-card border border-surface-border rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-surface-border bg-surface-bg">
        <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
        <p className="text-xs text-text-muted truncate">{user?.email}</p>
        <Badge variant="gold" size="sm" className="mt-1">{user?.roleName}</Badge>
      </div>
      {/* Menu items */}
      <div className="py-1.5">
        <button
          onClick={() => { navigate('/profile'); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/60 transition-colors"
        >
          <User size={14} /> Profile
        </button>
        <button
          onClick={() => { navigate('/settings'); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/60 transition-colors"
        >
          <Settings size={14} /> Settings
        </button>
        <button
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/60 transition-colors"
          onClick={() => setShowSwitcher(s => !s)}
        >
          <RefreshCw size={14} />
          <span className="flex-1 text-left">Switch Role (Demo)</span>
          <ChevronDown size={12} className={`transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
        </button>
        {showSwitcher && (
          <div className="bg-surface-bg border-t border-surface-border py-1">
            {ROLE_SWITCHER.map(r => (
              <button
                key={r.email}
                onClick={() => { switchRole(r.email); onClose(); }}
                className={[
                  'w-full flex items-center gap-2.5 px-6 py-1.5 text-xs transition-colors',
                  user?.email === r.email
                    ? 'text-brand-gold'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/40',
                ].join(' ')}
              >
                {user?.email === r.email && <Check size={10} className="shrink-0" />}
                {user?.email !== r.email && <span className="w-2.5 shrink-0" />}
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-surface-border py-1.5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </motion.div>
  );
}

export default function Header({ collapsed, setCollapsed, isDesktop, onOpenMobileSidebar }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications: userNotifs, unreadCount } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setCollapsed(c => !c);
      return;
    }
    onOpenMobileSidebar();
  };

  // Close panels when clicking outside
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowNotifs(false);
        setShowUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-13 bg-surface-card border-b border-surface-border flex items-center px-4 gap-3 shrink-0 sticky top-0 z-30">
      {/* Toggle sidebar */}
      <button
        type="button"
        onClick={handleSidebarToggle}
        aria-label={isDesktop ? (collapsed ? 'Expand navigation' : 'Collapse navigation') : 'Open navigation menu'}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-surface-border text-text-muted hover:text-text-primary hover:bg-surface-border transition-colors"
      >
        <PanelLeft size={16} strokeWidth={1.5} />
      </button>

      {/* Search */}
      <div className="hidden md:block flex-1 max-w-md">
        <div className="flex items-center gap-2 h-8 px-3 bg-surface-bg border border-surface-border rounded-lg">
          <Search size={13} className="text-text-muted shrink-0" />
          <input
            aria-label="Search applicants, certificates, exams"
            placeholder="Search applicants, certificates, exams..."
            className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="text-[10px] text-text-muted bg-surface-border px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1" ref={ref}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-border transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowNotifs(s => !s); setShowUser(false); }}
            aria-label="Open notifications"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-border transition-colors relative"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-gold rounded-full" />
            )}
          </button>
          <AnimatePresence>
            {showNotifs && <NotificationPanel notifications={userNotifs.slice(0, 6)} onClose={() => setShowNotifs(false)} />}
          </AnimatePresence>
        </div>

        {/* User */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowUser(s => !s); setShowNotifs(false); }}
            aria-label="Open account menu"
            className="flex items-center gap-2 pl-2 pr-1 h-8 rounded-lg hover:bg-surface-border transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
              style={{ backgroundColor: user?.avatarColor || '#F59E0B' }}
            >
              {user?.name?.[0] || 'U'}
            </div>
            <span className="text-xs font-medium text-text-secondary max-w-24 truncate hidden sm:block">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={12} className="text-text-muted" />
          </button>
          <AnimatePresence>
            {showUser && <UserMenu onClose={() => setShowUser(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
