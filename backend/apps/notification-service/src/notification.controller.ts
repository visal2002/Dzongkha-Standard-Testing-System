/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationService } from './notification.service';

@ApiBearerAuth()
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}
  @Get() list(@Req() request: Request, @Query('limit') limit?: string) { return this.notifications.list(request.user!.sub, Number(limit ?? 30)); }
  @Patch(':id/read') read(@Param('id') id: string, @Req() request: Request) { return this.notifications.read(id, request.user!.sub); }
  @Post('read-all') readAll(@Req() request: Request) { return this.notifications.readAll(request.user!.sub); }
  @Delete(':id') archive(@Param('id') id: string, @Req() request: Request) { return this.notifications.archive(id, request.user!.sub); }
}
