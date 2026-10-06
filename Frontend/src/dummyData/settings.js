/**
 * Placeholder values for the Settings screens until the Settings API (#26)
 * exists. Deleted in the same pass that wires them to it.
 */

export const companySettings = {
  companyName: "Tribeca Jets",
  primaryEmail: "fly@tribecajets.com",
  website: "www.tribecajets.com",
  phone: "",
  businessAddress: "New York, NY",
  clientServicesLabel: "Tribeca Jets Client Services",
  logoUrl: "",
  showContactBlock: true,
  useLogoOnDocuments: true,
  showBrokerContact: true,
};

export const quoteDefaults = {
  defaultMarkup: "15",
  quoteValidityHours: "24",
  defaultFetPercent: "7.5",
  applyFetByDefault: true,
  followUpIntervalDays: "3",
  defaultLeadStage: "NEW",
  quoteTerms:
    "All charter quotes are subject to aircraft availability, operator confirmation, cancellation policy, FET where applicable, and final client acceptance.",
};

export const securitySettings = {
  idleTimeoutMinutes: "10",
  idleWarningMinutes: "1",
  showIdleWarning: true,
  requireAdminTwoFactor: true,
};

export const notificationSettings = {
  emailNotifications: true,
  inAppNotifications: true,
  flightAlertsToBrokers: true,
  followUpReminders: true,
  paymentReminders: true,
  quoteExpiryReminders: true,
  quoteExpiryWarningHours: "4",
  paymentReminderDays: "1",
  followUpReminderMinutes: "0",
};

export const dataSettings = {
  importType: "CLIENTS",
  exportScope: "ALL",
  exportFrom: "2026-01-01",
  exportTo: "2026-12-31",
};
