import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './configuration.js';

/**
 * Thin typed facade over Nest's ConfigService.
 *
 * `ConfigModule.validate` returns our `AppConfig`, so its values are the
 * config root — exposing them as getters keeps call sites free of string keys
 * and gives autocomplete over the whole shape.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv() { return this.get('nodeEnv'); }
  get isProduction() { return this.get('isProduction'); }
  get port() { return this.get('port'); }
  get apiPrefix() { return this.get('apiPrefix'); }
  get webAppUrl() { return this.get('webAppUrl'); }
  get apiPublicUrl() { return this.get('apiPublicUrl'); }

  get database() { return this.get('database'); }
  get redis() { return this.get('redis'); }
  get auth() { return this.get('auth'); }
  get cors() { return this.get('cors'); }
  get verification() { return this.get('verification'); }
  get rateLimit() { return this.get('rateLimit'); }
  get storage() { return this.get('storage'); }
  get mail() { return this.get('mail'); }
  get ai() { return this.get('ai'); }
}
