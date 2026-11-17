import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { phoneDigits } from '../../config/configuration.js';
import { RedisService } from '../../core/redis/redis.service.js';

const MEMORY_TTL_SECONDS = 30 * 60;
const MAX_MESSAGES = 12;
const textMessage = z.object({ kind: z.literal('text'), role: z.enum(['user', 'assistant']), text: z.string() });
export type MemoryMessage = z.infer<typeof textMessage>;

/**
 * Six exchanges, expiring half an hour after the last answer. Tool arguments
 * and rows never enter this store: a later question must read current CRM data.
 */
@Injectable()
export class WhatsappMemory {
  constructor(private readonly redis: RedisService) {}

  private key(phone: string): string {
    return `whatsapp:memory:${phoneDigits(phone)}`;
  }

  async load(phone: string): Promise<MemoryMessage[]> {
    const stored = await this.redis.getString(this.key(phone));
    return stored ? z.array(textMessage).parse(JSON.parse(stored)).slice(-MAX_MESSAGES) : [];
  }

  async save(phone: string, history: MemoryMessage[], text: string, reply: string): Promise<void> {
    // Construct the fields again rather than trusting a caller's object: only
    // user text and final replies may survive this question.
    const messages: MemoryMessage[] = [
      ...history.map((message) => ({ kind: 'text' as const, role: message.role, text: message.text })),
      { kind: 'text', role: 'user', text },
      { kind: 'text', role: 'assistant', text: reply },
    ];
    await this.redis.setString(this.key(phone), JSON.stringify(messages.slice(-MAX_MESSAGES)), MEMORY_TTL_SECONDS);
  }

  async reset(phone: string): Promise<void> {
    await this.redis.del(this.key(phone));
  }
}
