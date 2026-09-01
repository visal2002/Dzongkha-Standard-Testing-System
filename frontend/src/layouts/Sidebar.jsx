/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, FileText, CheckSquare, Users, Upload, ClipboardList,
  Award, BarChart3, Settings, ChevronDown,
  ChevronRight, Bookmark, BookOpen, UserCog, Home, FileSearch,
  GraduationCap, Scale, Server, FileCog, Download,
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
  // System Admin gets its own dashboard label and no other role does, so it is
  // excluded from the generic entry below and given a standalone one instead - the
  // same flattening pattern used for Test Taker's "My Applications" further down.
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', excludeRoles: ['admin'] },
  { label: 'Admin Dashboard', icon: LayoutDashboard, to: '/dashboard', onlyRoles: ['admin'] },
  // DCDD holds `users`/`roles` Read in the matrix (situational awareness, not a
  // stated day-to-day task) but that stays an unsurfaced backend entitlement under
  // the v2 six-item menu, the same treatment given its other matrix-only Read grants
  // (Question Papers, Band Scores, Re-evaluation) - see outOfMatrix.js 'examConfiguration'.
  { label: 'User Management', icon: Users, to: '/admin/users', access: ['users', 'read'], excludeRoles: ['dcdd'] },
  { label: 'Role Management', icon: UserCog, to: '/admin/roles', access: ['roles', 'read'], excludeRoles: ['dcdd'] },
  // v2 sidebar decision: System Admin is scoped to technical governance - users, roles,
  // permissions and system-level technical settings. Every exam-workflow module below
  // is withdrawn from the role entirely (see accessMatrix.js), not merely hidden, so
  // none of it can leak back in here.
  { label: 'Permission & Association Management', icon: ClipboardCheck, to: '/admin/permissions', roles: rolesFor('permissionManagement') },
  { label: 'Role Assignment', icon: UserCog, to: '/admin/role-assignment', roles: rolesFor('roleAssignment') },
  { label: 'System Audit Logs', icon: ScrollText, to: '/admin/audit-logs', roles: rolesFor('systemAuditLogs') },
  // System-level integration configuration (API keys, NDI credentials, SMS/email
  // gateways). Out of the matrix because no module describes infrastructure, but
  // owned by the System Administrator - see 'technicalSettings' in outOfMatrix.js.
  { label: 'Technical Settings', icon: Server, to: '/admin/technical', roles: rolesFor('technicalSettings') },
  {
    label: 'Registration', icon: FileText, access: ['registration', 'read'], excludeRoles: ['test_taker', 'dcdd', 'exam_head', 'chief_executive', 'committee_member', 'committee_head'], children: [
      { label: 'Exam Windows', icon: Bookmark, to: '/registration/windows', access: ['registration', 'read'] },
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
  // v2 Test Taker sidebar decision: registration and profile editing are the same
  // underlying record for this role (BRD §5.2.1-§5.2.2), so they get one merged
  // screen and one sidebar entry instead of the section-plus-child treatment this
  // used to get - the same flattening every other v2 role's menu already applies.
  // See MyApplications.jsx for the cancel/resubmit/profile-edit implementation.
  { label: 'Register / My Profile', icon: ClipboardList, to: '/my-applications', onlyRoles: ['test_taker'], access: ['registration', 'read_own'] },
  // DCDD sees its own day-to-day work as flat, ungrouped top-level items instead of
  // the collapsible Registration group above - v2 sidebar decision, six-item strict
  // least-privilege menu. It reuses the same routes as the entries it replaces, so
  // the route guards below need no change, only the sidebar presentation does.
  { label: 'Registration Windows', icon: Bookmark, to: '/registration/windows', onlyRoles: ['dcdd'] },
  { label: 'Verification', icon: CheckSquare, to: '/verification', access: ['verification', 'read'], excludeRoles: ['dcdd', 'exam_head'] },
  { label: 'Application Verification', icon: CheckSquare, to: '/verification', onlyRoles: ['dcdd'] },
  { label: 'Absentee', icon: Users, to: '/attendance', access: ['attendance', 'read'], excludeRoles: ['dcdd', 'exam_head'] },
  { label: 'Absentee Management', icon: Users, to: '/attendance', onlyRoles: ['dcdd'] },
  // v2 sidebar decision: the two former DCDD settings screens (Exam Configuration at
  // /masters, Operational Settings at /dcdd/operational) are consolidated into one
  // Master Configuration screen - certificate templates and the re-evaluation fee,
  // both real backend-driven, versioned, approval-gated data. See outOfMatrix.js.
  { label: 'Master Configuration', icon: Settings, to: '/masters', roles: rolesFor('examConfiguration') },
  {
    label: 'Question Papers', icon: BookOpen, access: ['questions', 'read'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_head'], children: [
      { label: 'Upload Papers', icon: Upload, to: '/questions/upload', access: ['questions', 'create'] },
      { label: 'Question Papers', icon: FileText, to: '/questions', access: ['questions', 'read'] },
    ],
  },
  { label: 'Sample Papers', icon: FileSearch, to: '/questions/samples', access: ['questions', 'sample'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_head', 'test_taker'] },
  // v2 sidebar decision: BRD §5.4.2 defines exactly one function for this role -
  // uploading question papers and answer sheets (BR-1/BR-2) - so it gets a scoped
  // "Question Bank" upload workspace instead of the shared group above, which mixes
  // in listing/manage actions this role's screen keeps separate. BR-3 splits access
  // to the uploaded papers into its own time-gated screen, "Exam Day Downloads" -
  // reusing the shared "Question Papers" list/manage screen would not let a
  // scheduled-window-only control sit apart from the always-available upload
  // workspace. Every other v2-excluded module (Registration, Verification,
  // Absentee, Band Scores, Re-evaluation, Certificates, Reports) is dropped from
  // this role's sidebar entirely, not relabelled - the matrix's Read grant on each
  // stays real and reachable by direct URL, the same unsurfaced-entitlement
  // treatment DCDD's own situational-awareness grants get, but none of it is a
  // stated day-to-day task for this role so none of it is surfaced here.
  { label: 'Question Bank', icon: Upload, to: '/questions/upload', onlyRoles: ['exam_head'], access: ['questions', 'create'] },
  { label: 'Exam Day Downloads', icon: Download, to: '/questions/downloads', onlyRoles: ['exam_head'], access: ['questions', 'secure_read'] },
  { label: 'Released Sample Papers', icon: FileSearch, to: '/questions/samples', onlyRoles: ['exam_head'], access: ['questions', 'sample'] },
  { label: 'Band Score Entry', icon: ClipboardList, to: '/scores', access: ['scores', 'submit'] },
  // ViewScores only ever loads the caller's own results; every other role gets an
  // empty table. It is a personal screen, so it is offered to own-scoped roles only -
  // the organisation-wide view is Score History.
  { label: 'My Results', icon: FileText, to: '/scores/view', ownScoped: 'scores' },
  // Read-only by design - declaring results lives here too, but entering a score never
  // does. Named "Score History" (not "Band Scores") so it doesn't read as a duplicate
  // of Band Score Entry above.
  { label: 'Score History', icon: BarChart3, to: '/scores/summary', access: ['scores', 'read_all'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_member', 'committee_head'] },
  // Committee Member's own three-item strict least-privilege menu (Dashboard, View
  // Band Scores, Re-evaluation Queue) - BRD §5.5.2/§5.6.1 define this role's whole
  // job as viewing submitted band scores and tracking re-evaluation requests after
  // they clear payment. It is genuinely read-only: BR-2/BR-3 require searching by
  // Exam ID or Registration Number and the reviewing committee's names, which the
  // shared Score History screen (built for the roles that also declare results)
  // does not offer, so this gets its own dedicated screen rather than a relabel.
  { label: 'View Band Scores', icon: BarChart3, to: '/scores/band-scores', onlyRoles: ['committee_member'] },
  // BRD §5.5.2 BR-1: constituting the committee (add/remove members, designate the
  // Head) is an out-of-matrix operation - see 'committeeSetup' in outOfMatrix.js. The
  // Committee Head held this too, until the v2 Committee Head sidebar decision
  // withdrew it - a Committee Head assembling and designating themselves does not
  // make organisational sense. DCDD is left holding it as an unsurfaced grant pending
  // an explicit ownership ratification (see outOfMatrix.js); no role currently has a
  // sidebar entry for it, so none is declared here rather than pointing at a screen
  // nobody can reach.
  { label: 'Re-evaluation', icon: Scale, to: '/appeals', access: ['appeals', 'read'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_member', 'committee_head'] },
  { label: 'Revision Approvals Queue', icon: Scale, to: '/appeals', onlyRoles: ['chief_executive'] },
  // Same route as the generic 'Re-evaluation' entry above - the approved matrix
  // gives Committee Member View only (not Process), so the page renders read-only
  // for this role; see AppealList.jsx's canProcess/canApprove checks. A dedicated
  // label keeps that distinction visible in the sidebar itself, not just on the page.
  { label: 'Re-evaluation Queue', icon: Scale, to: '/appeals', onlyRoles: ['committee_member'] },
  // v2 Committee Head sidebar decision: BRD §5.6.1-5.6.2 give this role exactly two
  // re-evaluation functions - review a committee-forwarded appeal and record a
  // revision recommendation (this screen), and track the real approval status of
  // requests it has already submitted (Revision Status Tracker below). The shared
  // "Re-evaluation" list mixes in the Chief's own approve/reject queue and every
  // other role's read-only view, so this gets the same dedicated-label treatment
  // Chief Executive and Committee Member already get above.
  { label: 'Re-evaluation Panel', icon: Scale, to: '/appeals', onlyRoles: ['committee_head'] },
  // New screen, not a relabel: BRD §5.6.2 Committee BR-2 requires the Committee Head
  // to see the real Pending/Approved/Rejected status of every revision request it has
  // submitted, with an edit path scoped to only the specific skill the Chief actually
  // approved. See RevisionTracker.jsx.
  { label: 'Revision Status Tracker', icon: ClipboardCheck, to: '/appeals/revisions', onlyRoles: ['committee_head'] },
  { label: 'Certificates', icon: Award, to: '/certificates', access: ['certificates', 'read'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_head'] },
  // v2 Test Taker sidebar decision: "Sample Question Papers" is the same route and
  // grant as the shared "Sample Papers" entry above, but placed last for this role -
  // it is the public post-results archive, not part of the exam-cycle workflow the
  // items above it cover, so it reads better as the final item. "My Reports" is
  // dropped entirely for this role: the six-item menu (Dashboard, Register / My
  // Profile, My Results, Re-evaluation, Certificates, Sample Question Papers) is the
  // complete surface for this role now, not a seventh reporting screen.
  { label: 'Sample Question Papers', icon: FileSearch, to: '/questions/samples', onlyRoles: ['test_taker'], access: ['questions', 'sample'] },
  { label: 'Reports', icon: BarChart3, to: '/reports', access: ['reports', 'read_all'], excludeRoles: ['dcdd', 'exam_head', 'chief_executive', 'committee_member', 'committee_head'] },
  { label: 'Executive Reports', icon: BarChart3, to: '/reports', onlyRoles: ['chief_executive'] },
  { label: 'Reports & Analytics', icon: BarChart3, to: '/reports', onlyRoles: ['dcdd'] },
];

// Maps each NAV_CONFIG English `label` to its i18n key. The `label` itself stays
// the canonical English string (the RBAC test suite asserts on it); this lookup is
// only for what the sidebar renders. Anything missing here falls back to `label`.
const NAV_LABEL_KEYS = {
  'Dashboard': 'nav.dashboard',
  'Admin Dashboard': 'nav.admin_dashboard',
  'User Management': 'nav.user_management',
  'Role Management': 'nav.role_management',
  'Permission & Association Management': 'nav.permission_management',
  'Role Assignment': 'nav.role_assignment',
  'System Audit Logs': 'nav.system_audit_logs',
  'Technical Settings': 'nav.technical_settings',
  'Registration': 'nav.registration',
  'Exam Windows': 'nav.exam_windows',
  'Applications': 'nav.applications',
  'Register / My Profile': 'nav.register_my_profile',
  'Registration Windows': 'nav.registration_windows',
  'Verification': 'nav.verification',
  'Application Verification': 'nav.application_verification',
  'Absentee': 'nav.absentee',
  'Absentee Management': 'nav.absentee_management',
  'Master Configuration': 'nav.master_configuration',
  'Question Papers': 'nav.question_papers',
  'Upload Papers': 'nav.upload_papers',
  'Sample Papers': 'nav.sample_papers',
  'Question Bank': 'nav.question_bank',
  'Exam Day Downloads': 'nav.exam_day_downloads',
  'Released Sample Papers': 'nav.released_sample_papers',
  'Band Score Entry': 'nav.band_score_entry',
  'My Results': 'nav.my_results',
  'Score History': 'nav.score_history',
  'View Band Scores': 'nav.view_band_scores',
  'Re-evaluation': 'nav.reevaluation',
  'Revision Approvals Queue': 'nav.revision_approvals_queue',
  'Re-evaluation Queue': 'nav.reevaluation_queue',
  'Re-evaluation Panel': 'nav.reevaluation_panel',
  'Revision Status Tracker': 'nav.revision_status_tracker',
  'Certificates': 'nav.certificates',
  'Sample Question Papers': 'nav.sample_question_papers',
  'Reports': 'nav.reports',
  'Executive Reports': 'nav.executive_reports',
  'Reports & Analytics': 'nav.reports_analytics',
};

function useNavLabel() {
  const { t } = useTranslation();
  return (label) => t(NAV_LABEL_KEYS[label] ?? '', { defaultValue: label });
}

function permitted(item, role) {
  if (item.onlyRoles && !item.onlyRoles.includes(role)) return false;
  if (item.excludeRoles && item.excludeRoles.includes(role)) return false;
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.ownScoped && !isOwnScoped(role, item.ownScoped)) return false;
  if (item.access && !canAccess(role, item.access[0], item.access[1])) return false;
  return true;
}

// BRD §5.5-5.6 define this role's actual job as band score entry and re-evaluation
// processing. Registration, Question Papers, Sample Papers, Score History,
// Certificates and Reports are all "Read" access by RBAC default, not a stated
// day-to-day need. This role used to get those demoted into a collapsed read-only
// section below its actual work; the v2 Committee Head sidebar decision replaced that
// with a strict four-item menu (Dashboard, Band Score Entry, Re-evaluation Panel,
// Revision Status Tracker) that drops its read-only modules from the sidebar entirely
// instead of merely demoting them - see the `excludeRoles: [..., 'committee_head']`
// entries above, the same treatment Exam Head, Committee Member, Chief Executive,
// DCDD and System Administrator already carry. Every role now resolves its menu from
// flat `excludeRoles`/`onlyRoles` carve-outs, so `navigationFor` no longer needs a
// per-role section-splitting pass.
export function navigationFor(role) {
  return NAV_CONFIG.filter(item => permitted(item, role)).map(item => {
    if (!item.children) return item;
    const children = item.children.filter(child => permitted(child, role));
    return { ...item, children };
  }).filter(item => !item.children || item.children.length > 0);
}

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const navLabel = useNavLabel();
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
              <span className="flex-1 text-left truncate">{navLabel(item.label)}</span>
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
                    <span className="truncate">{navLabel(child.label)}</span>
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
      title={collapsed ? navLabel(item.label) : undefined}
      className={({ isActive }) => [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-brand-gold/10 text-brand-gold shadow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-border/60',
      ].join(' ')}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{navLabel(item.label)}</span>}
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
            src="/images/Dzongjuk logo.png"
            alt="Dzongjuk Logo"
            className="w-full h-full object-contain p-0.5"
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
