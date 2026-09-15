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
import {
  PASSWORD_RESET_COOKIE,
  REFRESH_TOKEN_COOKIE,
  TWO_FACTOR_COOKIE,
} from '../../common/constants/auth.constants.js';
import { StorageService } from '../../core/storage/storage.service.js';
import { AuthService } from './auth.service.js';
import { TokenService, type SessionContext } from './token.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyCodeDto,
} from './dto/verification.dto.js';

/**
 * Endpoints map 1:1 onto the frontend's auth screens:
 *
 *   /sign-in                  -> POST /auth/login
 *   /sign-in/two-factor       -> POST /auth/two-factor/verify | /resend
 *   /sign-in/complete         -> (no call; session already established)
 *   /forgot-password          -> POST /auth/forgot-password
 *   /forgot-password/verify   -> POST /auth/forgot-password/verify | /resend
 *   /reset-password           -> POST /auth/reset-password
 *
 * Every step carries its state in httpOnly cookies, because each OTP screen
 * submits only a 6-digit code and has no hidden challenge field.
 */
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

  // ---------------------------------------------------------------------------
  // Sign in
  // ---------------------------------------------------------------------------

  @Public()
  // Five attempts per 15 minutes per IP — slows credential stuffing without
  // locking out someone who simply mistyped.
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email and password',
    description:
      'For accounts without two-factor, sets the session cookies and returns the profile. ' +
      'For accounts with two-factor, sets only a short-lived challenge cookie and returns ' +
      'requiresTwoFactor: true — no session exists until the code is verified. ' +
      'When SMTP is not configured outside production, the response also carries a ' +
      'devCode object holding the generated code, so the flow is usable without email.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.contextOf(req);
    const user = await this.auth.validateCredentials(dto, context);

    if (user.twoFactorEnabled) {
      const challenge = await this.auth.startTwoFactorChallenge(user, context);
      this.tokens.setChallenge(
        res,
        'twoFactor',
        challenge.challengeToken,
        challenge.ttlMs,
      );

      return {
        requiresTwoFactor: true,
        email: challenge.maskedEmail,
        expiresInSeconds: Math.floor(challenge.ttlMs / 1000),
        // Present only while SMTP is unconfigured outside production.
        ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
      };
    }

    await this.tokens.startSession(res, user, context, dto.rememberMe);

    return {
      requiresTwoFactor: false,
      user: await this.auth.getProfile(user.id),
    };
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 900 })
  @Post('two-factor/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the two-factor code and complete sign-in',
    description: 'Reads the challenge from the tj_2fa cookie; the body carries only the code.',
  })
  async verifyTwoFactor(
    @Body() dto: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.contextOf(req);
    const challengeToken = req.cookies?.[TWO_FACTOR_COOKIE] as string | undefined;

    const user = await this.auth.verifyTwoFactor(challengeToken, dto.code, context);
    await this.tokens.startSession(res, user, context);

    return { user: await this.auth.getProfile(user.id) };
  }

  @Public()
  // Tighter than verification: resend sends real email, so it is the abusable
  // side of the flow.
  @RateLimit({ limit: 3, windowSeconds: 900 })
  @Post('two-factor/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the two-factor code' })
  async resendTwoFactor(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challengeToken = req.cookies?.[TWO_FACTOR_COOKIE] as string | undefined;
    const challenge = await this.auth.resendTwoFactorCode(challengeToken);

    this.tokens.setChallenge(
      res,
      'twoFactor',
      challenge.challengeToken,
      challenge.ttlMs,
    );

    return {
      email: challenge.maskedEmail,
      expiresInSeconds: Math.floor(challenge.ttlMs / 1000),
      ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
    };
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  @Public()
  @RateLimit({ limit: 30, windowSeconds: 900 })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the session',
    description:
      'Issues a new token pair. Replaying an already-used token revokes every session for that user.',
  })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset code',
    description:
      'Always succeeds, whether or not the address has an account, and always sets a ' +
      'challenge cookie — otherwise the endpoint would reveal which emails are registered.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challenge = await this.auth.startPasswordReset(
      dto.email,
      this.contextOf(req),
    );

    this.tokens.setChallenge(
      res,
      'passwordReset',
      challenge.challengeToken,
      challenge.ttlMs,
    );

    return {
      message: 'If that email is registered, a reset code is on its way.',
      email: challenge.maskedEmail,
      expiresInSeconds: Math.floor(challenge.ttlMs / 1000),
      ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
    };
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 900 })
  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the password reset code',
    description:
      'Unlocks the reset step. The password itself is set by POST /auth/reset-password.',
  })
  async verifyResetCode(@Body() dto: VerifyCodeDto, @Req() req: Request) {
    const challengeToken = req.cookies?.[PASSWORD_RESET_COOKIE] as
      | string
      | undefined;

    const { ttlMs } = await this.auth.verifyPasswordResetCode(
      challengeToken,
      dto.code,
    );

    return { verified: true, expiresInSeconds: Math.floor(ttlMs / 1000) };
  }

  @Public()
  @RateLimit({ limit: 3, windowSeconds: 900 })
  @Post('forgot-password/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the password reset code' })
  async resendResetCode(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challengeToken = req.cookies?.[PASSWORD_RESET_COOKIE] as
      | string
      | undefined;

    const challenge = await this.auth.resendPasswordResetCode(challengeToken);
    this.tokens.setChallenge(
      res,
      'passwordReset',
      challenge.challengeToken,
      challenge.ttlMs,
    );

    return {
      email: challenge.maskedEmail,
      expiresInSeconds: Math.floor(challenge.ttlMs / 1000),
      ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
    };
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password',
    description:
      'Requires a verified reset challenge. Revokes every existing session on success.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challengeToken = req.cookies?.[PASSWORD_RESET_COOKIE] as
      | string
      | undefined;

    await this.auth.completePasswordReset(
      challengeToken,
      dto.newPassword,
      this.contextOf(req),
    );

    this.tokens.clearChallenge(res, 'passwordReset');

    return { message: 'Your password has been changed. Please sign in.' };
  }
}
