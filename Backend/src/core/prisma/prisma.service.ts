import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { AppConfigService } from '../../config/config.service.js';

/**
 * The single database connection for the application.
 *
 * Prisma 7 connects through a driver adapter rather than a bare connection
 * string, so the pool is configured here and nowhere else.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.database.url }),
      // Query logging in development only — it is far too noisy in production
      // and would leak client data into the server logs.
      log: config.isProduction
        ? [{ emit: 'stdout', level: 'error' }]
        : [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Excludes soft-deleted rows. Spread into a `where` clause:
   *   `where: { ...this.prisma.notDeleted, email }`
   *
   * Soft deletes are a scope requirement — historical business data must never
   * be destroyed (§6.19) — so every list query needs this filter.
   */
  get notDeleted() {
    return { deletedAt: null } as const;
  }
}
