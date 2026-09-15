import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation.js';
import { buildConfig } from './configuration.js';
import { AppConfigService } from './config.service.js';

/**
 * Global so no feature module needs to re-import it to read configuration.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      // Runs before any provider is constructed: bad env => no boot.
      validate: (raw) => buildConfig(validateEnv(raw)),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
