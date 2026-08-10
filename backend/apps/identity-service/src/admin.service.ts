/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { DomainException } from '@dzongjuk/common';
import { AuditService } from './audit.service';
import { CreateRoleDto, CreateUserDto, UpdateUserRolesDto } from './dtos';
import { PermissionEntity, RoleEntity, UserEntity } from './entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity) private readonly permissions: Repository<PermissionEntity>,
    private readonly audit: AuditService,
  ) {}

  listUsers() {
    return this.users.find({ order: { createdAt: 'DESC' }, take: 100 });
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
      email: dto.email.toLowerCase(), cid: dto.cid, fullName: dto.fullName,
      passwordHash: await bcrypt.hash(dto.password, 12), roles, status: 'ACTIVE',
    }));
    await this.audit.record({ action: 'USER_CREATED', resourceType: 'User', resourceId: user.id, actorUserId: actorId, requestId, safeData: { roles: dto.roleCodes } });
    return user;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'DISABLED', actorId: string, requestId: string) {
    const user = await this.getUser(id);
    user.status = status;
    await this.users.save(user);
    await this.audit.record({ action: 'USER_STATUS_CHANGED', resourceType: 'User', resourceId: id, actorUserId: actorId, requestId, safeData: { status } });
    return user;
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
}
