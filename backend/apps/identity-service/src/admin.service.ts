/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { In, IsNull, Not, Repository } from 'typeorm';
import { assertInternalService, DomainException } from '@dzongjuk/common';
import { AuditService } from './audit.service';
import { CreateRoleDto, CreateUserDto, UpdateRolePermissionsDto, UpdateUserDto, UpdateUserRolesDto } from './dtos';
import { PermissionEntity, RoleEntity, UserEntity } from './entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity) private readonly permissions: Repository<PermissionEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // Cross-service contact resolution. The notification dispatch worker uses this for
  // email delivery (phone numbers live on the applicant's registration profile, not
  // the identity account, and are resolved from registration-service instead);
  // result-service uses the same lookup to resolve a committee member's display name
  // for score-sheet attribution (BRD §5.5.2 BR-3).
  async internalContactEmail(id: string, internalKey: string | undefined) {
    assertInternalService(this.config, internalKey);
    const user = await this.users.findOneBy({ id });
    if (!user) throw new DomainException('USER_NOT_FOUND', 'User not found.', 404);
    return { email: user.email, name: user.fullName };
  }

  listUsers() {
    return this.users.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  // A minimal projection - id, name and role only, no email or CID - for screens that
  // need to pick a staff member (constituting an exam committee) but hold committee.
  // manage rather than admin.user.read. Returning the full listUsers() shape here
  // would hand every caller of that narrower permission the entire user directory,
  // test takers' personal data included, just to populate a picker.
  async listCommitteeRosterCandidates() {
    const users = await this.users.find({ where: { status: 'ACTIVE' }, order: { fullName: 'ASC' } });
    return users
      .filter((user) => user.roles.some((role) => role.code !== 'test_taker'))
      .map((user) => ({
        id: user.id,
        name: user.fullName,
        role: user.roles.filter((role) => role.code !== 'test_taker').map((role) => role.name).join(', '),
      }));
  }

  async getUser(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new DomainException('USER_NOT_FOUND', 'User not found.', 404);
    return user;
  }

  async createUser(dto: CreateUserDto, actorId: string, requestId: string) {
    if (await this.users.exists({ where: [{ email: dto.email.toLowerCase() }, { cid: dto.cid }] })) {
      throw new DomainException('USER_DUPLICATE', 'An account already exists for this email or CID.', 409);
    }
    const roles = await this.roles.findBy({ code: In(dto.roleCodes), active: true });
    if (roles.length !== new Set(dto.roleCodes).size) throw new DomainException('ROLE_INVALID', 'One or more roles are invalid.');
    const user = await this.users.save(this.users.create({
      email: dto.email.toLowerCase(), cid: dto.cid, fullName: dto.fullName, userId: await this.allocateUserId(),
      passwordHash: await bcrypt.hash(dto.password, 12), roles, status: 'ACTIVE',
    }));
    await this.audit.record({ action: 'USER_CREATED', resourceType: 'User', resourceId: user.id, actorUserId: actorId, requestId, safeData: { roles: dto.roleCodes } });
    return user;
  }

  /**
   * Allocates the next 4-digit login handle in sequence: one past the highest
   * currently in use. Shares the same running counter as self-registration.
   */
  private async allocateUserId(): Promise<string> {
    const [highest] = await this.users.find({
      where: { userId: Not(IsNull()) }, select: ['userId'], order: { userId: 'DESC' }, take: 1,
    });
    let next = (Number(highest?.userId) || 1000) + 1;
    for (let attempt = 0; attempt < 25; attempt += 1, next += 1) {
      const candidate = String(next).padStart(4, '0');
      if (!(await this.users.exists({ where: { userId: candidate } }))) return candidate;
    }
    throw new DomainException('USER_ID_ALLOCATION_FAILED', 'Could not allocate a unique User ID. Please try again.', 503);
  }

  async setStatus(id: string, status: 'ACTIVE' | 'DISABLED', actorId: string, requestId: string) {
    const user = await this.getUser(id);
    user.status = status;
    await this.users.save(user);
    await this.audit.record({ action: 'USER_STATUS_CHANGED', resourceType: 'User', resourceId: id, actorUserId: actorId, requestId, safeData: { status } });
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string, requestId: string) {
    const user = await this.getUser(id);
    if (dto.email) {
      const existing = await this.users.findOneBy({ email: dto.email.toLowerCase() });
      if (existing && existing.id !== id) throw new DomainException('USER_DUPLICATE', 'This email is already assigned to another account.', 409);
      user.email = dto.email.toLowerCase();
    }
    if (dto.cid) {
      const existing = await this.users.findOneBy({ cid: dto.cid });
      if (existing && existing.id !== id) throw new DomainException('USER_DUPLICATE', 'This CID is already assigned to another account.', 409);
      user.cid = dto.cid;
    }
    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.roleCodes) {
      const roles = await this.roles.findBy({ code: In(dto.roleCodes), active: true });
      if (roles.length !== new Set(dto.roleCodes).size) throw new DomainException('ROLE_INVALID', 'One or more roles are invalid.');
      user.roles = roles;
    }
    const saved = await this.users.save(user);
    await this.audit.record({ action: 'USER_UPDATED', resourceType: 'User', resourceId: id, actorUserId: actorId, requestId, safeData: { roles: dto.roleCodes } });
    return saved;
  }

  async deleteUser(id: string, actorId: string, requestId: string) {
    if (id === actorId) throw new DomainException('SELF_DELETE_FORBIDDEN', 'You cannot delete your own account.', 400);
    const user = await this.getUser(id);
    await this.users.remove(user);
    await this.audit.record({ action: 'USER_DELETED', resourceType: 'User', resourceId: id, actorUserId: actorId, requestId, safeData: {} });
    return { deleted: true };
  }

  async setRoles(id: string, dto: UpdateUserRolesDto, actorId: string, requestId: string) {
    const user = await this.getUser(id);
    const roles = await this.roles.findBy({ code: In(dto.roleCodes), active: true });
    if (roles.length !== new Set(dto.roleCodes).size) throw new DomainException('ROLE_INVALID', 'One or more roles are invalid.');
    user.roles = roles;
    await this.users.save(user);
    await this.audit.record({ action: 'USER_ROLES_CHANGED', resourceType: 'User', resourceId: id, actorUserId: actorId, requestId, safeData: { roles: dto.roleCodes } });
    return user;
  }

  listRoles() { return this.roles.find({ order: { name: 'ASC' } }); }
  listPermissions() { return this.permissions.find({ order: { name: 'ASC' } }); }

  async createRole(dto: CreateRoleDto, actorId: string, requestId: string) {
    if (await this.roles.existsBy({ code: dto.code })) throw new DomainException('ROLE_DUPLICATE', 'Role code already exists.', 409);
    const permissions = await this.permissions.findBy({ name: In(dto.permissions) });
    if (permissions.length !== new Set(dto.permissions).size) throw new DomainException('PERMISSION_INVALID', 'One or more permissions are invalid.');
    const role = await this.roles.save(this.roles.create({ code: dto.code, name: dto.name, permissions, active: true, administrative: true }));
    await this.audit.record({ action: 'ROLE_CREATED', resourceType: 'Role', resourceId: role.id, actorUserId: actorId, requestId, safeData: { code: dto.code, permissions: dto.permissions } });
    return role;
  }

  async updateRolePermissions(id: string, dto: UpdateRolePermissionsDto, actorId: string, requestId: string) {
    const role = await this.roles.findOneBy({ id });
    if (!role) throw new DomainException('ROLE_NOT_FOUND', 'Role not found.', 404);
    const permissions = await this.permissions.findBy({ name: In(dto.permissions) });
    if (permissions.length !== new Set(dto.permissions).size) throw new DomainException('PERMISSION_INVALID', 'One or more permissions are invalid.');
    role.permissions = permissions;
    const saved = await this.roles.save(role);
    await this.audit.record({ action: 'ROLE_PERMISSIONS_UPDATED', resourceType: 'Role', resourceId: id, actorUserId: actorId, requestId, safeData: { permissions: dto.permissions } });
    return saved;
  }
}
