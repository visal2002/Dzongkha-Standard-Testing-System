/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Skill } from '@dzongjuk/contracts';
import { AppealDecision, AppealRecommendation } from './entities';
import { CertificateOrientation, CertificatePaperSize } from './entities';

// Certificate template image slots (logos, border, signature, seal) - a data URI's
// mime-type prefix, base64-decoded and size-checked in CertificateService.createTemplate.
export class CertificateTemplateAssetDto {
  @IsIn(['image/png', 'image/jpeg']) mimeType: 'image/png' | 'image/jpeg';
  @IsString() @Length(1, 3_000_000) dataBase64: string;
}

export class CreateAppealDto {
  @IsUUID() applicationId: string;
  @IsUUID() examId: string;
  @IsArray() @ArrayMinSize(1) @IsEnum(Skill, { each: true }) skills: Skill[];
  @IsString() @Length(20, 4000) reason: string;
}

export class CommitteeReviewDto {
  @IsEnum(AppealRecommendation) recommendation: AppealRecommendation;
  @IsString() @Length(3, 4000) remarks: string;
  @IsOptional() @IsObject() proposedScores?: Partial<Record<Skill, number>>;
}

export class ChiefDecisionDto {
  // BRD §5.6.2 Committee BR-2: the Chief decides per skill, not once for the whole
  // request, so this carries a decision for every appealed skill rather than a single
  // top-level value.
  @IsObject() skillDecisions: Partial<Record<Skill, AppealDecision>>;
  @IsString() @Length(3, 4000) remarks: string;
}

export class ConfirmAppealPaymentDto {
  @IsString() @Length(2, 80) gateway: string;
  @IsString() @Length(3, 160) externalTransactionId: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsDateString() paidAt: string;
}

export class CreateFeeRuleDto {
  @IsString() @Length(2, 80) code: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amountPerSkill: number;
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsDateString() effectiveFrom: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}

export class CreateCertificateTemplateDto {
  @IsString() @Length(2, 80) code: string;
  @IsInt() @Min(1) versionNumber: number;
  @IsString() @Length(3, 180) title: string;
  @IsString() @Length(10, 2000) declarationText: string;
  @IsString() @Length(2, 180) signatoryName: string;
  @IsString() @Length(2, 180) signatoryTitle: string;
  @IsString() @Length(2, 180) chiefExecutiveName: string;
  @IsString() @Length(2, 180) chiefExecutiveTitle: string;
  @IsEnum(CertificatePaperSize) paperSize: CertificatePaperSize;
  @IsEnum(CertificateOrientation) orientation: CertificateOrientation;
  @IsInt() @Min(1) @Max(240) validityMonths: number;
  @IsOptional() @IsBoolean() testOnly?: boolean;
  @IsDateString() effectiveFrom: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @ValidateNested() @Type(() => CertificateTemplateAssetDto) leftLogo?: CertificateTemplateAssetDto;
  @IsOptional() @ValidateNested() @Type(() => CertificateTemplateAssetDto) rightLogo?: CertificateTemplateAssetDto;
  @IsOptional() @ValidateNested() @Type(() => CertificateTemplateAssetDto) borderImage?: CertificateTemplateAssetDto;
  @IsOptional() @ValidateNested() @Type(() => CertificateTemplateAssetDto) signatureImage?: CertificateTemplateAssetDto;
  @IsOptional() @ValidateNested() @Type(() => CertificateTemplateAssetDto) sealImage?: CertificateTemplateAssetDto;
}

export class GenerateCertificatesDto {
  @IsUUID() examId: string;
}

export class RevokeCertificateDto {
  @IsString() @Length(10, 1000) reason: string;
}
