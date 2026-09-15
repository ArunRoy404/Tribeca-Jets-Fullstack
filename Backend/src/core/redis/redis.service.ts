import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../../config/config.service.js';

/**
 * Shared Redis connection used for rate limiting, caching and (via BullMQ)
 * the job queues that drive reminders and scheduled email.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redis.url, {
      // BullMQ requires this to be null; keeping it consistent avoids surprises
      // when the same connection options are reused for queues.
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.client.on('error', (err: Error) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  /**
   * Fixed-window counter. Returns the current hit count for `key`, setting the
   * TTL only on first write so the window does not slide forward on each hit.
   */
  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
