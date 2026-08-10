/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { CreateCommitteeDto, CreateScoringRuleDto, ScoreValuesDto } from './dtos';
import { ResultService } from './result.service';
import { ScoringService } from './scoring.service';

@ApiBearerAuth()
@ApiTags('Examination committees')
@Controller('exams/:examId/committee')
export class CommitteeController {
  constructor(private readonly results: ResultService) {}

  @Permissions('score.view') @Get() get(@Param('examId') examId: string, @Req() request: Request) { return this.results.getCommittee(examId, request.user!); }
  @Permissions('committee.manage') @Post() create(@Param('examId') examId: string, @Body() dto: CreateCommitteeDto, @Req() request: Request) { return this.results.setCommittee(examId, dto, request.user!, request.id); }
  @Permissions('committee.manage') @Put() replace(@Param('examId') examId: string, @Body() dto: CreateCommitteeDto, @Req() request: Request) { return this.results.setCommittee(examId, dto, request.user!, request.id); }
}

@ApiBearerAuth()
@ApiTags('Scores and results')
@Controller()
export class ScoresController {
  constructor(private readonly results: ResultService) {}

  @Permissions('score.enter') @Put('score-sheets/:applicationId/draft')
  draft(@Param('applicationId') applicationId: string, @Body() dto: ScoreValuesDto, @Req() request: Request) {
    return this.results.saveDraft(applicationId, dto, request.user!, request.id);
  }

  @Permissions('score.submit') @Post('score-sheets/:scoreSheetId/submit')
  submit(@Param('scoreSheetId') id: string, @Headers('idempotency-key') key: string, @Req() request: Request) {
    return this.results.submit(id, request.user!, request.id, key);
  }

  @Permissions('score.view') @Get('exams/:examId/scores')
  examScores(@Param('examId') examId: string, @Req() request: Request) { return this.results.getExamScores(examId, request.user!); }

  @Permissions('result.declare') @Post('exams/:examId/declare-results')
  declare(@Param('examId') examId: string, @Req() request: Request) { return this.results.declareResults(examId, request.user!, request.id); }

  @Permissions('score.view_own') @Get('results/my')
  my(@Req() request: Request) { return this.results.myResults(request.user!.sub); }

  @Public() @Get('internal/exams/:examId/certificate-results')
  certificateResults(@Param('examId') examId: string, @Headers('x-internal-service-key') key: string | undefined) {
    return this.results.certificateResults(examId, key);
  }
}

@ApiBearerAuth()
@ApiTags('Scoring configuration')
@Controller('scoring-rules')
export class ScoringRulesController {
  constructor(private readonly scoring: ScoringService) {}

  @Permissions('score.rule.manage') @Get() list() { return this.scoring.listRules(); }
  @Permissions('score.rule.manage') @Post() create(@Body() dto: CreateScoringRuleDto, @Req() request: Request) { return this.scoring.createRule(dto, request.user!, request.id); }
  @Permissions('score.rule.manage') @Post(':id/approve') approve(@Param('id') id: string, @Req() request: Request) { return this.scoring.approveRule(id, request.user!, request.id); }
}
