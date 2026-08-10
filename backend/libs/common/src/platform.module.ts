/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Controller, Get, Header, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { Public } from '@dzongjuk/security';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'dzongjuk_' });

@Controller()
export class PlatformController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get('health/live')
  live() {
    return { status: 'UP' };
  }

  @Public()
  @Get('health/ready')
  async ready() {
    await this.dataSource.query('SELECT 1');
    return { status: 'UP', database: 'UP' };
  }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics() {
    return registry.metrics();
  }
}

@Module({ controllers: [PlatformController] })
export class PlatformModule {}
