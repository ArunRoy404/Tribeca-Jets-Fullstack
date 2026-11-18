import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../config/config.service.js';

const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;
type WhatsappConfig = NonNullable<AppConfigService['whatsapp']>;

function messagesUrl(config: WhatsappConfig): string {
  return `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
}

/** Meta's message and error_data can echo the question or the phone number. */
const errorSchema = z.object({
  code: z.number().optional().catch(undefined),
  error_subcode: z.number().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  fbtrace_id: z.string().optional().catch(undefined),
});

function metaError(body: unknown) {
  const parsed = z.object({ error: errorSchema }).safeParse(body);
  return parsed.success ? parsed.data.error : {};
}

@Injectable()
export class WhatsappSender {
  private readonly logger = new Logger(WhatsappSender.name);

  constructor(private readonly config: AppConfigService) {}

  private post(config: WhatsappConfig, body: object): Promise<Response> {
    return fetch(messagesUrl(config), {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  async sendText(to: string, body: string, replyTo?: string): Promise<boolean> {
    const config = this.config.whatsapp;
    if (!config) return false;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
      ...(replyTo ? { context: { message_id: replyTo } } : {}),
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        const response = await this.post(config, payload);
        if (response.ok) return true;
        const error = metaError(await response.json().catch(() => null));
        this.logger.error(`WhatsApp send to …${to.slice(-4)} failed (HTTP ${response.status}) ${JSON.stringify(error)}`);
        if (error.code === 190) {
          this.logger.error('WhatsApp access token rejected (code 190): renew WHATSAPP_ACCESS_TOKEN');
        }
        if (response.status !== 429 && (response.status < 500 || response.status >= 600)) return false;
      } catch {
        this.logger.error(`WhatsApp send to …${to.slice(-4)} failed (network or timeout)`);
      }
    }
    return false;
  }

  /** One attempt: a missing typing indicator must never cost the admin their reply. */
  async markRead(messageId: string): Promise<void> {
    const config = this.config.whatsapp;
    if (!config) return;
    try {
      const response = await this.post(config, {
        messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' },
      });
      if (!response.ok) {
        const { code } = metaError(await response.json().catch(() => null));
        this.logger.warn(`WhatsApp mark read failed (HTTP ${response.status}${code === undefined ? '' : `, code ${code}`})`);
      }
    } catch {
      this.logger.warn('WhatsApp mark read failed (network or timeout)');
    }
  }
}
