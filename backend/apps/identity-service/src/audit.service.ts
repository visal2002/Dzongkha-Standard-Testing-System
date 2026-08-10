/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from './entities';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditEventEntity) private readonly events: Repository<AuditEventEntity>) {}

  async record(input: Partial<AuditEventEntity>) {
    await this.events.save(this.events.create(input));
  }
}
