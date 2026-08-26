/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../libs/security/src/security.guards';

// ─── helpers ─────────────────────────────────────────────────────────────────

type AssuranceLevel = 'LOCAL' | 'NDI' | 'MFA';

const ctx = (permissions: string[], assurance: AssuranceLevel = 'LOCAL'): ExecutionContext =>
  ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          sub: '00000000-0000-4000-8000-000000000001',
          sessionId: '00000000-0000-4000-8000-000000000002',
          roles: [],
          permissions,
          assurance,
        },
      }),
    }),
  } as unknown as ExecutionContext);

const guardFor = (requiredPermission: string): PermissionGuard => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue([requiredPermission]) } as unknown as Reflector;
  return new PermissionGuard(reflector);
};

// Permission strings extracted from controller @Permissions() decorators:
const PERMS = {
  EXAM_WINDOW_MANAGE: 'exam.window.manage',
  APPLICATION_SUBMIT: 'registration.application.submit',
  APPLICATION_VERIFY: 'registration.application.verify',
  ATTENDANCE_MARK: 'attendance.mark',
  QUESTION_UPLOAD: 'question.upload',
  QUESTION_SECURE_DOWNLOAD: 'question.secure.download',
  COMMITTEE_MANAGE: 'committee.manage',
  SCORE_SUBMIT: 'score.submit',
  SCORE_VIEW: 'score.view',
  APPEAL_REVIEW: 'appeal.review',
  APPEAL_VIEW: 'appeal.view',
  APPEAL_APPROVE: 'appeal.approve',
  CERTIFICATE_MANAGE: 'certificate.manage',
  REPORT_VIEW: 'report.view',
  ADMIN_ROLE_MANAGE: 'admin.role.manage',
};

// Role → permission set mapping (mirrors the seed data / BRD §2.9)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  test_taker: [PERMS.APPLICATION_SUBMIT],
  dcdd: [
    PERMS.APPLICATION_VERIFY, PERMS.ATTENDANCE_MARK,
    PERMS.EXAM_WINDOW_MANAGE, PERMS.COMMITTEE_MANAGE,
    PERMS.CERTIFICATE_MANAGE, PERMS.REPORT_VIEW,
  ],
  exam_head: [
    PERMS.APPLICATION_VERIFY, PERMS.QUESTION_UPLOAD,
    PERMS.QUESTION_SECURE_DOWNLOAD, PERMS.COMMITTEE_MANAGE,
    PERMS.SCORE_VIEW, PERMS.REPORT_VIEW,
  ],
  // migration 0022_committee_member_appeal_view_only.sql: this role holds View, not
  // Process, on Re-evaluation - `appeal.view` grants the organisation-wide read
  // (POST /appeals/:id/committee-review stays on `appeal.review`, which this role no
  // longer holds).
  committee_member: [PERMS.SCORE_VIEW, PERMS.APPEAL_VIEW, PERMS.REPORT_VIEW],
  committee_head: [PERMS.SCORE_SUBMIT, PERMS.SCORE_VIEW, PERMS.APPEAL_REVIEW, PERMS.REPORT_VIEW],
  chief_executive: [PERMS.APPEAL_APPROVE, PERMS.REPORT_VIEW],
  admin: ['*'],
};

// ─── exhaustive matrix ────────────────────────────────────────────────────────

