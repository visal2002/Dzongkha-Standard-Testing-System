/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions, Public } from '@dzongjuk/security';
import { RawResponse } from '@dzongjuk/common';
import { AssessmentService } from './assessment.service';
import { AssignExamContentDto, UploadQuestionPaperDto } from './dtos';
import { DocumentType } from './entities';

@ApiBearerAuth()
@ApiTags('Secure assessment content')
@Controller(['question-papers', 'questions'])
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  @Permissions('question.secure.upload')
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'questionPaper', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'answerSheet', maxCount: 1 },
  ], { limits: { files: 2, fileSize: 52_428_800 } }))
  upload(
    @Body() dto: UploadQuestionPaperDto,
    @UploadedFiles() files: { questionPaper?: Express.Multer.File[]; file?: Express.Multer.File[]; answerSheet?: Express.Multer.File[] },
    @Req() request: Request,
  ) {
    return this.service.upload(dto, files, request.user!, request.id);
  }

  @Permissions('question.secure.download')
  @Get()
  list(@Req() request: Request, @Query('examId') examId?: string) { return this.service.list(request.user!, examId); }

  @Get('samples')
  samples() { return this.service.listSamples(); }

  @Permissions('question.secure.download')
  @Get(':id')
  get(@Param('id') id: string, @Req() request: Request) { return this.service.getMetadata(id, request.user!); }

  @Permissions('question.secure.download')
  @Get(':id/metadata')
  metadata(@Param('id') id: string, @Req() request: Request) { return this.service.getMetadata(id, request.user!); }

  @Permissions('question.secure.download')
  @RawResponse()
  @Get(':id/question-document')
  async questionDocument(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    return this.sendDocument(await this.service.download(id, DocumentType.QuestionPaper, request.user, request.id), response, true);
  }

  @Permissions('question.secure.download')
  @RawResponse()
  @Get(':id/answer-document')
  async answerDocument(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    return this.sendDocument(await this.service.download(id, DocumentType.AnswerSheet, request.user, request.id), response, true);
  }

  @Permissions('question.secure.publish')
  @Post(':id/publish-sample')
  publishSample(@Param('id') id: string, @Req() request: Request) {
    return this.service.publishSample(id, request.user!, request.id);
  }

  @Permissions('question.secure.upload')
  @Delete(':id')
  retire(@Param('id') id: string, @Req() request: Request) {
    return this.service.retire(id, request.user!, request.id);
  }

  // Two path segments, so this never collides with the single-segment `:id` route
  // above regardless of declaration order.
  @Permissions('question.secure.upload')
  @Get('assignments/mine')
  myAssignments(@Req() request: Request) {
    return this.service.myAssignments(request.user!);
  }

  @Permissions('question.assignment.manage')
  @Post('assignments')
  assign(@Body() dto: AssignExamContentDto, @Req() request: Request) {
    return this.service.assignExam(dto, request.user!, request.id);
  }

  private sendDocument(document: { buffer: Buffer; filename: string; mimeType: string }, response: Response, classified: boolean) {
    response.setHeader('content-type', document.mimeType);
    response.setHeader('content-disposition', `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`);
    response.setHeader('cache-control', classified ? 'no-store, private' : 'private, max-age=300');
    response.setHeader('x-content-type-options', 'nosniff');
    response.end(document.buffer);
  }
}

@ApiBearerAuth()
@ApiTags('Sample papers')
@Controller('sample-papers')
export class SamplePapersController {
  constructor(private readonly service: AssessmentService) {}

  @Public()
  @Get() list() { return this.service.listSamples(); }

  @Public()
  @RawResponse()
  @Get(':id/:type')
  async download(@Param('id') id: string, @Param('type') type: string, @Req() request: Request, @Res() response: Response) {
    const documentType = type === 'answer' ? DocumentType.AnswerSheet : DocumentType.QuestionPaper;
    // This route is @Public() - there is no authenticated actor to assert non-null here.
    const document = await this.service.download(id, documentType, request.user, request.id, true);
    response.setHeader('content-type', document.mimeType);
    response.setHeader('content-disposition', `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`);
    response.setHeader('cache-control', 'private, max-age=300');
    response.setHeader('x-content-type-options', 'nosniff');
    response.end(document.buffer);
  }
}
