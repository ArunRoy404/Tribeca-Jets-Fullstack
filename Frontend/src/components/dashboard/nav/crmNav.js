import { Module } from "@/lib/access";

/**
 * The CRM's sidebar, one entry per module.
 *
 * Each item names the permission module it opens, so the sidebar shows only
 * what the signed-in person may view, and `ModuleGate` refuses a page typed
 * straight into the address bar. The partner portal's menu
 * (`components/portal/portalNav.js`) carries no modules and is unfiltered.
 */

export const CRM_HOME = { label: "Dashboard", icon: "nav-dashboard", href: "/dashboard", module: Module.DASHBOARD };

export const CRM_SECTIONS = [
  {
    label: "Operations",
    items: [
      { label: "Trips", icon: "nav-trips", href: "/dashboard/trips", module: Module.TRIPS },
      { label: "Schedule", icon: "nav-schedule", href: "/dashboard/schedule", module: Module.SCHEDULE },
      { label: "Operators Sourcing", icon: "nav-operators-sourcing", href: "/dashboard/operator-sourcing", module: Module.OPERATOR_SOURCING },
      { label: "Flight Tracking", icon: "nav-flight-tracking", href: "/dashboard/flight-tracking", module: Module.FLIGHT_TRACKING },
      { label: "Itineraries", icon: "nav-itineraries", href: "/dashboard/itineraries", module: Module.ITINERARIES },
      { label: "Empty Legs", icon: "nav-empty-legs", href: "/dashboard/empty-legs", module: Module.EMPTY_LEGS },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      { label: "Clients", icon: "nav-clients", href: "/dashboard/clients", module: Module.CLIENTS },
      { label: "Leads & Agents", icon: "nav-leads-agents", href: "/dashboard/leads-agents", module: Module.LEADS_AGENTS },
      // Between leads and quotes because that is the order of the pipeline:
      // someone becomes a client, asks for something, and then gets a price.
      { label: "Trip Requests", icon: "nav-trips", href: "/dashboard/trip-requests", module: Module.TRIP_REQUESTS },
      // Where the partner portal's submissions arrive (#11). Beside trip
      // requests because converting one creates a trip request.
      { label: "Referrals", icon: "nav-leads-agents", href: "/dashboard/referrals", module: Module.REFERRALS },
      { label: "Quotes", icon: "nav-quotes", href: "/dashboard/quotes", module: Module.QUOTES },
      { label: "Email Templates", icon: "nav-email-templates", href: "/dashboard/email-templates", module: Module.EMAIL_TEMPLATES },
    ],
  },
  {
    label: "Database",
    items: [
      { label: "Operators", icon: "nav-operators-sourcing", href: "/dashboard/operators", module: Module.OPERATORS },
      { label: "Aircraft", icon: "nav-flight-tracking", href: "/dashboard/aircraft", module: Module.AIRCRAFT },
      { label: "Airports", icon: "nav-airports", href: "/dashboard/airports", module: Module.AIRPORTS },
      // Document Vault (#22) — no Figma icon was exported for it; the
      // itineraries document glyph is the nearest honest match.
      { label: "Document Vault", icon: "nav-itineraries", href: "/dashboard/documents", module: Module.DOCUMENTS },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Receivables", icon: "nav-receivables", href: "/dashboard/receivables", module: Module.RECEIVABLES },
      { label: "Operator Payments", icon: "nav-operator-payments", href: "/dashboard/operator-payments", module: Module.OPERATOR_PAYMENTS },
      { label: "Commissions", icon: "nav-commissions", href: "/dashboard/commissions", module: Module.COMMISSIONS },
      { label: "Transactions", icon: "nav-transactions", href: "/dashboard/transactions", module: Module.TRANSACTIONS },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", icon: "nav-reports", href: "/dashboard/reports", module: Module.REPORTS }],
  },
  {
    label: "System",
    items: [
      { label: "Tasks Board", icon: "nav-tasks-board", href: "/dashboard/tasks-board", module: Module.TASKS },
      { label: "Users & Roles", icon: "nav-users-roles", href: "/dashboard/users-roles", module: Module.USERS },
      { label: "Settings", icon: "nav-settings", href: "/dashboard/settings", module: Module.SETTINGS },
    ],
  },
];

const ITEMS = [CRM_HOME, ...CRM_SECTIONS.flatMap((section) => section.items)];

/** Where `proxy.js` sends a page the person's permissions leave out. */
export const NO_ACCESS_PATH = "/dashboard/no-access";

/** A module's screen name, for "No access to Settings". */
export function moduleLabel(module) {
  return ITEMS.find((item) => item.module === module)?.label ?? null;
}

/**
 * The module a CRM path belongs to, or null for a page every signed-in person
 * may open (My Account). Longest prefix wins, so `/dashboard/trips/123` is
 * Trips and `/dashboard` alone is the Dashboard.
 */
export function moduleForPath(pathname) {
  const path = String(pathname ?? "");
  const match = ITEMS.filter((item) =>
    item.href === CRM_HOME.href ? path === item.href : path === item.href || path.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.module ?? null;
}

/** The first page this person may open — where they land without a Dashboard. */
export function firstAllowedHref(canAccess) {
  return ITEMS.find((item) => canAccess(item.module))?.href ?? null;
}