describe('RBAC permission matrix — all 14 permissions × 7 roles (BRD §2.9)', () => {
  const permissionNames = Object.values(PERMS);
  const roleNames = Object.keys(ROLE_PERMISSIONS);

  for (const permission of permissionNames) {
    describe(`Permission: ${permission}`, () => {
      const guard = guardFor(permission);

      for (const role of roleNames) {
        const rolePerms = ROLE_PERMISSIONS[role];
        const shouldAllow = rolePerms.includes('*') || rolePerms.includes(permission);

        it(`${role} → ${shouldAllow ? 'ALLOW ✓' : 'DENY ✗'}`, () => {
          if (shouldAllow) {
            expect(guard.canActivate(ctx(rolePerms))).toBe(true);
          } else {
            expect(() => guard.canActivate(ctx(rolePerms))).toThrow();
          }
        });
      }
    });
  }

  // ─── wildcard admin ───────────────────────────────────────────────────────

  it('admin wildcard (*) grants access to every permission', () => {
    for (const [, permission] of permissionNames) {
      expect(guardFor(permission).canActivate(ctx(['*']))).toBe(true);
    }
  });

  // ─── multi-role union ─────────────────────────────────────────────────────

  it('a user with both test_taker and committee_member roles has the union of their permissions', () => {
    const unionPerms = [
      ...ROLE_PERMISSIONS.test_taker,
      ...ROLE_PERMISSIONS.committee_member,
    ];
    // Should allow APPLICATION_SUBMIT (from test_taker)
    expect(guardFor(PERMS.APPLICATION_SUBMIT).canActivate(ctx(unionPerms))).toBe(true);
    // Should allow SCORE_VIEW (from committee_member)
    expect(guardFor(PERMS.SCORE_VIEW).canActivate(ctx(unionPerms))).toBe(true);
    // Should deny APPEAL_APPROVE (not in either role)
    expect(() => guardFor(PERMS.APPEAL_APPROVE).canActivate(ctx(unionPerms))).toThrow();
  });

  // ─── boundary: empty permissions ─────────────────────────────────────────

  it('a user with no permissions is denied every protected endpoint', () => {
    for (const [, permission] of permissionNames) {
      expect(() => guardFor(permission).canActivate(ctx([]))).toThrow();
    }
  });

  // ─── cross-role isolation checks ─────────────────────────────────────────

  it('test_taker cannot manage exams (exam.window.manage)', () => {
    expect(() => guardFor(PERMS.EXAM_WINDOW_MANAGE).canActivate(ctx(ROLE_PERMISSIONS.test_taker))).toThrow();
  });

  it('committee_member cannot submit scores (score.submit)', () => {
    expect(() => guardFor(PERMS.SCORE_SUBMIT).canActivate(ctx(ROLE_PERMISSIONS.committee_member))).toThrow();
  });

  it('committee_head cannot approve appeals (appeal.approve — Chief Executive only)', () => {
    expect(() => guardFor(PERMS.APPEAL_APPROVE).canActivate(ctx(ROLE_PERMISSIONS.committee_head))).toThrow();
  });

  it('exam_head cannot approve appeals (appeal.approve — Chief Executive only)', () => {
    expect(() => guardFor(PERMS.APPEAL_APPROVE).canActivate(ctx(ROLE_PERMISSIONS.exam_head))).toThrow();
  });

  it('chief_executive cannot submit scores (score.submit — Committee Head only)', () => {
    expect(() => guardFor(PERMS.SCORE_SUBMIT).canActivate(ctx(ROLE_PERMISSIONS.chief_executive))).toThrow();
  });

  it('dcdd cannot approve appeals (appeal.approve — Chief Executive only)', () => {
    expect(() => guardFor(PERMS.APPEAL_APPROVE).canActivate(ctx(ROLE_PERMISSIONS.dcdd))).toThrow();
  });

  it('non-admin roles cannot access admin.role.manage', () => {
    const nonAdminRoles = roleNames.filter((role) => role !== 'admin');
    for (const role of nonAdminRoles) {
      expect(() => guardFor(PERMS.ADMIN_ROLE_MANAGE).canActivate(ctx(ROLE_PERMISSIONS[role]))).toThrow();
    }
  });

  // ─── public endpoint handling ─────────────────────────────────────────────

  it('guard allows unauthenticated access when endpoint is marked @Public()', () => {
    // Simulate reflector returning null (no @Permissions() decorator — public endpoint)
    const openReflector = { getAllAndOverride: jest.fn().mockReturnValue(null) } as unknown as Reflector;
    const guard = new PermissionGuard(openReflector);
    expect(guard.canActivate(ctx([]))).toBe(true);
  });
});
