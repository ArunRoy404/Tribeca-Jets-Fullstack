# Module feature status — what works now, and what is waiting on a dependency

A per-module ledger, in build order. For every module, two lists:

- **Working now** — wired end to end: schema → API → Postman → screen. If it is
  in this list, you can use it against the real database today.
- **Waiting on a dependency** — designed, present in the UI or the scope, and
  deliberately not faked. Each line names the module that unblocks it.

A third state appears where it applies: **Deferred by decision** — something
the scope asks for that we chose not to build yet, with the reason.

> **The rule that keeps this file honest:** a feature that is waiting renders an
> em dash or an empty state, never a zero. "0 trips" against a client the desk
> has flown twice is a wrong answer; "—" is a true one. So anything in the
> second list is *visibly* blank on screen — nothing in this project quietly
> pretends a missing dependency is a zero.

Companion to [MODULES.md](MODULES.md), which explains what each module *is* and
why it sits where it does in the queue, and to
[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md), which tracks what the client has
asked us to change. This file is only about state.

The rules behind every decision recorded here live in **`AGENTS.md`** at the
repository root.

Legend: ✅ done · ◐ partly done · ⬅ next · ⬜ not started

---

## 1. Auth & Sessions ✅

**Working now**

- Sign-in with email and password; httpOnly cookie session, no token ever
  reaches the browser
- Two-factor verification, with resend
- Session refresh and logout
- `GET /auth/me` — profile **plus the permission matrix for the role**, so the
  frontend never carries its own copy
