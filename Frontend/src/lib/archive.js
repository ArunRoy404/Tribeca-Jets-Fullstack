/**
 * Display helpers for the archive trail every module carries.
 *
 * Nothing in this system is permanently deleted — removing a record archives
 * it, and it can be restored with every field intact. These turn the four
 * columns behind that (`deletedAt`, `deletedBy`, `restoredAt`, `restoredBy`)
 * into what the tables and sheets render.
 *
 * Shared rather than repeated per module: the columns are identical everywhere,
 * so the labelling should be too.
 */

const DASH = "—";

/**
 * Renders an actor as a name.
 *
 * Null for seeded and imported rows — nobody archived those — so it is a real
 * value to display, not missing data.
 */
export function actorName(actor) {
  if (!actor) return DASH;
  return (
    [actor.firstName, actor.lastName].filter(Boolean).join(" ") ||
    actor.email ||
    DASH
  );
}

/** Date and time, because "when was this removed" usually needs the hour. */
export function formatTimestamp(value) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date only, for columns where the time would just be noise. */
export function formatDate(value) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The archive fields for one record, ready to render.
 *
 * Every module's row mapper spreads this, so the Archived tab and the restored
 * badge behave identically across modules.
 */
export function toArchiveFields(record) {
  const isArchived = Boolean(record?.deletedAt);
  return {
    isArchived,
    // A restored record keeps its badge for good. It is a fact about the
    // record, not a transient state, and hiding it after a while would mean
    // the table quietly stops telling you something it once did.
    isRestored: Boolean(record?.restoredAt) && !isArchived,

    deletedAt: record?.deletedAt ?? null,
    deletedAtLabel: formatTimestamp(record?.deletedAt),
    deletedByName: actorName(record?.deletedBy),

    restoredAt: record?.restoredAt ?? null,
    restoredAtLabel: formatTimestamp(record?.restoredAt),
    restoredByName: actorName(record?.restoredBy),
  };
}

/** Tab ids. Short, because they go in the URL. */
export const ARCHIVE_TABS = { LIVE: "live", ARCHIVED: "archived" };
