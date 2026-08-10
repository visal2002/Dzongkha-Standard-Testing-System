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
import { AppealFeesController, AppealsController } from './appeal.controller';
import { CertificatesController, CertificateTemplatesController, PublicCertificatesController } from './certificate.controller';
import { AppealService } from './appeal.service';
import {
  AppealApprovalEntity, AppealAuditEntity, AppealCommitteeReviewEntity, AppealEntity, AppealHistoryEntity,
  AppealIdempotencyEntity, AppealOutboxEntity, AppealSkillEntity, FeeRuleEntity, PaymentEntity, PaymentEventEntity,
  CertificateAccessEventEntity, CertificateEntity, CertificateFileEntity, CertificateTemplateEntity,
} from './entities';
import { AppealOutboxPublisher } from './outbox-publisher.service';
import { ResultClientService } from './result-client.service';
import { CertificateService } from './certificate.service';
import { CertificateEncryptionService } from './certificate-encryption.service';
import { CertificateStorageService } from './certificate-storage.service';
import { CertificateRendererService } from './certificate-renderer.service';
import { CertificateSourceClientService } from './certificate-source-client.service';
const InfoController = createServiceInfoController('appeal-certificate-service', ['appeal-payment', 'committee-review', 'chief-decision', 'certificate-versioning', 'public-minimal-verification']);
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => databaseOptions(c, 'appeal_certificate') }),
    TypeOrmModule.forFeature([
      FeeRuleEntity, AppealEntity, AppealSkillEntity, PaymentEntity, PaymentEventEntity, AppealCommitteeReviewEntity,
      AppealApprovalEntity, AppealHistoryEntity, AppealAuditEntity, AppealIdempotencyEntity, AppealOutboxEntity,
      CertificateTemplateEntity, CertificateFileEntity, CertificateEntity, CertificateAccessEventEntity,
    ]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [InfoController, AppealsController, AppealFeesController, CertificateTemplatesController, CertificatesController, PublicCertificatesController],
  providers: [AppealService, ResultClientService, AppealOutboxPublisher, CertificateService, CertificateEncryptionService, CertificateStorageService, CertificateRendererService, CertificateSourceClientService],
})
export class AppModule {}
