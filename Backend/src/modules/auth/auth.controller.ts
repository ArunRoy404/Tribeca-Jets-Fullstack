import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { REFRESH_TOKEN_COOKIE } from '../../common/constants/auth.constants.js';
import { StorageService } from '../../core/storage/storage.service.js';
import { AuthService } from './auth.service.js';
import { TokenService, type SessionContext } from './token.service.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly storage: StorageService,
  ) {}

  private contextOf(req: Request): SessionContext {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Public()
  // Five attempts per 15 minutes per IP — slows credential stuffing without
  // locking out a user who simply mistyped.
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Sets httpOnly access and refresh cookies. No token is returned in the body by design.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.contextOf(req);
    const user = await this.auth.validateCredentials(dto, context);
    await this.tokens.startSession(res, user, context);
    return this.auth.getProfile(user.id);
  }

  @Public()
  @RateLimit({ limit: 30, windowSeconds: 900 })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the session',
    description:
      'Issues a new token pair. Replaying an already-used token revokes every session for that user.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const presented = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const user = await this.tokens.rotateSession(
      res,
      presented,
      this.contextOf(req),
    );
    return this.auth.getProfile(user.id);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out and revoke the refresh token' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const presented = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.tokens.endSession(res, presented);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Current user',
    description:
      'How the frontend learns who is signed in — the session token is httpOnly and unreadable by JavaScript.',
  })
  async me(@CurrentUser('id') userId: string) {
    const profile = await this.auth.getProfile(userId);
    return {
      ...profile,
      avatarUrl: await this.storage.signedUrlOrNull(profile.avatarKey),
    };
  }
}
