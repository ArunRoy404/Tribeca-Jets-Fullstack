import { describe, expect, it } from 'vitest';
import { FailedSignInScope, LeadStage } from '../../generated/prisma/enums.js';
import { updateSettingsSchema } from './dto/settings.dto.js';
import { brandingView, settingsDiff, settingsView, type SettingsRow } from './settings.view.js';

const LOGO_ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';

const row: SettingsRow = {
  companyName: 'Tribeca Jets',
  companyEmail: 'fly@example.com',
  website: 'www.example.com',
  phone: '+1 212 555 0100',
  address: 'New York, NY',
  clientServicesLabel: 'Client Services',
  logoUrl: `/api/uploads/${LOGO_ID}`,
  showContactBlock: true,
  logoOnDocuments: true,
  showBrokerContact: false,
  defaultMarkupPercent: 15,
  quoteValidityHours: 24,
  defaultFetPercent: 7.5,
  applyFetByDefault: true,
  followUpIntervalDays: 3,
  defaultLeadStage: LeadStage.NEW,
  defaultQuoteTerms: 'Subject to availability.',
  idleLogoutEnabled: true,
  idleTimeoutMinutes: 10,
  idleWarningMinutes: 1,
  showIdleWarning: true,
  requireAdminTwoFactor: false,
  failedSignInLimit: 5,
  failedSignInWindowMinutes: 15,
  signInLockoutMinutes: 15,
  failedSignInScope: FailedSignInScope.ACCOUNT_AND_IP,
  codeSendLimit: 3,
  codeSendWindowMinutes: 15,
  codeAttemptLimit: 5,
  emailNotifications: true,
  inAppNotifications: true,
  flightAlertsToBrokers: true,
  followUpReminders: true,
  paymentReminders: true,
  quoteExpiryReminders: true,
  quoteExpiryWarningHours: 4,
  paymentReminderDays: 1,
  followUpReminderMinutes: 0,
  updatedAt: new Date('2026-10-07T12:00:00Z'),
};

describe('public branding', () => {
  it('always carries the name and the public logo address, never the upload URL', () => {
    const branding = brandingView(row);
    expect(branding.companyName).toBe('Tribeca Jets');
    expect(branding.logoUrl).toBe(`/api/settings/branding/logo?v=${LOGO_ID}`);
    expect(JSON.stringify(branding)).not.toContain('/api/uploads/');
  });

  it('has no logo address when none is set', () => {
    expect(brandingView({ ...row, logoUrl: null }).logoUrl).toBeNull();
  });

  it('shows contact details only while the contact block is on', () => {
    expect(brandingView(row).contact?.email).toBe('fly@example.com');
    expect(brandingView({ ...row, showContactBlock: false }).contact).toBeNull();
  });

  /** The public route is read with no session: nothing internal may leak. */
  it('carries nothing but branding', () => {
    const text = JSON.stringify(brandingView(row));
    for (const internal of ['idleTimeout', 'requireAdminTwoFactor', 'Markup', 'Fet', 'Reminder', 'Terms', 'SignIn', 'code']) {
      expect(text).not.toContain(internal);
    }
  });
});

describe('settings view', () => {
  it('groups the row by screen', () => {
    const view = settingsView(row);
    expect(Object.keys(view)).toEqual(['company', 'defaults', 'security', 'rateLimits', 'notifications', 'updatedAt']);
    expect(view.defaults.defaultFetPercent).toBe(7.5);
    expect(view.security).not.toHaveProperty('companyName');
  });
});

describe('the audit diff', () => {
  it('records only what moved', () => {
    expect(
      settingsDiff(row, { defaults: { defaultFetPercent: 7.5, quoteValidityHours: 48 } }),
    ).toEqual({ quoteValidityHours: { from: 24, to: 48 } });
  });

  it('is empty when a save changed nothing', () => {
    expect(settingsDiff(row, { company: { companyName: 'Tribeca Jets' } })).toEqual({});
  });
});

