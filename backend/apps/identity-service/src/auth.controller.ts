/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Body, Controller, Get, Headers, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@dzongjuk/security';
import { AuthService } from './auth.service';
import { LoginDto, NdiStatusDto, RefreshDto, RegisterDto } from './dtos';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.auth.register(dto, this.context(request));
  }

  @Public() @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, this.context(request));
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public() @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(this.refreshCookie(request) ?? dto.refreshToken, this.context(request));
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public() @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(this.refreshCookie(request), this.context(request));
    response.clearCookie('dzongjuk_refresh', { path: '/api/v1/auth' });
    return { loggedOut: true };
  }

  @Public() @Post('ndi/initiate')
  ndiInitiate() { return this.auth.ndiInitiate(); }

  @Public() @Post('ndi/status')
  async ndiStatus(@Body() dto: NdiStatusDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.ndiStatus(dto.pollToken, this.context(request));
    if ('refreshToken' in result) {
      this.setRefreshCookie(response, result.refreshToken);
      const { refreshToken: _refreshToken, ...publicResult } = result;
      return publicResult;
    }
    return result;
  }

  @Public() @Post('ndi/cancel')
  ndiCancel(@Body() dto: NdiStatusDto) { return this.auth.ndiCancel(dto.pollToken); }

  @Public() @Post('ndi/webhook') @HttpCode(202)
  ndiWebhook(@Headers('authorization') authorization: string | undefined, @Body() payload: Record<string, unknown>) {
    return this.auth.ndiWebhook(authorization, payload);
  }

  @ApiBearerAuth() @Get('me')
  me(@Req() request: Request) { return request.user; }

  private context(request: Request) { return { requestId: request.id, ip: request.ip, userAgent: request.header('user-agent') }; }
  private refreshCookie(request: Request): string | undefined {
    return (request.cookies as Record<string, string> | undefined)?.dzongjuk_refresh;
  }
  private setRefreshCookie(response: Response, token: string) {
    response.cookie('dzongjuk_refresh', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/v1/auth', maxAge: 8 * 60 * 60_000 });
  }
}
