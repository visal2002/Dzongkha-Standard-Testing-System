/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions, PlatformModule } from '@dzongjuk/common';
import { SecurityModule } from '@dzongjuk/security';
import { ApplicationsController, AttendanceController, BirmsPaymentsController, ExamsController, VerificationController } from './registration.controller';
import { ApplicationEntity, ApplicationHistoryEntity, AttendanceEntity, ExamEntity, IdempotencyRecordEntity, OutboxEventEntity, WaitlistEntryEntity } from './entities';
import { RegistrationService } from './registration.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { BirmsPaymentService } from './birms-payment.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => databaseOptions(config, 'registration') }),
    TypeOrmModule.forFeature([ExamEntity, ApplicationEntity, WaitlistEntryEntity, AttendanceEntity, ApplicationHistoryEntity, OutboxEventEntity, IdempotencyRecordEntity]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [ExamsController, ApplicationsController, BirmsPaymentsController, VerificationController, AttendanceController],
  providers: [RegistrationService, OutboxPublisherService, BirmsPaymentService],
})
export class AppModule {}
