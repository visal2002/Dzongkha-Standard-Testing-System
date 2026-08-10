/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Type } from 'class-transformer';
import { Allow, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { ReportDataset, ReportFormat } from './entities';

export enum ReportFilterOperator { Equals = 'eq', In = 'in', From = 'gte', To = 'lte' }

export class ReportFilterDto {
  @IsString() @Length(1, 60) field: string;
  @IsEnum(ReportFilterOperator) operator: ReportFilterOperator;
  @Allow() value: unknown;
}

export class ReportQueryDto {
  @IsEnum(ReportDataset) dataset: ReportDataset;
  @IsOptional() @IsArray() @IsString({ each: true }) fields?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ReportFilterDto) filters?: ReportFilterDto[];
  @IsOptional() @IsString() groupBy?: string;
  @IsOptional() @IsInt() @Min(1) @Max(10000) limit = 1000;
}

export class SaveReportDto {
  @IsString() @Length(2, 120) name: string;
  @ValidateNested() @Type(() => ReportQueryDto) query: ReportQueryDto;
}

export class CreateReportJobDto {
  @IsEnum(ReportFormat) format: ReportFormat;
  @ValidateNested() @Type(() => ReportQueryDto) query: ReportQueryDto;
}

export class DashboardConfigDto {
  @IsArray() @IsString({ each: true }) metricKeys: string[];
}

export class AuditQueryDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() actorUserId?: string;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 50;
}
