/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, CheckSquare, Users, Upload, ClipboardList,
  Award, AlertCircle, BarChart3, Settings, Shield, ChevronDown,
  ChevronRight, Bookmark, BookOpen, UserCog, Zap, Home, FileSearch,
  GraduationCap, Scale, Wrench, Server, SlidersHorizontal, FileCog,
  ClipboardCheck, FlaskConical, ScrollText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Badge from '@/components/ui/Badge';
import { canAccess } from '@/features/rbac/accessMatrix';

const NAV_CONFIG = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { labelKey: 'nav.user_management', icon: Users, to: '/admin/users', access: ['users', 'read'] },
  { labelKey: 'nav.role_management', icon: UserCog, to: '/admin/roles', access: ['roles', 'read'] },
  {
    labelKey: 'nav.registration', icon: FileText, access: ['registration', 'read'], children: [
      { labelKey: 'nav.exam_windows', icon: Bookmark, to: '/registration/windows', access: ['registration', 'read'] },
      { labelKey: 'nav.applications', icon: ClipboardList, to: '/registration/applications', access: ['registration', 'read_all'] },
      { labelKey: 'nav.my_applications', icon: ClipboardList, to: '/my-applications', access: ['registration', 'read_own'] },
    ],
  },
  { labelKey: 'nav.verification', icon: CheckSquare, to: '/verification', access: ['verification', 'read'] },
  { labelKey: 'nav.absentee', icon: Users, to: '/attendance', access: ['attendance', 'read'] },
  {
    labelKey: 'nav.question_papers', icon: BookOpen, access: ['questions', 'read'], children: [
      { labelKey: 'nav.upload_papers', icon: Upload, to: '/questions/upload', access: ['questions', 'create'] },
      { labelKey: 'nav.question_papers', icon: FileText, to: '/questions', access: ['questions', 'read'] },
    ],
  },
  { labelKey: 'nav.sample_papers', icon: FileSearch, to: '/questions/samples', access: ['questions', 'sample'] },
  { labelKey: 'nav.band_score_entry', icon: ClipboardList, to: '/scores', access: ['scores', 'submit'] },
  { labelKey: 'nav.view_scores', icon: FileText, to: '/scores/view', access: ['scores', 'read'], excludeRoles: ['admin', 'dcdd', 'exam_head', 'committee_head'] },
  { labelKey: 'nav.score_summary', icon: BarChart3, to: '/scores/summary', access: ['scores', 'read_all'] },
  { labelKey: 'nav.re_evaluation', icon: Scale, to: '/appeals', access: ['appeals', 'read'] },
  { labelKey: 'nav.submit_re_evaluation', icon: AlertCircle, to: '/appeals/new', access: ['appeals', 'submit_own'] },
  { labelKey: 'nav.certificates', icon: Award, to: '/certificates', access: ['certificates', 'read'] },
  { labelKey: 'nav.reports', icon: BarChart3, to: '/reports', access: ['reports', 'read'] },
  { labelKey: 'nav.technical_settings', icon: Wrench, to: '/admin/technical', roles: ['admin'] },
  { labelKey: 'nav.exam_configuration', icon: Settings, to: '/masters', roles: ['admin', 'dcdd'] },
  { labelKey: 'nav.operational_settings', icon: SlidersHorizontal, to: '/dcdd/operational', roles: ['dcdd'] },
  { labelKey: 'nav.notifications', icon: Zap, to: '/notifications' },
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
  const { t } = useTranslation();
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
              <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
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
                    <span className="truncate">{t(child.labelKey)}</span>
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
      title={collapsed ? t(item.labelKey) : undefined}
      className={({ isActive }) => [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-brand-gold/10 text-brand-gold shadow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
      ].join(' ')}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
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
