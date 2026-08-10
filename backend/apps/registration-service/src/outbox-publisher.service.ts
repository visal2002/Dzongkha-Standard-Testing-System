/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitOutboxPublisher } from '@dzongjuk/common';
import { OutboxEventEntity } from './entities';

@Injectable()
export class OutboxPublisherService extends RabbitOutboxPublisher<OutboxEventEntity> {
  constructor(@InjectRepository(OutboxEventEntity) events: Repository<OutboxEventEntity>, config: ConfigService) {
    super(events, config, 'registration-service');
  }
}
