import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from '@dzongjuk/security';
import { UpdateMasterConfigurationDto } from './dtos';
import { MasterConfigurationService } from './master-configuration.service';

@ApiBearerAuth()
@ApiTags('Master configuration')
@Controller('masters')
export class MasterConfigurationController {
  constructor(private readonly masters: MasterConfigurationService) {}

  @Permissions('master.configuration.read')
  @Get()
  get() { return this.masters.get(); }

  @Permissions('master.configuration.manage')
  @Put()
  update(@Body() dto: UpdateMasterConfigurationDto, @Req() request: Request) {
    return this.masters.update(dto, request.user!.sub, request.id);
  }
}
