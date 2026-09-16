# Tribeca Jets Command Center — the modules, and the order to build them

A working reference for what each module is, what it depends on, and why it
sits where it sits in the queue.

Two applications, deployed separately:

- **`Frontend/`** — Next.js 16, JavaScript. Built first, and it is the
  specification: its dummy data, dialogs, filter dropdowns and table columns
  define the fields and enums the API has to support.
- **`Backend/`** — NestJS 12, TypeScript, ESM, PostgreSQL via Prisma 7.

Every screen listed below already exists in the frontend. "Not started" here
means *not wired to an API* — the screen renders from a file in
`src/dummyData/`. Finishing a module means deleting that file.

---

## The order

The rule is **dependency-first: if B references A, A ships first.** A module
built ahead of its dependencies has to store `operator: "Jet Aviation"` as a
string, and every row written that way becomes a migration, a backfill and a
set of broken joins the day the real table arrives.

| # | Module | Status | Waits on |
|---|---|---|---|
| 1 | **Auth & Sessions** | ✅ Done | — |
| 2 | **Users & Roles** | ✅ Done | Auth |
| 3 | **Airports** | ✅ Done | — |
| 4 | **Operators** | ✅ Done | — |
| 5 | **Clients** | ✅ Done | Users (broker), Airports (home base) |
| 6 | **Aircraft** | ✅ Done | Operators (owner), Airports (home base) |
| 7 | **Leads & Agents** | ✅ Done | Users, Clients |
| 8 | **Trip Requests** *(Open Requests)* | ◐ API done, board pending | Clients, Airports, Users |
| 9 | **Operator Sourcing** | ⬅ **Next** | Trip Requests, Operators, Aircraft |
| 10 | **Quotes** | Not started | Trip Requests, Sourcing, Clients, Aircraft |
| 11 | **Trips** | Not started | Quotes, everything above |
| 12 | **Itineraries** | Not started | Trips |
| 13 | **Schedule** | Not started | Trips (read-only view) |
| 14 | **Flight Tracking** | Not started | Trips, Aircraft |
| 15 | **Empty Legs** | Not started | Operators, Aircraft, Airports |
| 16 | **Receivables** | Not started | Trips, Clients |
| 17 | **Operator Payments** | Not started | Trips, Operators |
| 18 | **Commissions** | Not started | Trips, Users |
| 19 | **Transactions** | Not started | 16, 17, 18 (a union view) |
| 20 | **Tasks Board** | Not started | Users; links to Trips/Clients |
| 21 | **Email Templates** | Not started | — (could move earlier) |
| 22 | **Document Vault** | No screen yet | Trips, Clients, Operators |
| 23 | **Reports** | Not started | All financial modules |
| 24 | **Dashboard** | Not started | Nearly everything — build it last |
| 25 | **Client Portal** | No screen yet | Trips, Quotes, Documents |
| 26 | **Settings / Import / Export / Backup** | No screen yet | All |
| 27 | **AI Assistant** | Stub only | All |

**Why Operator Sourcing is next:** it needs Trip Requests, Operators and
Aircraft, and all three now exist. It is the first module that reads an
enquiry and does something with it.

**The open question about leads is settled**, and the doc settled it. A lead
is not a table: §6.3 puts "lead source and lead stage" on the *client*, and
§6.4 makes the enquiry its own entity. So the Add Lead form writes **two
records** — a Client at lead stage, and a TripRequest for what they asked for.

**Why Dashboard is last** even though it is the first screen a user sees: it
aggregates from every other module. Building it early means writing the same
counts twice — once against dummy data, once for real.

### One decision still open

1. **MongoDB vs PostgreSQL.** The signed proposal (§13) says MongoDB. The
   project is PostgreSQL, which is the right choice for this data — it is
   relational throughout, and half these modules are joins. Needs a
   client-facing decision, not a technical one.

---

## What is already built

### 1. Auth & Sessions ✅

Sign-in, two-factor, forgot/reset password, invitation acceptance.

**How it works.** Sessions are **httpOnly cookies only** — no token is ever
returned to, stored by, or read by the frontend, so a cross-site script cannot
steal one. CSRF is handled by a `tj_csrf` cookie the client echoes back as an
`X-CSRF-Token` header. A global `JwtAuthGuard` protects every route unless it
is explicitly marked public.

Password reset never changes a user's status — a suspended user who resets
their password is still suspended.

### 2. Users & Roles ✅

Invite, edit, change role, suspend, reactivate. Five roles:
`SUPER_ADMIN`, `ADMIN`, `SENIOR_BROKER`, `BROKER`, `ASSISTANT`.

