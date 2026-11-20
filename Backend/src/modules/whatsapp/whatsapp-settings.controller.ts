import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WHATSAPP_LINK_COOKIE } from '../../common/constants/auth.constants.js';
import { SuperAdminOnly } from '../../common/decorators/access.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { sessionContextOf, TokenService } from '../auth/token.service.js';
import {
  QueryWhatsappHistoryDto, QueryWhatsappPhonesDto, RenameWhatsappPhoneDto, RevealWhatsappSecretDto, SendLinkCodeDto,
  SetWhatsappAssistantDto, TestWhatsappMetaDto, TestWhatsappOpenAiDto, UnlinkWhatsappPhoneDto,
  UpdateWhatsappSettingsDto, VerifyWhatsappPhoneDto,
} from './dto/whatsapp-settings.dto.js';
import { WhatsappConnectionsService } from './whatsapp-connections.service.js';
import { WhatsappHistoryService } from './whatsapp-history.service.js';
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
    private readonly historyService: WhatsappHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'WhatsApp and AI settings with masked credentials' })
  view(@CurrentUser('id') userId: string) {
    return this.settings.view(userId);
  }

  @Get('phones')
  @ApiOperation({ summary: 'List your verified WhatsApp phones, optionally including unlinked phones' })
  phones(@CurrentUser('id') userId: string, @Query() query: QueryWhatsappPhonesDto) {
    return this.phone.list(userId, query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Read WhatsApp assistant and settings history newest first' })
  history(@CurrentUser('id') userId: string, @Query() query: QueryWhatsappHistoryDto) {
    return this.historyService.list(userId, query);
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
    @Body() dto: VerifyWhatsappPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const challenge = req.cookies?.[WHATSAPP_LINK_COOKIE] as string | undefined;
    const linked = await this.phone.verify(userId, challenge, dto, sessionContextOf(req));
    this.tokens.clearChallenge(res, 'whatsappLink');
    return linked;
  }

  @Patch('phone/:id')
  @ApiOperation({ summary: 'Rename one of your linked WhatsApp phones' })
  rename(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameWhatsappPhoneDto,
    @Req() req: Request,
  ) {
    return this.phone.rename(userId, id, dto.label, sessionContextOf(req));
  }

  @Delete('phone/:id')
  @ApiOperation({ summary: 'Unlink one of your WhatsApp phones after a password check' })
  unlink(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UnlinkWhatsappPhoneDto,
    @Req() req: Request,
  ) {
    return this.phone.unlink(userId, id, dto.currentPassword, sessionContextOf(req));
  }
}
