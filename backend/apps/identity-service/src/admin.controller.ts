/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Request } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { AdminService } from './admin.service';
import { CreateRoleDto, CreateUserDto, UpdateRolePermissionsDto, UpdateUserDto, UpdateUserRolesDto } from './dtos';

class SetStatusDto {
  @IsIn(['ACTIVE', 'DISABLED']) status: 'ACTIVE' | 'DISABLED';
}

@ApiBearerAuth()
@ApiTags('User administration')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Permissions('admin.user.read') @Get('users') listUsers() { return this.admin.listUsers(); }
  // Declared ahead of 'users/:id' - a literal segment must win over the param route,
  // or Nest resolves this path as getUser({ id: 'committee-roster' }) instead.
  @Permissions('committee.manage') @Get('users/committee-roster') listCommitteeRoster() { return this.admin.listCommitteeRosterCandidates(); }
  // Internal-service-key guarded, not JWT-guarded - the notification dispatch worker
  // in another service has no user session to hold a permission with.
  @Public() @Get('users/:id/internal-contact')
  internalContact(@Param('id') id: string, @Headers('x-internal-service-key') key: string | undefined) {
    return this.admin.internalContactEmail(id, key);
  }
  @Permissions('admin.user.read') @Get('users/:id') getUser(@Param('id') id: string) { return this.admin.getUser(id); }
  @Permissions('admin.user.manage') @Post('users') createUser(@Body() dto: CreateUserDto, @Req() req: Request) { return this.admin.createUser(dto, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Put('users/:id') updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) { return this.admin.updateUser(id, dto, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Delete('users/:id') deleteUser(@Param('id') id: string, @Req() req: Request) { return this.admin.deleteUser(id, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Patch('users/:id/status') setStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @Req() req: Request) { return this.admin.setStatus(id, dto.status, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Put('users/:id/roles') setRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto, @Req() req: Request) { return this.admin.setRoles(id, dto, req.user!.sub, req.id); }
  @Permissions('admin.role.read') @Get('roles') listRoles() { return this.admin.listRoles(); }
  @Permissions('admin.role.manage') @Post('roles') createRole(@Body() dto: CreateRoleDto, @Req() req: Request) { return this.admin.createRole(dto, req.user!.sub, req.id); }
  @Permissions('admin.role.read') @Get('permissions') listPermissions() { return this.admin.listPermissions(); }
  @Permissions('admin.role.manage') @Put('roles/:id/permissions') updateRolePermissions(@Param('id') id: string, @Body() dto: UpdateRolePermissionsDto, @Req() req: Request) { return this.admin.updateRolePermissions(id, dto, req.user!.sub, req.id); }
}
