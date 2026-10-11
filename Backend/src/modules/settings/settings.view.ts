import type { LeadStage } from '../../generated/prisma/enums.js';
import { uploadIdFrom } from '../../common/dto/uploads.js';

/**
 * The shapes the settings row is read in, as pure functions so the rules —
 * above all "what the public branding may show" — are tested without a
 * server.
 */

/** The row as the service reads it (Decimals already turned into numbers). */
export interface SettingsRow {
  companyName: string;
  companyEmail: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  clientServicesLabel: string | null;
  logoUrl: string | null;
  showContactBlock: boolean;
  logoOnDocuments: boolean;
  showBrokerContact: boolean;
  defaultMarkupPercent: number;
  quoteValidityHours: number;
  defaultFetPercent: number;
  applyFetByDefault: boolean;
  followUpIntervalDays: number;
  defaultLeadStage: LeadStage;
  defaultQuoteTerms: string | null;
  idleTimeoutMinutes: number;
  idleWarningMinutes: number;
  showIdleWarning: boolean;
  requireAdminTwoFactor: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  flightAlertsToBrokers: boolean;
  followUpReminders: boolean;
  paymentReminders: boolean;
  quoteExpiryReminders: boolean;
  quoteExpiryWarningHours: number;
  paymentReminderDays: number;
  followUpReminderMinutes: number;
  updatedAt: Date;
}

/** Which keys belong to which Settings screen — the API's sections. */
export const SECTIONS = {
  company: [
    'companyName', 'companyEmail', 'website', 'phone', 'address', 'clientServicesLabel',
    'logoUrl', 'showContactBlock', 'logoOnDocuments', 'showBrokerContact',
  ],
  defaults: [
    'defaultMarkupPercent', 'quoteValidityHours', 'defaultFetPercent', 'applyFetByDefault',
    'followUpIntervalDays', 'defaultLeadStage', 'defaultQuoteTerms',
  ],
  security: ['idleTimeoutMinutes', 'idleWarningMinutes', 'showIdleWarning', 'requireAdminTwoFactor'],
  notifications: [
    'emailNotifications', 'inAppNotifications', 'flightAlertsToBrokers', 'followUpReminders',
    'paymentReminders', 'quoteExpiryReminders', 'quoteExpiryWarningHours', 'paymentReminderDays',
    'followUpReminderMinutes',
  ],
} as const satisfies Record<string, readonly (keyof SettingsRow)[]>;

type Section = keyof typeof SECTIONS;

const pick = <K extends keyof SettingsRow>(row: SettingsRow, keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, row[key]])) as Pick<SettingsRow, K>;

/** `GET /settings`: one object per screen, the shape `PATCH` accepts. */
export function settingsView(row: SettingsRow) {
  return {
    company: pick(row, SECTIONS.company),
    defaults: pick(row, SECTIONS.defaults),
    security: pick(row, SECTIONS.security),
    notifications: pick(row, SECTIONS.notifications),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** The public address of the logo, versioned by its upload so a new logo is a new URL. */
export const LOGO_PATH = '/api/settings/branding/logo';

/**
 * `GET /settings/branding` — read with no session, by the sign-in page and
 * every sidebar, so it carries only what the company shows the world.
 *
 * - **Name and logo always** — the app is branded whatever the toggles say.
 *   The logo is the public route, never the upload URL: an upload needs a
 *   session, and the sign-in page has none.
 * - **Contact details only with `showContactBlock`.** Off means absent, not
 *   empty, so nothing renders a blank "Email:" line.
 * - **The document toggles**, so a letterhead or PDF can follow them without
 *   a second call. They are switches, not data.
 *
 * Nothing else: no defaults, no security policy, no notification settings.
 */
export function brandingView(row: SettingsRow) {
  const logoId = uploadIdFrom(row.logoUrl);
  return {
    companyName: row.companyName,
    logoUrl: logoId ? `${LOGO_PATH}?v=${logoId}` : null,
    contact: row.showContactBlock
      ? {
          email: row.companyEmail,
          website: row.website,
          phone: row.phone,
          address: row.address,
          clientServicesLabel: row.clientServicesLabel,
        }
      : null,
    documents: {
      showContactBlock: row.showContactBlock,
      showLogo: row.logoOnDocuments,
      showBrokerContact: row.showBrokerContact,
    },
  };
}

/**
 * What a save changed, as `{ field: { from, to } }` — the audit entry's
 * metadata. Unchanged fields are left out, so "saved with nothing changed"
 * reads as exactly that.
 */
export function settingsDiff(
  before: SettingsRow,
  changes: Partial<Record<Section, Partial<SettingsRow>>>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const section of Object.keys(changes) as Section[]) {
    for (const [key, to] of Object.entries(changes[section] ?? {})) {
      if (to === undefined) continue;
      const from = before[key as keyof SettingsRow];
      if (from !== to) diff[key] = { from, to };
    }
  }
  return diff;
}
