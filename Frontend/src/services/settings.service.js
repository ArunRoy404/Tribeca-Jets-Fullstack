import { request } from "@/lib/axios";
import { uploadUrl } from "@/services/uploads.service";

function buildImportFormData({ file, type, mapping }) {
  const body = new FormData();
  body.append("file", file);
  body.append("type", type);
  if (mapping && Object.keys(mapping).length > 0) {
    body.append("mapping", JSON.stringify(mapping));
  }
  return body;
}

/**
 * The company's settings (#26) — one set, for the whole company.
 *
 * No toasts, no redirects, no cache writes; services only talk HTTP.
 */
export const settingsService = {
  /** GET /settings — `{ company, defaults, security, rateLimits, notifications, updatedAt }`. */
  get: () => request({ url: "/settings", method: "GET" }),

  /** PATCH /settings — one or more sections, each with only the fields to change. */
  update: (body) => request({ url: "/settings", method: "PATCH", data: body }),

  /**
   * GET /settings/branding — public, no session needed. Name, logo address,
   * contact details when the company shows them, and the document toggles.
   */
  branding: () => request({ url: "/settings/branding", method: "GET" }),

  /** POST /settings/import/validate — parses a CSV/XLSX and previews valid, duplicate and invalid rows. */
  validateImport: ({ file, type, mapping }) =>
    request({
      url: "/settings/import/validate",
      method: "POST",
      data: buildImportFormData({ file, type, mapping }),
      headers: { "Content-Type": undefined },
    }),

  /** POST /settings/import/commit — imports all valid non-duplicate rows from the file. */
  commitImport: ({ file, type, mapping }) =>
    request({
      url: "/settings/import/commit",
      method: "POST",
      data: buildImportFormData({ file, type, mapping }),
      headers: { "Content-Type": undefined },
    }),
};

/**
 * The download URL for `GET /settings/export` (#31). Followed directly by the
 * browser so the httpOnly session cookie travels with the download.
 */
export function settingsExportUrl({ scope = "ALL", format = "XLSX", from, to, includeArchived = false }) {
  const params = new URLSearchParams({ scope, format });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (includeArchived) params.set("includeArchived", "true");
  return uploadUrl(`/api/settings/export?${params.toString()}`);
}
