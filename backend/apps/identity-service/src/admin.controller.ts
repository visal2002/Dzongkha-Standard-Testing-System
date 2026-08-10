/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Request } from 'express';
import { Permissions } from '@dzongjuk/security';
import { AdminService } from './admin.service';
import { CreateRoleDto, CreateUserDto, UpdateUserRolesDto } from './dtos';

class SetStatusDto {
  @IsIn(['ACTIVE', 'DISABLED']) status: 'ACTIVE' | 'DISABLED';
}

@ApiBearerAuth()
@ApiTags('User administration')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Permissions('admin.user.manage') @Get('users') listUsers() { return this.admin.listUsers(); }
  @Permissions('admin.user.manage') @Get('users/:id') getUser(@Param('id') id: string) { return this.admin.getUser(id); }
  @Permissions('admin.user.manage') @Post('users') createUser(@Body() dto: CreateUserDto, @Req() req: Request) { return this.admin.createUser(dto, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Patch('users/:id/status') setStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @Req() req: Request) { return this.admin.setStatus(id, dto.status, req.user!.sub, req.id); }
  @Permissions('admin.user.manage') @Put('users/:id/roles') setRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto, @Req() req: Request) { return this.admin.setRoles(id, dto, req.user!.sub, req.id); }
  @Permissions('admin.role.manage') @Get('roles') listRoles() { return this.admin.listRoles(); }
  @Permissions('admin.role.manage') @Post('roles') createRole(@Body() dto: CreateRoleDto, @Req() req: Request) { return this.admin.createRole(dto, req.user!.sub, req.id); }
  @Permissions('admin.role.manage') @Get('permissions') listPermissions() { return this.admin.listPermissions(); }
}
