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
import { ResultOutboxEntity } from './entities';

@Injectable()
export class ResultOutboxPublisher extends RabbitOutboxPublisher<ResultOutboxEntity> {
  constructor(@InjectRepository(ResultOutboxEntity) events: Repository<ResultOutboxEntity>, config: ConfigService) {
    super(events, config, 'result-service');
  }
}
