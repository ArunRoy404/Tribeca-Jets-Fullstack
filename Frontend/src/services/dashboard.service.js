import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/dashboard` endpoints (#24). The rest of
 * the overview — upcoming trips, follow-ups, open invoices and operator
 * bills — reads the owning modules' own list endpoints through their hooks.
 */
export const dashboardService = {
  /** GET /dashboard/summary — the tiles for `period` (TODAY | WEEK | MONTH | QUARTER | YEAR) around `on`. */
  summary: (params) => request({ url: "/dashboard/summary", method: "GET", params }),

  /** GET /dashboard/priorities — follow-ups, tasks and bills due, most overdue first. */
  priorities: (params) => requestWithMeta({ url: "/dashboard/priorities", method: "GET", params }),

  /** GET /dashboard/activity — the audit trail the caller may read, newest first. */
  activity: (params) => requestWithMeta({ url: "/dashboard/activity", method: "GET", params }),
};
