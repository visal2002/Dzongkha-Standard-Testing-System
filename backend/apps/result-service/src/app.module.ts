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
import { CommitteeController, ScoresController, ScoringRulesController } from './result.controller';
import { CandidateEligibilityEntity, CommitteeEntity, CommitteeMemberEntity, ProcessedEventEntity, ResultAuditEntity, ResultDeclarationEntity, ResultIdempotencyEntity, ResultOutboxEntity, ScoreSheetEntity, ScoreVersionEntity, ScoringRuleEntity } from './entities';
import { ResultService } from './result.service';
import { IdentityClientService } from './identity-client.service';
import { ScoringService } from './scoring.service';
import { ResultOutboxPublisher } from './outbox-publisher.service';
import { RegistrationEventConsumer } from './event-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => databaseOptions(config, 'result') }),
    TypeOrmModule.forFeature([CommitteeEntity, CommitteeMemberEntity, CandidateEligibilityEntity, ScoringRuleEntity, ScoreSheetEntity, ScoreVersionEntity, ResultDeclarationEntity, ResultAuditEntity, ProcessedEventEntity, ResultIdempotencyEntity, ResultOutboxEntity]),
    SecurityModule,
    PlatformModule,
  ],
  controllers: [CommitteeController, ScoresController, ScoringRulesController],
  providers: [ResultService, IdentityClientService, ScoringService, ResultOutboxPublisher, RegistrationEventConsumer],
})
export class AppModule {}
