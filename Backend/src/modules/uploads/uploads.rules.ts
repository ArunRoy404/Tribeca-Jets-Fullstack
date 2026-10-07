import { UploadKind } from '../../generated/prisma/enums.js';

/**
 * What each upload route accepts, and where its files live.
 *
 * Two kinds, not a list of purposes. "Image" and "document" describe what a
 * file *is*; "tax form", "id proof" and "brochure" describe what it is *for*,
 * and belong to the record that stores the URL. Encoding purpose here is what
 * put the previous design behind a migration every time a screen gained an
 * upload button.
 */
export interface UploadKindRule {
  /** Folder under the storage root. The client asked for these by name. */
  folder: string;

  /**
   * Accepted content types, matched against the bytes rather than the
   * multipart header.
   */
  accept: readonly string[];

  /** Ceiling for one file, in bytes. */
  maxBytes: number;

  /** Used in error messages, so a rejection names what was expected. */
  label: string;

  /** Extension written into the storage key, per accepted content type. */
  extensions: Readonly<Record<string, string>>;

  /**
   * Whether a file the sniffer does not recognise is still taken, stored as
   * opaque bytes (`application/octet-stream`). Documents only — see
   * `storedContentType`.
   */
  acceptsAnyFile: boolean;
}

/** What an unrecognised document is stored and served as. */
export const OPAQUE_CONTENT_TYPE = 'application/octet-stream';

const MB = 1024 * 1024;

/**
 * SVG is absent deliberately, and it is the one exclusion worth stating twice:
 * an SVG is a document that executes script, so serving one from the API's own
 * origin is stored XSS wearing an image's clothes.
 */
const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  // Added 7 Oct 2026 for the company logo; every modern browser renders it.
  'image/avif': '.avif',
} as const;

/**
 * Legacy `.doc` and `.xls` are absent on purpose. Both are OLE2 compound files
 * and are byte-identical at the header, so nothing can tell one from the other
 * without trusting the sender's declared type — which is the exact thing
 * reading the bytes exists to avoid. They are also the macro-bearing formats,
 * and Word and Excel have written the modern equivalents by default since 2007.
 *
 * Archives are absent for a different reason: a zip carries its contents past
 * whatever checked the outer file.
 */
// What follows describes the *recognised* document types — the ones kept as
// their own type. Anything else is still accepted as opaque bytes
// (`storedContentType`).
const DOCUMENT_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',
} as const;

export const UPLOAD_KIND_RULES: Record<UploadKind, UploadKindRule> = {
  [UploadKind.IMAGE]: {
    folder: 'images',
    accept: Object.keys(IMAGE_EXTENSIONS),
    maxBytes: 15 * MB,
    label: 'an image',
    extensions: IMAGE_EXTENSIONS,
    // An image is rendered inline, so it must be one the sniffer proved.
    acceptsAnyFile: false,
  },
  [UploadKind.DOCUMENT]: {
    folder: 'documents',
    accept: Object.keys(DOCUMENT_EXTENSIONS),
    maxBytes: 25 * MB,
    label: 'a document',
    extensions: DOCUMENT_EXTENSIONS,
    acceptsAnyFile: true,
  },
};

/**
 * The content type a file is stored and later served under, or null to
 * refuse it.
 *
 * A recognised type keeps its own. **Since 6 Oct 2026 (owner's decision) a
 * document may be any file**: a scanned ID photo, a legacy `.xls`, a zip of
 * receipts. Anything the sniffer cannot place on the document list is stored
 * as `application/octet-stream` — never as what the sender claimed — so the
 * download route always sends it as an attachment, with `nosniff`. It is
 * saved to disk, never rendered by the browser on our origin, which is what
 * the old exclusions (SVG, HTML, archives, OLE2) protected against. What it
 * does not do is vouch for the file: opening a downloaded macro workbook is
 * the reader's machine's risk, as with any email attachment.
 */
export function storedContentType(rule: UploadKindRule, sniffed: string | null): string | null {
  if (sniffed && rule.accept.includes(sniffed)) return sniffed;
  return rule.acceptsAnyFile ? OPAQUE_CONTENT_TYPE : null;
}

/** The rule for a kind. Total by construction — every value has a row. */
export function ruleFor(kind: UploadKind): UploadKindRule {
  return UPLOAD_KIND_RULES[kind];
}

/**
 * The largest upload any route accepts.
 *
 * Multer needs one number before it knows which route it is feeding, so this is
 * the outer gate and the per-kind ceiling is enforced afterwards. Both are
 * needed: without this one, a 4 GB body is buffered before anybody checks it.
 */
export const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(UPLOAD_KIND_RULES).map((rule) => rule.maxBytes),
);

/** Human size, for the message a caller reads when their file is too big. */
export function formatBytes(bytes: number): string {
  const mb = bytes / MB;
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}

/**
 * Images render in the page; everything else downloads.
 *
 * This is the second half of `nosniff`: a PDF that is secretly HTML is stored
 * as `text/plain`, and an attachment disposition means the browser saves it
 * instead of executing it on the API's own origin with the session cookie
 * attached.
 *
 * Exported for the one other route that streams a stored file — a referral's
 * attachments (#11) — so both answer with the same header.
 */
export function contentDisposition(file: {
  contentType: string;
  filename: string;
}): string {
  const mode = file.contentType.startsWith('image/') ? 'inline' : 'attachment';
  // RFC 5987, so a filename with a space, a quote or an accent survives.
  return `${mode}; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
}
