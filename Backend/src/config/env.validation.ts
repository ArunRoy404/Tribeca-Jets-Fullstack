import { z } from 'zod';

/**
 * Single source of truth for every environment variable the API reads.
 *
 * The schema is applied at boot (see `AppModule`), so a missing or malformed
 * variable fails fast with a readable message instead of surfacing as an
 * undefined at runtime, three modules deep, in production.
 */

const bool = (def: boolean) =>
  z
    .enum(['true', 'false'])
    .default(def ? 'true' : 'false')
    .transform((v) => v === 'true');

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z
  .object({
    // ---- Runtime -----------------------------------------------------------
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().default('api'),

    /** Public origin of the Next.js app. Used for CORS + links in emails. */
    WEB_APP_URL: z.url().default('http://localhost:3000'),
    /** Public origin of this API. Used for absolute file URLs. */
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),

    // ---- Data --------------------------------------------------------------
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // ---- Auth --------------------------------------------------------------
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    /** Refresh lifetime when the user ticks "Remember me" on sign-in. */
    JWT_REFRESH_TTL_REMEMBERED: z.string().default('30d'),

    // ---- One-time codes ----------------------------------------------------
    TWO_FACTOR_CODE_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
    PASSWORD_RESET_CODE_TTL_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
    /** Window to choose a new password after the reset code is verified. */
    PASSWORD_RESET_WINDOW_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
    /** Wrong guesses before a code is burned. */
    VERIFICATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),

    // ---- Rate limiting -----------------------------------------------------
    /**
     * Multiplies every `@RateLimit` allowance. Defaults to 1, so production
     * behaviour is exactly what the decorators declare.
     *
     * Exists because the per-route limits are tuned for real users and are far
     * too tight for an end-to-end API run: the Postman collection signs in
     * eight times, against a login limit of five per fifteen minutes, so a
     * full pass could never succeed. Raise it locally rather than loosening
     * the limits themselves, which would weaken production.
     *
     * Refused above 1 in production — see the superRefine below.
     */
    RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
    /** Turns rate limiting off entirely. Never permitted in production. */
    RATE_LIMIT_ENABLED: bool(true),

    /**
     * Leave empty in development (host-only cookie on localhost).
     * In production set to `.tribecajetscommandcenter.com` so the cookie is
     * shared between the web app and the `api.` subdomain.
     */
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: bool(false),
    /** Extra origins allowed through CORS, comma separated. */
    CORS_ORIGINS: csv,

    // ---- Storage -----------------------------------------------------------
    /**
     * `auto` (default) picks the S3 driver when S3 credentials are present and
     * silently falls back to local disk on the VPS when they are not.
     */
    STORAGE_DRIVER: z.enum(['auto', 's3', 'local']).default('auto'),
    STORAGE_LOCAL_PATH: z.string().default('./storage'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    /** Optional CDN / public base URL that fronts the bucket. */
    S3_PUBLIC_URL: z.string().optional(),

    // ---- Mail --------------------------------------------------------------
    /** `auto` uses SMTP when credentials are present, else logs in development. */
    MAIL_DRIVER: z.enum(['auto', 'smtp', 'log']).default('auto'),
    MAIL_FROM: z.string().default('Tribeca Jets <no-reply@tribecajets.com>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    // ---- Integrations (all optional; features degrade gracefully) ----------
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  })
  .superRefine((env, ctx) => {
    // A production deployment must never fall back to insecure cookies.
    if (env.NODE_ENV === 'production' && !env.RATE_LIMIT_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['RATE_LIMIT_ENABLED'],
        message:
          'Rate limiting cannot be disabled in production. It is the only thing standing between the login route and a credential-stuffing run.',
      });
    }

    if (env.NODE_ENV === 'production' && env.RATE_LIMIT_MULTIPLIER !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['RATE_LIMIT_MULTIPLIER'],
        message:
          'RATE_LIMIT_MULTIPLIER is a development convenience and must stay 1 in production.',
      });
    }

    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production (cookies are the session).',
      });
    }

    if (env.MAIL_DRIVER === 'smtp') {
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when MAIL_DRIVER=smtp`,
          });
        }
      }
    }

    // Fail loudly rather than silently writing client passports to local disk
    // because one of four S3 variables was fat-fingered.
    if (env.STORAGE_DRIVER === 's3') {
      for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return parsed.data;
}
