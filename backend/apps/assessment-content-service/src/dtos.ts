/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Skill } from '@dzongjuk/contracts';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsString, IsUUID, Length } from 'class-validator';

export class UploadQuestionPaperDto {
  @IsUUID() examId: string;
  @IsString() @Length(3, 200) title: string;
  @Transform(({ value }) => String(value).toUpperCase()) @IsEnum(Skill) skill: Skill;
  @IsDateString() accessAllowedFrom: string;
  @IsDateString() accessAllowedUntil: string;
}

export class ResultsDeclaredEventDto {
  @IsUUID() eventId: string;
  @IsUUID() examId: string;
  @IsUUID() declarationId: string;
  @IsDateString() declaredAt: string;
}

export class AssignExamContentDto {
  @IsUUID() examId: string;
  @IsUUID() userId: string;
}