- Forgot password → code → verify → resend → reset
- Invitation acceptance
- CSRF via `tj_csrf` cookie echoed as `X-CSRF-Token`
- Real SMTP delivery (`core/mail`) for codes and invitations
- **Ten-minute idle logout** (client request #4), enforced on both sides: the
  browser keeps the precise timer — real input only, sleep-safe, shared across
  tabs, with a minute's warning — and the API refuses to refresh a session that
  has demonstrably been idle past the limit. The limit ships from `/auth/me`
  rather than the frontend's env, so the two cannot drift

**Waiting on a dependency** — none. Auth depends on nothing.

**Known gap** (not a dependency): an invitation cannot be withdrawn and the
email stays reserved, so a mistyped invitation address is unrecoverable.

---

## 2. Users & Roles ✅

**Working now**

- Invite, edit, change role, suspend, reactivate
- Six roles: `SUPER_ADMIN`, `ADMIN`, `SENIOR_BROKER`, `BROKER`, `ASSISTANT`,
  and since 27 Sep 2026 **`REFERRAL_AGENT`** — a partner, not staff, with NONE
  on every staff permission (see **Referrals (#32)**). An agent carries their
  standard commission structure on the user row (`commissionBasis` /
  `commissionPercentage` / `commissionAmount`), accepted only on that role
- The staff directory (`GET /users`, `/stats`, `/roles`, `/:id`) needs
  `VIEW_TEAM`, which every staff role has and the agent does not
- `activeTrips` per user is a real count since **Trips (#11)**
- Three-layer authorization — guard → permission → row-level scope — used by
  every module built since
- `SUPER_ADMIN` immunity: cannot be demoted, suspended or deleted
- List with search, role and status filters, pagination, stats, roles endpoint
- **A Documents tab on each team member** (client request #7) — upload, list,
  download, remove and restore. The folder is a query over **Uploads (#28)**
  (`?ownerUserId=`), not a second table, so a removed document and a removed
  file are one act. Files are private and owned: the person they are about can
  read them, an administrator can read them, and **another broker gets a 404 —
  not a 403**, which would confirm the document exists and turn the staff list
  into a register of who has been paid

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| `activeLeads` on the team member card | Leads aggregates exist, not yet joined into this screen |
| ~~`activeTrips` per user~~ | ✅ Shipped with **Trips (#11)** |
| `conversionRate` per user | Not on this endpoint — the Agents roster carries it |
| `revenue` per user | **A decision, not a dependency** — Receivables (#16) ✅ can sum what a broker's trips collected, but the staff directory is `VIEW_TEAM`, which assistants hold, and a colleague's collections are financial. Who may see them needs deciding first |
| ~~Commission-structure fields on the team member sheet~~ | ✅ 27 Sep 2026 — set on invite or edit when the role is Referral Agent (`CommissionTermsFields`), shown on the detail sheet |

The three unfilled figures render "—" in `toTeamMember`.

**By design, not pending:** no archive/restore here. Suspension is enough — a
user is a person with history attached, and removing the row orphans every
audit trail pointing at them.

---

## 3. Airports ✅

**Working now**

- Full CRUD, archive/restore, bulk archive and bulk restore
- Search, country filter, sorting, pagination, stats
- `GET /airports/countries` for the filter, derived from the rows
- ICAO uniqueness across live and archived rows
- Referenced as a real foreign key by Clients, Aircraft and Trip Requests

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| FBO details per airport | **Document Vault (#22)** / operator data — an em dash, never an invented FBO name. *True only since 26 Sep 2026:* until then the detail sidebar and the mobile airport card both fell back to "Signature Flight Support", and every airport without notes read "Primary departure airport for NYC clients." |
| Traffic / trips-through counts | **Trips (#11)** ✅ — not built yet |

---

## 4. Operators ✅

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Contact details, certifications, commercial terms, payment terms, sourcing
  notes
- **Cancellation policy pasted verbatim** from the operator's own terms — a
  textarea in, `whitespace-pre-line` out, up to 5,000 characters, so a tiered
  policy stays a tier per line instead of collapsing into one paragraph
  (client request #2)
- `reliabilityRating` as a real 0–5 number; `safetyRating` and `responseSpeed`
  as the free text they actually are
- **Fleet tab is real** — filled in the second pass the day Aircraft shipped,
  mapped through the aircraft module's own formatter so a tail reads identically
  in both screens

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~`totalTrips`~~ | ✅ Shipped with **Trips (#11)** |
| `totalPaid` | **Operator Payments (#17)** |
| ~~Trip history tab~~ | ✅ Shipped with **Trips (#11)** |
| Payments tab | **Operator Payments (#17)** |
| ~~Sourcing response history~~ | ✅ Shipped — response rate, win rate, average response time and last asked |

**Two bugs fixed here on 2026-09-17:** the status dropdown's options carried
display labels (`value="Active"`) rather than enum values, so it showed "Active"
for every operator whatever its real status and rejected any change with a 400 —
**operator status could not be changed from the form at all**. And a blank
aircraft-types field defaulted to `["Global 7500"]`, putting an airframe nobody
entered into the operator's fleet.

---

## 5. Clients ✅

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Two independent axes: `status` (LEAD / ACTIVE / VIP / INACTIVE) and
  `leadStage` (the pipeline)
- `homeAirportId` as a real foreign key — was free text, backfilled 67/67 by
  ICAO match
- Broker assignment, follow-up scheduling with a due window
- Type, status, stage, source, priority and broker filters; search; sorting
- Removal is admin-only: brokers hold `MANAGE_CLIENTS` at `ASSIGNED` scope
- `GET /clients/broker-performance` — real aggregates over leads
- Enquiries listed on the client, from Trip Requests
- Internal notes, travel preferences and birthday round-trip: written, returned
  and repopulated in the edit form
- An archived client's detail page opens from the Archived tab and offers
  Restore in place of Edit, Create Trip and Archive
- Mark Complete on the follow-up strip clears the reminder and its note
- **The Activity tab is a real timeline** (adjustment #5): notes people write,
  merged with the recorded changes already in the audit log. The standing
  "Internal Notes" field in the sidebar is deliberately separate — see
  **Notes / Timeline (#29)** for why

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~Trips tab ("No Trip History")~~ | ✅ Shipped with **Trips (#11)** — and Total Trips on the stats row is a real count |
| ~~Quotes tab~~ | ✅ Shipped with **Quotes (#10)** — the tab lists the client's real offers |
| ~~Payments tab ("No Payments Yet")~~ | ✅ Shipped with **Receivables (#16)** — the invoices billed to this client, with the API's totals; hidden for a role without `VIEW_RECEIVABLES` |
| ~~Credit / money on account~~ | ✅ Shipped with **Client Credits (#30)** — a Credit tab with a real ledger |
| ~~Activity timeline ("No Activity Yet")~~ | ✅ Shipped with **Notes / Timeline (#29)** — notes merged with the audit trail |
| ~~Total spend~~ | ✅ Shipped with **Receivables (#16)** — money actually received (`collected` from `GET /receivables/stats?clientId=`), not booked value |
| Average trip value | Not built — booked value or received value per trip is a definition nobody has chosen |

**Removed rather than faked:** the detail page had an attachment drop zone
wired to nothing. It belongs to **Document Vault (#22)**.

**Known gap, not a dependency:** the Clients *table* does not read
`usePermissions()` yet — its row menu, checkbox column and bulk actions render
for every role, and the API refuses what a broker or assistant cannot do. The
detail page and dialogs are wired; the table is next time Clients is opened.

**Four bugs fixed here on 2026-09-17**, all of the same family — a field the
API accepted, stored, and never gave back:

1. `notes`, `preferences` and `birthday` were **write-only**. The detail page
   said "No internal notes on file" about clients whose notes were in the
   database.
2. `findOne` used `include` rather than the shared select, so the detail
   endpoint returned a bare `homeAirportId` and no airport row — home airport
   read "—" on every client that had one, and the edit form then cleared it.
3. **`updateClientSchema` used `.partial()`, which does not strip `.default()`.**
   Any partial update re-applied every create-time default: scheduling a
   follow-up demoted a VIP travel agent to a brand-new direct lead and erased
   their labels and travel preferences. This was the most damaging bug in the
   codebase and nothing on screen revealed it.
4. The follow-up strip carried a hardcoded date and a note about a Miami → New
   York round trip, shown on four of the five tabs for every client.

**Three more fixed on 2026-09-26** (the whole-project audit):

1. **A broker could not save any edit to their own client** — 403, because the
   edit form resends `assignedBrokerId` and the reassign guard fired on its
   presence. It now fires only on a real change, and the broker picker is
   hidden (not disabled) from anyone without `ALL` scope — on the edit form,
   Add Lead and Schedule Follow-up.
2. **Nothing could be cleared.** Six optional fields refused `null`, so
   emptying a phone number saved without effect.
3. **Archiving an airport locked every client based there** — the home
   airport was re-validated on every save, not only when it changed.

---

## 6. Aircraft ✅

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Tail number as the identity — unique across live *and* archived rows,
  upper-cased on the way in; re-adding an archived tail returns 409 pointing at
  Restore rather than silently reviving it
- Four statuses, all reachable from the row menu and the detail header:
  `AVAILABLE`, `IN_SERVICE`, `MAINTENANCE`, `INACTIVE`
- Operator and home-base pickers as real foreign keys; an archived assignment is
  shown labelled `(archived)` rather than silently dropped
- Specs: seats, range, year, ceiling, weights, dimensions. Speeds as free text
  (jets quote Mach, turboprops knots)
- Maintenance tab: three dates, with Completed / Scheduled / **Overdue**
  derived from today — never stored, so it cannot go stale
- **Fleet finder** (scope §6.8): `minPassengers`, `minRangeNm` and amenities.
  All are *at least* bounds; amenities must **all** match; a tail with a missing
  figure is excluded rather than assumed to fit
- `GET /aircraft/amenities`, derived from the rows, so the filter can never
  offer a feature nothing has

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~`totalTrips`, `tripsThisYear`~~ | ✅ Shipped with **Trips (#11)** |
| `avgUtilization` | Nothing records flight hours per tail — stays null |
| ~~Trips tab on the aircraft detail page~~ | ✅ Shipped with **Trips (#11)** |
| `IN_SERVICE` becoming *derived* rather than set by hand | **Trips (#11)** ✅ — not built yet |
| Availability against a date range | **Trips (#11)** ✅ + **Schedule (#13)** |

**Aircraft photos (27 Sep 2026, client adjustment #3's fleet half).** An
exterior and an interior photo per tail (`exteriorImageUrl` /
`interiorImageUrl`, relative upload URLs checked by the shared `uploadUrl`),
uploaded from the Add/Edit form — before the tail exists, on a new one — and
shown in a Photos card on the detail page, with an honest empty slot when
there is none. The upload does not know it is for an aircraft, which is what
makes the create form work. See **Uploads (#28)**.

---

## 7. Leads & Agents ✅

**Working now**

- Leads list — search, and stage / source / priority / broker filters, paging
- Archived tab with restore
- **Add Lead writes two records**: a Client at lead stage, and a TripRequest for
  what they actually asked for. One form, because a lead is not a table
- Edit a lead (touches the person only)
- Schedule Follow-up, Assign Broker
- **Convert to Client is a status change, not a copy** — LEAD → ACTIVE, stage →
  WON, on the row that already exists. Notes, preferences, follow-ups and every
  enquiry stay attached
- Lead detail page listing that client's real enquiries
- Agents roster — active leads, converted, conversion %, follow-ups due,
  capacity used — computed from real lead data
- Agent detail page with their assigned leads
- `conversionRate` and `capacityUsed` are **null, not 0%**, when there is
  nothing yet to measure

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~`activeTrips` on the roster and the agent page~~ | ✅ Shipped with **Trips (#11)** |
| Agent "associated trips" panel | **Buildable now** — `GET /trips?brokerId=` exists; `AgentAssociatedTrips` is not wired to it yet |
| Revenue per agent | **A decision** — the same one as `revenue` on Users & Roles (#2) |
| Contact / activity timeline on a lead | **Communications / Email Templates (#21)** |
| Quote-linked lead stages (Proposal, Quoted moving on their own) | **Quotes (#10)** ✅ exists — wiring the *client's* lead stage to it is a Clients change, still to do |
| Log Call Activity on an agent | **Communications** — disabled and labelled, not silently inert |

**Fixed here on 2026-09-17:** the agent detail page's row menu offered Schedule
Follow-up and Convert to Client over live leads and both did nothing — the
dialogs were never mounted on that page. Its Prev/Next had no handler either,
and the desktop table and mobile cards offered different menus. The Internal
Notes card displayed the *follow-up* note, and the trip-interest card printed
`LIGHT_JET` at the reader.

**Fixed here on 2026-09-26:** editing a travel-agent lead turned it into a
direct client (the form sent `type: DIRECT` on every save — now on create
only). Brokers were offered Assign Broker, Remove and Restore, which the API
refuses them; the lead detail page offered every write to an assistant and on
an archived lead. All now hidden for the roles that cannot use them.

**By design, not pending:** the roster is read-only and has no Add form. An
agent is one of the desk's own brokers — a User — and staff are invited through
Users & Roles, where the permission matrix and suspend rules live. *Travel*
agents are something else: clients of type `TRAVEL_AGENT`.

---

## 8. Trip Requests ✅

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Client, origin and destination as real foreign keys; dates, passengers,
  aircraft preference, estimated value, summary, requirements, internal notes
- Human-readable `reference` number
- Broker scoping: a broker sees their own **plus unassigned**; reassignment and
  archive are administrator-only (403 with "Mark it Lost instead")
- `openOnly` filter, departure-window filter, pipeline value in stats
- Return-before-departure rejected on the field, not in a banner
- Editable after its client is archived — the client is re-checked only when
  it changes (a 400 on every save until 26 Sep 2026)
- Uses the **trips** permissions (`VIEW_TRIPS` / `MANAGE_TRIPS` /
  `DELETE_TRIPS`), because a request is the start of a trip
- **A page of its own** at `/dashboard/trip-requests` (client request #8/#10a)
  — Active / All Requests / Archived tabs, stats tiles, search, five filters,
  a mobile card view below `lg`, bulk archive and restore
- **Mark as Lost** as the row action, ahead of Remove: a lost enquiry leaves
  the Active tab and stays in the log, which is what makes it findable when an
  empty leg matches it later
- Also created and listed through the Leads and Operator Sourcing screens,
  which write the same record through one shared form

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~"Source this request" action~~ | ✅ Shipped with **Operator Sourcing (#9)** |
| ~~Request → quote conversion~~ | ✅ Shipped with **Quotes (#10)** — a quote carries `tripRequestId`, and sending it moves the enquiry to QUOTED |
| ~~Request → trip, closing the loop~~ | ✅ Shipped with **Trips (#11)** — a trip carries `tripRequestId`, and booking one marks the enquiry CONVERTED |
| ~~Matching against repositioning flights~~ | ✅ Shipped with **Empty Legs (#15)** — `TripRequestsService.onRoutes` feeds client adjustment #10b |

---

## 9. Operator Sourcing ✅

**One new table, not two.** The board's rows are trip requests being worked —
client, broker, route, departure and budget are all `TripRequest` columns, and
the New Sourcing Request form is the trip-request form with a quote deadline
added. So the only genuinely new record is `OperatorQuote`: what each operator
came back with. A second requests table would have split one enquiry across two
rows, the way a leads table would have split one client.

**Working now**

- The sourcing board, listing real enquiries with URL-backed search, status,
  aircraft and broker filters, paging and an Archived tab
- New Sourcing Request — files a real trip request, including the quote deadline
- Ask an Operator — one live ask per operator per enquiry, enforced by the
  service *and* a partial unique index; operators already asked are removed
  from the picker rather than offered and refused
- Record the operator's response; approve, reject, record a decline, and **undo
  a decision**
- Only one quote per enquiry can be approved — a second attempt is refused by
  name rather than silently demoting the first, because two approved quotes
  mean two operators booked for one flight
- Asking the first operator moves the enquiry to SOURCING; approving moves it
  to QUOTED. Neither ever moves a request backwards or touches one already
  converted or lost
- Sourcing tiles: open requests, awaiting response, quotes received, average
  response time, sourced
- Per-enquiry counts — operators asked, responses in, best price, and the
  board's four stages — **all derived from the quotes on every read**, never
  stored
- Operator scorecard on the operator detail page: response rate, win rate,
  average response time, last asked
- An operator quote stays editable after its aircraft is archived — the
  aircraft is re-checked only when it changes (fixed 26 Sep 2026)

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~Turning an approved operator price into a client-facing offer~~ | ✅ Shipped with **Quotes (#10)** — a quote carries `operatorQuoteId`, which is what makes its margin traceable |
| Deposit / payment column on the board | **A decision** — Receivables (#16) ✅ shipped, but an invoice has no "deposit" kind, so nothing can say which payment was the deposit. Still an em dash |
| Departure and arrival *times* on the route strip | **Trips (#11)** ✅ — not wired here yet — a request records the day, not a schedule |
| Emailing the request to the operator | **Email Templates (#21)** |
| Operator document upload and field extraction (§6.9) | **Document Vault (#22)** — the pipeline exists now (**Files #28**); the sourcing screen and the extraction step do not |

**Deferred by decision: most of the operator scorecard.** Scope §6.7 asks for
accuracy, hidden fees, cabin cleanliness, crew quality and passenger feedback
alongside response speed — and §17 lists "operator scorecard rating scales" as a
decision nobody has made. The three figures that can be counted from real quotes
are built; inventing a scale for the rest would put a score on an operator that
no one gave them, which is the exact failure that made "never display a number
the data did not supply" the hardest rule in this project.

---

## 10. Quotes ✅

**Two quote entities, deliberately.** Scope §10 lists Operator Quote and Client
Quote separately and they are genuinely different records: one is what an
operator charges *us* (#9), the other is what the client pays, with margin and
Federal Excise Tax on top. Approving an operator's price does not create the
client's offer — the desk decides the markup — so `operatorQuoteId` links them
without making one the other.

**Nothing computed is stored.** `fetAmount`, `extrasTotal`, `totalPrice`,
`grossProfit` and `marginPercentage` are worked out on every read from the four
inputs a person actually typed. A stored total beside its own parts is the
classic accounting bug: the day an edit moves the base price and the total does
not follow, the quote contradicts itself and nothing on screen says which half
is right. The one place frozen figures *are* needed — "what exactly did the
client see on the 9th?" — is `QuoteVersion`.

**Working now**

- The quotes board: URL-backed search, status and broker filters, sorting,
  paging, page size, an Archived tab, bulk remove and bulk restore
- Write a quote, always as a draft at V1 — nothing reaches a client by being
  saved
- Line items: extras that are priced, and extras that are "Included" — a line
  with neither is refused rather than stored as $0
- FET as a **rate**, stored per quote, switchable off for an exempt
  international leg. A rate above 1 is refused as the typo it is: "7.5" meaning
  7.5% turns a $79,500 quote into a $676,000 one, and that one would go out
- **Version history.** A new version is cut only when an edit moves the money,
  and every figure is frozen as it stood. Correcting an FBO address is not a new
  version of the offer
- Send, approve, reject, expire, and **undo any decision**
- Only one quote per enquiry can be approved — a second is refused by name
  rather than silently demoting the first
- An approved or rejected quote cannot be edited in place; reopening it is a
  recorded act
- Copy a quote into a fresh draft, with none of the original's send or decision
  history
- Sending a quote moves its enquiry to QUOTED — forward only, never over a
  request already converted or lost
- **Margins are gated behind `VIEW_FINANCIALS`.** An assistant sees the offer
  and not the desk's profit, and the keys are *absent* rather than zeroed — a
  `0` margin is a number someone could repeat down the phone
- Expiry is derived from `validUntil` on every read, so a quote that lapsed on
  Friday does not still read "Sent" on Monday
- The client detail page's Quotes tab, filled in the same pass
- **A full-screen create/edit form with a live document preview** (25 September
  2026, the client's Figma redesign) — reuses `QuoteDetailStats` and the quote
  detail page's own cards rather than a second set built for the form
- **An aircraft exterior photo per quote** (`exteriorImageUrl`), previewed
  through the shared `PhotoTile` component in the form and, since 26 Sep, shown
  on the saved quote's detail page in an Aircraft Photo card — the quote half
  of client adjustment #3. Only a relative `/api/uploads/<id>` URL is accepted
  (shared `uploadUrl`, `common/dto/uploads.ts`)
- **Delete answers 204 with no body**, like every other module (200 with the
  row until 26 Sep)
- **Edits survive an archived dependency.** Each of a quote's eight links is
  re-checked only when it changes, so archiving an airport or operator no
  longer locks every quote that used it (fixed 26 Sep; the same bug was fixed
  in Clients, Trip Requests and Operator Sourcing)
- **`POST /quotes/price-preview`** — the same `priceQuote()` pricing engine,
  run against draft form inputs before anything is saved, gated behind
  `VIEW_FINANCIALS` exactly like the saved quote. Nothing recomputes the money
  math in frontend JavaScript
- **Suggested price** (27 Sep 2026, client adjustment #6) — the base price at
  each markup over the operator cost, from `POST /quotes/suggested-price`
  (`MANAGE_TRIPS` + `VIEW_FINANCIALS`); one click fills the base price
- **Photo library** on the aircraft photo field, with the chosen tail's own
  fleet photos offered first (27 Sep 2026, client adjustment #3)

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Print-ready / PDF output and a branded quote document (§6.10) | **Document Vault (#22)** — nothing in this system generates a document yet |
| Emailing the quote to the client | **Email Templates (#21)** — Send marks it sent and says so; it does not deliver |
| `viewedAt` — "the client opened it" | **Client Portal (#25)**, and scope §16 already hedges it with "where technically trackable" |
| ~~Turning an approved quote into a booking~~ | ✅ Shipped with **Trips (#11)** — `POST /trips/from-quote/:quoteId`, "Book Trip" on the quote |
| Deposit *received* against the deposit quoted | **A decision** — as on the sourcing board: invoices do not mark a deposit yet |
| Distance and aircraft recommendation from the route (§6.10) | **Airports** holds the coordinates; the recommendation rules are undecided |

**Deferred by decision: the AI quote builder.** Scope §6.10 calls it
"potential", §17 lists "AI quote approval rules before sending" as an open
decision, and §18 says outright that **AI must not be the source of truth for
financial calculations**. Building it now would mean inventing the approval
rules the scope says nobody has agreed.

---

## 11. Trips ✅ *(27 Sep 2026)*

**Working now**

- `Trip` with ordered `TripLeg`s (one-way, round trip, multi-leg) and named
  `TripPassenger`s; client, broker, operator, aircraft, trip request and quote
  are real foreign keys. Pricing inputs mirror the quote's and every total is
  computed on read through the same pricing engine — nothing is stored
- `POST /trips/from-quote/:quoteId` books an approved quote in one click,
  copying client, route, aircraft and pricing; booking marks the enquiry
  CONVERTED. "Book Trip" on the quote detail page
- Status machine in `trips.lifecycle.ts` (pure, tested): Draft → Booked →
  Confirmed → In Flight → Completed, each step undoable one step back, Cancel
  before departure, reopen a cancelled trip as Draft. Completed and cancelled
  trips are read-only until reopened
- List (search, filters, Archived tab), stats (revenue only for
  `VIEW_FINANCIALS`), detail, create, edit, status, archive/restore and bulk —
  broker scope on reads and writes, removal for ALL only
- Frontend: the board, the create/edit form (`/dashboard/trips/new`,
  `/dashboard/trips/[tripId]/edit`), the detail page with a notes timeline and
  the trip's commissions on the financial card. `dummyData/trips.js` and
  `tripDetails.js` are deleted
- Postman `15 · Trips` (12 requests)

**Second passes it made** — Users and Agents `activeTrips`; Operators
`totalTrips` and trip history; Aircraft `totalTrips` / `tripsThisYear` and the
Trips tab; Clients' Trips tab and trip count; Notes `TRIP` subject; Client
Credits `appliedToTripId`; Trip Requests closing the loop.

**Second pass from Receivables (#16), 28 Sep 2026:** each trip carries
`clientPayment` — its billing across its invoices (Not Invoiced, Due,
Partially Paid, Paid, Overdue) with invoiced, paid and balance — shown as the
board's "Client Pmt" column and the trip page's Client Paid / Client Balance,
where the trip's invoices are listed and raised. The "Payment Attention" tile
counts trips with an overdue invoice. All absent for a role without
`VIEW_RECEIVABLES`.

**Still waiting:** `avgUtilization` (no module records flight hours),
`IN_SERVICE` derived from trips, the Agent "associated trips" panel (buildable
now), the board's "All Payments" filter (buildable now — needs the trips API
to work out matching ids, as the receivables list does), and operator
payments — **Operator Payments (#17)**.

---

## 12. Itineraries ⬜

No backend. Its dependency **Trips (#11)** ✅ has shipped, so it is buildable; passenger images and the
printable document also want **Document Vault (#22)**.

The frontend build-form and live preview shipped ahead of the module itself
(24–25 September 2026, dummy-data-backed): a full-screen create/edit modal, a
two-photo aircraft gallery through the shared `PhotoTile` component, and the
mobile layout fixed after a real-device regression (labels were hiding the
photos on iPhone/Pixel widths — `PhotoTile`'s `shrink-0` fix). **The uploads
are real** — logo, operator PDF and both photos go through
`POST /api/uploads/*` and live on the server — **but the itinerary is not**:
it is saved into `useItinerariesStore` and is gone on reload, so nothing
points at those files afterwards. Screens built ahead of their API, same as
every other still-⬜ module's UI.

**Placeholders removed 26 Sep 2026**, because a dummy-backed screen still must
not invent: the builder pre-filled a route (including `KTTB`, not an airport),
catering, a car and an FBO, and on submit made up a client name, times,
"Passenger N" names and random passport numbers; the store filled a blank tail,
aircraft, operator, date and times; the preview showed a stock jet photo on
every itinerary without one. The five seeded itineraries now carry their stock
photos as data, where they belong.

---

## 13. Schedule ⬜

Nothing wired. Buildable — **Trips (#11)** ✅ has shipped. **No new table** — a read-only
calendar projection of Trips.

---

## 14. Flight Tracking ⬜

Nothing wired. Dependencies shipped: **Trips (#11)** ✅ and **Aircraft (#6)** ✅.

**Open decision before it can be built:** live position almost certainly needs a
third-party feed. That is a procurement decision, not a coding one.

---

## 15. Empty Legs ✅ *(27 Sep 2026, with client adjustment #10b)*

**Working now**

- `EmptyLeg`: origin/destination airports, departure date and time, offer
  expiry, operator, aircraft (or a free-text description), seats, price,
  status, notes. List, stats, detail, create, edit, archive/restore and bulk,
  under `OPERATOR_SOURCING`
- **Expired is computed, not stored**: an Available or Matched leg past
  `expiresAt` reads EXPIRED on every read and in the status filter
  (`effectiveStatus` in `empty-legs.matching.ts`, pure and tested)
- **#10b matching**: every trip request on the same route (exact airports),
  **including LOST, CONVERTED and archived ones**, with the client's phone and
  email; requests within ±3 days of the leg are listed first. The list carries
  `matchCount` / `dateMatchCount`; the detail carries the matches. Requests are
  read through `TripRequestsService.onRoutes`, so the broker scope applies
- Stats: counts per status and the open value, with how many open legs are
  priced — an unpriced leg is never summed as zero
- Frontend: the board with a match badge, the add/edit dialog, the detail sheet
  with the matches list, and the dashboard's "Empty Leg Opportunities" section
  reading the API. `dummyData/emptyLegs.js` and the dashboard's copy are deleted

**Not done:** the Postman folder.

---

## 16–19. The financial modules ◐

- **16 Receivables** ✅ *(28 Sep 2026)* — what clients owe, and what has come
  in. Below.
- **17 Operator Payments** — what Tribeca owes operators. Trips ✅,
  Operators ✅. ⬜
- **18 Commissions** ✅ *(27 Sep 2026, for client adjustment #11)* — below.
- **19 Transactions** — a union **view** over the three above, not a fourth
  table, which is why it comes last of the four. ⬜

### 16. Receivables ✅ *(28 Sep 2026)*

**Working now**

- `Invoice` on a trip, billed to a client (the trip's by default, or a travel
  agent paying for them): the charge before FET, the FET on it, the due date,
  and a status a person sets — Draft, Sent or Cancelled. The number is
  `INV-<year>-<sequence>`, fixed at creation
- `InvoicePayment`, a ledger under the invoice: amount, the day it arrived,
  method, reference, notes. Withdrawn (never deleted) with who withdrew it,
  and restorable
- **Paid, balance and the state are computed on every read**, never stored
  (`receivables.amounts.ts`, pure and tested): Draft, Due, Partially Paid,
  Paid, Overdue (sent, owing, past its due date) or Cancelled. Filtering by
  state works out the matching ids with the same function, so the pager and
  the total stay right
- The money rules, each enforced on create, edit and restore: a payment only
  on a sent invoice; never past what is owed (an overpayment belongs on the
  client's credit); the total never below what is paid; no cancelling, no
  back-to-draft and no archiving while live payments stand
- Stats — invoiced, collected, outstanding, overdue and a count per state —
  summed in cents, optionally for one client or one trip
- `VIEW_RECEIVABLES` / `MANAGE_RECEIVABLES`: every invoice for administrators
  and senior brokers; the invoices on the trips they may see for a broker,
  through `TripsService.visibleWhere`, so the two scopes cannot drift. A broker
  raises invoices and records payments on their own trips; archiving an invoice
  and withdrawing or restoring a payment are ALL-only. Assistants and referral
  agents: none
- Frontend: the board (URL state, Archived tab, bulk archive/restore, cards
  below `lg`), the add/edit dialog with "Bill the full trip" from the server's
  own figures, the record/correct payment dialog, and the detail sheet with the
  payment ledger. `dummyData/receivables.js` and the store's copy are deleted;
  the old "Send Reminder" and "Export" buttons are gone rather than faked
- **Second passes:** Trips (payment column, paid/balance, invoices on the trip
  page, Payment Attention), Clients (the Payments tab and Total Spent)
- `CommissionPaymentMethod` became the shared `PaymentMethod` (a rename in
  place — the method on every paid commission is kept)
- Migration `20260928100000_add_receivables`; Postman builder
  `build_receivables_folder.py` → `19 · Receivables` (14 requests), **written,
  not run**

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Payment reminders (§9.3 "trigger reminders") | **Email Templates (#21)** |
| A printable / PDF invoice | **Document Vault (#22)** |
| Export | **Settings / Import / Export (#26)** |
| Receivables on the dashboard and the daily brief | **Dashboard (#24)** |
| Paying an invoice from a client's credit | **A decision** — see Client Credits (#30) |

**Deferred by decision:** processing card or wire payments. Scope §17 lists
"whether the CRM only records payments or also processes card/wire payments"
as open; this module records them.

### 18. Commissions ✅

**Working now**

- `Commission` on a trip, paid to a **referral agent** (a user), a **client**
  (e.g. a travel agent) or a **manual** named recipient. Basis: percent of
  profit, flat fee or custom; status Pending → Earned → Paid (or Cancelled);
  payment method and paid date (defaults to today when marked Paid)
- **Percent of profit is computed on read, not stored** — in cents, from the
  trip's pricing (`commissions.amounts.ts`, pure and tested); a loss gives 0,
  an unpriced trip gives an honest blank. `finalAmount` is the one figure a
  person types, as the settled amount
- A new commission with no basis copies the agent's standard structure from
  their user row. Linking a referral's trip raises the agent's commission
  automatically (skipped for CUSTOM, and never twice)
- Scope: ALL for admins and senior brokers; a broker sees the commissions on
  their trips; an agent sees only their own, stripped of notes, broker and
  every price input. Writes need `MANAGE_COMMISSIONS` (ALL only)
- Frontend: the board, stats, add dialog (with an "agent's standard" basis),
  detail sheet, and the trip's financial card. `dummyData/commissions.js` is
  deleted

**Not done:** the Postman folder; the agent's own Commission Center screen
(the portal, see #32).

Money is why soft delete is absolute: `deletedAt` everywhere, no hard delete
anywhere in the system.

---

## 20. Tasks Board ⬜

Nothing wired. Waits on **Users (#2)** ✅ — buildable now. Task links out to
trips and clients need **Trips (#11)** ✅ (shipped); clients ✅ already work.

**The top-nav notification bell belongs here** (scope §6.22, *Notifications,
Tasks & Activity*). It is dummy-backed: `dummyData/notifications.js` through
`useNotificationsStore` — moved out of inline JSX on 26 Sep 2026, per the
dummy-data rule. Real notifications need a source to raise them (follow-ups
due, quote expiry, trip reminders), so they land with this module, not before.

---

## 21. Email Templates ⬜

Nothing wired. **No hard dependencies** — can be pulled earlier if the desk
needs it. Merge fields for quotes and trips need **Quotes (#10)** and
**Trips (#11)** ✅.

It is also what unblocks the Activity timelines on Clients and Leads.

---

## 22. Document Vault ⬜

**No screen exists.** Waits on nothing unbuilt: Trips (#11) ✅, Clients ✅, Operators ✅.

**The pipeline it was going to own now exists** — see **Uploads (#28)**, built
first because four separate client requests were queued behind it. What is left
here is the vault *as a product*: a browsable store with folders, versions and
expiry dates on certificates.

Aircraft images, the client attachment drop zone, contracts, operator
certificates and quote PDFs all now have somewhere to go on the server. Each
still needs its own screen and its own category rule.

---

## 23. Reports ⬜

Nothing wired. Waits on every financial module (16–19) and Trips ✅.

Export to CSV / Excel / PDF is an **acceptance criterion in the signed scope
with no code written**.

---

## 24. Dashboard ⬜

Only the "Empty Leg Opportunities" section is wired (27 Sep 2026, Empty Legs #15); the rest renders from `dummyData/dashboard.js`. Waits on nearly
everything, which is why it is last despite being the first screen a user sees.
Building it early means writing every count twice.

---

## 25. Client Portal ⬜

**No screen exists.** Waits on Trips ✅, Quotes and Documents, and needs a
**separate authentication surface** — it is not the staff login with a different
role.

---

## 26. Settings / Import / Export / Backup ⬜

**No screen exists.** Import, export and backup are **acceptance criteria in the
signed scope with no code written**. So is **offline / PWA support**.

Not blocked by anything. They need to be *scheduled*, not discovered at
delivery.

---

## 27. AI Assistant ⬜

Currently four hardcoded suggestion strings. The scope describes an in-app
assistant answering questions about the desk's own data — so in practice it
waits on the data being there, which means most of the queue above.

---

## 28. Uploads ✅

**Not in the original queue.** Built out of order because four separate client
requests were queued behind one missing piece of infrastructure — per-broker tax
form folders, the referral portal's Resources section, referral attachments, and
the aircraft photo library. See
[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md).

**Rebuilt on 23 September 2026.** The first version keyed every file to a
`FileCategory` that decided who could read it. That made a category a
prerequisite of an upload — so a photograph could not be attached to a record
that did not exist yet, which is the ordinary shape of a create form — and put
every future upload button behind a new enum value and a migration. It was
replaced before any screen consumed it, so nothing was migrated and no real data
existed.

**Working now**

- **`POST /api/uploads/image`** and **`POST /api/uploads/document`** — the whole
  write surface. A screen uploads, gets a **URL**, and stores that URL on
  whatever record it was editing. Nothing in the upload path knows what a file
  is *for*, so a new upload spot anywhere in the product needs no backend change
- **The content type is read from the bytes**, never the upload header, so
  renaming a file changes nothing. SVG, archives and legacy `.doc`/`.xls` are
  refused — the first executes script, the second hides its contents from any
  check, and the last two are byte-identical at the header
- **Files land in the folders the client asked for**: `images/` and
  `documents/`, content-addressed as `<sha256>.<ext>`
- **Per-file access control**: `visibility` (PUBLIC / PRIVATE, defaulting to
  PRIVATE) and `ownerUserId`. A broker reads the 1099 filed about them; another
  broker gets a **404, not a 403**. The rule is pure functions in
  `uploads.access.ts` with a test that walks every combination
- **`GET /api/uploads`** — paginated, searchable, scoped on the way out.
  `?ownerUserId=` is what makes a personal folder a query rather than a table
- **Re-uploading a file returns the one already on file** — `deduplicated: true`,
  the original id, nothing written. Keyed on uploader, checksum, kind, owner
  *and* visibility, so filing one PDF for two people does not put one document
  in two folders. Self-healing: if the object has gone missing from storage the
  bytes are rewritten rather than a dead URL returned
- **`GET /api/uploads/:id`** streams the bytes with `nosniff`, `inline` for
  images and `attachment` for everything else. Works directly in an `<img src>`,
  because the session is an httpOnly cookie
- **`GET /api/uploads/:id/meta`** describes a file without downloading it, and
  answers for archived files too, so a list can show "removed" rather than a
  broken link
- Remove and restore, with **the bytes untouched** either way
- 9 Postman requests, 18 captured examples, real multipart fixtures, a teardown
  that leaves nothing live, and a folder login so it passes run alone
- Unit tests: 8 on the rules, 10 on the access rule (every combination), 11 on
  the byte sniffer, and 7 on `uploadUrl` — the shared validator any DTO that
  stores an upload URL uses (added 26 Sep, first used by the quote photo)

**Waiting on a dependency**

| Feature | Blocked by |
|---|---|
| ~~The broker document folder tab~~ | ✅ Shipped — see **Users & Roles (#2)** |
| ~~The aircraft **fleet** photo gallery~~ | ✅ Shipped 27 Sep 2026 — exterior + interior per aircraft |
| Referral attachments and the Resources section | **Referral Agent (#11 in the client list)** |
| ~~Picking a photo onto a quote or itinerary~~ | ✅ Shipped — itinerary 24 Sep, quote 25 Sep 2026, both through the shared `PhotoTile` component |
| Itinerary files staying attached to a saved itinerary | **Itineraries (#12)** — the uploads are real, the itinerary record is not |

**Consumers today:** the broker Documents tab (#7), the quote photo, the
aircraft photos, and the Build Itinerary form.

**The photo library** (27 Sep 2026, client adjustment #3): every `PUBLIC`
image, via `?kind=IMAGE&visibility=PUBLIC`, offered by the shared uploader's
optional `library` prop on every photo field. A view over the stored uploads,
not a second table.

**Deferred by decision: thumbnails and image resizing.** A 15 MB cabin
photograph served whole is slow, and the fix is a resize pipeline. What renders
today is one or two photos per screen (a quote, an itinerary); nothing lists
dozens at once, so building it now would be tuning for a fleet gallery that
does not exist yet.

---

## 29. Notes / Timeline ✅ *(Clients, Trips, Referrals)*

**Not in the original queue.** It is the client's adjustment #5 — *"a section
where I can write notes and add it to a timeline"*, for trips and for clients.
See [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md).

**`Client.notes` was not that.** One string, and editing it destroys what it
said before. That column stays as the standing summary the sidebar shows; this
table is the append-only record. Two questions, two places, and the decision is
recorded rather than left for somebody to "tidy up" later.

**Working now**

- **`GET /api/notes/timeline`** — notes and the audit entries about the same
  record, interleaved newest-first. A timeline of hand-written notes alone is
  half a timeline: status changes, reassignments and archives are already
  recorded and are the half nobody has to remember to type. `entries=NOTE|EVENT`
  reads one half
- **Paginated across two tables without a UNION**, by taking `skip + take` from
  each and merging. Exact rather than approximate — the nth newest row overall
  cannot be older than the nth newest of either source. `mergeTimeline` is a
  pure function with tests that walk the page boundaries, because an off-by-one
  there shows one entry twice and hides another
- **Polymorphic: `subjectType` + `subjectId`.** CLIENT today; TRIP is one enum
  value and three lines in `notes.subjects.ts`. `subjectId` is therefore not a
  foreign key — the service asks the module that owns the subject, so
  `ClientsService` applies the same broker scope it applies everywhere else and
  a note on somebody else's client answers **404, not 403**
- **`visibility`** — INTERNAL (default) or SHARED. This is #11's *Agent Update*
  field, built now rather than as a second note system later. It is stored and
  displayed and **filters nobody yet**, because the Referral Agent role does not
  exist; the day it lands, its read scope is `visibility: SHARED`
- **Editing is the author only, administrators included** — narrower than every
  other update in this system, because the timeline renders a note under the
  name of whoever wrote it. Withdrawing is wider (author *or* administrator):
  moderation does not put words in anyone's mouth
- Withdraw and restore, with a Withdrawn view naming who took each note off
- **The Activity tab on the client detail page** — composer, Timeline / Notes /
  Withdrawn views, server-side paging. `NotesTimeline` takes
  `subjectType`/`subjectId`, so the trip detail page renders the same component
- **No permission decorator on the controller**, deliberately, the same choice
  Uploads records: the right to write a note is the right to edit the record it
  hangs on, and which permission that is depends on a query-string value a
  decorator cannot see. The check moved one layer in, to `notes.subjects.ts`
- **An archived record is read-only.** Its timeline still opens — the Archived
  tab links to it — but writing or editing on it answers 400 with the reason.
  Withdraw and restore stay allowed: moderation is not a new statement
- **The timeline refuses `search`, `sortBy` and `sortOrder`** rather than
  accepting and ignoring them. It is always newest-first; searching notes is
  `GET /notes?search=`, which does filter. See the `.strict()` note in
  `AGENTS.md` for why omitting the fields was not enough on its own
- 9 Postman requests, 26 captured examples, a teardown that withdraws both
  probes and archives the client it wrote them on, and a folder login so it
  passes run alone. The builder now **refuses to write an example whose label
  disagrees with the status it captured**
- 48 live assertions across four real accounts, 23 unit tests on the merge and
  the DTOs, and the timeline rendered at 375 / 768 / 1440 with no horizontal
  overflow

**Waiting on a dependency**

| Feature | Blocked by |
|---|---|
| ~~A timeline on the trip detail page~~ | ✅ Shipped with **Trips (#11)** — `NoteSubjectType.TRIP` |
| ~~Referral agents reading SHARED notes and nothing else~~ | ✅ Enforced in the service since 27 Sep 2026 (`REFERRAL` subject, partner rules in `notes.service.ts`). The portal screen that shows them to the agent is not built yet — see **Referrals (#32)** |

**Deferred by decision: attachments on a note.** The upload surface exists and a
note could carry a URL, but nothing has asked for it, and a second place that
files documents about a client competes with Document Vault (#22) before that
module has decided anything.

---

## 30. Client Credits ✅

**Not in the original queue.** The client's adjustment #9, built as a ledger
rather than the single editable number he described — see
[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) for why, and for the sentence in
his own request that settles it.

**Working now**

- **`GET /api/client-credits/summary`** — `balance`, `credited`, `applied`, the
  movement count and the last movement date. **Summed on every read; there is
  no `balance` column.** Withdrawn movements count towards nothing, so the
  total always agrees with the rows printed under it
- **`GET /api/client-credits`** — the ledger, newest *movement* first
  (`occurredAt`, not `createdAt`: a trip cancelled on the 3rd and entered on
  the 9th is dated the 3rd). `archived=true` is the withdrawn half
- Create, edit, withdraw and restore, with `type` carrying the direction and
  `amount` always positive
- **An application cannot overdraw the account** — checked on create, on edit
  (against the ledger *excluding* the row being edited) and on restore, because
  a withdraw-and-restore would otherwise walk around the rule. The message
  names what is available
- **Money is counted in integer cents** by pure functions with tests, and the
  conversion parses the decimal string rather than multiplying
- **`money()` in `common/dto/numbers.ts`** refuses a third decimal place: the
  column is `Decimal(12, 2)` and would round it, leaving the balance the
  service checked disagreeing with the row it wrote
- **Two permission questions, kept separate**: `VIEW_FINANCIALS` to see money
  at all (an assistant holds NONE), and the clients module's own scope for
  *which* clients. Another broker's ledger answers 404, never 403
- An archived client's account is readable and not writable, matching
  `findOne`/`findLive` everywhere else
- **A Credit tab on the client detail page** — summary tiles, the ledger,
  Withdrawn view, inline edit, server-side paging. Hidden entirely from roles
  without `VIEW_FINANCIALS` rather than shown and refused
- `formatMoneyExact` beside `formatMoney` in the new `lib/money.js`: a balance
  is an amount somebody is owed, and rounding $6,000.40 to "$6,000" means the
  profile and the bank statement disagree with nothing explaining why
- 9 Postman requests, 24 captured examples, a teardown that withdraws both
  movements and archives the client, and a folder login so it passes run alone
- 35 live assertions across four real accounts, 20 unit tests on the
  arithmetic and the DTOs, and the tab rendered at 375 / 768 / 1440 with no
  horizontal overflow

**Waiting on a dependency**

| Feature | Blocked by |
|---|---|
| ~~"Used towards **which** trip" as a real link~~ | ✅ Shipped with **Trips (#11)** — `appliedToTripId`, a real foreign key, picked from the client's trips on the form |
| Credit shown against an invoice | **A decision** — Receivables (#16) ✅ shipped. Paying an invoice from credit would record the same money twice (an APPLICATION and a payment) unless one is made to create the other; how the desk wants that to work has not been described |

**Deferred by decision: a REFUND type.** Money actually paid back out is a
third real movement, and it is absent until somebody asks. Recording one today
means an APPLICATION whose reason says so — imprecise but honest, where
inventing the value now would be guessing at a workflow nobody has described.


---

## 31. Charter Rates / Instant Estimate ✅ *(client adjustment #6)*

**Working now**

- `GET /charter-rates` — every aircraft category, priced or not
- `PUT /charter-rates/:category` — administrators and senior brokers only
  (VIEW_FINANCIALS at ALL scope); `null` clears; audited before/after
- `POST /charter-rates/estimate` — great-circle distance, flight and billed
  hours, estimated cost per category, round trip, fits-the-party
- Instant Estimate dialog on the Quotes screen: estimate → suggested price →
  Start a quote with route, party and price filled in
- Rates tab, editable or read-only by role
- Postman `14 · Charter Rates`, restoring the real rate it changed

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| The desk's actual rates | **Data entry** — the table is empty until someone types them in; no code |
| Positioning legs / overnight fees in the estimate | **The client's pricing formula** — not modelled rather than guessed |

---

## 32. Referrals / Referral Agent ✅ *(client adjustment #11, 27 Sep 2026)*

**Working now — the desk half**

- `REFERRAL_AGENT` role, denied everything outside its own referrals and
  commissions (rules in `AGENTS.md`, "The referral agent is a partner")
- `Referral`: the client's name and contact (phone or email required), route,
  dates, passengers, aircraft preference, budget, notes and private
  attachments; ladder Submitted → Contacted → Quoting → Booked → Completed
  (or Lost / Cancelled) — its own ladder, not the trip request's
- `POST /referrals` — an agent submits as themselves; desk staff must name the
  agent. `POST /referrals/:id/convert` creates the client (lead source
  REFERRAL) or links an existing one, then the trip request, and moves the
  referral to Contacted. `PATCH` changes status, takes or assigns the broker,
  and links the trip it booked — which moves it to Booked and raises the
  agent's commission
- Attachments streamed through the referral
  (`GET /referrals/:id/attachments/:uploadId`, `openVouched`)
- `ReferralResource` — the portal's Resources library, curated by ALL-scope
  roles; the file must be a PUBLIC upload
- Notes `REFERRAL` subject: the desk writes; notes ticked "Share with the
  referring agent" are the Agent Updates, and the only notes an agent can read
- Frontend (desk): `/dashboard/referrals` — table, cards, stats, detail sheet
  (convert, broker, status, link trip, attachments, timeline) and the
  Resources card. A client's detail shows the referrals that produced it

**Working now — the agent portal (27 Sep 2026)**

- `/portal`, its own shell: the CRM's sidebar and header (`AppSidebar` /
  `NavMain` / `TopNav` take optional `home`, `sections`, `titleFor` and
  `showNotifications`, defaulting to the CRM's) showing only **Dashboard |
  Submit Referral | My Referrals | Commissions | Resources**, with idle sign-out
- **Routing by role:** sign-in lands each role in its own area
  (`landingFor` in `lib/roles.js`, honouring `?next=` only inside that area);
  the two-factor "all set" screen continues to the right home; `proxy.js`
  protects `/portal` like `/dashboard`; `AreaGate` in both layouts sends a
  partner out of the CRM and staff out of the portal once `/auth/me` answers
- **Dashboard:** referrals submitted, active, trips booked, completed trips,
  pending commission, total commission earned, total commission paid (all
  from the API; commissions still waiting on a trip's figures are counted in
  a note, not as $0), and the four newest referrals
- **Submit Referral:** every field in the client's spec, attachments private
  to the agent, "Referral source" shown as the signed-in agent and recorded
  by the API; lands on the new referral
- **My Referrals:** search, status filter and pager in the URL; the shared
  `ReferralsTable` (new `partner` prop) and `ReferralCard`; the sheet shows the
  Submitted → Completed ladder, the booked trip, what was sent, the agent's
  own attachments and **Updates from Tribeca** (SHARED notes, read-only)
- **Commissions:** the agent's standard terms (`commissionTerms` on
  `/auth/me`, partners only), pending / earned-to-date / paid totals
  (`earnedToDate` added to `GET /commissions/stats`, summed in cents), and
  client/trip, trip date, structure, estimated, final, status and paid date
- **Resources:** what the desk published, opening the file

**Not built yet**

| Piece | State |
|---|---|
| Postman `16 · Empty Legs`, `17 · Commissions`, `18 · Referrals` | ◐ Builders written (27 Sep); **not run yet** — the collection gains the folders when they are. `01 · Auth` (`commissionTerms`) and `04 · Users` (invite terms) examples need a recapture too |
| Live testing of Empty Legs, Commissions, Referrals and the portal | ☐ Written without it, by the owner's instruction |

The team member form sets an agent's standard commission (percent of profit,
flat fee or custom) on invite or edit; `POST /users/invite` accepts the same
three optional fields as the update. The seed adds `agent@tribecajets.com`
(REFERRAL_AGENT, 10% of profit) for the portal and the Postman folders.

---

## Cross-cutting fixes

Things repaired in one place that changed behaviour in several modules. They
have no single module's section, and they are the ones a later agent is most
likely to trip over if they are not written down.

### `CommonDatePicker` emitted a display string — fixed 19 September 2026

The shared date control emitted `"Aug 12, 2026"`, the string the Figma mock
showed. Every date field on the API rejects it with "Use a YYYY-MM-DD date".

**Quotes, Leads, Aircraft maintenance and Operator Sourcing all pass the
picker's value straight to the server, so none of their dates could be saved at
all** — silently, in four modules, until someone tried one. It now emits
`YYYY-MM-DD` and formats the label for reading only, the same split the project
already applies to enums.

Three more mock values went with it: the calendar opened on a hardcoded August
2026, the shortcut read "Today (Aug 12)" whatever the real date was, and the
selected day was matched by substring, so picking the 1st highlighted the 10th
and the teens too.

**If you are wiring a module whose dates "never worked", this was why.** The
modules above were not individually broken; they were all downstream of one
control.

### The OpenAPI success response — fixed 19 September 2026

Nest injects an implicit 200/201 only when a controller declares **no**
`@ApiResponse` of its own. The Files routes hand-write their 403s, so five of
them were published as operations that could only fail. `describe-responses.ts`
now reconstructs the success code the way Nest picks it, from
`HTTP_CODE_METADATA`. **The fix is general** — every future route that
documents a response by hand is covered, and nothing has to be remembered at
the call site.

### The 26 September audit — five cross-module fixes

- **A foreign key is re-checked only when it changes.** Clients, Trip Requests,
  Operator Sourcing and Quotes all re-validated every link on every save, so
  archiving an airport, client or aircraft made every record pointing at it
  uneditable. Each now compares against the stored value first — the rule
  `AGENTS.md` already stated.
- **One set of form helpers** — `src/lib/form.js` (`optionalText`,
  `optionalNumber`) replaced seven private copies in Airports, Operators,
  Aircraft, Clients, Leads, Quotes and the shared trip-request form. On edit a
  cleared box sends `null`, so it actually clears; an unparseable number is
  omitted rather than sent as `NaN`.
- **One `BROKER_ROLES`** in `src/lib/roles.js` replaced eight copies. The
  Clients copies left out `ADMIN`, so an admin who owns clients could not be
  picked or filtered on those screens.
- **One `uploadUrl`** in `common/dto/uploads.ts` for any DTO that stores an
  upload URL.
- **Postman:** every builder asserts label against status and places its
  folder with `collection_order.place_folder()`. 126 requests, 305 examples,
  0 mislabelled; Newman 149 / 81 / 0, twice, every folder also alone.
  (27 Sep: 127 requests, 311 examples, Newman 151 / 81 / 0.)

### Found while building Trips — 27 September 2026

- **`TimePicker` emitted `"08:00 AM"`**, which the API refuses, so scheduling a
  client follow-up with a time silently saved nothing. It now emits `"HH:MM"`
  (`src/lib/time.js`); the 12-hour text is display only.
- **Calendar dates are rendered in UTC** with `formatCalendarDate`
  (`src/lib/date.js`), so a `@db.Date` stored as the 14th does not read as the
  13th west of Greenwich.
- **`toCents` / `fromCents` moved to `common/money/cents.ts`** when Empty Legs
  and Commissions became its second and third callers;
  `client-credits.balance.ts` re-exports them.

---

## The short version

**Usable against the real database today:** Auth, Users & Roles, Airports,
Operators, Clients, Aircraft, Leads & Agents, Operator Sourcing, Quotes, Trip
Requests, Uploads, Notes / Timeline, Client Credits, Charter Rates, **Trips,
Empty Legs, Commissions, Referrals** (desk and portal) and **Receivables**.

**Most recent change (28 September), uncommitted:** Receivables (#16) — invoices
and payments, with its second passes into Trips and Clients. One migration,
`20260928100000_add_receivables`, must be deployed (`npm run db:deploy`)
before the API starts. Written **without live testing, by the owner's
instruction**: backend `tsc`, oxlint and vitest (171 tests, 16 files) are
clean, frontend eslint reports nothing in the files changed, and `npm run
build` passes. The Postman builder is written and not run.

**Most recent change (27 September), all uncommitted:** Trips (#11) with every
second pass it owed; Empty Legs (#15) with client adjustment #10b's matching;
Commissions (#18); and client adjustment #11's `REFERRAL_AGENT` role, referrals
and the desk's Referrals page. One migration,
`20260927160000_add_empty_legs_commissions_referrals`, must be deployed
(`npm run db:deploy`) before the API starts against an existing database.

**How far that was verified:** Trips was checked with live requests, in the
browser at three widths and with its own Postman folder, which passed. Empty
Legs, Commissions and Referrals were written **without live testing, by the
owner's instruction** — backend `tsc`, oxlint and vitest (150 tests, 15 files)
are clean, frontend eslint reports nothing in the files changed, and frontend
`npm run build` passes (27 Sep, end of day). A full Newman run has **not**
been run since.

**The agent portal (`/portal`) was built 27 Sep, after the commits above**,
also without live testing: build, eslint, backend lint and tests pass.
**Left of client adjustment #11:** nothing to build. The three Postman builders
are written and need one run against a freshly seeded API, then Newman.

**Next in the module queue:** Operator Payments (#17), then Transactions
(#19); Itineraries (#12) and Schedule (#13) are unblocked by Trips too.

**Open decisions, not code:** MongoDB vs PostgreSQL (the signed proposal §13
says MongoDB; the project is PostgreSQL, which is right for this relational
data), the flight-tracking data feed, whether a credit **refund** is a movement
the desk needs (see #30), and whether gross profit should count the FET
(`CLIENT_ADJUSTMENTS.md` §5) — which now also moves every percent-of-profit
commission.

**Known debt:** twelve components nothing imports (listed in
[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) §4, 26 Sep) — kept, because a
component is not deleted until its module is finished, and one of them
(`airports/AirportCardsContainer.jsx`) imports a file that does not exist.
Frontend lint reports nine errors in older files this work did not touch
(`react-hooks/set-state-in-effect` in eight dialogs — email templates,
operator payments, receivables, transactions, `TripRequestDialog` — and
`react-hooks/purity` in `useIdleLogout.js`); each is fixed on its module's turn.
