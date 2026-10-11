import { request, requestWithMeta } from "@/lib/axios";
import { uploadUrl } from "@/services/uploads.service";

/**
 * Thin wrappers around the API's `/reports` endpoints (#23). `from` and `to`
 * are YYYY-MM-DD, both days included.
 */
export const reportsService = {
  /** GET /reports/summary — the tiles and the financial summary for the window. */
  summary: (params) => request({ url: "/reports/summary", method: "GET", params }),

  /** GET /reports/series — revenue, profit and trips per WEEK, MONTH or YEAR around `on`. */
  series: (params) => request({ url: "/reports/series", method: "GET", params }),

  /** GET /reports/brokers — broker performance, largest revenue first. */
  brokers: (params) => requestWithMeta({ url: "/reports/brokers", method: "GET", params }),

  /** GET /reports/clients — top clients by revenue. */
  clients: (params) => requestWithMeta({ url: "/reports/clients", method: "GET", params }),

  /** GET /reports/routes — top routes by revenue. */
  routes: (params) => requestWithMeta({ url: "/reports/routes", method: "GET", params }),
};

/**
 * The address of an operations export — CSV or XLSX, over `from`–`to`, or
 * everything when both are omitted.
 *
 * A link the browser follows, not an XHR: the file downloads with the
 * session cookie attached, the same way every stored file in this app does,
 * and nothing has to hold a whole spreadsheet in memory to save it.
 */
export function reportExportUrl({ from, to, format }) {
  const params = new URLSearchParams({ format });
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return uploadUrl(`/api/reports/export?${params.toString()}`);
}
