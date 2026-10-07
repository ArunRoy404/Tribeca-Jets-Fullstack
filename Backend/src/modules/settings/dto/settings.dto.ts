import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { LeadStage } from '../../../generated/prisma/enums.js';
import {
  FOLLOW_UP_INTERVAL_DAYS,
  FOLLOW_UP_REMINDER_MINUTES,
  IDLE_TIMEOUT_MINUTES,
  IDLE_WARNING_MINUTES,
  PAYMENT_REMINDER_DAYS,
  QUOTE_EXPIRY_WARNING_HOURS,
  QUOTE_VALIDITY_HOURS,
} from '../settings.options.js';

/**
 * `PATCH /settings` — one key per Settings screen, each optional, so a
 * screen's Save sends its own section and nothing else.
 *
 * Every field is `.optional()` with **no default** (AGENTS.md: never build an
 * update schema with `.partial()` or defaults — an absent field must stay
 * absent, or saving one screen would reset another). Text that may be
 * cleared is `.nullable()`; an empty box arrives as `null`. Each section is
 * `.strict()`: a misspelt key is a 400, not a save that quietly did nothing.
 */

/** One of a fixed set of numbers; the message lists them. */
const oneOf = (values: readonly number[], what: string) =>
  z
    .number({ error: `${what} must be a number` })
    .refine((value) => values.includes(value), {
      message: `${what} must be one of ${values.join(', ')}`,
    });

/** A percentage with at most `places` decimals — the column's precision. */
const percent = (what: string, places: number) =>
  z
    .number({ error: `${what} must be a number` })
    .min(0, `${what} cannot be negative`)
    .max(100, `${what} cannot be more than 100`)
    .refine((value) => (String(value).split('.')[1]?.length ?? 0) <= places, {
      message: `${what} takes at most ${places} decimal places`,
    });

/** Optional text that an empty box clears. */
const clearableText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null).nullable().optional();

const companySchema = z
  .object({
    companyName: z.string().trim().min(1, 'The company needs a name').max(120).optional(),
    companyEmail: z
      .union([z.email('Enter a valid email address'), z.literal('')])
      .transform((value) => value || null)
      .nullable()
      .optional(),
    website: clearableText(200),
    phone: clearableText(40),
    address: clearableText(300),
    clientServicesLabel: clearableText(120),
    logoUrl: uploadUrl.nullable().optional(),
    showContactBlock: z.boolean().optional(),
    logoOnDocuments: z.boolean().optional(),
    showBrokerContact: z.boolean().optional(),
  })
  .strict();

const defaultsSchema = z
  .object({
    defaultMarkupPercent: percent('Default markup', 2).optional(),
    quoteValidityHours: oneOf(QUOTE_VALIDITY_HOURS, 'Quote validity').optional(),
    defaultFetPercent: percent('Default FET', 3).optional(),
    applyFetByDefault: z.boolean().optional(),
    followUpIntervalDays: oneOf(FOLLOW_UP_INTERVAL_DAYS, 'Follow-up interval').optional(),
    defaultLeadStage: z.enum(LeadStage).optional(),
    defaultQuoteTerms: clearableText(5000),
  })
  .strict();

const securitySchema = z
  .object({
    idleTimeoutMinutes: oneOf(IDLE_TIMEOUT_MINUTES, 'Inactivity timeout').optional(),
    idleWarningMinutes: oneOf(IDLE_WARNING_MINUTES, 'Warning before logout').optional(),
    showIdleWarning: z.boolean().optional(),
    requireAdminTwoFactor: z.boolean().optional(),
  })
  .strict();

const notificationsSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    flightAlertsToBrokers: z.boolean().optional(),
    followUpReminders: z.boolean().optional(),
    paymentReminders: z.boolean().optional(),
    quoteExpiryReminders: z.boolean().optional(),
    quoteExpiryWarningHours: oneOf(QUOTE_EXPIRY_WARNING_HOURS, 'Quote expiration warning').optional(),
    paymentReminderDays: oneOf(PAYMENT_REMINDER_DAYS, 'Payment reminder').optional(),
    followUpReminderMinutes: oneOf(FOLLOW_UP_REMINDER_MINUTES, 'Follow-up reminder').optional(),
  })
  .strict();

export const updateSettingsSchema = z
  .object({
    company: companySchema.optional(),
    defaults: defaultsSchema.optional(),
    security: securitySchema.optional(),
    notifications: notificationsSchema.optional(),
  })
  .strict()
  .refine(
    (body) =>
      (body.security?.idleWarningMinutes ?? 0) < (body.security?.idleTimeoutMinutes ?? Infinity),
    { message: 'The warning must come before the timeout', path: ['security', 'idleWarningMinutes'] },
  );

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
