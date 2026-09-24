import { request, requestWithMeta } from "@/lib/axios";

/**
 * Dated entries on a record's timeline.
 *
 * Every call names its subject — `subjectType` and `subjectId` — because a
 * note is only meaningful beside the record it is about. There is no "all
 * notes" endpoint to call.
 *
 * No toasts, no redirects, no cache writes; services only talk HTTP.
 */
export const notesService = {
  /**
   * GET /notes/timeline
   *
   * The reading view: what people wrote and what the system recorded, merged
   * newest-first. Each row carries `kind` — `NOTE` or `EVENT`.
   */
  timeline: (params) =>
    requestWithMeta({ url: "/notes/timeline", method: "GET", params }),

  /**
   * GET /notes
   *
   * The editable half alone, without the audit entries. `archived: true` is
   * the withdrawn half.
   */
  list: (params) => requestWithMeta({ url: "/notes", method: "GET", params }),

  /** POST /notes */
  create: (body) => request({ url: "/notes", method: "POST", data: body }),

  /** PATCH /notes/:id — the author only, including for administrators. */
  update: ({ id, ...body }) =>
    request({ url: `/notes/${id}`, method: "PATCH", data: body }),

  /** DELETE /notes/:id — takes it off the timeline; nothing is destroyed. */
  remove: (id) => request({ url: `/notes/${id}`, method: "DELETE" }),

  /** POST /notes/:id/restore — clears the deletion stamp, nothing else. */
  restore: (id) => request({ url: `/notes/${id}/restore`, method: "POST" }),
};
