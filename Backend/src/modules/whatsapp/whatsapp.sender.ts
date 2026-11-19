import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '../../config/config.service.js';
import { documentSizeKb, type WhatsappDocument } from './whatsapp.document.js';

const TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
type WhatsappConfig = NonNullable<AppConfigService['whatsapp']>;

function messagesUrl(config: WhatsappConfig): string {
  return `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
}

function mediaUrl(config: WhatsappConfig): string {
  return `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/media`;
}

/** Meta's message and error_data can echo the question or the phone number. */
const errorSchema = z.object({
  code: z.number().optional().catch(undefined),
  error_subcode: z.number().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  fbtrace_id: z.string().optional().catch(undefined),
});
const mediaSchema = z.object({ id: z.string().min(1) });

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

  private async postWithRetry<T>(
    send: () => Promise<Response>, operation: string,
    readSuccess: (response: Response) => T | Promise<T>, codesOnly = false,
  ): Promise<T | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        const response = await send();
        if (response.ok) return await readSuccess(response);
        const error = metaError(await response.json().catch(() => null));
        const logged = codesOnly ? { code: error.code, error_subcode: error.error_subcode } : error;
        this.logger.error(`WhatsApp ${operation} failed (HTTP ${response.status}) ${JSON.stringify(logged)}`);
        if (error.code === 190) {
          this.logger.error('WhatsApp access token rejected (code 190): renew WHATSAPP_ACCESS_TOKEN');
        }
        if (response.status !== 429 && (response.status < 500 || response.status >= 600)) return null;
      } catch {
        this.logger.error(`WhatsApp ${operation} failed (network or timeout)`);
      }
    }
    return null;
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

    return (await this.postWithRetry(() => this.post(config, payload), `send to …${to.slice(-4)}`, () => true)) ?? false;
  }

  async sendDocument(to: string, file: WhatsappDocument, caption?: string, replyTo?: string): Promise<boolean> {
    const config = this.config.whatsapp;
    if (!config) return false;
    const size = `${documentSizeKb(file.body.length)} KB`;
    if (file.body.length > MAX_DOCUMENT_BYTES) {
      this.logger.warn(`WhatsApp document exceeds the upload limit (${size})`);
      return false;
    }

    try {
      const form = new FormData();
      form.set('messaging_product', 'whatsapp');
      form.set('type', file.contentType);
      form.set('file', new Blob([new Uint8Array(file.body)], { type: file.contentType }), file.filename);

      const id = await this.postWithRetry(
        () => fetch(mediaUrl(config), {
          method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}` },
          body: form, signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        }),
        `document upload (${size})`,
        async (response) => {
          const body: unknown = await response.json().catch((error: unknown) => {
            if (error instanceof SyntaxError) return null;
            throw error;
          });
          const media = mediaSchema.safeParse(body);
          if (media.success) return media.data.id;
          this.logger.error(`WhatsApp document upload (${size}) returned no media id (HTTP ${response.status})`);
          return null;
        },
        true,
      );
      if (!id) return false;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { id, filename: file.filename, ...(caption !== undefined ? { caption } : {}) },
        ...(replyTo ? { context: { message_id: replyTo } } : {}),
      };
      return (await this.postWithRetry(() => this.post(config, payload), `document send (${size})`, () => true, true)) ?? false;
    } catch {
      this.logger.error(`WhatsApp document preparation failed (${size})`);
      return false;
    }
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
