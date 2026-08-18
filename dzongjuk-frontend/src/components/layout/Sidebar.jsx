/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, CheckSquare, Users, Upload, ClipboardList,
  Award, AlertCircle, BarChart3, Settings, Shield, ChevronDown,
  ChevronRight, Bookmark, BookOpen, UserCog, Zap, Home, FileSearch,
  GraduationCap, Scale, Wrench, Server, SlidersHorizontal, FileCog,
  ClipboardCheck, FlaskConical, ScrollText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../ui/Badge';
import { canAccess } from '../../config/accessMatrix';

const NAV_CONFIG = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'User Management', icon: Users, to: '/admin/users', access: ['users', 'read'] },
  { label: 'Role Management', icon: UserCog, to: '/admin/roles', access: ['roles', 'read'] },
  {
    label: 'Registration', icon: FileText, access: ['registration', 'read'], children: [
      { label: 'Exam Windows', icon: Bookmark, to: '/registration/windows', access: ['registration', 'read'] },
      { label: 'Applications', icon: ClipboardList, to: '/registration/applications', access: ['registration', 'read'], excludeRoles: ['test_taker'] },
      { label: 'My Applications', icon: ClipboardList, to: '/my-applications', access: ['registration', 'read_own'] },
    ],
  },
  { label: 'Verification', icon: CheckSquare, to: '/verification', access: ['verification', 'read'] },
  { label: 'Absentee', icon: Users, to: '/attendance', access: ['attendance', 'read'] },
  {
    label: 'Question Papers', icon: BookOpen, access: ['questions', 'read'], children: [
      { label: 'Upload Papers', icon: Upload, to: '/questions/upload', access: ['questions', 'create'] },
      { label: 'Question Papers', icon: FileText, to: '/questions', access: ['questions', 'read'] },
    ],
  },
  { label: 'Sample Papers', icon: FileSearch, to: '/questions/samples', access: ['questions', 'sample'] },
  { label: 'Band Score Entry', icon: ClipboardList, to: '/scores', access: ['scores', 'submit'] },
  { label: 'View Scores', icon: FileText, to: '/scores/view', access: ['scores', 'read'], excludeRoles: ['admin', 'dcdd', 'exam_head', 'committee_head'] },
  { label: 'Score Summary', icon: BarChart3, to: '/scores/summary', access: ['scores', 'read'], excludeRoles: ['test_taker'] },
  { label: 'Re-evaluation', icon: Scale, to: '/appeals', access: ['appeals', 'read'] },
  { label: 'Submit Re-evaluation', icon: AlertCircle, to: '/appeals/new', access: ['appeals', 'submit_own'] },
  { label: 'Certificates', icon: Award, to: '/certificates', access: ['certificates', 'read'] },
  { label: 'Reports', icon: BarChart3, to: '/reports', access: ['reports', 'read'] },
  { label: 'Technical Settings', icon: Wrench, to: '/admin/technical', roles: ['admin'] },
  { label: 'Exam Configuration', icon: Settings, to: '/masters', roles: ['admin', 'dcdd'] },
  { label: 'Operational Settings', icon: SlidersHorizontal, to: '/dcdd/operational', roles: ['dcdd'] },
  { label: 'Notifications', icon: Zap, to: '/notifications' },
];

function permitted(item, role) {
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.excludeRoles?.includes(role)) return false;
  if (item.access && !canAccess(role, item.access[0], item.access[1])) return false;
  return true;
}

function navigationFor(role) {
  return NAV_CONFIG.filter(item => permitted(item, role)).map(item => {
    if (!item.children) return item;
    const children = item.children.filter(child => permitted(child, role));
    return { ...item, children };
  }).filter(item => !item.children || item.children.length > 0);
}

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => item.children?.some(c => location.pathname.startsWith(c.to)));

  if (item.children) {
    const isActive = item.children.some(c => location.pathname.startsWith(c.to));
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={[
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-brand-gold/10 text-brand-gold'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
          ].join(' ')}
        >
          <item.icon size={16} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-0.5 pl-3 border-l border-surface-border flex flex-col gap-0.5 py-0.5">
                {item.children.map(child => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={({ isActive }) => [
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-gold/10 text-brand-gold'
                        : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/40',
                    ].join(' ')}
                  >
                    <child.icon size={13} className="shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-brand-gold/10 text-brand-gold shadow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
      ].join(' ')}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, isDesktop, mobileOpen }) {
  const { user } = useAuth();
  const navItems = navigationFor(user?.role);

  return (
    <motion.aside
      initial={false}
      animate={isDesktop ? { width: collapsed ? 60 : 220, x: 0 } : { width: 260, x: mobileOpen ? 0 : -260 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-surface-card border-r border-surface-border shrink-0 overflow-hidden lg:relative lg:z-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-13 border-b border-surface-border shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm bg-white flex items-center justify-center">
          <img
            src="/images/logo of DCDD.jpg"
            alt="DCDD Logo"
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-sm font-bold text-white leading-none mb-0.5 tracking-wide">Dzongjuk</p>
            <p className="text-[10px] text-[#64748b] leading-none uppercase font-medium tracking-wider">DSTS &middot; DCDD</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {navItems.map((item, i) => (
          <NavItem key={i} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-brand-gold font-semibold text-sm shrink-0">
                {user.name?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
              <p className="text-[10px] text-text-muted truncate">{user.roleName}</p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
