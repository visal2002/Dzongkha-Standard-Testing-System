/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ExamStatus, Skill } from '@dzongjuk/contracts';
import { PartialType } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsIn, IsInt, IsNumberString, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { RegistrationPaymentStatus } from './entities';

export class CreateExamDto {
  @IsString() @Length(2, 40) code: string;
  @IsString() @Length(2, 180) title: string;
  @IsDateString() examDate: string;
  @IsDateString() registrationStart: string;
  @IsDateString() registrationEnd: string;
  @IsInt() @Min(1) @Max(100000) capacity: number;
  @IsString() @Length(2, 240) venue: string;
  @IsNumberString() registrationFee: string;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class UpdateExamStatusDto { @IsEnum(ExamStatus) status: ExamStatus; }

export class SubmitApplicationDto {
  @IsString() @Length(5, 64) identityKey: string;
  @IsObject() profileSnapshot: Record<string, unknown>;
}

// `identityKey` is deliberately absent - it is the immutable identifier the
// examId+identityKey uniqueness constraint is built on, so a resubmission edits
// the profile details DCDD asked to be corrected, never the identity itself.
export class ResubmitApplicationDto {
  @IsObject() profileSnapshot: Record<string, unknown>;
}

export class LookupCitizenDto {
  @IsString() @Matches(/^\d{11}$/, { message: 'CID must contain exactly 11 digits.' }) cid: string;
}

export class ReturnApplicationDto { @IsString() @Length(3, 2000) remarks: string; }
export class RecordRegistrationPaymentDto {
  @IsIn([RegistrationPaymentStatus.Paid, RegistrationPaymentStatus.Waived]) status: RegistrationPaymentStatus.Paid | RegistrationPaymentStatus.Waived;
  @IsString() @Length(2, 40) method: string;
  @IsOptional() @IsString() @Length(3, 100) reference?: string;
}
export class CancelBirmsPaymentDto {
  @IsString() @Length(3, 500) reason: string;
}
export class MarkAttendanceDto { @IsArray() @IsEnum(Skill, { each: true }) absentSkills: Skill[]; }

export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() examId?: string;
}
