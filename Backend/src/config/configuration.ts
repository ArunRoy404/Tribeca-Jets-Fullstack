import type { Env } from './env.validation.js';

/**
 * Maps the flat, validated env into grouped config objects.
 *
 * Feature code injects `AppConfigService` and reads `cfg.storage.driver`
 * rather than reaching for `process.env` — so the resolution rules below
 * (notably storage driver auto-detection) live in exactly one place.
 */

export type StorageDriver = 's3' | 'local';
export type MailDriverName = 'smtp' | 'log';

export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  isProduction: boolean;
  port: number;
  apiPrefix: string;
  webAppUrl: string;
  apiPublicUrl: string;

  database: { url: string };
  redis: { url: string };

  auth: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
    refreshTtlRemembered: string;
    cookieDomain?: string;
    cookieSecure: boolean;
  };

  verification: {
    twoFactorTtlMinutes: number;
    passwordResetTtlMinutes: number;
    passwordResetWindowMinutes: number;
    maxAttempts: number;
  };

  rateLimit: {
    enabled: boolean;
    multiplier: number;
  };

  mail: {
    driver: MailDriverName;
    from: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
  };

  cors: { origins: string[] };

  storage: {
    driver: StorageDriver;
    localPath: string;
    s3?: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicUrl?: string;
    };
  };

  ai: {
    provider: Env['AI_PROVIDER'];
    openaiApiKey?: string;
    anthropicApiKey?: string;
    enabled: boolean;
  };
}

/**
 * `STORAGE_DRIVER=auto` resolves to S3 only when a complete credential set is
 * present; anything less falls back to local disk on the VPS.
 */
function resolveStorage(env: Env): AppConfig['storage'] {
  const hasS3Credentials = Boolean(
    env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY,
  );

  const useS3 =
    env.STORAGE_DRIVER === 's3' ||
    (env.STORAGE_DRIVER === 'auto' && hasS3Credentials);

  if (!useS3) {
    return { driver: 'local', localPath: env.STORAGE_LOCAL_PATH };
  }

  return {
    driver: 's3',
    localPath: env.STORAGE_LOCAL_PATH,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      publicUrl: env.S3_PUBLIC_URL,
    },
  };
}

/** SMTP only when a complete credential set is present. */
function resolveMail(env: Env): AppConfig['mail'] {
  const hasSmtpCredentials = Boolean(
    env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD,
  );

  const useSmtp =
    env.MAIL_DRIVER === 'smtp' ||
    (env.MAIL_DRIVER === 'auto' && hasSmtpCredentials);

  if (!useSmtp) {
    return { driver: 'log', from: env.MAIL_FROM };
  }

  return {
    driver: 'smtp',
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
    },
  };
}

export function buildConfig(env: Env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    webAppUrl: env.WEB_APP_URL,
    apiPublicUrl: env.API_PUBLIC_URL,

    database: { url: env.DATABASE_URL },
    redis: { url: env.REDIS_URL },

    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
      refreshTtlRemembered: env.JWT_REFRESH_TTL_REMEMBERED,
      cookieDomain: env.COOKIE_DOMAIN || undefined,
      cookieSecure: env.COOKIE_SECURE,
    },

    cors: {
      // The web app is always allowed; CORS_ORIGINS adds staging/preview hosts.
      origins: Array.from(new Set([env.WEB_APP_URL, ...env.CORS_ORIGINS])),
    },

    verification: {
      twoFactorTtlMinutes: env.TWO_FACTOR_CODE_TTL_MINUTES,
      passwordResetTtlMinutes: env.PASSWORD_RESET_CODE_TTL_MINUTES,
      passwordResetWindowMinutes: env.PASSWORD_RESET_WINDOW_MINUTES,
      maxAttempts: env.VERIFICATION_MAX_ATTEMPTS,
    },

    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED,
      multiplier: env.RATE_LIMIT_MULTIPLIER,
    },

    storage: resolveStorage(env),
    mail: resolveMail(env),

    ai: {
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      enabled: Boolean(
        env.AI_PROVIDER === 'openai' ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY,
      ),
    },
  };
}
