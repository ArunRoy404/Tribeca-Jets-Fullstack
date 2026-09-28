import { getFullName } from "@/lib/user";
import { Permission } from "@/lib/permissions";

/**
 * Turning a timeline row into something a person reads.
 *
 * The API returns two shapes under one list: a `NOTE` somebody wrote, and an
 * `EVENT` the system recorded. This is the one place that decides how either
 * is worded, so the client timeline and — when Trips ships — the trip timeline
 * cannot describe the same event two different ways.
 */

/**
 * Which permission governs writing on each kind of subject.
 *
 * Mirrors `notes.subjects.ts` on the API, which is the enforcement point —
 * this only decides whether to *render* the composer. It exists because
 * `NotesTimeline` takes a `subjectType` and is meant to serve trips as well as
 * clients: a hardcoded `MANAGE_CLIENTS` would offer a trip's composer to
 * somebody the API refuses, and hide it from somebody it allows.
 *
 * A subject missing from this map yields `undefined`, which `canWrite` treats
 * as no permission — so a new subject type fails closed until somebody adds
 * its row here.
 */
export const SUBJECT_PERMISSION = {
  CLIENT: Permission.MANAGE_CLIENTS,
  TRIP: Permission.MANAGE_TRIPS,
  REFERRAL: Permission.MANAGE_REFERRALS,
  FLIGHT: Permission.MANAGE_TRIPS,
};

/**
 * What each recorded action says, in the past tense, with the actor's name in
 * front of it.
 *
 * Only actions that actually reach a timeline are listed. An action with no
 * entry here is *humanised*, never guessed at: "client.follow_up_scheduled"
 * reads as "client follow up scheduled", which is clumsy and true. Inventing a
 * friendlier sentence for an action nobody has mapped would eventually put
 * words on the record that describe the wrong thing.
 */
const EVENT_PHRASES = {
  "client.created": "added this client",
  "client.updated": "updated this client",
  "client.deleted": "archived this client",
  "client.removed_bulk": "archived this client",
  "client.restored": "restored this client",
  "client.restored_bulk": "restored this client",
  "trip.created": "booked this trip",
  "trip.booked_from_quote": "booked this trip from its quote",
  "trip.updated": "updated this trip",
  "trip.status_changed": "moved this trip",
  "trip.archived": "archived this trip",
  "trip.bulk_archived": "archived this trip",
  "trip.restored": "restored this trip",
  "trip.bulk_restored": "restored this trip",
  "referral.submitted": "submitted this referral",
  "referral.updated": "updated this referral",
  "referral.status_changed": "moved this referral",
  "referral.converted": "converted this referral into a client and a trip request",
  "referral.archived": "archived this referral",
  "referral.bulk_archived": "archived this referral",
  "referral.restored": "restored this referral",
  "referral.bulk_restored": "restored this referral",
  "flight.status_changed": "reported this flight",
  "flight.updated": "updated this flight",
};

const FLIGHT_STATUS_WORDS = {
  NOT_DEPARTED: "Not Departed",
  DELAYED: "Delayed",
  IN_FLIGHT: "In Flight",
  LANDED: "Landed",
  DIVERTED: "Diverted",
};

/** A flight report's tail: its estimate and its note, from what the entry stored. */
function flightDetail(metadata) {
  const eta = metadata?.estimatedArrival ? ` · ETA ${metadata.estimatedArrival}` : "";
  const note = metadata?.note ? ` — “${metadata.note}”` : "";
  return `${eta}${note}`;
}

