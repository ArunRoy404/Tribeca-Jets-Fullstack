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

> **Role restrictions are on again (7 Oct 2026).** From 4 to 7 Oct every user
> acted as SUPER_ADMIN; the old role matrix is enforced again, and each module
> moves to per-user permissions during its review. See `AGENTS.md`, "Role
> restrictions are on again".

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
- **Reviewed 6 Oct 2026** (module-by-module pass). Fixed: an idle refusal
  now signs out only that device (it revoked every session the user had);
  "Remember me" survives two-factor; the audit log says
  `auth.login.password_accepted` until a two-factor code is verified, so
  "success" means a session exists; the profile menus' Account and Settings
  items now go somewhere.
- **My Account** (`/dashboard/account`, profile menu → My Account): own name,
  phone and photo (`PATCH /auth/me`), password change (`POST
  /auth/change-password` — signs out every other device), own two-factor on
  and off (`PATCH /auth/two-factor`, password required), and the signed-in
  devices list with Revoke and "sign out all other devices"
  (`/auth/sessions`). The same list and password dialog sit in Settings ›
  Security. Postman: `01 · Auth › 05 · My Account`, run as the assistant and
  self-restoring.
- **Fixed 7 Oct 2026: signed out on reload after "Stay signed in".** The
  server measured idleness by the refresh token's age, which real activity
  never moved. Sessions now carry `lastActiveAt`, moved by `POST
  /auth/activity` (sent on real input, at most every two minutes across
  tabs, and at once on "Stay signed in"); the server's limit is the idle
  timeout plus five minutes. Two tabs renewing at once within 30 seconds is
  no longer mistaken for theft. The devices list shows last activity.
  Postman: `01 · Auth › 03 · Session › 03 · Record activity`.

**Waiting on a dependency**

| Not yet | What brings it back |
|---|---|
| Session location (city) | Dropped — would need a paid IP-lookup service |

Since 7 Oct 2026 the idle timeout, the warning and "require two-factor for
administrators" are read from **Settings (#26)**, and a mistaken invitation
can be withdrawn (`DELETE /users/:id/invitation`).

---

## 2. Users & Roles ✅

**Working now**

- Invite, edit, change role, suspend, reactivate
- Five roles: `SUPER_ADMIN`, `ADMIN`, `BROKER`, `ASSISTANT` (`SENIOR_BROKER`
  withdrawn 7 Oct 2026, its accounts became brokers), and since 27 Sep 2026
  **`REFERRAL_AGENT`** — a partner, not staff, with NONE
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

**Reviewed 6–7 Oct 2026 — owner signed off**

- Fixed: the Documents tab crashed ("documents?.map is not a function") — it
  read the page object `{ data, meta }` as the rows.
