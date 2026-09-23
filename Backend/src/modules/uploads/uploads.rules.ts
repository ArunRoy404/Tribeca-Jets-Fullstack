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
}

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
  },
  [UploadKind.DOCUMENT]: {
    folder: 'documents',
    accept: Object.keys(DOCUMENT_EXTENSIONS),
    maxBytes: 25 * MB,
    label: 'a document',
    extensions: DOCUMENT_EXTENSIONS,
  },
};

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
