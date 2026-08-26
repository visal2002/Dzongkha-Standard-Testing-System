/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createServiceInfoController, databaseOptions, PlatformModule } from '@dzongjuk/common';
import { SecurityModule } from '@dzongjuk/security';
import { NotificationDeliveryEntity, NotificationEntity, NotificationProcessedEventEntity, NotificationTemplateEntity } from './entities';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationEventConsumer } from './event-consumer.service';
import { ContactResolverService } from './contact-resolver.service';
import { LoggingNotificationProvider, NotificationProviderService } from './notification-provider.service';
import { DeliveryDispatchService } from './delivery-dispatch.service';
const InfoController = createServiceInfoController('notification-service', ['in-app-notifications', 'email', 'sms', 'template-versioning', 'delivery-retry', 'dead-letter']);
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => databaseOptions(c, 'notification') }),
    TypeOrmModule.forFeature([NotificationTemplateEntity, NotificationEntity, NotificationDeliveryEntity, NotificationProcessedEventEntity]),
    SecurityModule, PlatformModule,
  ],
  controllers: [InfoController, NotificationController],
  providers: [
    NotificationService, NotificationEventConsumer, ContactResolverService, DeliveryDispatchService,
    // Swap this provider binding for a real SMS/email vendor implementation when one
    // is chosen - DeliveryDispatchService only depends on the NotificationProviderService
    // abstraction, so nothing else changes.
    { provide: NotificationProviderService, useClass: LoggingNotificationProvider },
  ],
})
export class AppModule {}
