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

// Navigation config keyed by role
const NAV_CONFIG = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management', icon: Users, to: '/admin/users' },
    { label: 'Role Management', icon: UserCog, to: '/admin/roles' },
    { label: 'Technical Settings', icon: Wrench, to: '/admin/technical' },
    { label: 'Audit Logs', icon: ScrollText, to: '/admin/technical' },
    { label: 'System Monitoring', icon: Server, to: '/admin/technical' },
  ],
  dcdd: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    {
      label: 'Registration',
      icon: FileText,
      children: [
        { label: 'Exam Windows', icon: Bookmark, to: '/registration/windows' },
        { label: 'Applications', icon: ClipboardList, to: '/registration/applications', badge: 'pending' },
      ]
    },
    { label: 'App. Verification', icon: CheckSquare, to: '/verification' },
    { label: 'Attendance', icon: Users, to: '/attendance' },
    {
      label: 'Examination',
      icon: ClipboardCheck,
      children: [
        { label: 'Exam Configuration', icon: Settings, to: '/masters' },
        { label: 'Score Summary', icon: BarChart3, to: '/scores/summary' },
      ]
    },
    {
      label: 'Question Bank',
      icon: BookOpen,
      children: [
        { label: 'Sample Papers', icon: FileSearch, to: '/questions/samples' },
      ]
    },
    { label: 'Certificate Management', icon: Award, to: '/certificates' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
    { label: 'Notifications', icon: Zap, to: '/notifications' },
    { label: 'Operational Settings', icon: SlidersHorizontal, to: '/dcdd/operational' },
  ],
  exam_head: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    {
      label: 'Question Papers',
      icon: BookOpen,
      children: [
        { label: 'Upload Papers', icon: Upload, to: '/questions/upload' },
        { label: 'My Uploads', icon: FileText, to: '/questions' },
        { label: 'Sample Papers', icon: FileSearch, to: '/questions/samples' },
      ]
    },
    { label: 'Score Summary', icon: ClipboardList, to: '/scores/summary' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ],
  committee_head: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Committee Setup', icon: Users, to: '/scores/committee' },
    { label: 'Band Score Entry', icon: ClipboardList, to: '/scores' },
    { label: 'Score Summary', icon: FileText, to: '/scores/summary' },
    { label: 'Appeals Review', icon: Scale, to: '/appeals', badge: 'pending' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ],
  committee_member: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'View Scores', icon: FileText, to: '/scores/view' },
    { label: 'Score Summary', icon: ClipboardList, to: '/scores/summary' },
    { label: 'Appeals Review', icon: Scale, to: '/appeals' },
  ],
  chief_executive: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Appeal Approvals', icon: Scale, to: '/appeals', badge: 'pending' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ],
  test_taker: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    {
      label: 'My Registration',
      icon: FileText,
      children: [
        { label: 'Register for Exam', icon: GraduationCap, to: '/registration/windows' },
        { label: 'My Applications', icon: ClipboardList, to: '/my-applications' },
      ]
    },
    { label: 'My Results', icon: BarChart3, to: '/scores/view' },
    { label: 'Certificates', icon: Award, to: '/certificates' },
    { label: 'Submit Appeal', icon: AlertCircle, to: '/appeals/new' },
    { label: 'My Appeals', icon: Scale, to: '/appeals' },
    { label: 'Sample Papers', icon: BookOpen, to: '/questions/samples' },
  ],
};

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
              : 'text-text-muted hover:text-text-secondary hover:bg-[var(--color-surface-border)]/60',
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
                        : 'text-text-muted hover:text-text-secondary hover:bg-[var(--color-surface-border)]/40',
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
          : 'text-text-muted hover:text-text-secondary hover:bg-[var(--color-surface-border)]/60',
      ].join(' ')}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, isDesktop, mobileOpen }) {
  const { user } = useAuth();
  const navItems = NAV_CONFIG[user?.role] || NAV_CONFIG.admin;

  return (
    <motion.aside
      initial={false}
      animate={isDesktop ? { width: collapsed ? 60 : 220, x: 0 } : { width: 260, x: mobileOpen ? 0 : -260 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-surface-card border-r border-surface-border shrink-0 overflow-hidden lg:relative lg:z-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-13 border-b border-surface-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-white">
            <path d="M4 6H20M4 12H20M4 18H12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-brand-gold font-semibold text-sm shrink-0">
              {user.name[0]}
            </div>
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
