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
  Award, BarChart3, Settings, Shield, ChevronDown,
  ChevronRight, Bookmark, BookOpen, UserCog, Home, FileSearch,
  GraduationCap, Scale, Wrench, Server, SlidersHorizontal, FileCog,
  ClipboardCheck, FlaskConical, ScrollText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Badge from '@/components/ui/Badge';
import { canAccess, isOwnScoped } from '@/features/rbac/accessMatrix';
import { rolesFor } from '@/features/rbac/outOfMatrix';

// `access: [module, action]`  shown when the matrix grants that action.
// `ownScoped: module`         shown only to roles that may read their own records in
//                             the module but not everyone's - the personal screens.
// `roles: [...]`              an operation outside the matrix; roles come from the
//                             out-of-matrix registry, never from a literal here.
// `onlyRoles: [...]`          a UI-only carve-out for one role's presentation, not an
//                             access grant - use when a role needs a different shape of
//                             an entry other roles already see (e.g. flattened out of a
//                             collapsible group into its own top-level item).
// `excludeRoles: [...]`       the inverse - hides an otherwise-permitted entry from one
//                             role because that role has its own carve-out entry instead.
// `type: 'section'`           a non-interactive uppercase label, not a nav link.
const NAV_CONFIG = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  // System Admin's menu is split into labelled sections; every other role keeps the
  // flat list it already had, so these headers are scoped to admin only.
  { type: 'section', label: 'Identity & Access', onlyRoles: ['admin'] },
  { label: 'User Management', icon: Users, to: '/admin/users', access: ['users', 'read'] },
  { label: 'Role Management', icon: UserCog, to: '/admin/roles', access: ['roles', 'read'] },
  { label: 'Technical Settings', icon: Wrench, to: '/admin/technical', roles: rolesFor('technicalSettings') },
  { type: 'section', label: 'Operations', onlyRoles: ['admin'] },
  {
    label: 'Registration', icon: FileText, access: ['registration', 'read'], excludeRoles: ['test_taker'], children: [
      // BRD §5.2.1 gives DCDD ownership of exam window configuration; System Admin's
      // matrix grant is superuser oversight, not a day-to-day task, so its copy of
      // this link lives in Admin Overrides below instead of here.
      { label: 'Exam Windows', icon: Bookmark, to: '/registration/windows', access: ['registration', 'read'], excludeRoles: ['admin'] },
      { label: 'Applications', icon: ClipboardList, to: '/registration/applications', access: ['registration', 'read_all'] },
      // "My Applications" deliberately has no entry here. Only the Test Taker
      // registers for exams, and it already gets its own flat section below - every
      // other role's `read_own` on Registration is only incidental to the `full`/
      // `read` access level it holds for organisation-wide oversight, not a real
      // personal screen. That incidental grant kept satisfying an `access:
      // ['registration', 'read_own']` check here, so this leaked into System Admin's
      // menu, then a second role's, before being caught a third time on Exam Head -
      // removing the entry instead of excluding one more role closes it for good.
    ],
  },
  // Test Taker sees a flat section instead of the collapsible group above - they only
  // ever have the one child, so a always-visible section reads better than a toggle.
  { type: 'section', label: 'Registration', onlyRoles: ['test_taker'] },
  { label: 'My Applications', icon: ClipboardList, to: '/my-applications', onlyRoles: ['test_taker'], access: ['registration', 'read_own'] },
  // Verification and Absentee are BRD §5.3.1 DCDD workflows; System Admin holds them
  // only as matrix "Full" oversight, so its copies move to Admin Overrides too.
  { label: 'Verification', icon: CheckSquare, to: '/verification', access: ['verification', 'read'], excludeRoles: ['admin'] },
  { label: 'Absentee', icon: Users, to: '/attendance', access: ['attendance', 'read'], excludeRoles: ['admin'] },
  {
    label: 'Question Papers', icon: BookOpen, access: ['questions', 'read'], children: [
      { label: 'Upload Papers', icon: Upload, to: '/questions/upload', access: ['questions', 'create'] },
      { label: 'Question Papers', icon: FileText, to: '/questions', access: ['questions', 'read'] },
    ],
  },
  { label: 'Sample Papers', icon: FileSearch, to: '/questions/samples', access: ['questions', 'sample'] },
  { label: 'Band Score Entry', icon: ClipboardList, to: '/scores', access: ['scores', 'submit'] },
  // ViewScores only ever loads the caller's own results; every other role gets an
  // empty table. It is a personal screen, so it is offered to own-scoped roles only -
  // the organisation-wide view is Band Scores.
  { label: 'My Results', icon: FileText, to: '/scores/view', ownScoped: 'scores' },
  { label: 'Band Scores', icon: BarChart3, to: '/scores/summary', access: ['scores', 'read_all'] },
  { label: 'Re-evaluation', icon: Scale, to: '/appeals', access: ['appeals', 'read'] },
  { label: 'Certificates', icon: Award, to: '/certificates', access: ['certificates', 'read'] },
  { label: 'Reports', icon: BarChart3, to: '/reports', access: ['reports', 'read_all'] },
  { label: 'My Records', icon: BarChart3, to: '/reports/my', ownScoped: 'reports' },
  { label: 'Exam Configuration', icon: Settings, to: '/masters', roles: rolesFor('examConfiguration') },
  { label: 'Operational Settings', icon: SlidersHorizontal, to: '/dcdd/operational', roles: rolesFor('operationalSettings') },
  // System Admin's superuser copies of DCDD's day-to-day screens, collapsed and
  // placed last so they read as break-glass oversight rather than core admin work.
  {
    label: 'Admin Overrides', icon: Shield, onlyRoles: ['admin'], children: [
      { label: 'Exam Windows', icon: Bookmark, to: '/registration/windows', access: ['registration', 'read'] },
      { label: 'Verification', icon: CheckSquare, to: '/verification', access: ['verification', 'read'] },
      { label: 'Absentee', icon: Users, to: '/attendance', access: ['attendance', 'read'] },
    ],
  },
];