**Authorization runs in three layers**, and every module follows this pattern:

1. **`JwtAuthGuard`** — are you logged in?
2. **`@RequirePermissions` / `@RequireWritePermissions` + `PermissionsGuard`** —
   may your role touch this kind of record at all?
3. **Row-level scope, in the service** — *which* records?

The third layer is the one that matters on a brokerage desk. A permission is
not a boolean; it carries a **scope**:

| Scope | Meaning |
|---|---|
| `NONE` | Rejected outright |
| `READ` | May read, may not modify |
| `ASSIGNED` | Only rows explicitly assigned to this user |
| `OWN` | Only rows this user owns or originated |
| `ALL` | Every row |

So a broker holds `VIEW_TRIPS` at `OWN` scope: they see their own trips, not
the desk's. Rows outside scope return **404, not 403** — a 403 confirms the
record exists, which leaks the client list to anyone who can guess an id.

`SUPER_ADMIN` has the same *capabilities* as `ADMIN`. Its extra power is an
**immunity**: it cannot be demoted, suspended or deleted.

**Users is the one module with no archive/restore.** Suspension is enough — a
user is a person with history attached, and removing the row orphans every
audit trail that points at them. `deletedAt` survives on the table as a
database-level kill switch and to hide legacy test rows, but nothing in the API
or UI writes it.

> **Known gap:** because an invitation cannot be withdrawn and the email stays
> reserved, a mistyped invitation address is currently unrecoverable. Recorded
> in `Backend/AGENTS.md`.

### 3. Airports ✅

The reference table of airports — ICAO/IATA, name, city, country, timezone.

Pure reference data with **zero dependencies**, which is why it shipped early:
Clients, Trips, Empty Legs and Flight Tracking all point at it, and every one
of them would otherwise have stored a bare ICAO string.

### 4. Operators ✅

The charter companies that actually fly the aircraft — contact details,
certifications, reliability rating, commercial terms.

Also dependency-free. Aircraft, Sourcing, Empty Legs and Operator Payments all
reference it.

> Operators has a lot of *back-references* — aircraft, trip history, payments —
> which makes it look dependency-heavy. It is not. Those modules point **at**
> Operator; Operator does not point at them. A back-reference is added in a
> second pass and never blocks the build.

**What was wrong here, and is worth remembering.** The Overview tab ran the
*safety certification text* (`"ARG/US Platinum"`) through `parseFloat`, got
`NaN`, and fell back to `4.9` — so every operator in the system displayed a
4.9/5 safety rating, in stars, that nobody had ever given them. The Add form
pre-filled reliability with `"4.8"`. Both looked like real data. On a charter
desk, an invented safety score is the kind of thing that gets someone hurt.

That incident is the origin of the project's hardest rule: **never display a
number the data did not supply.**

### 5. Clients ✅

The people and companies who charter. List, detail, archive/restore,
follow-up scheduling, broker assignment.

**Two independent axes**, which is the thing to understand here:

- **`status`** — `LEAD / ACTIVE / VIP / INACTIVE`. What this relationship *is*.
- **`leadStage`** — where they sit in the sales pipeline.

They are deliberately not one field. A VIP can be mid-pipeline on a new
request, and a booked client can go dormant without losing VIP standing.

`homeAirport` was a free-text ICAO string, because airports did not exist when
the screen was first built. It is now a real foreign key (`homeAirportId`),
backfilled by matching ICAO — 67 of 67 rows resolved.

**Removal is admin-only.** Brokers hold `MANAGE_CLIENTS` at `ASSIGNED` scope,
so they can edit their own book but not delete from it; the rule lives in
`assertMayArchive` in the service, which the bulk routes inherit.

---

## What each remaining module is

### 6. Aircraft ✅

The individual airframes: tail number, model, category, seats, range, year,
performance and dimensions, amenities, maintenance dates, home base, and the
operator who holds the certificate.

**The tail number is the identity**, unique across live *and* archived rows and
upper-cased on the way in — `n780ex` and `N780EX` are one airframe. Unlike an
archived airport ICAO, re-adding an archived tail is refused rather than
silently reviving it: an archived tail is usually a real aircraft someone wants
back *with its history*, not a code to recycle, so the 409 points at Restore.

**Two axes for "not flying", and they are different.** `status: INACTIVE` means
the tail has left the fleet — still listed, still searchable, history intact.
Archiving is for a row that should not have been entered at all. The remove
dialog says so, because deleting a real aircraft to mean "we stopped offering
it" hides history the desk will need.

