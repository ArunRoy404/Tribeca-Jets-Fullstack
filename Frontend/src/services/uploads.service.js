import { request, requestWithMeta } from "@/lib/axios";

/**
 * The one way a file gets into this system.
 *
 * Upload first, receive a URL, then store that URL on whatever record is being
 * edited. Nothing here knows what a file is *for* — which is what lets a
 * photograph be chosen on a create form, before the record it belongs to
 * exists.
 *
 * No toasts, no redirects, no cache writes; services only talk HTTP.
 */
export const uploadsService = {
  /**
   * GET /uploads
   *
   * `requestWithMeta` because paging is server-side. Pass `ownerUserId` to
   * open one person's folder — that filter is what makes a folder a query
   * rather than a second table.
   */
  list: (params) => requestWithMeta({ url: "/uploads", method: "GET", params }),

  /** GET /uploads/:id/meta — the record without its bytes. */
  meta: (id) => request({ url: `/uploads/${id}/meta`, method: "GET" }),

  /**
   * POST /uploads/image | /uploads/document
   *
   * `kind` picks the route rather than becoming a field, because the two
   * endpoints enforce different formats and different size ceilings.
   *
   * The Content-Type header is deliberately **not** set: the browser has to
   * write it itself so it can append the multipart boundary, and setting it by
   * hand produces a body the server cannot parse.
   */
  upload: ({ file, kind = "document", visibility, ownerUserId, label, onProgress }) => {
    const body = new FormData();
    body.append("file", file);
    // Omitted rather than sent empty: the API's default is PRIVATE, and an
    // empty string is not a valid enum value.
    if (visibility) body.append("visibility", visibility);
    if (ownerUserId) body.append("ownerUserId", ownerUserId);
    if (label) body.append("label", label);

    return request({
      url: `/uploads/${kind}`,
      method: "POST",
      data: body,
      // The shared instance defaults to application/json. Left in place, axios
      // keeps it and the server receives a body it cannot parse — multipart
      // needs a boundary, and only the browser can write one. Undefined makes
      // axios compute the header from the FormData itself.
      headers: { "Content-Type": undefined },
      onUploadProgress: onProgress
        ? (event) =>
            onProgress(
              event?.total ? Math.round((event.loaded * 100) / event.total) : 0,
            )
        : undefined,
    });
  },

  /** DELETE /uploads/:id — archives the record; the bytes stay in storage. */
  remove: (id) => request({ url: `/uploads/${id}`, method: "DELETE" }),

  /** POST /uploads/:id/restore — clears the deletion stamp, nothing else. */
  restore: (id) => request({ url: `/uploads/${id}/restore`, method: "POST" }),
};

/**
 * The absolute address of a stored file.
 *
 * The API returns a **relative** URL on purpose — an absolute one would embed
 * whatever host was running at upload time, so every row written in
 * development would point at localhost for ever. This is where it becomes
 * loadable, at render time, from whatever base this build is actually talking
 * to.
 */
export function uploadUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  // The API's URLs already carry the `/api` prefix, and so does the base when
  // one is configured — joining both would produce `/api/api/uploads/…`.
  const root = base.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${root}${url}`;
}
