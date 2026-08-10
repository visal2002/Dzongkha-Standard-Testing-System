/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { CommitteeRole } from './entities';

export class CommitteeMemberDto {
  @IsUUID() userId: string;
  @IsEnum(CommitteeRole) role: CommitteeRole;
}

export class CreateCommitteeDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CommitteeMemberDto)
  members: CommitteeMemberDto[];
}

export class ScoreValuesDto {
  @IsNumber({ maxDecimalPlaces: 3 }) writing: number;
  @IsNumber({ maxDecimalPlaces: 3 }) reading: number;
  @IsNumber({ maxDecimalPlaces: 3 }) listening: number;
  @IsNumber({ maxDecimalPlaces: 3 }) speaking: number;
}

export class BandRangeDto {
  @IsNumber() min: number;
  @IsNumber() max: number;
  @IsString() @Length(1, 80) label: string;
  @IsOptional() @IsString() @Length(1, 40) cefr?: string;
}

export class CreateScoringRuleDto {
  @IsString() @Length(2, 80) code: string;
  @IsString() @Length(2, 160) name: string;
  @IsNumber() minimumScore: number;
  @IsNumber() maximumScore: number;
  @IsNumber() increment: number;
  @IsInt() @Min(0) @Max(3) roundingDecimals: number;
  @IsDateString() effectiveFrom: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => BandRangeDto)
  bands: BandRangeDto[];
}
