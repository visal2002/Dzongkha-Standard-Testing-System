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
import { AppealOutboxEntity } from './entities';

@Injectable()
export class AppealOutboxPublisher extends RabbitOutboxPublisher<AppealOutboxEntity> {
  constructor(@InjectRepository(AppealOutboxEntity) events: Repository<AppealOutboxEntity>, config: ConfigService) {
    super(events, config, 'appeal-certificate-service');
  }
}
