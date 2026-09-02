/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { IsArray, IsEmail, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @Length(5, 32) cid: string;
  @IsString() @Length(2, 160) fullName: string;
  @IsString() @MinLength(12) password: string;
}

export class LoginDto {
  @IsString() identifier: string;
  @IsString() password: string;
}

export class RefreshDto {
  @IsOptional() @IsString() refreshToken?: string;
}

export class NdiStatusDto {
  @IsString() @Length(32, 256) pollToken: string;
}

export class CreateUserDto extends RegisterDto {
  @IsArray() @IsString({ each: true }) roleCodes: string[];
}

export class UpdateUserRolesDto {
  @IsArray() @IsString({ each: true }) roleCodes: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(5, 32) cid?: string;
  @IsOptional() @IsString() @Length(2, 160) fullName?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) roleCodes?: string[];
}

export class UpdateRolePermissionsDto {
  @IsArray() @IsString({ each: true }) permissions: string[];
}

export class CreateRoleDto {
  @IsString() @Length(2, 64) code: string;
  @IsString() @Length(2, 120) name: string;
  @IsArray() @IsString({ each: true }) permissions: string[];
}

export class UpdateMasterConfigurationDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) registrationFee?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) appealFee?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) appealFeePerSkill?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(240) certificateValidity?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) maxBandScore?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(50) minBandScore?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(10) bandScoreStep?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsArray() bandLevels?: Record<string, unknown>[];
  @IsOptional() @IsObject() certificateTemplate?: Record<string, unknown>;
  @IsOptional() @IsObject() notificationTemplates?: Record<string, string>;
}
