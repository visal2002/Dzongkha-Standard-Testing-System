import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { UpdateMasterConfigurationDto } from './dtos';
import { MasterConfigurationEntity } from './entities';

const SYSTEM_ID = 'SYSTEM';

@Injectable()
export class MasterConfigurationService {
  constructor(
    @InjectRepository(MasterConfigurationEntity) private readonly configurations: Repository<MasterConfigurationEntity>,
    private readonly audit: AuditService,
  ) {}

  async get() {
    const entity = await this.configurations.findOneBy({ id: SYSTEM_ID });
    return entity?.configuration ?? {};
  }

  async update(dto: UpdateMasterConfigurationDto, actorUserId: string, requestId: string) {
    let entity = await this.configurations.findOneBy({ id: SYSTEM_ID });
    entity ??= this.configurations.create({ id: SYSTEM_ID, configuration: {}, updatedByUserId: null });
    entity.configuration = this.merge(entity.configuration, dto as Record<string, unknown>);
    entity.updatedByUserId = actorUserId;
    const saved = await this.configurations.save(entity);
    await this.audit.record({
      action: 'MASTER_CONFIGURATION_UPDATED',
      resourceType: 'MasterConfiguration',
      resourceId: SYSTEM_ID,
      actorUserId,
      requestId,
      safeData: { fields: Object.keys(dto), version: saved.version },
    });
    return saved.configuration;
  }

  private merge(current: Record<string, unknown>, updates: Record<string, unknown>) {
    const merged = { ...current, ...updates };
    if (updates.certificateTemplate && typeof updates.certificateTemplate === 'object') {
      merged.certificateTemplate = {
        ...((current.certificateTemplate as Record<string, unknown> | undefined) ?? {}),
        ...(updates.certificateTemplate as Record<string, unknown>),
      };
    }
    if (updates.notificationTemplates && typeof updates.notificationTemplates === 'object') {
      merged.notificationTemplates = {
        ...((current.notificationTemplates as Record<string, unknown> | undefined) ?? {}),
        ...(updates.notificationTemplates as Record<string, unknown>),
      };
    }
    return merged;
  }
}
