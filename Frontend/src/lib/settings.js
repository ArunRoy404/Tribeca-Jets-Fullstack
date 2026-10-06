import { toastInfo } from "@/lib/toast";

/**
 * The Settings sections, in the order the left-hand nav lists them.
 *
 * Six, not the eight the Figma file draws. "Overview" repeated the nav and
 * the other tabs' toggles, and "Backup & Retention" configured things the
 * server already does outside the app — its one true fact is shown as a
 * read-only line under Data Import & Export. What was dropped, and why, is
 * logged in docs/MODULE_FEATURE_STATUS.md (Settings).
 */
export const SETTINGS_SECTIONS = [
  {
    id: "company",
    label: "Company & Branding",
    description: "Company profile, logo and document identity",
    title: "Company & Branding",
    subtitle:
      "Control company identity, contact information and how Tribeca Jets appears in client-facing documents.",
  },
  {
    id: "defaults",
    label: "CRM & Quote Defaults",
    description: "Pricing, FET and workflow defaults",
    title: "CRM & Quote Defaults",
    subtitle: "Set pricing, tax, quote, trip and client workflow defaults used by brokers.",
  },
  {
    id: "security",
    label: "Security & Session",
    description: "2FA, inactivity logout and sessions",
    title: "Security & Session",
    subtitle: "Configure account protection, inactivity logout and signed-in sessions.",
  },
  {
    id: "notifications",
    label: "Notifications & Automation",
    description: "Alerts, reminders and automation",
    title: "Notifications & Automation",
    subtitle: "Control alerts, reminders, automated messages and who receives them.",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Quick links to the desk's other tools",
    title: "Integrations",
    subtitle: "Quick links to the sourcing, signing and website tools the desk works alongside.",
  },
  {
    id: "data",
    label: "Data Import & Export",
    description: "CRM migration, exports and backups",
    title: "Data Import & Export",
    subtitle:
      "Import legacy CRM data safely and create annual or historical exports without losing record history.",
  },
];

export const SETTINGS_SECTION_IDS = SETTINGS_SECTIONS.map((section) => section.id);
export const DEFAULT_SETTINGS_SECTION = SETTINGS_SECTION_IDS[0];

export const sectionById = (id) =>
  SETTINGS_SECTIONS.find((section) => section.id === id) ?? SETTINGS_SECTIONS[0];

/** Markup presets offered beside the default markup field, in percent. */
export const MARKUP_PRESETS = [10, 15, 20, 25];

export const QUOTE_VALIDITY_OPTIONS = [
  { value: "12", label: "12 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
  { value: "168", label: "7 days" },
];

export const FOLLOW_UP_INTERVAL_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
];

export const IDLE_TIMEOUT_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
];

export const IDLE_WARNING_OPTIONS = [
  { value: "1", label: "1 minute" },
  { value: "2", label: "2 minutes" },
  { value: "5", label: "5 minutes" },
];

export const QUOTE_EXPIRY_WARNING_OPTIONS = [
  { value: "1", label: "1 hour before" },
  { value: "2", label: "2 hours before" },
  { value: "4", label: "4 hours before" },
  { value: "12", label: "12 hours before" },
  { value: "24", label: "24 hours before" },
];

export const PAYMENT_REMINDER_OPTIONS = [
  { value: "0", label: "On the due date" },
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before" },
  { value: "7", label: "7 days before" },
];

export const FOLLOW_UP_REMINDER_OPTIONS = [
  { value: "0", label: "At due time" },
  { value: "15", label: "15 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

/** What an import can create. Each maps onto an existing module's records. */
export const IMPORT_TYPES = [
  { value: "CLIENTS", label: "Clients" },
  { value: "OPERATORS", label: "Operators" },
  { value: "AIRCRAFT", label: "Aircraft" },
  { value: "AIRPORTS", label: "Airports" },
];

export const EXPORT_SCOPES = [
  { value: "ALL", label: "All CRM Records" },
  { value: "CLIENTS", label: "Clients" },
  { value: "TRIPS", label: "Trips" },
  { value: "QUOTES", label: "Quotes" },
  { value: "RECEIVABLES", label: "Receivables" },
  { value: "OPERATOR_PAYMENTS", label: "Operator Payments" },
  { value: "COMMISSIONS", label: "Commissions" },
];

/**
 * Legacy `.xls` is refused by the upload rules (it is OLE2, byte-identical to
 * `.doc` and macro-bearing), so an import takes the modern formats only.
 */
export const IMPORT_ACCEPT = ".csv,.xlsx";
export const IMPORT_MAX_MB = 25;

/** The destination fields a source column can map onto, per import type. */
export const IMPORT_TARGET_FIELDS = {
  CLIENTS: ["Client Name", "Primary Email", "Primary Phone", "Lead Source", "Preferred Airports"],
  OPERATORS: ["Operator Name", "Email", "Phone", "Certification", "Base Airport"],
  AIRCRAFT: ["Tail Number", "Model", "Category", "Seats", "Operator"],
  AIRPORTS: ["ICAO", "IATA", "Name", "City", "Country"],
};

/**
 * The backup schedule the server runs (docs/DEPLOYMENT-VPS.md). A fact about
 * the deployment, not a setting — so it is stated, never offered as a control.
 */
export const BACKUP_POLICY = "Daily at 03:00 UTC to Cloudflare R2, kept for 30 days.";

/** Quick links the Integrations tab opens in a new tab. */
export const QUICK_LINKS = [
  {
    id: "avinode",
    name: "Avinode",
    description: "Quick link and sourcing workflow handoff.",
    href: "https://marketplace.avinode.com",
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Quick link for signed charter documents and agreements.",
    href: "https://app.docusign.com",
  },
  {
    id: "website",
    name: "TribecaJets.com",
    description: "The public website, for checking what clients see.",
    href: "https://www.tribecajets.com",
  },
];

/**
 * Said on every Save until the Settings API (#26) exists. The values change
 * on this screen only, and the toast says exactly that rather than reporting
 * a save the server never received.
 */
export function announceLocalSave(what) {
  toastInfo(`${what} updated on this screen`, "Not stored on the server yet — that arrives with the Settings API.");
}
