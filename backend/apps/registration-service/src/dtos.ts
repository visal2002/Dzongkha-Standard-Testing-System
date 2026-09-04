/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ExamStatus, Skill } from '@dzongjuk/contracts';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsNumberString, IsObject, IsOptional, IsString,
  Length, Matches, Max, MaxLength, Min, ValidateNested, ValidatorConstraint, ValidatorConstraintInterface, Validate,
} from 'class-validator';
import { RegistrationPaymentStatus } from './entities';

/**
 * A date of birth that is a real calendar date, in the past, and inside a lifespan a
 * person could actually have. The value is kept as the 'YYYY-MM-DD' string the form
 * submits rather than transformed to a Date: it is stored verbatim in the
 * profileSnapshot jsonb column and RegistrationService.certificateProfile() reads it
 * back with a `typeof value === 'string'` check before it reaches a certificate.
 */
@ValidatorConstraint({ name: 'plausibleDateOfBirth' })
export class PlausibleDateOfBirth implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    // Rejects 2026-02-31, which Date would otherwise roll forward into March.
    if (parsed.toISOString().slice(0, 10) !== value) return false;
    const now = Date.now();
    const oldestAllowed = new Date('1900-01-01T00:00:00Z').getTime();
    return parsed.getTime() < now && parsed.getTime() >= oldestAllowed;
  }

  defaultMessage() {
    return 'dateOfBirth must be a real calendar date in YYYY-MM-DD form, in the past and no earlier than 1900.';
  }
}

/**
 * The registration profile captured at submission time.
 *
 * This used to be declared as a bare `@IsObject()`, so any JSON at all was accepted,
 * written straight into the profileSnapshot jsonb column and read back later without
 * further checking. Three of these fields - fullName, cid and dateOfBirth - are what
 * RegistrationService.certificateProfile() hands to the certificate service, where
 * they are printed onto an issued certificate and stored on the certificate row; the
 * rest drive BIRMS payer identification and applicant contact. Validating them here
 * is the only point at which the shape is checked before it becomes a record of
 * fact.
 *
 * The field list mirrors the submission and resubmission forms exactly
 * (frontend ApplicationForm.jsx and MyApplications.jsx), so a legitimate submission
 * from either passes unchanged. With the global ValidationPipe's
 * `forbidNonWhitelisted`, anything outside this list is rejected rather than stored.
 *
 * fullName, cid and dateOfBirth are required because certificate generation cannot
 * proceed without them: leaving them optional only defers the failure to issuance
 * time, where certificateProfile() raises CERTIFICATE_PROFILE_INCOMPLETE for a whole
 * exam's batch instead of for the one application that is actually incomplete.
 */
export class ProfileSnapshotDto {
  @IsString() @Length(2, 160) fullName: string;

  // Bhutanese CIDs are digits; the field also carries prefixed forms such as
  // CID-10701000001 in existing data, so letters and hyphens are permitted. The
  // character class matters because this value is printed onto a certificate.
  @IsString() @Length(4, 64) @Matches(/^[A-Za-z0-9-]+$/, { message: 'cid may contain only letters, digits and hyphens.' })
  cid: string;

  @IsDateString() @Validate(PlausibleDateOfBirth) dateOfBirth: string;

  @IsOptional() @IsString() @Length(1, 40) gender?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  // Accepts the shapes the form actually produces - 17123456, +975 17123456,
  // +975-17-123-456 and (02) 322345 - while excluding letters and control characters.
  @IsOptional() @IsString() @Length(6, 32) @Matches(/^[+(]?[0-9][0-9 ()+-]*$/, { message: 'phone may contain only digits, spaces, brackets, hyphens and a leading +.' })
  phone?: string;
  @IsOptional() @IsString() @Length(2, 80) dzongkhag?: string;
  @IsOptional() @IsString() @Length(2, 80) gewog?: string;
  @IsOptional() @IsString() @Length(2, 120) education?: string;
  @IsOptional() @IsString() @Length(2, 200) institution?: string;
  @IsOptional() @IsString() @Length(2, 60) employmentStatus?: string;
  @IsOptional() @IsString() @MaxLength(200) organization?: string;

  // Alternate spellings that the service layer still reads as fallbacks when the
  // canonical field above is absent - see BirmsPaymentService.profileString() and
  // RegistrationService.applicationContact(). Declared so a client that submits one
  // is not rejected, and bounded so declaring them costs nothing.
  @IsOptional() @IsString() @Length(2, 160) name?: string;
  @IsOptional() @IsString() @Length(6, 32) contactNo?: string;
  @IsOptional() @IsString() @Length(6, 32) mobileNo?: string;
  @IsOptional() @IsString() @Length(4, 64) identityKey?: string;
}

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
  @IsObject() @ValidateNested() @Type(() => ProfileSnapshotDto) profileSnapshot: ProfileSnapshotDto;
}

/**
 * The validated snapshot as the plain jsonb record ApplicationEntity.profileSnapshot
 * stores. Spreading produces an anonymous object type, which TypeScript will widen
 * to Record<string, unknown>; the class itself will not, because it has no index
 * signature - and giving it one would let unrelated properties past the compiler.
 */
export const snapshotColumn = (snapshot: ProfileSnapshotDto): Record<string, unknown> => ({ ...snapshot });

// `identityKey` is deliberately absent - it is the immutable identifier the
// examId+identityKey uniqueness constraint is built on, so a resubmission edits
// the profile details DCDD asked to be corrected, never the identity itself.
//
// The snapshot is validated on this path too. A resubmission is the one workflow
// that replaces a stored profile, and RegistrationService.resubmit() only permits it
// out of the RETURNED state, so a profile can never be rewritten after verification
// has accepted it.
export class ResubmitApplicationDto {
  @IsObject() @ValidateNested() @Type(() => ProfileSnapshotDto) profileSnapshot: ProfileSnapshotDto;
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