function permitted(item, role) {
  if (item.onlyRoles && !item.onlyRoles.includes(role)) return false;
  if (item.excludeRoles && item.excludeRoles.includes(role)) return false;
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.ownScoped && !isOwnScoped(role, item.ownScoped)) return false;
  if (item.access && !canAccess(role, item.access[0], item.access[1])) return false;
  return true;
}

// BRD §5.4.2 defines exactly one function for the Exam Head: upload question papers
// and answer sheets. Every other module it can see is "Read" in the matrix by
// default, granting situational awareness across the pipeline rather than a defined
// day-to-day task, so those are demoted into a collapsed read-only section below the
// role's actual work instead of sitting at the same visual weight as it.
const EXAM_HEAD_PRIMARY_LABELS = ['Dashboard', 'Question Papers', 'Sample Papers'];

export function navigationFor(role) {
  const items = NAV_CONFIG.filter(item => permitted(item, role)).map(item => {
    if (!item.children) return item;
    const children = item.children.filter(child => permitted(child, role));
    return { ...item, children };
  }).filter(item => !item.children || item.children.length > 0);

  if (role !== 'exam_head') return items;

  const primary = items.filter(item => EXAM_HEAD_PRIMARY_LABELS.includes(item.label));
  const rest = items.filter(item => !EXAM_HEAD_PRIMARY_LABELS.includes(item.label));
  return [...primary, { type: 'section', label: 'Read-Only' }, ...rest];
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
          item.type === 'section'
            ? (!collapsed && (
                <p key={i} className="px-3 pt-3 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider select-none">
                  {item.label}
                </p>
              ))
            : <NavItem key={i} item={item} collapsed={collapsed} />
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