describe('PATCH /settings validation', () => {
  const ok = (body: unknown) => updateSettingsSchema.safeParse(body).success;

  it('accepts one section on its own', () => {
    expect(ok({ defaults: { quoteValidityHours: 48 } })).toBe(true);
  });

  it('refuses a value the screen has no option for', () => {
    expect(ok({ defaults: { quoteValidityHours: 36 } })).toBe(false);
    expect(ok({ security: { idleTimeoutMinutes: 7 } })).toBe(false);
  });

  it('refuses a misspelt key rather than ignoring it', () => {
    expect(ok({ defaults: { quoteValidity: 48 } })).toBe(false);
    expect(ok({ branding: {} })).toBe(false);
  });

  it('holds percentages to the column precision', () => {
    expect(ok({ defaults: { defaultFetPercent: 7.5 } })).toBe(true);
    expect(ok({ defaults: { defaultFetPercent: 7.5125 } })).toBe(false);
    expect(ok({ defaults: { defaultMarkupPercent: 101 } })).toBe(false);
  });

  it('turns an emptied text box into a clear, not an empty string', () => {
    const parsed = updateSettingsSchema.parse({ company: { phone: '', companyEmail: '' } });
    expect(parsed.company).toEqual({ phone: null, companyEmail: null });
  });

  it('keeps an absent field absent — saving one screen never resets another', () => {
    const parsed = updateSettingsSchema.parse({ company: { companyName: 'Tribeca Jets' } });
    expect(parsed).toEqual({ company: { companyName: 'Tribeca Jets' } });
  });

  it('only stores a logo as an upload URL', () => {
    expect(ok({ company: { logoUrl: `/api/uploads/${LOGO_ID}` } })).toBe(true);
    expect(ok({ company: { logoUrl: 'https://elsewhere.example.com/logo.png' } })).toBe(false);
  });

  it('wants the idle warning before the timeout', () => {
    expect(ok({ security: { idleTimeoutMinutes: 5, idleWarningMinutes: 5 } })).toBe(false);
  });

  it('switches automatic logout off and on, and only with a true/false', () => {
    expect(ok({ security: { idleLogoutEnabled: false } })).toBe(true);
    expect(ok({ security: { idleLogoutEnabled: true } })).toBe(true);
    expect(ok({ security: { idleLogoutEnabled: 'off' } })).toBe(false);
  });

  it('shows the switch on the security screen, never in the public branding', () => {
    expect(settingsView(row).security).toHaveProperty('idleLogoutEnabled', true);
    expect(brandingView(row)).not.toHaveProperty('idleLogoutEnabled');
  });

  it('takes a rate limit as an offered number or null — the screen\'s "Never"', () => {
    expect(ok({ rateLimits: { failedSignInLimit: 10, codeSendLimit: null, codeAttemptLimit: null } })).toBe(true);
    expect(ok({ rateLimits: { failedSignInLimit: 7 } })).toBe(false);
    expect(ok({ rateLimits: { failedSignInLimit: 0 } })).toBe(false);
    // A window or a pause has no "Never" — only a limit does.
    expect(ok({ rateLimits: { signInLockoutMinutes: null } })).toBe(false);
    expect(ok({ rateLimits: { signInLockoutMinutes: 1440, failedSignInWindowMinutes: 60 } })).toBe(true);
  });

  it('counts failures only by the three offered scopes', () => {
    expect(ok({ rateLimits: { failedSignInScope: 'ACCOUNT' } })).toBe(true);
    expect(ok({ rateLimits: { failedSignInScope: 'EVERYONE' } })).toBe(false);
  });

  it('records "Never" in the audit diff as null', () => {
    expect(settingsDiff(row, { rateLimits: { failedSignInLimit: null } })).toEqual({
      failedSignInLimit: { from: 5, to: null },
    });
  });
});
