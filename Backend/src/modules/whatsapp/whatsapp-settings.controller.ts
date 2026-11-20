import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WHATSAPP_LINK_COOKIE } from '../../common/constants/auth.constants.js';
import { SuperAdminOnly } from '../../common/decorators/access.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { VerifyCodeDto } from '../auth/dto/verification.dto.js';
import { sessionContextOf, TokenService } from '../auth/token.service.js';
import {
  RevealWhatsappSecretDto, SendLinkCodeDto, SetWhatsappAssistantDto, TestWhatsappMetaDto,
  TestWhatsappOpenAiDto, UnlinkWhatsappPhoneDto, UpdateWhatsappSettingsDto,
} from './dto/whatsapp-settings.dto.js';
import { WhatsappConnectionsService } from './whatsapp-connections.service.js';
import { WhatsappPhoneService } from './whatsapp-phone.service.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

const SETTINGS_ACTION_LIMIT = { limit: 10, windowSeconds: 900 };

@ApiTags('Settings')
@SuperAdminOnly()
@Controller('settings/whatsapp')
export class WhatsappSettingsController {
  constructor(
    private readonly settings: WhatsappSettingsService,
    private readonly phone: WhatsappPhoneService,
    private readonly tokens: TokenService,
    private readonly connections: WhatsappConnectionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'WhatsApp and AI settings with masked credentials' })
  view(@CurrentUser('id') userId: string) {
    return this.settings.view(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update WhatsApp and AI settings after a password check' })
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateWhatsappSettingsDto, @Req() req: Request) {
    return this.settings.update(userId, dto, sessionContextOf(req));
  }

  @Patch('assistant')
  @ApiOperation({ summary: 'Switch the WhatsApp assistant on or off' })
  setAssistant(@CurrentUser('id') userId: string, @Body() dto: SetWhatsappAssistantDto, @Req() req: Request) {
    return this.settings.setAssistant(userId, dto, sessionContextOf(req));
  }

  @Post('reveal')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Reveal one WhatsApp or OpenAI credential after a password check' })
  reveal(@CurrentUser('id') userId: string, @Body() dto: RevealWhatsappSecretDto, @Req() req: Request) {
    return this.settings.reveal(userId, dto, sessionContextOf(req));
  }

  @Post('openai/test')
  @HttpCode(HttpStatus.OK)
  @RateLimit(SETTINGS_ACTION_LIMIT)
  @ApiOperation({ summary: 'Test the OpenAI key and list chat models' })
  testOpenAi(@Body() dto: TestWhatsappOpenAiDto) {
    return this.connections.testOpenAi(dto);
  }

  @Post('meta/test')
  @HttpCode(HttpStatus.OK)
  @RateLimit(SETTINGS_ACTION_LIMIT)
  @ApiOperation({ summary: 'Test the Meta access token and business phone number' })
  testMeta(@Body() dto: TestWhatsappMetaDto) {
    return this.connections.testMeta(dto);
  }

  @Post('phone')
  @HttpCode(HttpStatus.OK)
  @RateLimit(SETTINGS_ACTION_LIMIT)
  @ApiOperation({ summary: 'Send a verification code by WhatsApp' })
  async sendCode(
    @CurrentUser('id') userId: string,
    @Body() dto: SendLinkCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { challengeToken, ttlMs } = await this.phone.sendCode(userId, dto, sessionContextOf(req));
    this.tokens.setChallenge(res, 'whatsappLink', challengeToken, ttlMs);
    return { expiresInSeconds: Math.ceil(ttlMs / 1000) };
  }

  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the WhatsApp code using the link cookie' })
  async verify(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challenge = req.cookies?.[WHATSAPP_LINK_COOKIE] as string | undefined;
    const linked = await this.phone.verify(userId, challenge, dto.code, sessionContextOf(req));
    this.tokens.clearChallenge(res, 'whatsappLink');
    return linked;
  }

  @Delete('phone')
  @ApiOperation({ summary: 'Unlink the WhatsApp number after a password check' })
  async unlink(
    @CurrentUser('id') userId: string,
    @Body() dto: UnlinkWhatsappPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.phone.unlink(userId, dto.currentPassword, sessionContextOf(req));
    this.tokens.clearChallenge(res, 'whatsappLink');
    return { linkedPhone: null };
  }
}
