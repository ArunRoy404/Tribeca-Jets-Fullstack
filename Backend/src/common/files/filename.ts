/**
 * The name a stored file keeps, made safe to store and to show.
 *
 * Three things go wrong with the name a multipart upload arrives with, and all
 * three were live in Uploads until 7 Oct 2026:
 *
 * - **Accents arrive garbled.** Multer (busboy) decodes the `filename`
 *   parameter as latin1, while every browser sends UTF-8. "Résumé.pdf" was
 *   stored as "RÃ©sumÃ©.pdf" and shown that way in every folder and download.
 * - **A long name 500s.** `uploads.filename` is `VarChar(255)`, so a 300-
 *   character name failed the insert with a bare "Database error" after the
 *   bytes were already written.
 * - **A name is the sender's text.** Some clients send a path
 *   (`C:\fakepath\x.pdf`), and control characters break a
 *   `Content-Disposition` header.
 *
 * The name is only ever a label: the storage key is the content hash, so
 * nothing here can reach the disk.
 */

/** The column width: `uploads.filename` is `VarChar(255)`. */
export const MAX_FILENAME_LENGTH = 255;

/** Longest extension worth keeping intact when a name is shortened. */
const MAX_EXTENSION_LENGTH = 16;

/** What a file with no usable name is called. */
const FALLBACK = 'file';

/**
 * Re-reads a latin1-decoded name as UTF-8 — but only when that is what it was.
 *
 * A name that really is latin1 (a client that sent no UTF-8) does not
 * survive the round trip as valid UTF-8, and is kept exactly as received.
 * Plain ASCII is identical either way.
 */
function decodeUtf8(raw: string): string {
  // Characters above U+00FF mean it was not latin1-decoded in the first place.
  if (Array.from(raw).some((char) => char.codePointAt(0)! > 0xff)) return raw;
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? raw : decoded;
}

/** Shortens to `max` characters without splitting the extension or a surrogate pair. */
function shorten(name: string, max: number): string {
  const chars = Array.from(name);
  if (chars.length <= max) return name;

  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? Array.from(name.slice(dot)) : [];
  if (extension.length === 0 || extension.length > MAX_EXTENSION_LENGTH) {
    return chars.slice(0, max).join('').trimEnd();
  }
  const stem = chars.slice(0, chars.length - extension.length);
  return stem.slice(0, max - extension.length).join('').trimEnd() + extension.join('');
}

/** The cleaned, displayable, storable name for an uploaded file. */
export function cleanFilename(raw: string | undefined | null): string {
  const decoded = decodeUtf8(raw ?? '');
  // The last path segment, whichever separator the client used.
  const base = decoded.split(/[\\/]/).pop() ?? '';
  const name = base
    // Control characters (including CR/LF, which would split a header).
    // oxlint-disable-next-line no-control-regex -- matching them is the point
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return shorten(name || FALLBACK, MAX_FILENAME_LENGTH);
}
