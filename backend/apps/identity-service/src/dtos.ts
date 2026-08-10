/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { IsArray, IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

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

export class CreateUserDto extends RegisterDto {
  @IsArray() @IsString({ each: true }) roleCodes: string[];
}

export class UpdateUserRolesDto {
  @IsArray() @IsString({ each: true }) roleCodes: string[];
}

export class CreateRoleDto {
  @IsString() @Length(2, 64) code: string;
  @IsString() @Length(2, 120) name: string;
  @IsArray() @IsString({ each: true }) permissions: string[];
}