**Speeds are free text, everything else is numeric.** Jets are quoted in Mach
and turboprops in knots, so one numeric column cannot hold both without a
second column saying which unit it is in — and a number rendered under the
wrong unit is worse than the string. Range, ceiling, weights, distances and
capacities all have one settled unit, so they are real numbers.

**Maintenance is three dates, and the badge is derived.** The tab shows Last
Inspection, Last Annual and Next Due; Completed / Scheduled / **Overdue** is
computed from the date against today, never stored. A stored status goes stale
the day it passes, and an overdue inspection still reading "Scheduled" is the
kind of wrong answer this project exists to avoid.

**The fleet finder** (scope §6.8) is the point of the module, not a filter bar:
`minPassengers`, `minRangeNm` and cabin preferences answer "what can carry nine
people to Aspen with a galley". All three are *at least* bounds — more seats or
more range still answers the question — and a tail whose figure is missing is
excluded rather than assumed to fit. Cabin preferences must **all** match: a
feature the client asked for is a requirement, so an aircraft missing one is a
wrong answer, not a weaker match. The filter's options come from
`GET /aircraft/amenities`, derived from the rows, so it can never offer a
feature nothing has.

Quotes, Trips, Empty Legs and Flight Tracking all reference aircraft, so this
unblocks a large part of the remaining queue.

