import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { TestWhatsappMetaDto, TestWhatsappOpenAiDto } from './dto/whatsapp-settings.dto.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

const CHAT_MODEL_PREFIX = /^(?:gpt-|chatgpt-|o\d)/;
const NON_CHAT_MODEL = /embedding|tts|whisper|dall-e|image|audio|realtime|transcribe|search|moderation|instruct/i;
const modelsBody = z.object({ data: z.array(z.object({ id: z.string() })) });
const metaPhoneBody = z.object({ display_phone_number: z.string().min(1), verified_name: z.string().min(1) });
const metaErrorBody = z.object({ error: z.object({ code: z.number() }) });
const OPENAI_UNAVAILABLE = 'Could not reach OpenAI';
const META_UNAVAILABLE = 'Could not reach Meta';

@Injectable()
export class WhatsappConnectionsService {
  private readonly logger = new Logger(WhatsappConnectionsService.name);

  constructor(private readonly settings: WhatsappSettingsService) {}

  private async get(url: string, token: string, unavailable: string): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
      this.logger.log(`Connection test HTTP ${response.status}`);
      return response;
    } catch {
      throw new BadGatewayException(unavailable);
    }
  }

  async testOpenAi({ apiKey }: TestWhatsappOpenAiDto) {
    const key = apiKey ?? await this.settings.openAiTestKey();
    if (!key) throw new BadRequestException('Enter an OpenAI API key first');
    const response = await this.get('https://api.openai.com/v1/models', key, OPENAI_UNAVAILABLE);
    if (response.status === 401 || response.status === 403) {
      throw new BadRequestException('OpenAI refused this key');
    }
    if (!response.ok) throw new BadGatewayException(OPENAI_UNAVAILABLE);
    const parsed = modelsBody.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new BadGatewayException(OPENAI_UNAVAILABLE);
    const models = [...new Set(parsed.data.data.map(({ id }) => id)
      .filter((id) => CHAT_MODEL_PREFIX.test(id) && !NON_CHAT_MODEL.test(id)))].sort().reverse();
    return { ok: true, models };
  }

  async testMeta(input: TestWhatsappMetaDto) {
    const saved = input.accessToken && input.phoneNumberId && input.graphVersion
      ? undefined : await this.settings.metaTestSettings();
    const token = input.accessToken ?? saved?.accessToken;
    const phoneNumberId = input.phoneNumberId ?? saved?.phoneNumberId;
    const graphVersion = input.graphVersion ?? saved?.graphVersion;
    if (!token || !phoneNumberId || !graphVersion) {
      throw new BadRequestException('Enter the Meta access token, phone number ID and Graph version first');
    }

    const url = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}`
      + '?fields=display_phone_number,verified_name';
    const response = await this.get(url, token, META_UNAVAILABLE);
    if (response.status >= 500 || response.status === 429) throw new BadGatewayException(META_UNAVAILABLE);
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = metaErrorBody.safeParse(body);
      const code = parsed.success ? parsed.data.error.code : undefined;
      if (code === 190) throw new BadRequestException('Meta refused the access token');
      if (code === 100 || response.status === 404) {
        throw new BadRequestException('Meta has no phone number with that ID');
      }
      throw new BadRequestException('Meta refused the connection');
    }
    const parsed = metaPhoneBody.safeParse(body);
    if (!parsed.success) throw new BadGatewayException(META_UNAVAILABLE);
    return {
      ok: true,
      displayPhoneNumber: parsed.data.display_phone_number,
      verifiedName: parsed.data.verified_name,
    };
  }
}