const TRIP_STATUS_WORDS = {
  DRAFT: "Draft",
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  IN_FLIGHT: "In Flight",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const REFERRAL_STATUS_WORDS = {
  SUBMITTED: "Submitted",
  CONTACTED: "Contacted",
  QUOTING: "Quoting",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

/** `client.follow_up_scheduled` → `client follow up scheduled`. */
function humanise(action) {
  return String(action ?? "")
    .replace(/[._]/g, " ")
    .trim();
}

/**
 * The sentence for one recorded event.
 *
 * `client.updated` says which fields moved when the audit entry recorded them,
 * because "Barry updated this client" four times in a row tells nobody
 * anything. The list comes from the stored metadata — it is never derived from
 * the row, which would be a guess about a change that happened in the past.
 */
export function describeEvent(entry) {
  const phrase = EVENT_PHRASES[entry?.action] ?? humanise(entry?.action);

  const status = entry?.metadata?.changes?.status;
  if (status?.to) {
    return `${phrase} — status ${status.from ?? "unset"} → ${status.to}`;
  }

  // A trip's lifecycle move records `from`/`to` (and an optional note) rather
  // than a `changes` block — read straight from what the audit entry stored.
  if (entry?.action === "trip.status_changed" && entry?.metadata?.to) {
    const from = TRIP_STATUS_WORDS[entry.metadata.from] ?? entry.metadata.from;
    const to = TRIP_STATUS_WORDS[entry.metadata.to] ?? entry.metadata.to;
    const note = entry.metadata.note ? ` — “${entry.metadata.note}”` : "";
    return `${phrase} from ${from} to ${to}${note}`;
  }
  // A referral's status move records `from`/`to` the same way (#11).
  if (entry?.action === "referral.status_changed" && entry?.metadata?.to) {
    const from = REFERRAL_STATUS_WORDS[entry.metadata.from] ?? entry.metadata.from;
    const to = REFERRAL_STATUS_WORDS[entry.metadata.to] ?? entry.metadata.to;
    return `${phrase} from ${from} to ${to}`;
  }
  // A flight report (#14) records `from`/`to`, the estimate and the note the
  // desk gave with it. Nothing is live — the words say who reported it.
  if (entry?.action === "flight.status_changed" && entry?.metadata?.to) {
    const to = FLIGHT_STATUS_WORDS[entry.metadata.to] ?? entry.metadata.to;
    return `${phrase} ${to}${flightDetail(entry.metadata)}`;
  }
  if (entry?.action === "flight.updated") {
    const fields = Array.isArray(entry?.metadata?.fields) && entry.metadata.fields.length
      ? ` (${entry.metadata.fields.map((f) => (f === "estimatedArrival" ? "arrival estimate" : "tracking link")).join(", ")})`
      : "";
    return `${phrase}${fields}${flightDetail(entry.metadata)}`;
  }
  if (entry?.action === "trip.booked_from_quote" && entry?.metadata?.quoteReference) {
    return `booked this trip from Q-${entry.metadata.quoteReference}`;
  }

  const fields = entry?.metadata?.fields;
  if (
    (entry?.action === "client.updated" || entry?.action === "trip.updated") &&
    Array.isArray(fields) &&
    fields.length
  ) {
    return `${phrase} (${fields.join(", ")})`;
  }

  return phrase;
}

/** Who did it, or "The system" when the actor was removed or it was automatic. */
export function actorName(actor) {
  const name = getFullName(actor);
  return name || "The system";
}

/**
 * A timestamp the way a timeline shows one: relative while it is recent,
 * absolute once it is not.
 *
 * "3 days ago" stops being useful somewhere around a week, and a charter desk
 * reading a client's history six months on wants the date. Anything
 * unparseable renders as an em dash rather than "Invalid Date".
 */
export function timelineTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The exact moment, for the `title` attribute — the relative label is lossy. */
export function timelineExactTime(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString();
}

/**
 * Whether a note was edited after it was written.
 *
 * The API stamps `updatedAt` on create as well, so they are equal on an
 * untouched note; a second of tolerance keeps a write that straddled a tick
 * from claiming an edit nobody made.
 */
export function wasEdited(note) {
  if (!note?.createdAt || !note?.updatedAt) return false;
  return new Date(note.updatedAt) - new Date(note.createdAt) > 1000;
}