> **Deferred: aircraft images.** The scope lists images on the Aircraft record
> (§ data model) and in the passenger itinerary (§6.11). They are not built,
> because **this project has no file-upload pipeline at all** — `multer` is not
> installed and no endpoint anywhere accepts a file; `avatarKey` is only ever
> read. Building the first one inside Aircraft would either be thrown away or
> become an accidental framework. It belongs with **Document Vault (#22)**,
> which needs the same pipeline for contracts, operator documents and quote
> PDFs. A column that nothing can write would be worse than the gap.

### 7. Leads & Agents ✅

Two screens over records that already existed, which is the whole point of
this module:

**A lead is a Client at lead stage.** The scope puts lead source and lead stage
on the client (§6.3), so a separate leads table would have duplicated the
client directory — two rows for one person, drifting apart from the first edit
and splitting their trip history between them. Clients gained `priority` and
`followUpMethod`; the funnel was realigned to the screen the desk works from
(New → Contacted → Qualified → Proposal → Quoted → Won → Lost).

**Converting is a status change, not a copy.** LEAD → ACTIVE and the stage to
WON, on the row that already exists. Notes, preferences, follow-ups and every
enquiry they filed stay attached, because nothing moved.

**An agent is one of the desk's own brokers** — a User, with lead numbers
attached. Travel agents are something else entirely: clients of type
`TRAVEL_AGENT`, in the client directory. The roster is therefore read-only and
has no Add form: staff are invited through Users & Roles, where the permission
matrix and the suspend rules already live. The Add Agent dialog that duplicated
the invite form was removed.

`conversionRate` and `capacityUsed` are **null, not 0%**, when there is nothing
to measure. A new broker showing "0% conversion" is a wrong answer that follows
them around.

### 8. Trip Requests (Open Requests) — API done

A client asks for a flight: route, dates, passenger count, aircraft
preference, budget. The record that *starts* everything downstream — sourcing,
quotes and trips all descend from it.

**The table and API shipped with Leads**, because the Add Lead form writes one.
It has full CRUD, archive/restore, scoping and stats, and the lead detail page
lists a client's enquiries.

**What is still missing is the dedicated board.** The doc's IA lists "Open Trip
Requests" as its own section and the frontend has no page for it — the API
already supports it (`openOnly=true`, the departure window filter, the pipeline
tile), so this is a screen to build, not a module to design.

Uses the **trips** permissions rather than its own: a request is the start of a
trip. `VIEW_TRIPS` to read, `MANAGE_TRIPS` to write, `DELETE_TRIPS`
(administrators only) to archive — because a broker who stops working an
enquiry marks it **Lost**, which keeps it in the conversion figures. Removing
the row would quietly improve everyone's conversion rate, which is the wrong
incentive to build into a sales tool.

### 9. Operator Sourcing

The broker sends a request out to operators and collects what comes back.
Tracks which operators were asked, who responded, and at what price —
"Requested → Sourcing → Pending Operator Quote → Source Complete".

### 10. Quotes

The priced offer to the client, built from a sourced operator price plus
margin and **FET** (Federal Excise Tax). Draft → Sent → Viewed → Approved /
Rejected / Expired. An approved quote becomes a trip.

### 11. Trips

The booked flight, and the centre of the system: client, broker, operator,
aircraft, route, dates, status, client payment state, operator payment state,
FET and profit. Almost every remaining module reads from it.

### 12. Itineraries

The passenger-facing document for a trip: tail number, times, passengers and
passport numbers, catering, ground transport, FBO. Confirmed or pending.

### 13. Schedule

A calendar view of trips. **Read-only** — no new table, just a different
projection of Trips with departures, arrivals and in-flight state.

### 14. Flight Tracking

Live position and status for trips in the air — departure, ETA, delays,
on-time rate. Likely needs a third-party feed, which is a decision to make
before building it.

### 15. Empty Legs

Repositioning flights an operator is flying anyway, offered at a discount.
Available → Matched → Booked → Expired, with matching against open requests.

### 16–19. The financial modules

- **Receivables** — what clients owe: invoices, due dates, collection state.
- **Operator Payments** — what Tribeca owes operators for each trip.
- **Commissions** — what each broker earns on a trip.
- **Transactions** — a single ledger view over the three above. A union view,
  not a fourth table, which is why it comes last of the four.

All four hang off Trips. Money is the reason soft delete is absolute here:
`deletedAt` everywhere, no hard delete anywhere in the system. Financial
history is never destroyed.

### 20. Tasks Board

A kanban of desk work — To Do / In Progress / Waiting on Client / Waiting on
Operator / Completed, with priority, due date and assignee. Tasks link out to
trips and clients.

### 21. Email Templates

Reusable templates for quote follow-ups, trip confirmations, empty-leg blasts
and payment reminders, with merge fields. **No hard dependencies**, so it can
be pulled earlier if the desk needs it before the pipeline is finished.

### 22. Document Vault

Central storage for contracts, itineraries, invoices and operator
certificates, attached to trips, clients and operators. **No screen exists.**
The Clients detail page had an attachment drop zone wired to nothing — it was
removed rather than faked, and belongs here.

### 23. Reports

Revenue, profit, FET collected and trip counts over selectable periods, with
CSV / Excel / PDF export.

### 24. Dashboard

The landing screen: upcoming trips, open requests, revenue, follow-ups due.
Aggregates from everything, so it is built last.

### 25. Client Portal

An external-facing view for clients to see their quotes, trips and documents.
A separate authentication surface. **No screen exists.**

### 26. Settings / Import / Export / Backup

Import and export are **acceptance criteria in the signed scope with no code
written**. So is offline/PWA support. Both need to be scheduled, not
discovered at delivery.

### 27. AI Assistant

Currently four hardcoded suggestion strings. The scope doc describes an
in-app assistant answering questions about the desk's own data.

---

## The rules that apply everywhere

These are enforced across every module, and they are the shortest path to
understanding why the code looks the way it does.

**Never display a number the data did not supply.** No `||` fallback to a
plausible literal, no pre-filled form default, no derived score. If the API
returns null, render an em dash or "Not on file". An honest blank always beats
a confident wrong number. When a module is wired to its API, its
`src/dummyData/` file is **deleted in the same pass** — a module is not done
while a screen can still render something the server never sent.

**Soft delete everywhere, and there is no permanent delete.** Every table has
`deletedAt`, plus who archived it and who restored it. Anything with a
bulk-delete has a bulk-restore.

**Enum values are the backend's `SCREAMING_SNAKE_CASE`**, on the wire and in
the database. The frontend maps them to display labels at the very edge and
never invents its own vocabulary.

**Every list endpoint is paginated** and returns `{ success, data, meta }`.
There are no unpaginated list endpoints.

**Shared by default.** Anything a second module will need lives in
`Backend/src/common/` or `Frontend/src/lib|hooks/common|components/common`.
Write it directly the first time; the moment a second module needs it, lift it
and move the first caller over in the same pass. Never leave two copies.

**Fix a module when we reach it, not before.** When a shared component
improves, only the module currently being worked on gets rewired. This makes
backwards compatibility a requirement of every shared change.

**Read the frontend before writing the schema.** The dummy data, dialogs and
filter dropdowns define the fields and enums. Where the UI and the schema
disagree, that is a real finding — surface it rather than quietly picking one.

**Postman is a deliverable.** Every endpoint gets its entry in the same pass as
the code, with a real captured success example and an example for every error
it can return. Verified with `newman` before it counts as done.

---

## The five gaps between the scope doc and the build

Sections the signed scope's information architecture lists, with no screen in
the frontend at all:

1. Open Trip Requests
2. Document Vault
3. Client Portal
4. Settings / Backup / Import / Export
5. AI Assistant

Plus two acceptance criteria with zero code: **PWA / offline support** and
**import/export/backup**.

None of these are blocked. They just have not been scheduled, and they are the
most likely source of a surprise at delivery.
