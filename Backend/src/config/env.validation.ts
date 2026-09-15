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

    // ---- Integrations (all optional; features degrade gracefully) ----------
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  })
  .superRefine((env, ctx) => {
    // A production deployment must never fall back to insecure cookies.
    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production (cookies are the session).',
      });
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
