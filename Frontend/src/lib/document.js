import { uploadUrl } from "@/services/uploads.service";
import { displayName } from "@/lib/client";
import { actorName, formatTimestamp, toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";

/**
 * Document Vault (#22) wording. The API's vocabulary travels (`PASSPORT`,
 * `CLIENT`, `EXPIRING`); these are the labels it is read with.
 */

const DASH = "—";

export const DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "ID",
  "CHARTER_AGREEMENT",
  "WIRE_CONFIRMATION",
  "INVOICE",
  "ITINERARY",
  "INSURANCE_CERTIFICATE",
  "OPERATOR_CERTIFICATE",
  "CATERING_REQUEST",
  "OTHER",
];

const CATEGORY_LABELS = {
  PASSPORT: "Passport",
  ID: "ID",
  CHARTER_AGREEMENT: "Charter Agreement",
  WIRE_CONFIRMATION: "Wire Confirmation",
  INVOICE: "Invoice",
  ITINERARY: "Itinerary",
  INSURANCE_CERTIFICATE: "Insurance Certificate",
  OPERATOR_CERTIFICATE: "Operator Certificate",
  CATERING_REQUEST: "Catering Request",
  OTHER: "Other",
};
export const formatDocumentCategory = (v) => (v ? (CATEGORY_LABELS[v] ?? v) : DASH);

/** Restricted by the API (scope §11); the form says so before anyone files one. */
export const SENSITIVE_DOCUMENT_CATEGORIES = ["PASSPORT", "ID"];

export const DOCUMENT_OWNERS = ["CLIENT", "TRIP", "OPERATOR"];
const OWNER_LABELS = { CLIENT: "Client", TRIP: "Trip", OPERATOR: "Operator" };
export const formatDocumentOwner = (v) => (v ? (OWNER_LABELS[v] ?? v) : DASH);

export const EXPIRY_STATES = ["EXPIRED", "EXPIRING", "VALID", "NONE"];
const EXPIRY_LABELS = { EXPIRED: "Expired", EXPIRING: "Expiring Soon", VALID: "Valid", NONE: "No Expiry" };
export const formatExpiry = (v) => (v ? (EXPIRY_LABELS[v] ?? v) : DASH);

/** Where a document's owner opens. */
function ownerHref(owner) {
  if (!owner?.id) return null;
  if (owner.type === "CLIENT") return `/dashboard/clients/${owner.id}`;
  if (owner.type === "TRIP") return `/dashboard/trips/${owner.id}`;
  if (owner.type === "OPERATOR") return `/dashboard/operators/${owner.id}`;
  return null;
}

function fileSize(bytes) {
  if (bytes === null || bytes === undefined) return DASH;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Where the file opens: through the document, never `/uploads/:id` — the
 * file is usually someone else's private upload, and only the document
 * route vouches for it.
 */
export function documentFileHref(id) {
  return id ? uploadUrl(`/api/documents/${id}/file`) : null;
}

/** One document as the table, the cards and a folder list render it. */
export function toDocumentRow(doc) {
  const owner = doc?.owner ?? null;
  return {
    id: doc?.id,
    title: doc?.title || DASH,
    category: doc?.category ?? null,
    categoryLabel: formatDocumentCategory(doc?.category),
    sensitive: Boolean(doc?.sensitive),
    owner,
    ownerType: owner?.type ?? null,
    ownerTypeLabel: formatDocumentOwner(owner?.type),
    ownerLabel: owner?.label ?? DASH,
    ownerHref: ownerHref(owner),
    /** A trip's client, so a trip document still says whose it is. */
    ownerClient: doc?.trip?.client ? displayName(doc.trip.client) : null,
    filename: doc?.file?.filename ?? DASH,
    fileSize: fileSize(doc?.file?.size),
    fileArchived: Boolean(doc?.file?.archived),
    isImage: doc?.file?.kind === "IMAGE",
    href: documentFileHref(doc?.id),
    fileUrl: doc?.fileUrl ?? null,
    expiresOn: doc?.expiresOn ?? null,
    expiresOnLabel: doc?.expiresOn ? formatCalendarDate(doc.expiresOn) : DASH,
    expiry: doc?.expiry ?? "NONE",
    expiryLabel: formatExpiry(doc?.expiry),
    notes: doc?.notes || "",
    filedBy: actorName(doc?.createdBy),
    createdById: doc?.createdById ?? null,
    filedAt: formatTimestamp(doc?.createdAt),
    raw: doc,
    ...toArchiveFields(doc),
  };
}