- Changed (owner's decision): **the invite form sets the first password**,
  with a Generate button; the invitation email carries it with a Sign In
  button; the first sign-in turns the account from Invited to Active. The
  "Forgot password?" route to activation is no longer what the email or the
  form describes (it still works).
- Documents tab uses the shared `FileUpload` drop box (several files at
  once), and **a document may be any file type**: unrecognised types are
  stored as opaque bytes that always download (Uploads, `storedContentType`).
- **Per-user permissions (owner's design, 7 Oct 2026)** — the first module
  moved off the role matrix. Roles are now Super Admin, Admin, Broker,
  Assistant and Referral Agent; **Senior Broker is withdrawn** (not in the
  scope) and its accounts became brokers.
  - Invite and Edit are **full pages** (`/dashboard/users-roles/invite`,
    `/dashboard/users-roles/<id>/edit`), replacing the dialog: details on the
    left, permissions on the right, Save in a sticky header, a warning before
    leaving with unsaved changes. The **Permissions** picker folds by sidebar
    section ("5 of 6 on"): 25 modules, each with its actions, starting from
    the role's defaults. Locked
    modules and actions show a lock; ticking a module that needs another
    turns that on too and says so; a needed module cannot be turned off
    first. A role change resets to the new role's defaults with a warning
    before saving. Nobody edits their own set; the owner's is fixed.
  - The detail sheet has a read-only **Permissions** tab.
  - Roles & Permissions tab: each role's defaults, optional extras, locks
    and reach, grouped by sidebar section.
  - Edit, Suspend and Invite appear only with the matching permission;
    Suspend never on your own account.
  - API: `/users/stats`, `/users/:id`, invite and edit are on
    `@RequireAccess`; new `GET /roles` and `GET /roles/:role/defaults`.
    `GET /users` stays on the old `VIEW_TEAM` because every module's broker
    picker reads it; Users & Roles · View decides how much of each row shows.
- **For every module:** the sidebar, `proxy.js` (from the `tj_modules`
  cookie, before render) and the page gate follow each person's own set; a
  refused page shows "No access". The APIs of the other modules still use
  the old matrix (off), until each is moved during its review.
- **Withdraw invitation** (7 Oct 2026): a pending invitation can be deleted
  permanently from the row menu or the detail panel, freeing the address;
  refused while clients, trips, documents or anything else are attached.
  The one permanent delete in the system.
- A Referral Agent lands in the partner portal again (by real role, not the
  switch); staff are kept out of it. The Invite/Edit page asks before any
  link leaves it with unsaved changes.
- Seed (7 Oct 2026): every account and contact on example.com; Barry is a
  broker with extra permissions, Mark one with fewer.
- Postman: `04 · Users` rebuilt (7 requests, 40 examples, `/roles` and
  permissions), the Auth session examples recaptured, `02 · Senior Broker`
  sign-in removed, `08 · Withdraw invitation` added. Full collection green twice: 199 requests, 0 failures.

**By design, not pending:** no archive/restore here. Suspension is enough — a
user is a person with history attached, and removing the row orphans every
audit trail pointing at them.

---

## 3. Airports ✅ *(reviewed and signed off 8 Oct 2026)*

**Working now**

- Full CRUD, archive/restore, bulk archive and bulk restore
- Search, country filter, sorting, pagination, stats
- `GET /airports/countries` for the filter, derived from the rows
- ICAO uniqueness across live and archived rows
- Referenced as a real foreign key by Clients, Aircraft, Trip Requests,
  Quotes, Trips, Empty Legs and Referrals
- **FBO** — one optional field on the airport (`assignedFbo`), typed in the
  Add/Edit form; itineraries default to it and may override it per trip.
  An em dash when none was entered. Not waiting on any module (owner, 8 Oct
  2026: it stays a single name).
- **Trips through each airport** on the detail panel — live, uncancelled
  trips with a leg departing or arriving there, total and this year; a
  round trip counts once (read through `TripsService.countThroughAirport`).

**Reviewed 8 Oct 2026** (review row 5). Fixed:

- **Permissions per person.** Every read needs only a session — eight forms
  pick an airport, including the referral portal's — and every write needs
  the caller's own Airports · Create / Edit / Archive (the owner's "reads are
  open" rule, AGENTS.md). Moved off the old `MANAGE_AIRPORTS` matrix entry.
- **The screen hides what a person cannot do** — Add, Edit, Remove, Restore,
  the bulk button and the checkbox column — instead of offering them and
  answering 403.
- **Latitude, longitude and runway can be changed but not cleared** on edit
  (required on create; an emptied value was accepted and stored as null).
- The detail panel loads the airport itself: trip count, runway and
  coordinates (it showed neither), "IATA —" instead of a blank, theme colours
  instead of hardcoded hex. "Delete" now says "Remove" — it archives.
- Stat tiles show a dash, not 0, when the counts fail to load.
- Mobile cards: no stray "/" without an IATA code, the Restored badge, the
  runway, and on the Archived tab who removed it and when.
- The form shows the server's message under every field it can refuse.
- Removed `components/airports/AirportCardsContainer.jsx` — imported nowhere,
  and importing a file that does not exist.
- Postman `05 · Airports` rebuilt live on `builder_common`
  (`build_airports_folder.py`): 10 requests, 33 captured examples, broker
  refusals and the agent's open reads.
- API docs now list the 403 on every `@RequireAccess` route (Users and
  Settings included), derived like the old ones.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~FBO details per airport~~ | Not a dependency — the airport's own optional field (above). |
| ~~Traffic / trips-through counts~~ | ✅ Trips through here, on the detail panel (8 Oct 2026) |

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
- `reliabilityRating` and `safetyRating` as the desk's own 0–5 ratings, as
  the Figma form (stars only beside a real one; blank is "Not rated")
- **Fixed choices** (owner's review, 8 Oct 2026): `responseSpeed`
  Fast/Average/Slow; `paymentTerms` Prepaid/Due on receipt/Net 7/15/30
- **Status SUSPENDED** — "do not book until further notice"; Request Quote is
  not offered for it, and the page says so
- **Documents in the form** — the shared `FileUpload` drop zone; files
  attached on Add/Edit are filed into the operator's vault folder, under one
  chosen type, once it saves (`useFileDocuments`), and the Documents tab
  (already there) lists, dates and archives them
- Every dropdown in the form is the shared `CommonSelect`
- **Fleet tab is real** — filled in the second pass the day Aircraft shipped,
  mapped through the aircraft module's own formatter so a tail reads identically
  in both screens

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| ~~`totalTrips`~~ | ✅ Shipped with **Trips (#11)** |
| ~~`totalPaid`~~ | ✅ Shipped with **Operator Payments (#17)** — every live payment sent to the operator; null (an em dash) for a caller who does not see every operator bill, because a broker's scope would make it a partial total |
| ~~Trip history tab~~ | ✅ Shipped with **Trips (#11)** |
| ~~Payments tab~~ | ✅ Shipped with **Operator Payments (#17)** — the operator's bills and totals from `GET /operator-payments?operatorId=`; the API's `payments: []` stand-in is gone. Hidden without `VIEW_OPERATOR_PAYMENTS` |
| ~~Sourcing response history~~ | ✅ Shipped — response rate, win rate, average response time and last asked |

**Reviewed 8 Oct 2026** (review row 7), owner tested and signed off 8 Oct. Fixed:

- **Permissions per person.** Reads need only a staff session (pickers in
  six modules); writes need Operators · Create / Edit / Archive. A referral
  agent is refused as before (`@StaffOnly`).
- **The screens hide what a person cannot do** — Add, Edit, Remove, Restore,
  bulk, checkboxes, Request Quote.
- **Figma vs. the build, settled by the owner:** Suspended added; safety a
  0–5 number as in Figma (the owner chose it over a list of audits);
  response speed and payment terms as dropdowns; payment terms kept though Figma lacks it (Operator Payments
  reads it); documents added to the form. Certificate number and insurance
  expiry are not fields — they are vault documents with an expiry date.
- **Migration `20261008120000_operator_choices`**, hand-written: every typed
  value that matches a choice is carried across, anything else is appended to
  the notes ("… (as entered before 8 Oct 2026)") — tested on the pre-wipe
  backup, where every real value mapped.
- **Edit could copy the general phone onto the contact** (the form read the
  table's fallback) — it reads the contact's own fields now.
- **Edit can change, never clear, home base, contact name and email**
  (required on create).
- Overview shows every stored field (contact and general lines, home base,
  aircraft types, payment terms); no grey stars for safety or speed.
- Stats count Suspended on its own instead of folding it into Inactive.
- `OperatorPicker` (on `RecordPicker`) built for the forms that pick an
  operator; each switches on its own review.
- Removed `OperatorDetailHeader.jsx` (imported nowhere).
- Postman `06 · Operators` rebuilt live (`build_operators_folder.py`, 10
  requests, 29 examples); `build_reference_folders.py` deleted.

**Waiting on other modules' reviews**

| What | Where |
|---|---|
| Refuse a SUSPENDED or archived operator when one is picked | Operator Sourcing, Quotes, Trips, Empty Legs — an `OperatorsService.usable` like `AirportsService.usable` |
| Operator pickers on `OperatorPicker` | Aircraft, Sourcing, Quotes, Trips, Empty Legs, Operator Payments |
| A bill's due date from the operator's payment terms | Operator Payments |
| Measured response time beside the desk's Fast/Average/Slow | Operator Sourcing (the scorecard already counts it) |

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
wired to nothing. ✅ It is now the **Documents** tab — the client's folder in
**Document Vault (#22)**, shipped 29 Sep 2026.

**Reviewed 9 Oct 2026:**
- **Moved to per-user permissions & open reads:**
  - `@StaffOnly()` on controller (desk data, referral agents refused 403).
  - Open staff `GET` reads without `@RequireAccess` for picker compatibility.
  - Writes require `@RequireAccess(Module.CLIENTS, Action.CREATE / EDIT / ARCHIVE)`.
  - Reach filters Prisma queries (`reachOf(user.access, Module.CLIENTS)` == ASSIGNED → `assignedBrokerId: user.id`).
- **Server-side validation of picked foreign keys:**
  - `homeAirportId` checked with `AirportsService.usable(id, 'home airport')`.
  - `assignedBrokerId` verified active staff broker/admin; reassigning checks `canDo(user.access, Module.CLIENTS, Action.ASSIGN)`.
- **Company settings integration (§26):**
  - Create defaults `leadStage` to `SettingsService.read().defaultLeadStage`.
- **Frontend upgraded:**
  - Table, toolbar, rows, cards, dialogs, detail header, follow-up banner, and sidebar use `usePermissions()` and hide (never disable) unauthorized actions.
  - `AddClientDialog` and `ScheduleFollowUpDialog` upgraded to use shared `AirportPicker` and `BrokerPicker` (on `RecordPicker` with live search, server-side pagination, page size selector, and unassign support).
  - All form controls unified to `h-10 text-[13px] rounded-md` height and typography parity.
  - `BROKER_ROLES` scoped strictly to `BROKER` (admins excluded from broker pickers).
  - Table checkbox and bulk action hidden when caller lacks `ARCHIVE` permission.
- **Testing & Postman:**
  - Vitest: 10/10 tests in `clients.access.spec.ts` passing; 362/362 backend tests green; Turbopack frontend build 0 errors.
  - Postman: `03 · Clients` folder verified green (11/11 requests passed, teardown archives probe client).

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
| Availability against a date range | **Schedule (#13)** ✅ shows a tail's legs by day (the aircraft filter); a search for free tails over a range is not built |

**Aircraft photos (27 Sep 2026, client adjustment #3's fleet half).** An
exterior and an interior photo per tail (`exteriorImageUrl` /
`interiorImageUrl`, relative upload URLs checked by the shared `uploadUrl`),
uploaded from the Add/Edit form — before the tail exists, on a new one — and
shown in a Photos card on the detail page, with an honest empty slot when
there is none. The upload does not know it is for an aircraft, which is what
makes the create form work. See **Uploads (#28)**.

**Reviewed 9 Oct 2026** (review row 8). Fixed:

- **Permissions per person.** Reads need only a staff session (pickers in
  Quotes, Trips, Sourcing, Flight Tracking, Empty Legs); writes need
  `Aircraft · Create` / `Edit` / `Archive` in the caller's own permissions
  (`@RequireAccess`). A referral agent is refused every route (`@StaffOnly`
  on the controller — fleet is internal desk data).
- **The screen hides what a person cannot do:** Add Aircraft, Edit, Change Status,
  Remove, Restore, bulk actions and the checkbox column are hidden based on
  `canAccess(Module.AIRCRAFT, Action.CREATE/EDIT/ARCHIVE)` (hide, not disable).
- **Picked ids verified on the server:** Home base verified with
  `AirportsService.usable(id, 'home base')` (missing or archived returns 400).
  Operator verified to exist, not be archived, and not be SUSPENDED (400).
- **Forms & Toolbar UI polished:** `AddAircraftDialog` and `AircraftPicker` use the modern
  reusable components (`OperatorPicker`, `AirportPicker`, `CommonSelect`). Form input heights
  standardized to `h-10 text-[13px] rounded-md` matching dropdowns and pickers.
  `AircraftToolbar` restructured: Add Aircraft sits prominently on the left of Row 1 alongside
  tabs; `FilterInput` component created for compact `Min seats` and `Min range (nm)` filters
  matching `SearchInput` and `FilterDropdown` styling.
  `AircraftPicker` (on `RecordPicker`) created for future modules (Quotes, Trips,
  Empty Legs, Flight Tracking).
- **Data honesty:** Empty/null fields in `AircraftCard` and `AircraftTableRow`
  render `"—"`, never omitted or disappeared cells.
- **Postman collection:** `07 · Aircraft` rebuilt on `builder_common.py`
  against port 4100 with 11 requests, 34 live-captured examples, testing staff
  reads, partner 403, and assistant/broker write/archive refusals. Dedicated
  teardown request (`11 · Teardown — archive the probe`) keeps test runs clean.
  Verified with Newman (100% passing, 0 failures, run twice).

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
| ~~Contact / activity timeline on a lead~~ | ✅ Shipped with **Email Templates (#21)** — the lead page shows the client timeline: notes, changes and emails sent |
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

**Reviewed 9 Oct 2026** (review row 12):
- **Unified permission & access model:**
  - Writes on the clients API now accept `Module.LEADS_AGENTS` in addition to `Module.CLIENTS` via `altModule` support on `@RequireAccess()`.
  - Service methods (`assertMayAssign`, `assertMayArchive`) respect `LEADS_AGENTS · ASSIGN` and `LEADS_AGENTS · ARCHIVE`.
  - Frontend (`LeadsAgentsContainer`, `AddLeadDialog`, `LeadDetailPage`, etc.) wired to `canAccess(Module.LEADS_AGENTS, Action.X)`.
- **Company settings integration (§26):**
  - Integrated company settings: pre-fills default lead stage (`settings.defaultLeadStage`) and automatically calculates initial follow-up date based on `settings.followUpIntervalDays`.
  - Server-side defaults `nextFollowUpAt` for new leads from `settings.followUpIntervalDays` when omitted.
- **Frontend component modernization & design system parity:**
  - Upgraded `AddLeadDialog`, `AssignBrokerDialog`, and `ScheduleFollowUpDialog` to use shared `BrokerPicker`, `AirportPicker`, and `CommonSelect`.
  - Form field heights standardized to `h-10 text-[13px] rounded-md px-3 py-2`.
  - Reassignment picker restricted to active staff brokers.

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
| Emailing the request to the operator | **Email Templates (#21)** ✅ shipped — it can email an operator, but has no trip-request merge fields yet, so the request's route and date would have to be typed |
| Operator document upload and field extraction (§6.9) | Upload ✅ with **Document Vault (#22)** — the operator's folder takes their documents. *Extraction* is not modelled anywhere: no parser exists, and a filed document is read by a person |

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
| Print-ready / PDF output and a branded quote document (§6.10) | **A PDF generator** — nothing in this system produces a document. The vault (#22) stores files; it does not make them, which is what this line used to wrongly wait on |
| ~~Emailing the quote to the client~~ | ✅ Shipped with **Email Templates (#21)** — "Email to Client" on the quote page; the quote is marked sent once a mail server accepts it |
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

**Second pass from Itineraries (#12), 28 Sep 2026:** `TripFlightInfoCard`'s
Confirmed Flight/Arrival Time boxes, `TripFlightRouteCard`'s outbound arrival
time, and `TripConfirmationCard`'s "Itinerary sent" tick all read a small
itinerary summary now carried on `TRIP_DETAIL_SELECT`
(`id`, `status`, `confirmedAt`, `sentAt`, `flightTime`, `arrivalTime`).
"Payment received" on the same checklist was wired in the same pass, from
`clientBilling` — Receivables' (#16) own figure, left unwired until now.

**Still waiting:** `avgUtilization` (no module records flight hours),
`IN_SERVICE` derived from trips, the Agent "associated trips" panel (buildable
now), and the board's "All Payments" filter (buildable now — needs the
trips API to work out matching ids, as the receivables list does).

**Second pass from Operator Payments (#17), 28 Sep 2026:** each trip carries
`operatorPayment` (Not Recorded, Due, Partially Paid, Paid, Overdue, with
owed, paid and balance) — the board's "Op Pmt" column and the trip page's
operator bills, where a bill is recorded and paid. Absent for a role without
`VIEW_OPERATOR_PAYMENTS`.

---

## 12. Itineraries ✅ *(28 Sep 2026)*

**A thin document over its trip, deliberately.** The passenger-facing document
for a trip: tail, times, passengers and passport numbers, catering, ground
transport, FBO handling, confirmed or pending. Aircraft, operator, tail
number, route, dates and the passenger manifest are **never columns on
`Itinerary`** — they are the trip's own facts (`Trip`, `TripLeg`,
`TripPassenger`), read through the required, unique `tripId` on every render.
Storing a second copy here is the figure-beside-its-parts mistake this project
already forbids for money, generalised: the day a trip is rebooked onto a
different tail, a copied aircraft name on the itinerary would go on saying the
old one, and nothing on screen would say which is right. This is a real
finding against the 24–25 September dummy build below, not a preference —
its form let a broker type an aircraft, tail and route independent of the
trip it claimed to be linked to, which is exactly that bug.

**Working now**

- `Itinerary`, one per trip (`tripId` unique, required) — status `PENDING` /
  `CONFIRMED`, `confirmedAt`; `sentAt` / `sentById`, the same "marks it,
  does not deliver" a quote's Send makes (emailing it is a separate act,
  Email Templates #21, which marks it sent on delivery); logo upload; the outbound leg's arrival
  time ("HH:MM", nothing else in the schema tracks one — `TripLeg` keeps only
  departure), flight time and miles as free text, the same split Aircraft's
  speeds make; catering; ground transport; the operator's own itinerary file
  and a text fallback, attached for reference and never parsed (no extraction
  pipeline exists anywhere in this system); notes
- **FBO is a document-level override over a fact Airports already had.**
  `Airport.assignedFbo` — "the FBO the desk defaults to when building an
  itinerary here" — shipped with Airports and sat unused until now. An
  itinerary's `departureFbo` / `arrivalFbo` override it only when set; the API
  returns the *effective* value (override, or the airport's own default) and
  the raw override separately, so the edit form can tell "using the default"
  from "deliberately blank". No FBO directory exists for address, phone or
  email — none are stored or invented, on the airport row or here
- **Aircraft photos are the same override `Quote.exteriorImageUrl` makes** —
  absent falls back to the trip's own aircraft's fleet photos (Aircraft, #6),
  with the photo library available on both fields
- `GET /api/itineraries` (search matches the trip's reference, client, tail
  or operator), `/stats` (total, confirmed, pending — no fabricated "pending
  upload" / "awaiting confirmation" split, since nothing in this schema
  distinguishes them), `GET /:id`, `POST`, `PATCH`, `POST /:id/confirm`
  (idempotent), `POST /:id/send`, archive/restore and bulk archive/restore.
  `VIEW_TRIPS` reads, `MANAGE_TRIPS` writes — the same rule Trip Requests
  already applies ("a document is part of the trip it is for, not a separate
  capability") — including archive and restore, deliberately narrower than a
  trip's own admin-only `DELETE_TRIPS`: a broker managing their own trip may
  manage the document attached to it
- **One attempt per trip.** A second `POST` naming a trip that already has a
  document is a 409 pointing at the existing one, unique across live *and*
  archived rows — the same rule Aircraft's tail number and Airport's ICAO
  already make, rather than silently reviving or duplicating
- **An archived trip's document is read-only**, the same split Notes makes for
  an archived subject: `create`/`update` refuse it with a 400 naming the
  reason; the document itself can still be read, archived and restored
- Frontend: the board (URL state, Archived tab, bulk archive/restore, search,
  status filter, cards below `lg`), the Build/Edit dialog with a live preview
  pane (one `ItineraryPreview` component, shared with the saved-record sheet,
  so what a broker composes is pixel-identical to what gets saved), and the
  detail sheet (Confirm, Send to Client, Edit, Archive/Restore, View Trip
  Details — a real navigation to the trip that made this a real link for the
  first time). `dummyData/itineraries.js` is deleted, and with it the static
  FBO address book and aircraft-model list the build form used to offer —
  aircraft now comes from the chosen trip, and FBO from the airport
- **"Download PDF" is gone, not faked** — the same call Receivables made for
  its old "Export" button: no Document Vault (#22), no PDF anywhere in this
  system. "Send to Client" is real (see `sentAt` above) rather than the old
  `alert()` stub

**Second pass on Trips (#11), same day.** Three cards on the trip detail page
had been shipped ahead of this module with an honest "awaiting the operator
itinerary" placeholder, named in their own code comments as waiting on #12:
`TripFlightInfoCard`'s Confirmed Flight/Arrival Time boxes now read the
trip's itinerary when one exists; `TripFlightRouteCard`'s outbound leg shows
a real arrival time instead of a permanent dash; `TripConfirmationCard`'s
checklist gained real "Itinerary sent" and "Payment received" ticks (the
second reads `clientBilling`, already computed by Receivables, #16, and left
unwired). `TRIP_DETAIL_SELECT` carries a small itinerary summary
(`id`, `status`, `confirmedAt`, `sentAt`, `flightTime`, `arrivalTime`) so none
of these cards makes a second request.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Print-ready / PDF output | **A PDF generator** — nothing in this system produces a document; the vault (#22) stores files, it does not make them |
| ~~Emailing the itinerary to the client~~ | ✅ Shipped with **Email Templates (#21)** — "Email It" in the Send dialog; no PDF is attached, because none is generated |
| Extracting flight data from the operator's own itinerary file | **Not modelled anywhere in this system** — the file attaches for reference; typed fields are typed by a person |
| The operator itinerary file opening for anyone but its uploader and admins | **The Itineraries review (#17)** — it is uploaded PRIVATE, so since role restrictions came back on (7 Oct 2026) another broker gets a 404. Serve it through the itinerary (`openVouched` after the itinerary's own scope check), as the vault and referrals do |

**Not done:** Postman `22 · Itineraries` — the builder (`build_itineraries_folder.py`)
is written, syntax-checked, and **not run** (no live server in this
environment); newman has not been run against it. Written by the owner's
instruction without live browser testing; backend `tsc`, oxlint and vitest
(185 tests, 18 files) are clean, frontend eslint reports nothing in the files
changed, and `npm run build` passes.

---

## 13. Schedule ✅ *(28 Sep 2026)*

**Working now**

- **The calendar is trip legs, and stores nothing.** One event per `TripLeg`
  departing in the window, read through `TripsService` under the trip scope
  (`scheduleLegs` / `scheduleCountsByDay` / `scheduleStats`) — the same scope
  the trips board uses, so a broker sees their own trips' legs and the
  unassigned ones. Client, aircraft, tail, operator, broker, status and FET are
  the trip's own facts, read on every request
- `GET /schedule?from&to` — at most 42 days (a month grid's six weeks), in the
  order the legs fly, cancelled trips left off unless asked for;
  `GET /schedule/stats` — Flights Today, In Flight (trips, so a round trip in
  the air counts once), Next 7 Days, Completed Today, under the same filters,
  with the browser's own day as today (`on`); `GET /schedule/calendar?year` —
  the year view's counts per month and per day
- Arrival time and duration come only from the trip's **itinerary (#12)**, and
  only for the outbound leg — the only place either is recorded. Any other leg
  shows "—". Payment status (**Receivables, #16**) shows only to a role that
  may read receivables
- Frontend: day, week, month and year views, the flight panel and the tiles on
  the API; view, day and every filter in the URL. The dummy data is deleted and
  the store keeps only which flight's panel is open. Brokers, operators and
  aircraft in the filters are the real records (shared `useIdFilter`). Query
  keys file under `trips`, so every trip, itinerary and invoice write already
  refreshes the calendar
- Postman builder `build_schedule_folder.py` → `23 · Schedule` (5 requests),
  **written, not run**

**Deviations from the old screen, stated:**

- The status filter offered **"Sourcing"**, a trip request's stage, and the
  broker filter named outside brokerages ("Skyline Partners"). Both now list
  what a trip can actually be: trip statuses and the desk's own brokers.
- The **Departures** and **Arrivals** tiles are gone. Every flight today is a
  departure, and nothing records an arrival date, so either tile would have
  been a copy of another or a guess. Next 7 Days replaces them.
- **Edit Schedule, Update Status, Upload Operator Itinerary** and the year
  view's **Add Flight** did nothing. A leg is moved and a status changed on the
  trip, so the panel opens the trip and its itinerary, and Add Flight is New
  Trip, shown only to a role that may book one.
- The week view's hour rail put 7 AM *below* 8 AM (as the Figma did), which
  would file a real 07:00 departure under an 08:00 one. It is in clock order
  now. A departure outside 7 AM–5 PM sits on the nearest edge row and an
  untimed leg at the top; the card always prints the real time.
- A day in the year view with flights opens that day, not the first flight's
  panel; days with flights carry a dot.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| A leg's reported flight status on the calendar | **Flight Tracking (#14)** ✅ — the API returns it; the calendar does not show it yet |
| Arrival times for return and later legs | Nothing records them — an itinerary holds the outbound only |
| More than 100 legs in one window | Shown as a notice ("first 100 of N") rather than a silent cut; paging the calendar is not built |

---

## 14. Flight Tracking ✅ *(28 Sep 2026 — manual)*

**Working now**

- **Manual by decision (27 Sep 2026).** No flight-data provider: a broker
  reports each flight's state by hand from what the operator says — status
  (Not Departed, Delayed, In Flight, Landed, Diverted), the operator's arrival
  estimate ("HH:MM", local at the destination) and a public tracking link
  (scope §6.12's "flight tracking links"). A flight nobody has reported on
  says **No Update**, never "Not Departed", and nothing is called "live"
- **A flight is a trip leg**, and the leg owns its state: four nullable
  columns on `trip_legs` (`flightStatus`, `flightStatusAt`, `estimatedArrival`,
  `trackingUrl`), written through `TripsService.updateFlight` under the trip
  scope. Migration `20260928160000_add_flight_tracking`, additive only. Kept
  apart from the trip's own status: a round trip's booking is In Flight while
  its outbound has landed and its return has not left
- **The flight's updates are the notes timeline**, subject `FLIGHT` — no
  second note system. Every report is written to the audit log against
  `TripLeg` with its note and estimate, and the timeline replays it beside the
  notes the desk writes about the flight
- `GET /flight-tracking` (window ACTIVE — today onward plus anything reported
  in the air or delayed — TODAY, PAST or all; flight status incl. NONE; the
  calendar's trip filters), `GET /flight-tracking/stats` (in flight, delayed,
  departing today, landed today, due out with no report),
  `GET /flight-tracking/:legId`, `PATCH /flight-tracking/:legId`
  (MANAGE_TRIPS; refused on a cancelled or archived trip, and when nothing
  would change). The leg serialiser is shared with Schedule
  (`trips/trips.legs.ts`)
- Frontend: the board, cards, tiles and panel on the API, the open flight in
  the URL. The panel carries the report form (only for a role that may manage
  trips, and only on a live trip), the tracking link and the timeline. The ETA
  shown is the desk's reported estimate, or the itinerary's planned arrival
  (outbound only), and says which
- Postman builder `build_flight_tracking_folder.py` → `24 · Flight Tracking`
  (8 requests), **written, not run**

**Deviations from the old screen, stated:**

- **The progress bar and "65% complete — Alt 41,000 ft" are gone.** Nothing
  records where a flight is; a percentage would be invented.
- **On Time Rate and Active Airports tiles are gone.** On-time needs actual
  times against scheduled ones, which a manual board does not have; the tiles
  are counts of what was reported instead.
- **Refresh Tracking is gone** — there is nothing to refresh from.
- The dummy data, the store and four unused dummy-bound components are deleted.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Live position, automatic status, delay notifications | **A decision** — a flight-data provider (scope §17); the client has not asked |
| On-time rate | Actual departure/arrival times — not recorded while tracking is manual |
| The reported status on the Schedule calendar | Buildable now — the calendar's API already returns it |

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

## 16–19. The financial modules ✅

- **16 Receivables** ✅ *(28 Sep 2026)* — what clients owe, and what has come
  in. Below.
- **17 Operator Payments** ✅ *(28 Sep 2026)* — what Tribeca owes operators,
  and what has been sent. Below.
- **18 Commissions** ✅ *(27 Sep 2026, for client adjustment #11)* — below.
- **19 Transactions** ✅ *(28 Sep 2026)* — the money ledger, a **view** over
  the three above with no table of its own. Below.

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
| ~~Payment reminders (§9.3 "trigger reminders")~~ | ✅ Shipped with **Email Templates (#21)** — "Send Reminder" on the row, by hand; *automatic* reminders need a scheduled job |
| A printable / PDF invoice | **A PDF generator** — the vault (#22) can hold a signed copy in the trip's folder, but nothing produces one |
| Export | **Settings / Import / Export (#26)** |
| ~~Receivables on the dashboard~~ | ✅ Shipped with **Dashboard (#24)** — the tile, the Financial Attention column and overdue invoices in Today's Priorities. A *daily brief* email needs a scheduled job |
| Paying an invoice from a client's credit | **A decision** — see Client Credits (#30) |

**Deferred by decision:** processing card or wire payments. Scope §17 lists
"whether the CRM only records payments or also processes card/wire payments"
as open; this module records them.

### 17. Operator Payments ✅ *(28 Sep 2026)*

**Working now**

- `OperatorPayable` on a trip — the operator's bill: who billed it (the trip's
  operator by default), the amount, the due date, their own invoice number,
  and OPEN or CANCELLED. Numbered `OP-<year>-<sequence>`
- `OperatorPayablePayment`, the ledger of money sent, withdrawn (never
  deleted) and restorable
- Paid, balance and the state (Due, Partially Paid, Paid, Overdue, Cancelled)
  **computed on every read** with the settling arithmetic shared with
  Receivables (`common/money/settlement.ts`); the state filter works out ids
- The money rules: never paid past the bill, the bill never below what was
  paid, no cancelling or archiving while live payments stand, restore
  re-checked
- Stats — payable, paid, outstanding, overdue, **due this week** — optionally
  for one operator or one trip
- `VIEW_OPERATOR_PAYMENTS` (ALL; OWN for a broker, through the trip's scope) /
  `MANAGE_OPERATOR_PAYMENTS` (administrators and senior brokers only — money
  leaving the company, as with commissions). Assistants and agents: none
- Frontend: the board (URL state, Archived tab, bulk, cards below `lg`), the
  bill dialog with "Use the trip's operator cost", the pay/correct dialog and
  the detail sheet. `dummyData/operatorPayments.js` is deleted; "Send
  Remittance" is not back — see the table below
- **Second passes:** Trips ("Op Pmt", the trip page's operator bills),
  Operators (`totalPaid`, the Payments tab)
- **Shared, not copied** — lifted when this module became the second caller:
  `common/money/settlement.ts`, `common/database/document-number.ts`,
  `common/dto/payments.ts` on the API; `PaymentForm` and `PaymentLedger`
  (`components/common/payments/`) and `toPaymentRow` (`lib/payment.js`) on the
  screen. Receivables moved onto all of them in the same pass
- Migration `20260928120000_add_operator_payments`; Postman builder
  `build_operator_payments_folder.py` → `20 · Operator Payments` (14
  requests), **written, not run**

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Remittance / operator-payment reminders (§6.13) | **Email Templates (#21)** ✅ shipped — it can email an operator, but has no operator-bill merge fields yet, so a remittance would carry no amount |
| ~~The operator's bill as an attached PDF~~ | ✅ **Document Vault (#22)** — file the operator's invoice in the trip's or the operator's folder (category Invoice). It sits beside the bill rather than on it; linking a document to one bill is not built |
| ~~Payables on the dashboard~~ | ✅ Shipped with **Dashboard (#24)** — the tile, the Financial Attention column and bills due in Today's Priorities |

### 19. Transactions ✅ *(28 Sep 2026)*

**Working now**

- **The money ledger**: every payment received on a client invoice (money in),
  every payment sent against an operator's bill and every commission paid
  (money out), one row per movement, by the day the money moved
- **No table.** Each kind is read through the module that owns it —
  `ReceivablesService.movements`, `OperatorPaymentsService.movements`,
  `CommissionsService.movements` — under that module's own row-level scope, in
  one shared shape (`common/money/movements.ts`). A kind the caller has no
  permission for is never read. The page is merged exactly with the shared
  `mergePages` (lifted from the notes timeline, which moved onto it)
- `VIEW_FINANCIALS` opens it; inside, each kind needs its own view permission.
  Read-only: a row opens the bill it settles, where it is corrected or
  withdrawn. A paid commission whose value cannot be known shows "Not yet
  known" and is counted, never summed
- Filters — type, direction, a date range, trip, search — and the order, all in
  the URL; the tiles (money in, money out, net, a count per type) use the same
  filters. A side the caller cannot see is null, and so is the net
- Frontend: the ledger, its tiles and cards below `lg`. The dummy data, store,
  detail sheet, Record Payment and Delete dialogs are deleted — they wrote to
  rows that were never money. `dateField()` joins the shared table-param
  builders for the date range
- Postman builder `build_transactions_folder.py` → `21 · Transactions` (5
  requests), **written, not run**

**Deviation from the old screen, stated:** the dummy page listed *bills* with a
status and a balance — the same rows as the Receivables, Operator Payments and
Commissions boards, a fourth time. A ledger lists *movements*; a bill's
status and balance live on its own board, one click away.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Export (CSV / accounting) | **Settings / Import / Export (#26)** |
| ~~Monthly revenue and profit~~ | ✅ **Reports (#23)** — revenue and profit by month from Trips, and cash collected by payment date |
| Refunds as movements | **A decision** — see Client Credits (#30) |

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

## 20. Tasks Board ✅ *(28 Sep 2026)*

**Working now**

- **`Task`**: title, description, status (the five columns), priority, a due
  day, an assignee (a staff member), a client and a trip as real foreign keys,
  a checklist and notes — the scope's "Notification/Task" entity (recipient,
  type, due date, status, linked entity). Migration `20260928180000_add_tasks`
- **Overdue and due-today are computed on every read** (`tasks.rules.ts`,
  pure, with tests) and filtered in SQL from the due date and status —
  nothing stores them. `completedAt` is stamped on the way into Completed and
  cleared if the task is reopened
- **New permissions `VIEW_TASKS` / `MANAGE_TASKS`**: administrators and senior
  brokers reach every task; a broker or an assistant reaches the tasks
  assigned to them and the ones they wrote (a task names a client, so the
  whole desk's list in front of every broker would be a client directory by
  another route). Archiving is the author's or an administrator's call. A
  linked client or trip must be one the caller may see, checked by
  `ClientsService` / `TripsService`
- `GET /tasks` (views MINE, DUE_TODAY, OVERDUE, HIGH_PRIORITY, ATTENTION;
  status, priority, assignee, client, trip; search by title, TSK-number,
  TJ-number or client; soonest due first — a stated exception to
  newest-first), `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id` (a column
  move is a PATCH), `DELETE` (archive) and restore
- Frontend: the board's five columns each ask the API for their own tasks, so
  each count is the server's; the add/edit form's assignee, client and trip
  are real records; the panel ticks the checklist and moves columns; the
  view, search and open task are in the URL; an Archived view restores. The
  dummy data and the store's data are deleted
- **The notification bell is real now**: *your* tasks due today or overdue,
  from `GET /tasks?view=ATTENTION&assigneeId=<you>`, each opening its task.
  The dummy alerts, the read/unread tabs and the delete buttons — none of
  which had anything behind them — are gone
- Postman builder `build_tasks_folder.py` → `25 · Tasks` (8 requests),
  **written, not run**

**Deviations from the old screen, stated:**

- **The "Auto" chip is gone.** Nothing raises tasks automatically yet, so no
  card may claim the system did.
- "Trip / Reference" was a text box and "Client" a hardcoded name list; both
  are pickers over real records now.
- "Delete … This cannot be undone" is **Archive**, with Restore.
- There is no bulk archive: the board has no checkbox column to feed one.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Automatic reminders — payment due, quote follow-up, trip reminders (scope §6.22) — raised as tasks or notifications | A scheduled job and the rules for each; not built |
| A Tasks tab on the client and trip pages | Buildable now — `GET /tasks?clientId=` / `?tripId=` exist |
| Browser push notifications | **Settings (#26)** and an open decision on devices (scope §17) |

---

## 21. Email Templates ✅ *(28 Sep 2026)*

**Working now**

- **`EmailTemplate`**: name, category (Quote Follow-up, Trip Confirmation,
  Client Update, Empty Leg, Payment, Travel Agent, General), subject, body,
  and `active` — offered when composing, or kept but switched off. Archive
  and restore, single and bulk. Five starter templates are seeded (created
  only when absent, so a re-seed never overwrites the desk's edits)
- **Merge fields** — `{client_name}`, `{route}`, `{total_price}`,
  `{amount_due}` and 20 more — from **one catalogue** (`email.fields.ts`,
  served at `GET /email-templates/fields`) that the editor, the save check
  and the send all read. A field is filled only from the record it names,
  read through the module that owns it, under the sender's own scope and
  read permission; one that cannot be filled stays as its `{token}` and is
  named. Nothing goes out with a token in it, and a token the catalogue does
  not have is refused on save. Pure functions with tests (`email.merge.ts`)
- **`EmailMessage`** — the scope's "Communication" (§10): every email sent,
  as sent (a snapshot, never re-rendered), with its recipient, template,
  sender, and the client, operator, trip, quote and invoice it was about, as
  real foreign keys. `status` says what happened: **SENT** (a mail server
  accepted it), **LOGGED** (no mail server configured — delivered to nobody,
  and every screen says so) or **FAILED** (refused; a 502, and the attempt is
  still recorded). Migration `20260928200000_add_email_templates`
- **Delivery is the system's mail server** (the SMTP that sends sign-in
  codes), with the sender as Reply-To so the client's answer reaches them.
  The scope leaves the Gmail workflow open (§17); this is the direct
  implementation until it is decided, and a Gmail transport would replace
  the delivery without changing a screen
- **Permissions:** `MANAGE_EMAIL_TEMPLATES` — READ for brokers and
  assistants (use the library), ALL for administrators and senior brokers
  (change it); `SEND_EMAILS` — ALL for administrators and senior brokers, OWN
  for brokers and assistants (about a client or trip they may see; the sent
  log shows theirs and those). Emailing about an invoice also needs
  `VIEW_RECEIVABLES`, and so on for each record — a preview can never fill a
  figure its sender could not open
- **Each email lands on the timelines** of the client and the trip it was
  about (`email.sent` / `email.failed` audit entries), worded by
  `lib/timeline.js` — LOGGED reads "not delivered"
- `GET/POST/PATCH/DELETE /email-templates`, `bulk-delete`, `bulk-restore`,
  `:id/restore`, `stats` (live, active, categories in use, sent this month),
  `fields`; `POST /emails/preview`, `POST /emails`, `GET /emails`,
  `GET /emails/:id`
- Frontend: the screen is on the API — Templates, **Sent** and Archived tabs,
  URL state, real tiles, bulk archive/restore, the detail sheet with the
  catalogue, the editor with click-to-insert fields. **One shared compose
  form** (`components/common/email/ComposeEmailDialog.jsx`) serves every
  screen that emails somebody. Dummy data, `createTripOptions.js` (its last
  users were this and Tasks), the Send and Delete dialogs and three unused
  duplicate components are deleted
- Postman builder `build_email_templates_folder.py` → `26 · Email Templates`
  (15 requests), **written, not run**. It emails a probe client on
  `example.com`, never a seeded one

**Second pass — the screens that were waiting on #21**

- **Quotes:** "Email to Client" on the quote page, opening on a follow-up
  template with the quote's figures; once a mail server accepts it, the
  quote is marked sent. "Send to Client" is now **Mark as Sent** — it always
  only marked it, and now says so
- **Itineraries:** Send offers "Email It" (then marks it sent) or "Mark as
  Sent" for a hand-off made another way. The document is not attached —
  the email carries the trip's facts
- **Receivables:** "Send Reminder" on a sent invoice with a balance, back
  from the old screen, opening on a payment template
- **Trips:** "Email Client" on the trip's action bar
- **Clients:** "Send Email" in the client page's More menu
- **Leads:** the lead page's Activity Timeline is the client timeline now —
  notes, changes and emails — instead of an empty card waiting on
  "Communications"

**Deviations from the old screen, stated:**

- `{agent_name}` and `{commission_amount}` are not merge fields: a travel
  agent is a client here, so `{client_name}` names them, and a commission is
  never shown to a client. The dummy commission template is not seeded.
- The dummy templates promised "the secure payment link below" and "attached
  you will find your briefing". Neither exists, so the seeded ones say
  neither.
- "Delete … This cannot be undone" is **Archive**, with Restore.
- The Categories tile counted seven of six options; it is now **Categories
  in use**, from the library.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Scheduled emails — seven-day, day-before, day-of (§6.17) | A scheduled job; not built |
| Weather in day-of-trip emails (§6.17) | A weather provider — an open question for the client |
| Gmail send (open for review, or direct) and Gmail import | **A decision** (§17, "exact Gmail send workflow") and Google API access |
| Attaching the quote or itinerary PDF | **A PDF generator** — nothing produces one; attaching a *filed* vault document to an email is not built either |
| Emailing a sourcing request to an operator | Trip-request merge fields — a request is not a trip, so `{route}` has nothing to read yet |
| Operator remittance (§6.13) | Operator-bill merge fields — the compose form addresses an operator already, but a remittance with no amount is not one |
| Empty-leg campaigns to many clients at once | A bulk send, and a rule for who may be emailed; one at a time works today |
| An HTML email body | Plain text only; the mail interface already takes `html` when a design exists |

---

## 22. Document Vault ✅ *(29 Sep 2026)*

**Working now**

- **`Document`** (scope §6.18, §10): a title, a category — Passport, ID,
  Charter Agreement, Wire Confirmation, Invoice, Itinerary, Insurance
  Certificate, Operator Certificate, Catering Request, Other — an optional
  expiry date, notes, and **exactly one owner**: a client, a trip or an
  operator, as three real foreign keys with a CHECK constraint. The file is an
  **upload by foreign key**; its name, size and type are read through it,
  never copied. Migration `20260929100000_add_document_vault`
- **Scope is the owner's.** A document is readable exactly when its client,
  trip or operator is — `ClientsService.visibleWhere`,
  `TripsService.visibleWhere`, operators for anyone who reads them — so a
  broker sees the folders of their own clients and trips and nothing else
- **Passports and IDs are restricted** (scope §11): the new
  `VIEW_SENSITIVE_DOCUMENTS` (administrators, senior brokers, brokers on their
  own clients; not assistants). Without it they are absent from every list and
  a 404 when named; the timeline names them by category, never by title
- **The file opens through the document**: `GET /documents/:id/file` checks
  the document is in scope, then streams its upload — the second sanctioned
  caller of `UploadsService.openVouched`, after referral attachments. Filing
  requires a file the caller may read, so the vouched read can never publish
  someone else's private upload
- **Expiry is computed, never stored**: None, Valid, Expiring (within 90
  days) or Expired, from `expiresOn` and the desk's today, with the list
  filter and the badge one rule (`documents.rules.ts`, pure, with tests)
- **Permissions:** `VIEW_DOCUMENTS` (ALL; OWN for brokers; ASSIGNED for
  assistants), `MANAGE_DOCUMENTS` (ALL; OWN for brokers — they archive only
  what they filed; none for assistants), `VIEW_SENSITIVE_DOCUMENTS` above
- `GET /documents` (folder, kind of folder, category, expiry, search, sort,
  archived), `/stats`, `/:id`, `/:id/file`, `POST`, `PATCH` (a new `fileUrl`
  replaces the file; the folder cannot change), `DELETE`, restore, bulk
  archive and restore. Filing, editing, archiving and restoring land on the
  **owner's timeline** (`document.*` on the client, trip or operator)
- Frontend: **`/dashboard/documents`** (sidebar: Database → Document Vault) —
  tiles, URL state, filters, Archived tab, bulk archive/restore, cards below
  `lg`; one filing form (`DocumentFormDialog`) and one folder list
  (`DocumentsPanel`) used everywhere
- Postman builder `build_documents_folder.py` → `28 · Documents` (12
  requests), **written, not run**

**Second pass — the screens that were waiting on #22**

- **Clients:** a **Documents** tab, the client's folder
- **Leads:** the lead page's Documents card, which said "arrive with Document
  Vault (#22)", is that folder
- **Trips:** the trip page's "Documents & Links" lists the trip's folder.
  `trips.documentUrls` is **gone** — the migration moved every file it named
  into the vault as an Other document on its trip and dropped the column, and
  the trip form no longer uploads (documents are filed on the trip page after
  saving), so a trip has one document store, not two
- **Operators:** a **Documents** tab — insurance and operator certificates
  with their expiry dates
- **Dashboard (#24):** Today's Priorities lists documents expired or expiring
  within 30 days — scope §6.3's passport-expiry reminder
- The Postman collection's `15 · Trips` examples no longer show
  `documentUrls`

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| Versions of one document | **A decision** — replacing the file keeps the audit entry, not the old file's link; nothing in the scope asks for version history |
| Document retention/deletion rules for passports and IDs | **A decision** — scope §17 lists it as open; nothing is ever deleted meanwhile |
| Generating PDFs (quotes, itineraries, invoices) | **A PDF generator** — the vault stores files, it does not produce them |
| Extracting fields from an operator's document (§6.9) | Not modelled — no parser exists |

---

## 23. Reports ✅ *(4 Oct 2026)*

**Which date counts** — decided 4 Oct 2026 without the client, under deadline
(§17 leaves "report layouts and KPI formulas" open): **revenue, profit,
margin and trip counts by the day a trip departs** (the money is earned when
the flight is delivered; the Dashboard already counted that way), **cash and
FET collected by the day a payment arrived**, **outstanding AR/AP as of
today**. Recorded in `reports.window.ts`; change it there if the client
answers differently.

**Working now** — every panel reads the API; `dummyData/reports.js` is
deleted and `useReportsStore` keeps only the export dialog.

- **Window**: the period tabs (Today, This Week — Monday first, This Month,
  This Year) or a picked month, quarter or YTD, worked out from the desk's
  own today and sent as `from`/`to` (both included). In the URL, with each
  chart's bucket.
- **Tiles and Financial Summary** (`GET /reports/summary`): revenue, profit,
  margin, trips, averages per trip, FET charged; FET and cash collected —
  each payment carries its invoice's share of FET, so a half-paid invoice has
  collected half its tax; outstanding AR and AP. The panel says under itself
  how many trips were left out of revenue (no price) or profit (no operator
  cost) rather than hiding it.
- **Charts** (`GET /reports/series`): revenue and profit, and trips, per week
  (twelve, Monday first), month (the year's twelve) or year (five).
- **Broker performance, top clients, top routes** (`GET /reports/brokers`,
  `/clients`, `/routes`): paged, largest revenue first; a trip with no broker
  is "Unassigned", never credited to anyone; a route is the first leg's.
- **Export** (`GET /reports/export`): one row per trip — reference, departure,
  status, client, broker, route, aircraft, operator, revenue, FET, operator
  cost, profit, margin — over the window or everything on record, as **CSV**
  or **Excel (.xlsx)**. Unknown figures are blank cells, never zero; formula
  text is defused. Written by `common/export/tabular.ts`, which #26 reuses.
- **One copy of the arithmetic**: trip figures are summed by
  `tallyTrips` in `trips/trips.figures.ts`, which the Dashboard's tiles now
  use too, so the two screens cannot disagree about the same trips.
- Module `modules/reports/` (window and bucket arithmetic in
  `reports.window.ts`, DTO checks, all with tests); Postman builder
  `build_reports_folder.py` → `29 · Reports` (7 requests, 19 examples),
  **run and Newman-green**. Verified live against probe trips, then archived.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| **Export PDF** (the design's button, removed rather than faked) | **A PDF generator** — nothing in this system produces one |
| Client lifetime value (§6.21) | Buildable now from Trips — not drawn in the design yet |
| Sales funnel and open-quote status (§6.21) | Buildable now from Trip Requests and Quotes — not drawn in the design yet |
| Forecast from open quotes (§6.21) | **A decision** — the probability formula is open (§17) |
| Admin daily activity report (§6.21) | The Dashboard's activity feed exists; a daily digest needs **a scheduled job** |
| 403 examples in `29 · Reports` | **The Reports review (#29)** — restrictions are on again; captured when the folder is rebuilt |

**Open, not decided here:** gross profit includes the FET, because
`priceQuote` computes it as total price minus operator cost — Reports reuses
that so it agrees with Quotes, Trips, the Dashboard and Commissions. Whether
it should is the open question in [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md)
§5; changing it moves every percent-of-profit commission.

---

## 24. Dashboard ✅ *(28 Sep 2026)*

**Working now** — every section reads the API; `dummyData/dashboard.js` and
`useDashboardStore` are deleted.

- **Tiles** (`GET /dashboard/summary?period=&on=`): upcoming trips (active,
  departing today or later), open requests and how many await sourcing, and
  for the chosen window — Today, This Week (Monday first), This Month, This
  Quarter, Year to Date — revenue, gross profit with margin, and FET charged
  on booked and flown trips *departing* in it, each against the window before
  ("+18% vs last week", or no badge with nothing to compare). Client
  receivables and operator payments outstanding with their overdue counts;
  empty legs on offer and matched. The period is in the URL.
- **Today's Priorities** (`GET /dashboard/priorities`): client follow-ups due
  by today, the caller's own tasks due by today, and invoices and operator
  bills still owed that are overdue or due within three days — most overdue
  first, each opening its record.
- **Recent Activity** (`GET /dashboard/activity`): the audit trail, newest
  first — everybody's activity on the kinds of record the caller can see all
  of, their own on the rest; each entry names its record ("TJ-1048", a
  client) and links to it. Sign-ins are never listed.
- **Upcoming Follow-ups**: the clients list with `followUp=SCHEDULED`.
- **Upcoming Trips**: the trips list with `departure=ONWARD&activeOnly=true`,
  each row opening the trip.
- **Financial Attention**: the receivables and operator-payments lists with
  `open=true`, soonest due first, and their own stats for the totals.
- **Empty Leg Opportunities**: unchanged since #15.
- **Scope**: every figure is read through its owning module, in the caller's
  row scope and behind that module's read permission. A section the role may
  not read is absent — an assistant sees no money tiles and no Financial
  Attention — never zero.
- Module `modules/dashboard/` (period arithmetic in `dashboard.period.ts`
  with tests, the activity visibility rule in `dashboard.activity.ts`);
  Postman builder `build_dashboard_folder.py` → `27 · Dashboard` (7
  requests), **written, not run**.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| "Ask Anything" in the header | **AI Assistant (#27)** |
| A daily brief by email | **A scheduled job** — nothing in the system runs on a timer yet |

**Deferred by decision:** the sparkline graphs the design drew on each tile.
They were static images — a trend nobody computed — so they are gone rather
than shown; a real series needs a per-day query per tile, which nobody has
asked for yet.

---

## 25. Client Portal ⬜

**No screen exists.** Waits on Trips ✅, Quotes and Documents, and needs a
**separate authentication surface** — it is not the staff login with a different
role.

---

## 26. Settings / Import / Export / Backup — Settings ✅, Import/Export 🟡 *(screens 6 Oct, API 7 Oct, signed off 8 Oct 2026)*

**Reviewed and signed off 8 Oct 2026** (review row 4, owner tested). The
review built the API, branded every surface from it (portal included), made
the contact block all or nothing, accepted AVIF logos, and hid Integrations
and Import.

> **Left for later — on purpose, each with its owner:**
>
> - **Import and Export** — review row 31 (tell the owner when we reach it).
> - **Each module's settings** — wired in that module's review (the table
>   below and the map in MODULES.md §26): Clients, Leads, Quotes, Trips,
>   Itineraries, Flight Tracking, Receivables, Operator Payments, Tasks,
>   Email Templates.
> - **Reminders actually firing** — needs a scheduler in the API.
> - **"Logo on documents", "Show broker contact", PDF header** — the PDF
>   generator (review row 32).
> - **A separate logo for dark backgrounds** — offered, not requested.

**One set of settings for the whole company** (owner's decision, 7 Oct
2026), never per user: the `company_settings` table holds exactly one row
(a CHECK keeps `id = 1`; the migration inserts it). `/dashboard/settings`
has five sections, the open one in the URL (`?section=`).

**Working now**

- **`GET /settings`** (Settings · View) and **`PATCH /settings`** (Settings ·
  Edit) — one object per screen; a screen saves only the fields it changed.
  Unknown keys and values a screen does not offer are 400s. Every change is
  audited as `settings.updated` with `{ field: { from, to } }`.
- **Public branding** — `GET /settings/branding` (name, logo address; email,
  website, phone, address only while "Show company contact block" is on;
  the three document switches) and `GET /settings/branding/logo` (the logo
  image, only that one file). No session needed: **every sidebar and the
  sign-in page read the logo from it** (`BrandLogo`), with the built-in
  Tribeca marks while none is uploaded.
- **The company brand reaches every surface that is not a module still
  waiting for review:** the logo (`BrandLogo`) on the sidebars, sign-in
  card and hero, splash, loading screen and 404; the letterhead on every
  detail sheet (`TribecaLetterhead`); the browser tab titles; the sign-in
  and reset wording; the referral portal's wording and the assistant's
  title; and every email's header, footer, subject and sign-off (logo by
  absolute public URL, name otherwise). AVIF logos are accepted.
- **The contact block is all or nothing** (owner's rule, 7 Oct 2026): on,
  the letterhead shows the company name, website, email, phone and address
  (whichever are filled in); off, it shows none of them — only the logo.
- **Company & Branding** — profile, logo upload / replace / back to built-in
  (checked to be a live image), contact-block preview that follows its
  toggle, three document toggles.
- **Security & Session — read by Auth now:** the inactivity timeout (the
  server's idle limit and `/auth/me` → `session`; the
  `AUTH_IDLE_TIMEOUT_MINUTES` env var is gone), the warning length and
  whether it shows (the browser's watcher), and **require 2FA for
  administrators** (SUPER_ADMIN and ADMIN get an emailed code at sign-in
  whether or not they turned two-factor on; off by default). Change Password
  and the sessions list were already live.
- **CRM & Quote Defaults** and **Notifications & Automation** — saved and
  shown; each screen says what reads them and when (below).
- Read-only without Settings · Edit: no Save, no upload, controls disabled.
- Postman `30 · Settings` — 5 requests, 16 captured examples, restores every
  value it changes; 12 unit tests (branding never leaks, the audit diff,
  validation).

**Hidden (owner's decision, 7 Oct 2026)**

> ⚠️ **Import is hidden, not dropped.** The Import card is behind
> `IMPORT_ENABLED` in `DataSection.jsx`. It is built in **Import / Export
> (#31)**, which also builds Export (the card stays visible and says it is
> not connected). **When the review reaches #31, tell the owner** — they
> asked to be reminded.
>
> **Integrations is hidden**: three static links that stored nothing.
> `IntegrationsSection` and `QUICK_LINKS` remain; adding `integrations` back
> to `SETTINGS_SECTIONS` restores it.

**Read by a module when that module is reviewed** (the map in MODULES.md §26)

| Setting | Module that will read it |
|---|---|
| Markup, quote validity, FET %, apply FET, quote terms | Quotes (#15), Trips (#16) |
| Follow-up interval, lead stage | Clients (#9), Leads & Agents (#12) |
| Company name, contact, logo on documents, broker contact | Email Templates (#27), Itineraries (#17), the letterhead, the PDF generator |
| Notification channels, flight alerts, reminders and timing | A reminder scheduler and notification inbox — with Tasks & bell (#26 in the review order) and Flight Tracking (#19) |
| "Use the company logo on documents", "Show assigned broker contact" | The quote and itinerary documents — Quotes (#15), Itineraries (#17), the PDF generator |

**Waiting on a dependency**

| Removed or inert | Why | What brings it back |
|---|---|---|
| ~~Every Save (all sections)~~ | ✅ The Settings API, 7 Oct 2026 | — |
| Overview tab | Repeated the nav; its toggles duplicated other tabs | Nothing — a real status page, if wanted, reads live health |
| "Preview PDF Header" | No PDF generator | The PDF generator |
| "Client & trip behavior" toggles (notes timelines, admin keeps deleted clients) | Always-on system rules, not preferences | Never a toggle |
| Session "Location" column | Needs a paid IP-lookup service | A geo-IP provider, if the client pays for one |
| New-device login alerts, remember trusted device | Features nobody asked for | A client request |
| "Audit & deletion safeguards" toggles | Always on | Never a toggle |
| WhatsApp Business | No integration | WhatsApp Business API |
| Weather alerts | No weather data feed | aviationweather.gov integration |
| Empty-leg email importer | No mailbox parser | Inbound email integration |
| Flight alerts to clients | Flight tracking is manual | FlightAware AeroAPI |
| Reminders actually firing | No scheduled job runs | A scheduler in the API |
| Gmail / Google Calendar / Cloud Storage / Weather / Flight Tracking API rows | Their "Connected" badges were invented | Each row returns when its service exists, showing a measured status |
| API & webhooks panel | No public API | A public API, if ever scoped |
| Validate Import, Export XLSX/CSV | No import/export endpoint (exports will reuse `common/export/tabular.ts`) | Import & Export API |
| Excel column mapping | An `.xlsx` header needs the server to read it | Import API |
| "File Format" dropdowns | The format is read from the file | Never |
| "Period" dropdown | The start and end dates are the period | Never |
| "Import safeguards" toggles | Preview and history preservation are always on | Never a toggle |
| Backup on/off, frequency, destination, Run Now, Download, Restore upload, "Healthy" / last-backup | Backups run on the server (03:00 UTC to R2); a browser restore is too dangerous; the status was invented | A read-only status from the server, if wanted |
| Record retention section | "Nothing is ever deleted" makes retention periods meaningless | Never |

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

**Reviewed 7 Oct 2026 — owner signed off**

- **Every broker and assistant could open every private file.** "Is this an
  administrator?" was asked of the role matrix, which answered SUPER_ADMIN for
  everyone while restrictions were off. It now reads the stored role
  (`isAdministrator`): SUPER_ADMIN and ADMIN read every file; everyone else
  only public files, their own uploads and what is filed about them.
- **Any signed-in user could remove a public file** — an aircraft photo, a
  brochure — because removing only checked reading; the file then stopped
  serving on every record using it. Remove and restore now need the uploader
  or an administrator (`mayManage`): 403 for someone who can see the file,
  404 for someone who cannot. The person a document is filed about can no
  longer remove it.
- **The partner rules** (an agent's upload is private with no owner; an
  agent lists only their own) read the stored role, so no switch can turn
  them off.
- **Role restrictions switched back on**, both sides, at the owner's request.
- The broker Documents tab is offered only to an administrator or on your own
  record — anyone else would get the API's 403.
- Storage layout kept flat and content-addressed (owner's decision): R2 and
  local disk alike, the bucket private, files served only through the API.
- Postman `11 · Uploads` rebuilt on `builder_common`, with the refusals that
  could not be captured before: another broker's 404 on fetch, describe and
  remove; a broker filing into someone else's folder; an agent publishing;
  an agent's own-only list; a PDF renamed `.png`; a zip stored opaque.
- **Files of 10–25 MB failed with a 500 from the app.** Next buffers a
  request through its server only up to 10 MB by default; the API was fine.
  `proxyClientMaxBodySize: "26mb"` in `next.config.mjs`, paired with the
  25 MB document limit.
- **Accented filenames were garbled** ("Résumé" stored as "RÃ©sumÃ©"):
  multer reads the name as latin1. **A name over 255 characters 500'd** on
  the column. Both fixed by `cleanFilename` (`common/files/filename.ts`),
  which also drops a client-side path and control characters.
- **PDFs could not be picked** where a field takes images *and* documents
  (operator itinerary, referral attachments): `image/png,…,` with the empty
  "any file" entry offers images only. `FileUpload` now treats a list that
  includes "any" as no filter.
- **A HEIC, TIFF or BMP photo was refused** in "auto" fields (the vault,
  referral attachments): any `image/*` went to the strict image route. Only
  JPEG, PNG, WebP and GIF go there now; anything else is a document.
- **Size is checked before the upload** (15 MB image, 25 MB document) with a
  toast, instead of after the bytes have travelled.
- **A missing object no longer names its storage path** in the 404, and on
  R2 an outage is no longer reported as "file not found".
- **A partly filled R2 configuration refuses to start** rather than falling
  back to local disk, and production on local disk logs a warning at boot.
- Removed `StorageService.uploadFor` / `buildKey`: unused, and a second way
  into storage with date folders and the sender's content type.
- Tests: 6 more on the access rule (who manages, who administers), 9 on
  `cleanFilename`; the five that were skipped while the switch was off now
  run.

**Working now**

- **`POST /api/uploads/image`** and **`POST /api/uploads/document`** — the whole
  write surface. A screen uploads, gets a **URL**, and stores that URL on
  whatever record it was editing. Nothing in the upload path knows what a file
  is *for*, so a new upload spot anywhere in the product needs no backend change
- **The content type is read from the bytes**, never the upload header, so
  renaming a file changes nothing. Images are strict (JPEG, PNG, WebP, GIF;
  never SVG). **A document may be any file** since 6 Oct 2026: PDF, DOCX,
  XLSX, text and CSV keep their type, anything else is stored as
  `application/octet-stream` and always downloads
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
- 9 Postman requests, 28 captured examples, real multipart fixtures, a teardown
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

## 29. Notes / Timeline ✅ *(Clients, Trips, Referrals, Flights)*

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

**Reviewed 9 Oct 2026** (review row 10):
- **Polymorphic per-user permissions:** `notes.subjects.ts` links each `NoteSubjectType`
  to its respective `Module` (`CLIENTS`, `TRIPS`, `REFERRALS`, `FLIGHT_TRACKING`).
- Capabilities evaluate `canDo(user.access, module, Action.VIEW / Action.EDIT)` and `reachOf`.
- Assistants hold no financial privileges and cannot write notes on client financial context.
- Author-only editing rule preserved; administrators hold moderation rights (withdraw/restore).
- Unit tests added: `notes.access.spec.ts` (7 tests, 100% passing).
- Frontend: `NotesTimeline.jsx` and `timeline.js` updated to use `SUBJECT_MODULE` with `canAccess` and `canModerate`.

**Waiting on a dependency**

| Feature | Blocked by |
|---|---|
| ~~A timeline on the trip detail page~~ | ✅ Shipped with **Trips (#11)** — `NoteSubjectType.TRIP` |
| ~~Referral agents reading SHARED notes and nothing else~~ | ✅ Enforced in the service since 27 Sep 2026 (`REFERRAL` subject, partner rules in `notes.service.ts`). The portal screen that shows them to the agent is not built yet — see **Referrals (#32)** |

**Deferred by decision: attachments on a note.** The upload surface exists and a
note could carry a URL, but nothing has asked for it, and a second place that
files documents about a client would compete with Document Vault (#22), which
is now where a client's documents live.

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

**Reviewed 9 Oct 2026** (review row 11):
- **Access control:** Controller decorated with `@StaffOnly()` (blocks partner/referral agents with 403).
- Service checks per-person access: `canDo(user.access, Module.CLIENTS, Action.VIEW / Action.EDIT)`.
- Assistants explicitly forbidden (`user.role === Role.ASSISTANT`) from viewing or writing client credit records.
- Brokers scoped to their assigned clients via `ClientsService.subjectRef` (foreign broker gets 404).
- Unit tests added: `client-credits.access.spec.ts` (5 tests, 100% passing).
- Frontend: `ClientCreditTab.jsx` and `ClientDetailPage.jsx` updated to strictly check assistant role and `canAccess(Module.CLIENTS, Action.EDIT)`.
- UI: Form inputs and selects in `CreditMovementForm.jsx` standardized to standard height (`h-10 text-[13px] rounded-md px-3 py-2`).

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

## 31. Charter Rates / Instant Estimate ✅ *(client adjustment #6 — reviewed and signed off 8 Oct 2026)*

**Working now**

- `GET /charter-rates` — every aircraft category, priced or not
- `PUT /charter-rates/:category` — administrators only; `null` clears;
  audited before/after
- `POST /charter-rates/estimate` — great-circle distance, flight and billed
  hours, estimated cost per category, round trip, fits-the-party
- Instant Estimate dialog on the Quotes screen: estimate → suggested price →
  Start a quote with route, party and price filled in
- Rates tab, editable by an administrator, read-only for everyone else
- Postman `14 · Charter Rates`, restoring the real rate it changed

**Reviewed 8 Oct 2026** (review row 6). Fixed:

- **Permissions** (owner's decision): part of Quotes, not a module of its
  own. Seeing the rates, the Instant Estimate button and running an estimate
  need **Quotes · View money** — rates are money, so not one of the open
  reads; a broker has it by default, an assistant cannot. **Changing a rate
  is for an administrator** (SUPER_ADMIN / ADMIN by stored role); the old
  "senior broker" path is gone with the role.
- **An archived airport is refused by name** ("KTEB has been archived…").
  `AirportsService.usable(id, label)` is the shared check every later module
  uses for a picked airport.
- The estimate re-runs on returning from the Rates tab, so a rate an
  administrator just saved shows at once (it kept the old result).
- A failed estimate says why on screen, not only in a toast.
- "Start a quote" is hidden for someone who cannot create quotes.
- The estimate's airport list is sorted by code, like every other picker.
- Postman `14` gains the broker's read-only access, the broker's estimate,
  and the archived-airport refusal.
- **From / To use the new shared `RecordPicker`** (via `AirportPicker`):
  search always visible, 10 a page by default (10/25/50/100), page numbers,
  server-side — no 100-airport cap. Other forms move to it on their review.
- The estimate keeps its height while it recalculates (previous figures stay,
  dimmed) and shows a skeleton for a new route.

**Waiting on a dependency**

| Feature | Unblocked by |
|---|---|
| The desk's actual rates | **Data entry** — the table is empty until someone types them in; no code |
| Positioning legs / overnight fees in the estimate | **The client's pricing formula** — not modelled rather than guessed |
| More than 100 airports in the other forms' pickers | **`AirportPicker`** (built 8 Oct, used by the estimate) — each form switches to it on its module's review: Clients, Aircraft, Trip Requests, Quotes, Trips, Empty Legs, Leads, the referral portal. |

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

*Updated 7 October 2026.* The full picture of where the project is — the
review stage, what is next, the promises to keep — is **[HANDOFF.md](../HANDOFF.md)**.
In brief:

**Built and usable against the real database:** every module in
[MODULES.md](MODULES.md)'s build table except the Client Portal (#25), the
AI Assistant (#27, a stub), Import / Export (Import hidden, Export not
connected) and the PDF generator.

**The stage:** the owner's module-by-module review (MODULES.md, "Review
order"). Signed off: Auth & Sessions (6 Oct), Users & Roles (7 Oct), Uploads
(7 Oct), **Settings (8 Oct)** — Import/Export left for review row 31.
**Airports (8 Oct)**. **Charter Rates (8 Oct)**. **Operators (8 Oct)**. Next: Aircraft (#8).

**Permissions:** role restrictions are on again (7 Oct); Users & Roles,
Settings, Airports, Charter Rates and Operators are on per-person permissions (`@RequireAccess`), every other module
on the old role matrix until its review moves it.

**Open decisions, not code:** MongoDB vs PostgreSQL (the signed proposal §13
says MongoDB; the project is PostgreSQL, which is right for this relational
data), the flight-tracking data feed (manual until the client asks), whether a
credit **refund** is a movement the desk needs (see #30), and whether gross
profit should count the FET (`CLIENT_ADJUSTMENTS.md` §5) — which also moves
every percent-of-profit commission.

**Known debt** (each fixed on its module's turn): Postman folders 16–28 are
missing from the collection JSON though their builders exist; frontend lint
has one pre-existing error (`set-state-in-effect` in `TripRequestDialog`);
twelve components nothing imports (listed in
[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) §4, 26 Sep) are kept until
their modules are finished.
