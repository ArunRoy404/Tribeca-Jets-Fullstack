import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { StorageService } from '../../core/storage/storage.service.js';
import { AppConfigService } from '../../config/config.service.js';

/**
 * Liveness/readiness endpoint for nginx, PM2 and uptime monitoring on the VPS.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Service health and active drivers' })
  async check() {
    const [database, redis] = await Promise.all([
      this.ping(() => this.prisma.$queryRaw`SELECT 1`),
      this.ping(() => this.redis.client.ping()),
    ]);

    const healthy = database === 'up' && redis === 'up';

    return {
      status: healthy ? 'ok' : 'degraded',
      environment: this.config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database,
        redis,
        // Surfaces which storage backend the env actually resolved to, so a
        // misconfigured S3 credential set is visible without reading logs.
        storage: this.storage.driverName,
        ai: this.config.ai.enabled ? 'configured' : 'not_configured',
      },
    };
  }

  private async ping(fn: () => Promise<unknown>): Promise<'up' | 'down'> {
    try {
      await fn();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
