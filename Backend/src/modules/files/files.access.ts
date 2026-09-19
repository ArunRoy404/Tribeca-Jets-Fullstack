import { FileCategory } from '../../generated/prisma/enums.js';
import { Permission } from '../../common/authorization/permissions.js';

/**
 * What each kind of file is, who may touch it, and what may be uploaded as one.
 *
 * Every file in this system lives in the same table and the same bucket, so
 * this table is the entire difference between a marketing brochure and a
 * broker's tax form. It is deliberately a data structure rather than a set of
 * `if (category === ...)` branches in the service: a rule scattered across four
 * methods is a rule that can be forgotten in the fifth, and the one that would
 * be forgotten is the download.
 */

/** Which column identifies the file's owner. */
export type FileOwnerKind = 'user' | 'aircraft' | 'none';

export interface FileCategoryRule {
  /**
   * The permission that governs *reading*, or `null` when every signed-in
   * caller may read — which is not the same as public. Authentication is still
   * required; there is no unauthenticated path to any stored object.
   */
  readPermission: Permission | null;

  /** The permission required to upload, edit, archive or restore. */
  writePermission: Permission;

  /** Which owner column must be supplied, and must be the only one supplied. */
  owner: FileOwnerKind;

  /**
   * Whether the owner may read their own file without holding
   * `readPermission`.
   *
   * True for a personal folder: a broker must be able to download their own
   * 1099 without being handed `MANAGE_USERS`, which would let them read
   * everybody else's.
   */
  ownerMayRead: boolean;

  /**
   * Accepted content types, checked against the bytes rather than the upload
   * header. Narrow on purpose — a category that accepts anything is a category
   * that will eventually serve an HTML file back to a browser from the API's
   * own origin.
   */
  accept: readonly string[];

  /** Ceiling for one file, in bytes. */
  maxBytes: number;

  /** Shown in error messages, so a rejection names what was expected. */
  label: string;
}

const MB = 1024 * 1024;

/**
 * Formats that render or download safely and that the desk actually exchanges.
 *
 * SVG is absent deliberately: it is a document that executes script, and
 * serving one from the API's origin is stored XSS wearing an image's clothes.
 */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

/**
 * Legacy `.doc` and `.xls` are absent on purpose.
 *
 * Both are OLE2 compound files, and a `.doc` and a `.xls` are byte-identical
 * at the header — so the sniffer could not tell one from the other and would
 * have to fall back to trusting the upload's own declared type, which is the
 * exact thing sniffing exists to avoid. OLE2 is also the macro-bearing format;
 * refusing it costs the desk nothing, since Word and Excel have written the
 * modern equivalents by default since 2007.
 */

export const FILE_CATEGORY_RULES: Record<FileCategory, FileCategoryRule> = {
  /**
   * One user's personal folder — the client's example is a 1099 issued to a
   * broker who earned commission.
   *
   * The most sensitive rows in the table, and the only ones whose read rule is
   * narrower than a whole role: an administrator files it, the person it
   * belongs to reads it, and a broker of identical rank sitting at the next
   * desk gets a 404. Not a 403 — a 403 would confirm the document exists and
   * turn a list of user ids into a register of who has been paid.
   */
  [FileCategory.USER_DOCUMENT]: {
    readPermission: Permission.MANAGE_USERS,
    writePermission: Permission.MANAGE_USERS,
    owner: 'user',
    ownerMayRead: true,
    accept: DOCUMENT_TYPES,
    maxBytes: 25 * MB,
    label: 'a document',
  },

  /**
   * Company-wide material: the brochure, the aircraft category guide, the
   * referral programme terms.
   *
   * Readable by everyone signed in, because that is what publishing means.
   * Writable only by an administrator — see `MANAGE_RESOURCES` for why that is
   * its own permission rather than borrowing `MANAGE_USERS`.
   */
  [FileCategory.RESOURCE]: {
    readPermission: null,
    writePermission: Permission.MANAGE_RESOURCES,
    owner: 'none',
    ownerMayRead: false,
    accept: [...DOCUMENT_TYPES, ...IMAGE_TYPES],
    maxBytes: 50 * MB,
    label: 'a document or image',
  },

  /**
   * Photographs of a tail, for quotes and itineraries.
   *
   * Follows the fleet's own permission exactly: whoever may edit an aircraft
   * may add pictures of it, and an assistant who may read the fleet may see
   * them. A separate permission here would mean a broker could rename a tail
   * but not photograph it, which nobody would be able to explain.
   */
  [FileCategory.AIRCRAFT_PHOTO]: {
    readPermission: Permission.MANAGE_AIRCRAFT,
    writePermission: Permission.MANAGE_AIRCRAFT,
    owner: 'aircraft',
    ownerMayRead: false,
    accept: IMAGE_TYPES,
    maxBytes: 15 * MB,
    label: 'an image',
  },
};

/** The rule for a category. Total by construction — every value has a row. */
export function ruleFor(category: FileCategory): FileCategoryRule {
  return FILE_CATEGORY_RULES[category];
}

/**
 * The largest upload any category accepts.
 *
 * Multer needs one number before it knows what it is receiving, so this is the
 * outer gate; the per-category ceiling is enforced afterwards, once `category`
 * has been parsed. Both are needed — without this one a 4GB body is buffered
 * before anybody checks it.
 */
export const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(FILE_CATEGORY_RULES).map((rule) => rule.maxBytes),
);

/** Which storage prefix a category's objects are written under. */
export function storageScopeFor(category: FileCategory): string {
  return category.toLowerCase().replace(/_/g, '-');
}
