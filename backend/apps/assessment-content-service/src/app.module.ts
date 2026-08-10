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
import { AssessmentController, SamplePapersController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { AccessAuditEntity, AssessmentOutboxEntity, ExamContentAssignmentEntity, QuestionDocumentEntity, QuestionPaperEntity, ResultDeclarationProjectionEntity, SamplePublicationEntity } from './entities';
import { EncryptionService } from './encryption.service';
import { MalwareScannerService } from './malware-scanner.service';
import { ObjectStorageService } from './object-storage.service';
import { AssessmentOutboxPublisher } from './outbox-publisher.service';
import { ResultEventConsumer } from './event-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => databaseOptions(config, 'assessment') }),
    TypeOrmModule.forFeature([ExamContentAssignmentEntity, QuestionPaperEntity, QuestionDocumentEntity, ResultDeclarationProjectionEntity, SamplePublicationEntity, AccessAuditEntity, AssessmentOutboxEntity]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [AssessmentController, SamplePapersController],
  providers: [AssessmentService, EncryptionService, MalwareScannerService, ObjectStorageService, AssessmentOutboxPublisher, ResultEventConsumer],
})
export class AppModule {}
