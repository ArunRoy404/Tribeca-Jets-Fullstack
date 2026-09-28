/**
 * Every React Query key in the app, in one place.
 *
 * Keys are built as arrays so a prefix invalidates everything beneath it:
 * invalidating `["clients"]` also clears `["clients", "detail", id]`.
 */
export const queryKeys = {
  auth: {
    all: ["auth"],
    currentUser: ["auth", "me"],
  },

  /**
   * Stored files.
   *
   * `folder` is its own key rather than a `list` with params, because a user's
   * document tab and a general file listing invalidate at different moments —
   * uploading into Mark's folder must refresh his tab without refetching every
   * other list on screen.
   */
  uploads: {
    all: ["uploads"],
    list: (params) => ["uploads", "list", params ?? {}],
    folder: (userId, params) => ["uploads", "folder", userId, params ?? {}],
    library: (params) => ["uploads", "library", params ?? {}],
    meta: (id) => ["uploads", "meta", id],
  },

  /**
   * Timeline entries.
   *
   * Keyed by the record they hang on, not by note id, because that is how they
   * are always read: writing a note must refresh the timeline it landed on and
   * nothing else. The two views of the same subject — the merged timeline and
   * the plain note list behind the Archived tab — sit under one `all` prefix so
   * a single write refreshes both.
   */
  notes: {
    all: ["notes"],
    timeline: (subjectType, subjectId, params) => [
      "notes",
      "timeline",
      subjectType,
      subjectId,
      params ?? {},
    ],
    list: (subjectType, subjectId, params) => [
      "notes",
      "list",
      subjectType,
      subjectId,
      params ?? {},
    ],
  },

  /**
   * Money on account.
   *
   * `summary` sits beside `list` under one `all` prefix because they are two
   * readings of the same rows: every write moves both, and refreshing only the
   * ledger would leave the balance above it stale — which on a money screen is
   * the one thing nobody would notice and everybody would trust.
   */
  clientCredits: {
    all: ["client-credits"],
    summary: (clientId) => ["client-credits", "summary", clientId],
    list: (clientId, params) => ["client-credits", "list", clientId, params ?? {}],
  },

  /** Booked flights (#11). */
  trips: {
    all: ["trips"],
    list: (params) => ["trips", "list", params ?? {}],
    detail: (id) => ["trips", "detail", id],
    stats: ["trips", "stats"],
  },

  /** The passenger document for a trip (#12). */
  itineraries: {
    all: ["itineraries"],
    list: (params) => ["itineraries", "list", params ?? {}],
    detail: (id) => ["itineraries", "detail", id],
    stats: ["itineraries", "stats"],
  },

  /** Operators' empty legs, and #10b's matches on each. */
  emptyLegs: {
    all: ["empty-legs"],
    list: (params) => ["empty-legs", "list", params ?? {}],
    detail: (id) => ["empty-legs", "detail", id],
    stats: ["empty-legs", "stats"],
  },

  /**
   * Commissions (#11's Commission Center). `stats` sits under the same prefix
   * because every write moves it — marking one paid moves money between two
   * tiles.
   */
  commissions: {
    all: ["commissions"],
    list: (params) => ["commissions", "list", params ?? {}],
    detail: (id) => ["commissions", "detail", id],
    stats: ["commissions", "stats"],
  },

  /**
   * Receivables (#16) — client invoices and their payments. `stats` takes a
   * client or a trip, so the client's Payments tab and a trip's financial card
   * each get their own cache entry under the same prefix, and one payment
   * invalidates them all.
   */
  receivables: {
    all: ["receivables"],
    list: (params) => ["receivables", "list", params ?? {}],
    detail: (id) => ["receivables", "detail", id],
    stats: (params) => ["receivables", "stats", params ?? {}],
  },

  /**
   * Operator Payments (#17) — operator bills and the money sent against them.
   * Stats take an operator or a trip, under the same prefix.
   */
  operatorPayments: {
    all: ["operator-payments"],
    list: (params) => ["operator-payments", "list", params ?? {}],
    detail: (id) => ["operator-payments", "detail", id],
    stats: (params) => ["operator-payments", "stats", params ?? {}],
  },

  /**
   * Schedule (#13) — a read-only calendar of trip legs. Filed under `trips` on
   * purpose: every write that moves what the calendar shows (a trip, its
   * itinerary, an invoice or payment) already invalidates `trips.all`, so the
   * calendar refreshes with them and no hook needs to know it exists.
   */
  schedule: {
    list: (params) => ["trips", "schedule", "list", params ?? {}],
    stats: (params) => ["trips", "schedule", "stats", params ?? {}],
    calendar: (params) => ["trips", "schedule", "calendar", params ?? {}],
  },

  /**
   * Flight Tracking (#14) — trip legs and their hand-reported state. Under
   * `trips` for the same reason as the schedule: a trip edit moves its legs.
   */
  flights: {
    list: (params) => ["trips", "flights", "list", params ?? {}],
    stats: (params) => ["trips", "flights", "stats", params ?? {}],
    detail: (id) => ["trips", "flights", "detail", id],
  },

  /**
   * Transactions (#19) — the money ledger, a read-only view over receivables,
   * operator payments and commissions. Invalidated by every money write in
   * those three modules.
   */
  transactions: {
    all: ["transactions"],
    list: (params) => ["transactions", "list", params ?? {}],
    stats: (params) => ["transactions", "stats", params ?? {}],
  },

  /** Portal referrals (#11) — the desk's board and the agent's own list. */
  referrals: {
    all: ["referrals"],
    list: (params) => ["referrals", "list", params ?? {}],
    detail: (id) => ["referrals", "detail", id],
    stats: ["referrals", "stats"],
  },

  /** The portal's Resources section. */
  referralResources: {
    all: ["referral-resources"],
    list: (params) => ["referral-resources", "list", params ?? {}],
  },

  /** The desk's charter rates — client adjustment #6's instant estimate. */
  charterRates: {
    all: ["charter-rates"],
    list: (params) => ["charter-rates", "list", params ?? {}],
  },

  users: {
    all: ["users"],
    list: (params) => ["users", "list", params ?? {}],
    detail: (id) => ["users", "detail", id],
    stats: ["users", "stats"],
    /**
     * Static reference data, so it sits outside `list` — invalidating the
     * table must not refetch the permission matrix, which only changes when
     * the backend's rules do.
     */
    roles: ["users", "roles"],
  },

  clients: {
    all: ["clients"],
    list: (params) => ["clients", "list", params ?? {}],
    detail: (id) => ["clients", "detail", id],
    stats: ["clients", "stats"],
    /**
     * The Agents roster. Under the clients prefix because every number on it
     * is lead data — creating or reassigning a lead moves it, so invalidating
     * clients must refresh it.
     */
    brokerPerformance: ["clients", "broker-performance"],
  },

  operatorQuotes: {
    all: ["operator-quotes"],
    list: (params) => ["operator-quotes", "list", params ?? {}],
    detail: (id) => ["operator-quotes", "detail", id],
    stats: ["operator-quotes", "stats"],
  },

  quotes: {
    all: ["quotes"],
    list: (params) => ["quotes", "list", params ?? {}],
    detail: (id) => ["quotes", "detail", id],
    stats: ["quotes", "stats"],
    /**
     * A quote's frozen history. Outside `detail` because it changes only when
     * the money moves, while the quote itself changes on every edit — and the
     * history is append-only, so a cached copy stays correct far longer.
     */
    versions: (id) => ["quotes", "versions", id],
  },

  tripRequests: {
    all: ["trip-requests"],
    list: (params) => ["trip-requests", "list", params ?? {}],
    detail: (id) => ["trip-requests", "detail", id],
    stats: ["trip-requests", "stats"],
  },

  airports: {
    all: ["airports"],
    list: (params) => ["airports", "list", params ?? {}],
    detail: (id) => ["airports", "detail", id],
    stats: ["airports", "stats"],
    /**
     * The country filter's options. Outside `list` because it changes only
     * when an airport is added or removed, not when the table is filtered.
     */
    countries: ["airports", "countries"],
  },

  operators: {
    all: ["operators"],
    list: (params) => ["operators", "list", params ?? {}],
    detail: (id) => ["operators", "detail", id],
    stats: ["operators", "stats"],
  },

  aircraft: {
    all: ["aircraft"],
    list: (params) => ["aircraft", "list", params ?? {}],
    detail: (id) => ["aircraft", "detail", id],
    stats: ["aircraft", "stats"],
    /**
     * The cabin-preference filter's options. Outside `list` because they
     * change only when an aircraft is added or edited, not when the table is
     * filtered — the same reasoning as the airports country filter.
     */
    amenities: ["aircraft", "amenities"],
  },
};
