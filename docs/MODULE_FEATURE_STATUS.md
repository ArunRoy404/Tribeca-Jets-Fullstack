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
why it sits where it does in the queue. This file is only about state.

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

**Waiting on a dependency** — none. Auth depends on nothing.

**Known gap** (not a dependency): an invitation cannot be withdrawn and the
email stays reserved, so a mistyped invitation address is unrecoverable.

---

## 2. Users & Roles ✅

**Working now**

- Invite, edit, change role, suspend, reactivate
- Five roles: `SUPER_ADMIN`, `ADMIN`, `SENIOR_BROKER`, `BROKER`, `ASSISTANT`
- Three-layer authorization — guard → permission → row-level scope — used by
  every module built since
- `SUPER_ADMIN` immunity: cannot be demoted, suspended or deleted
- List with search, role and status filters, pagination, stats, roles endpoint

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| `activeLeads` on the team member card | Leads aggregates exist, not yet joined into this screen |
| `activeTrips` per user | **Trips (#11)** |
| `conversionRate` per user | **Quotes (#10)** + **Trips (#11)** |
| `revenue` per user | **Trips (#11)** |

All four currently render "—" in `toTeamMember`.

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
| FBO details per airport | **Document Vault (#22)** / operator data — currently an em dash, never an invented FBO name |
| Traffic / trips-through counts | **Trips (#11)** |

---

## 4. Operators ✅

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Contact details, certifications, commercial terms, cancellation policy,
  payment terms, sourcing notes
- `reliabilityRating` as a real 0–5 number; `safetyRating` and `responseSpeed`
  as the free text they actually are
- **Fleet tab is real** — filled in the second pass the day Aircraft shipped,
  mapped through the aircraft module's own formatter so a tail reads identically
  in both screens

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| `totalTrips` | **Trips (#11)** |
| `totalPaid` | **Operator Payments (#17)** |
| Trip history tab | **Trips (#11)** |
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

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Trips tab ("No Trip History") | **Trips (#11)** |
| ~~Quotes tab~~ | ✅ Shipped with **Quotes (#10)** — the tab lists the client's real offers |
| Payments tab ("No Payments Yet") | **Receivables (#16)** |
| Activity timeline ("No Activity Yet") | **Communications / Email Templates (#21)** |
| Total spend, trip count, average trip value | **Trips (#11)** + **Receivables (#16)** |

**Removed rather than faked:** the detail page had an attachment drop zone
wired to nothing. It belongs to **Document Vault (#22)**.

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
| `totalTrips`, `tripsThisYear`, `avgUtilization` | **Trips (#11)** |
| Trips tab on the aircraft detail page | **Trips (#11)** |
| `IN_SERVICE` becoming *derived* rather than set by hand | **Trips (#11)** |
| Availability against a date range | **Trips (#11)** + **Schedule (#13)** |

**Deferred by decision: aircraft images.** The scope lists them on the record
and in the passenger itinerary. **This project has no file-upload pipeline at
all** — `multer` is not installed, no endpoint accepts a file, `avatarKey` is
only ever read. Building the first one inside Aircraft would either be thrown
away or become an accidental framework. It ships with **Document Vault (#22)**,
which needs the same pipeline for contracts, operator documents and quote PDFs.

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
| `activeTrips` on the roster and the agent page | **Trips (#11)** |
| Agent "associated trips" panel | **Trips (#11)** |
| Revenue per agent | **Trips (#11)** + **Receivables (#16)** |
| Contact / activity timeline on a lead | **Communications / Email Templates (#21)** |
| Quote-linked lead stages (Proposal, Quoted moving on their own) | **Quotes (#10)** ✅ exists — wiring the *client's* lead stage to it is a Clients change, still to do |
| Log Call Activity on an agent | **Communications** — disabled and labelled, not silently inert |

**Fixed here on 2026-09-17:** the agent detail page's row menu offered Schedule
Follow-up and Convert to Client over live leads and both did nothing — the
dialogs were never mounted on that page. Its Prev/Next had no handler either,
and the desktop table and mobile cards offered different menus. The Internal
Notes card displayed the *follow-up* note, and the trip-interest card printed
`LIGHT_JET` at the reader.

**By design, not pending:** the roster is read-only and has no Add form. An
agent is one of the desk's own brokers — a User — and staff are invited through
Users & Roles, where the permission matrix and suspend rules live. *Travel*
agents are something else: clients of type `TRAVEL_AGENT`.

---

## 8. Trip Requests (Open Requests) ◐

**Working now**

- Full CRUD, archive/restore, bulk operations, stats
- Client, origin and destination as real foreign keys; dates, passengers,
  aircraft preference, estimated value, summary, requirements, internal notes
- Human-readable `reference` number
- Broker scoping: a broker sees their own **plus unassigned**; reassignment and
  archive are administrator-only (403 with "Mark it Lost instead")
- `openOnly` filter, departure-window filter, pipeline value in stats
- Return-before-departure rejected on the field, not in a banner
- Uses the **trips** permissions (`VIEW_TRIPS` / `MANAGE_TRIPS` /
  `DELETE_TRIPS`), because a request is the start of a trip
- Created and listed through the Leads screens today

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| **The dedicated Open Requests board** | Nothing — the API supports it in full. This is a screen to draw, not a module to design |
| ~~"Source this request" action~~ | ✅ Shipped with **Operator Sourcing (#9)** |
| ~~Request → quote conversion~~ | ✅ Shipped with **Quotes (#10)** — a quote carries `tripRequestId`, and sending it moves the enquiry to QUOTED |
| Request → trip, closing the loop | **Trips (#11)** |
| Matching against repositioning flights | **Empty Legs (#15)** |

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

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~Turning an approved operator price into a client-facing offer~~ | ✅ Shipped with **Quotes (#10)** — a quote carries `operatorQuoteId`, which is what makes its margin traceable |
| Deposit / payment column on the board | **Receivables (#16)** — null today, renders an em dash |
| Departure and arrival *times* on the route strip | **Trips (#11)** — a request records the day, not a schedule |
| Emailing the request to the operator | **Email Templates (#21)** |
| Operator document upload and field extraction (§6.9) | **Document Vault (#22)** — no upload pipeline exists |

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

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Print-ready / PDF output and a branded quote document (§6.10) | **Document Vault (#22)** — nothing in this system generates a document yet |
| Emailing the quote to the client | **Email Templates (#21)** — Send marks it sent and says so; it does not deliver |
| `viewedAt` — "the client opened it" | **Client Portal (#25)**, and scope §16 already hedges it with "where technically trackable" |
| Turning an approved quote into a booking | **Trips (#11)** |
| Deposit *received* against the deposit quoted | **Receivables (#16)** |
| Distance and aircraft recommendation from the route (§6.10) | **Airports** holds the coordinates; the recommendation rules are undecided |

**Deferred by decision: the AI quote builder.** Scope §6.10 calls it
"potential", §17 lists "AI quote approval rules before sending" as an open
decision, and §18 says outright that **AI must not be the source of truth for
financial calculations**. Building it now would mean inventing the approval
rules the scope says nobody has agreed.

---

## 11. Trips ⬅

**Working now** — nothing. Renders from `dummyData/trips.js` and
`dummyData/tripDetails.js`.

**Waits on:** Quotes (#10) and everything above it.

**The single largest unblocker in the project.** Landing it fills in, in a
second pass: Users `activeTrips`/`revenue`, Operators `totalTrips`/trip history,
Aircraft `totalTrips`/`tripsThisYear`/`avgUtilization`/derived `IN_SERVICE`,
Clients trips tab and total spend, Agents `activeTrips` and associated trips —
plus it is the dependency for modules 12, 13, 14, 16, 17, 18, 19 and 23.

---

## 12. Itineraries ⬜

Nothing wired. Waits on **Trips (#11)**; passenger images and the printable
document also want **Document Vault (#22)**.

---

## 13. Schedule ⬜

Nothing wired. Waits on **Trips (#11)**. **No new table** — a read-only
calendar projection of Trips.

---

## 14. Flight Tracking ⬜

Nothing wired. Waits on **Trips (#11)** and **Aircraft (#6)** ✅.

**Open decision before it can be built:** live position almost certainly needs a
third-party feed. That is a procurement decision, not a coding one.

---

## 15. Empty Legs ⬜

Nothing wired. Waits on **Operators (#4)** ✅, **Aircraft (#6)** ✅ and
**Airports (#3)** ✅ — so it is *technically* buildable now. Matching against
open requests wants **Trip Requests (#8)** ✅ too.

It sits after Trips in the queue by priority, not by dependency.

---

## 16–19. The financial modules ⬜

- **16 Receivables** — what clients owe. Waits on **Trips (#11)**, Clients ✅.
- **17 Operator Payments** — what Tribeca owes operators. Waits on **Trips**,
  Operators ✅.
- **18 Commissions** — what each broker earns. Waits on **Trips**, Users ✅.
- **19 Transactions** — a union **view** over the three above, not a fourth
  table, which is why it comes last of the four.

Money is why soft delete is absolute: `deletedAt` everywhere, no hard delete
anywhere in the system.

---

## 20. Tasks Board ⬜

Nothing wired. Waits on **Users (#2)** ✅ — buildable now. Task links out to
trips and clients need **Trips (#11)**; clients ✅ already work.

---

## 21. Email Templates ⬜

Nothing wired. **No hard dependencies** — can be pulled earlier if the desk
needs it. Merge fields for quotes and trips need **Quotes (#10)** and
**Trips (#11)**.

It is also what unblocks the Activity timelines on Clients and Leads.

---

## 22. Document Vault ⬜

**No screen exists.** Waits on Trips (#11), Clients ✅, Operators ✅.

**This is the module that owns the file-upload pipeline**, which nothing in the
project has yet. Aircraft images, the client attachment drop zone, contracts,
operator certificates and quote PDFs all queue behind it.

---

## 23. Reports ⬜

Nothing wired. Waits on every financial module (16–19) and Trips.

Export to CSV / Excel / PDF is an **acceptance criterion in the signed scope
with no code written**.

---

## 24. Dashboard ⬜

Nothing wired; renders from `dummyData/dashboard.js`. Waits on nearly
everything, which is why it is last despite being the first screen a user sees.
Building it early means writing every count twice.

---

## 25. Client Portal ⬜

**No screen exists.** Waits on Trips, Quotes and Documents, and needs a
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

## The short version

**Usable against the real database today:** Auth, Users & Roles, Airports,
Operators, Clients, Aircraft, Leads & Agents, Operator Sourcing, Quotes, and
the Trip Requests API.

**The one screen that is only a screen:** the Open Requests board. Its API is
finished and verified.

**The one module that unblocks the most:** Trips (#11). Nine modules and a
dozen individual fields are waiting on it.

**The one piece of infrastructure nothing has:** file upload. It arrives with
Document Vault (#22) and until then, no screen anywhere accepts a file.

**Open decisions, not code:** MongoDB vs PostgreSQL (the signed proposal §13
says MongoDB; the project is PostgreSQL, which is right for this relational
data), and the flight-tracking data feed.
