import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { VerifyWebhookQueryDto } from './dto/whatsapp.dto.js';
import { readFailedStatuses, readIncomingMessages } from './whatsapp.payload.js';
import { verifyMetaSignature } from './whatsapp.signature.js';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

/**
 * Meta's webhook for the Super Admin's WhatsApp assistant.
 *
 * **Public, and authenticated by Meta's signature instead of a session** —
 * Meta has no cookie to send. So this controller carries no
 * `@RequireAccess`: the GET proves the URL is ours with the verify token, and
 * every POST is refused unless `X-Hub-Signature-256` is the app secret's HMAC
 * of the raw body. Who may *use* the bot is then decided per message in
 * `WhatsappService` (verified phones, one Super Admin, the Settings switch).
 *
 * Both routes answer 404 while Meta settings are incomplete, so a deployment
 * without the assistant does not advertise the route.
 */
@ApiTags('WhatsApp')
@Public()
@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly settings: WhatsappSettingsService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Get()
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Meta webhook verification',
    description:
      'Called once by Meta when the webhook URL is saved. Echoes `hub.challenge` as plain text when ' +
      '`hub.mode` is `subscribe` and `hub.verify_token` matches the stored verify token; 403 otherwise, ' +
      '404 while the assistant is not configured.',
  })
  @ApiResponse({ status: 200, description: 'The challenge, as plain text.' })
  async verify(@Query() query: VerifyWebhookQueryDto): Promise<StreamableFile> {
    const config = await this.settings.current();
    if (!config) throw new NotFoundException();

    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (query['hub.mode'] !== 'subscribe' || !token || !challenge || !sameText(token, config.verifyToken)) {
      throw new ForbiddenException('Verification token does not match');
    }
    // Plain bytes, not the `{ success, data }` envelope: Meta compares the
    // body to the challenge it sent. A StreamableFile passes the interceptor
    // untouched.
    return new StreamableFile(Buffer.from(challenge, 'utf8'));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  // Meta sends from a pool of addresses and bursts after an outage; this
  // bounds a flood of forged posts, each of which costs one HMAC.
  @RateLimit({ limit: 600, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Meta webhook events',
    description:
      'Incoming WhatsApp messages and delivery receipts from Meta. 401 unless `X-Hub-Signature-256` is ' +
      'the HMAC-SHA256 of the raw body with the stored app secret. Answers 200 at once and handles the ' +
      'messages afterwards. Messages from outside the Super Admin’s verified phones are dropped silently.',
  })
  @ApiResponse({ status: 200, description: 'Received.' })
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: unknown,
  ): Promise<{ received: number }> {
    const config = await this.settings.current();
    if (!config) throw new NotFoundException();

    if (!verifyMetaSignature(request.rawBody, signature, config.appSecret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const failed = readFailedStatuses(body);
    for (const { id, codes } of failed) {
      this.logger.warn(`WhatsApp message ${id} failed at Meta (codes: ${codes.join(', ')})`);
    }
    if (failed.length) {
      void this.whatsapp.recordDeliveryFailures(failed.map(({ id }) => id)).catch((error: unknown) =>
        this.logger.error(`WhatsApp delivery tracking failed (${error instanceof Error ? error.name : 'UnknownError'})`),
      );
    }

    const messages = readIncomingMessages(body);
    // Meta wants its 200 within seconds and retries otherwise; the work runs
    // after the answer, and the service drops the retries it would cause.
    if (messages.length) {
      void this.whatsapp
        .receive(messages)
        .catch((error: unknown) =>
          this.logger.error(`WhatsApp message handling failed (${error instanceof Error ? error.name : 'UnknownError'})`),
        );
    }
    return { received: messages.length };
  }
}

/** Constant time, so the verify token cannot be found by timing. */
function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
