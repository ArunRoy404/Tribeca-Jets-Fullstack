import { z } from 'zod';

/**
 * A column that stores an uploaded file, as the uploads surface returned it.
 *
 * `POST /uploads/image` and `/uploads/document` answer with a *relative* URL,
 * `/api/uploads/<id>`, and that exact string is what a record stores. Two
 * things this refuses, both of which a bare `z.string()` let through:
 *
 * - **An absolute URL.** One captured at upload time embeds whatever host
 *   issued it, so every row written in development points at localhost for
 *   ever, and a domain change strands every file already stored.
 * - **Somewhere else entirely.** `https://anywhere/picture.png` on a quote is
 *   an image this API never sniffed, served to the desk from a host nobody
 *   chose — and the frontend's image loader passes an absolute URL straight
 *   through.
 *
 * Every column holding an upload uses this, so the rule is written once.
 */
export const uploadUrl = z
  .string()
  .trim()
  .regex(
    /^\/api\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Use the URL the upload returned, like /api/uploads/<id>',
  );
