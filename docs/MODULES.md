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

> **Three documents, three questions.** Read the right one:
>
> | Question | File |
> |---|---|
> | *What is this module, and why is it here in the queue?* | **MODULES.md** — this file |
> | *What works against the real database today?* | [MODULE_FEATURE_STATUS.md](MODULE_FEATURE_STATUS.md) |
> | *What has the client asked us to change, and what is left?* | [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) |
>
> The rules every module follows — and the incidents that produced them — are
> in **`AGENTS.md`** at the repository root. Read it before writing code; it is
> the whole rulebook, and the conventions in it are not guessable.

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
| 8 | **Trip Requests** *(Open Requests)* | ✅ Done | Clients, Airports, Users |
| 9 | **Operator Sourcing** | ✅ Done | Trip Requests, Operators, Aircraft |
| 10 | **Quotes** | ✅ Done | Trip Requests, Sourcing, Clients, Aircraft |
| 11 | **Trips** | ✅ Done (27 Sep) | Quotes, everything above |
| 12 | **Itineraries** | ✅ Done (28 Sep) | Trips |
| 13 | **Schedule** | ✅ Done (28 Sep) — a view over trip legs | Trips (read-only view) |
| 14 | **Flight Tracking** | ✅ Done (28 Sep) — manual, no provider | Trips, Aircraft |
| 15 | **Empty Legs** | ✅ Done (27 Sep) | Operators, Aircraft, Airports; matching reads Trip Requests (adjustment #10b) |
| 16 | **Receivables** | ✅ Done (28 Sep) | Trips, Clients |
| 17 | **Operator Payments** | ✅ Done (28 Sep) | Trips, Operators |
| 18 | **Commissions** | ✅ Done (27 Sep) | Trips, Users (built ahead of 16–17 for adjustment #11) |
| 19 | **Transactions** | ✅ Done (28 Sep) — the money ledger, a view | 16, 17, 18 (a union view) |
| 20 | **Tasks Board** | ✅ Done (28 Sep) — with the notification bell | Users; links to Trips/Clients |
| 21 | **Email Templates** | ✅ Done (28 Sep) — with sending, and the quote/itinerary/reminder second pass | Clients, Operators, Trips, Quotes, Receivables (merge fields) |
| 22 | **Document Vault** | ✅ Done (29 Sep) — client, trip and operator folders; passports and IDs restricted | Trips, Clients, Operators, Uploads |
| 23 | **Reports** | ✅ Done (4 Oct) — revenue/profit by departure, cash and FET by payment; CSV and Excel export | All financial modules |
| 24 | **Dashboard** | ✅ Done (28 Sep) — tiles, priorities, activity; lists read the owning modules | Nearly everything — built last |
| 25 | **Client Portal** | No screen yet | Trips, Quotes, Documents |
| 26 | **Settings / Import / Export / Backup** | 🟡 Screens only (6 Oct) — no API; see the settings map below | Users, Uploads; every module in the map reads it |
| 27 | **AI Assistant** | Stub only | All |
| 28 | **Uploads** | ✅ Done | — (built out of order; see below) |
| 29 | **Notes / Timeline** | ✅ Done — Clients, Trips, Referrals, Flights | Clients, Users (built out of order; adjustment #5) |
| 30 | **Client Credits** | ✅ Done | Clients, Trips (built out of order; adjustment #9) |
| 31 | **Charter Rates / Instant Estimate** | ✅ Done | Airports (built out of order; adjustment #6) |
| 32 | **Referrals / Referral Agent** | ✅ Done (27 Sep) — desk and agent portal | Users, Clients, Trip Requests, Trips, Commissions, Uploads, Notes (adjustment #11) |

**Trips shipped on 27 September 2026**, with Empty Legs and Commissions
pulled forward after it so client adjustments #10b and #11 could be built
without waiting on the client; #11's agent portal followed the same day, and
**Receivables (#16)**, **Operator Payments (#17)**, **Transactions (#19)**,
**Itineraries (#12)**, **Schedule (#13)** and **Flight Tracking (#14, manual)**
on 28 September — everything that hangs off Trips — the **Tasks Board
(#20)** and **Email Templates (#21)**; the **Dashboard (#24)** and **Document
Vault (#22)** on 28–29 September, and **Reports (#23)** on 4 October. **What is next:** the module-by-module review below, from #1.

**Uploads (#28) was built out of order, on purpose.** It is not in the signed
scope's module list and it is not a client request in its own right: it is the
one piece of infrastructure that **four** of the client's adjustments were
queued behind. Building it inside any one of them would have made it that
module's private code. See [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md).

**Operator Sourcing added one table, not two.** The board's rows are trip
requests being worked — the same record the Open Requests board shows — so the
only genuinely new entity was `OperatorQuote`. That is the second time reading
the doc's data model before the frontend's folder names saved a duplicate
table; the first was leads.

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

## Review order (from 6 October 2026)

The owner now tests and fixes **one module at a time, as SUPER_ADMIN**, in
this order. It is the dependency order above with two changes: the
**Settings API moves up to fourth**, because a dozen modules read a setting
and each should be reviewed against the real value rather than a hardcoded
one; and the modules built out of order (Uploads, Notes, Credits, Charter
Rates, Referrals) sit where their dependencies put them. A module is done
when the owner has clicked through it, not when its tests pass.

**The Review column is the tracker.** When the owner signs a module off,
mark it ✅ with the date in the same pass, and record what the review fixed
under that module in `MODULE_FEATURE_STATUS.md` ("Reviewed …"). ⬜ means not
reviewed yet — the module may still be built and working.

| # | Module | Reads settings? | Review |
|---|---|---|---|
| 1 | Auth & Sessions | Yes — idle timeout, warning, admin 2FA | ✅ 6 Oct — owner tested |
| 2 | Users & Roles | — | ✅ 7 Oct — owner tested |
| 3 | Uploads | — | ✅ 7 Oct — owner tested |
| 4 | **Settings API** (#26, backend for the built screens) | — (it is the source) | ⬜ |
| 5 | Airports | — | ⬜ |
| 6 | Charter Rates / Instant Estimate | — | ⬜ |
| 7 | Operators | — | ⬜ |
| 8 | Aircraft | — | ⬜ |
| 9 | Clients | Yes — default lead stage, follow-up interval | ⬜ |
| 10 | Notes / Timeline | — | ⬜ |
| 11 | Client Credits | — | ⬜ |
| 12 | Leads & Agents | Yes — default lead stage, follow-up interval | ⬜ |
| 13 | Trip Requests | — | ⬜ |
| 14 | Operator Sourcing | — | ⬜ |
| 15 | Quotes | Yes — markup, validity, FET, terms, document identity | ⬜ |
| 16 | Trips | Yes — apply FET by default | ⬜ |
| 17 | Itineraries | Yes — document identity and toggles | ⬜ |
| 18 | Schedule | — | ⬜ |
| 19 | Flight Tracking | Yes — flight alerts to brokers | ⬜ |
| 20 | Empty Legs | — | ⬜ |
| 21 | Receivables | Yes — payment reminders | ⬜ |
| 22 | Operator Payments | Yes — payment reminders | ⬜ |
| 23 | Commissions | — | ⬜ |
| 24 | Referrals / Referral Agent | — | ⬜ |
| 25 | Transactions | — | ⬜ |
| 26 | Tasks Board & notification bell | Yes — in-app channel, follow-up reminders | ⬜ |
| 27 | Email Templates & sending | Yes — company identity, email channel | ⬜ |
| 28 | Document Vault | — | ⬜ |
| 29 | Reports | — | ⬜ |
| 30 | Dashboard | — | ⬜ |
| 31 | Import / Export (#26, the rest) — **tell the owner when we reach it** (Import hidden, Export not connected since 7 Oct) | — | ⬜ |
| 32 | PDF generator | Yes — document identity and toggles | ⬜ |
| 33 | Client Portal (#25) | — | ⬜ |
| 34 | AI Assistant (#27) | — | ⬜ |
| 35 | Offline / PWA | — | ⬜ |

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

> **Aircraft photos shipped 27 September 2026.** This paragraph used to say
> the project had no file-upload pipeline at all. It has one — **Uploads
> (#28)**, built when four client requests turned out to be queued behind it —
> and each aircraft now stores an exterior and an interior photo
> (`exteriorImageUrl` / `interiorImageUrl`) from it.
>
> The upload deliberately does not know it is for an aircraft, which is exactly
> what lets a photograph be chosen on the **Add Aircraft** form — before the
> tail it belongs to exists.
>
> **The picture-picker on an itinerary (24 September 2026) and on a quote
> (25 September, with the Quotes Figma redesign) have both shipped** — the
> itinerary gallery and `Quote.exteriorImageUrl`, both through a shared
> `PhotoTile` component. See
> [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) §3 item 3 and §4. The fleet
> screen followed on 27 September: an upload field for each photo on the
> Add/Edit form and a Photos card on the detail page. Thumbnails and resizing
> stay deferred until something renders enough images at once to need them.

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

### 8. Trip Requests (Open Requests) ✅

A client asks for a flight: route, dates, passenger count, aircraft
preference, budget. The record that *starts* everything downstream — sourcing,
quotes and trips all descend from it.

**The table and API shipped with Leads**, because the Add Lead form writes one.
It has full CRUD, archive/restore, scoping and stats, and the lead detail page
lists a client's enquiries.

**The dedicated page shipped on 19 September 2026**, as client adjustments #8
and #10a — he asked for it twice, five weeks apart. It lives at
`/dashboard/trip-requests` with three tabs: **Active** (`openOnly=true`),
**All Requests**, and **Archived**. His reason for wanting all of them kept is
worth repeating, because it is the whole design: *"most never get booked. We
still want to have access to those trip request data just in case in future
when we have empty legs that can match a previous trip request."*

That is also why the row action leads with **Mark as Lost** rather than Remove.
A lost enquiry leaves the Active tab and stays in the log — which is exactly
what makes it findable when an empty leg matches it later (**Empty Legs #15**).

Uses the **trips** permissions rather than its own: a request is the start of a
trip. `VIEW_TRIPS` to read, `MANAGE_TRIPS` to write, `DELETE_TRIPS`
(administrators only) to archive — because a broker who stops working an
enquiry marks it **Lost**, which keeps it in the conversion figures. Removing
the row would quietly improve everyone's conversion rate, which is the wrong
incentive to build into a sales tool.

### 9. Operator Sourcing ✅

The broker sends a request out to operators and collects what comes back:
which operators were asked, who responded, at what price, and who won.

**It is a view over trip requests plus one new table.** The board's rows are
enquiries being worked, and `OperatorQuote` holds each operator's answer. The
four stages the screen groups by — Requested → Pending Operator Quote →
Sourcing → Source Complete — are **derived from the quotes on every read**,
never stored, for the same reason the aircraft maintenance badge is: a stored
stage is wrong the moment the next operator replies.

**Response time is computed, not remembered.** From the ask to the answer,
every time it is read. A stored "2h" is right for one day and wrong forever
after — and the operator scorecard the desk judges operators by is built on it.

**Only one quote per enquiry can be approved.** A second attempt is refused by
name rather than silently demoting the first: two approved quotes would mean
two operators booked for one flight. Undo is a deliberate act — reopen the
wrong one, then approve the right one — which is also the only way back from a
mis-click, since the board disables both buttons once a quote is settled.

> **Deferred: most of the §6.7 scorecard.** The scope asks for accuracy, hidden
> fees, cabin cleanliness, crew quality and passenger feedback; §17 lists the
> rating scales for all of it as an open decision. Response rate, win rate and
> average response time are counted from real quotes and shipped. The rest is
> absent rather than invented — a score nobody gave an operator is the same
> failure as the 4.9 safety rating.

### 10. Quotes ✅

The priced offer to the client, built from a sourced operator price plus
margin and **FET** (Federal Excise Tax). Draft → Sent → Viewed → Approved /
Rejected / Expired. An approved quote becomes a trip.

**Two quote entities, deliberately.** Scope §10 lists Operator Quote and Client
Quote separately and they are genuinely different records: one is what an
operator charges *us* (#9), the other is what the client pays. Approving an
operator's price does not create the client's offer — the desk decides the
markup — so `operatorQuoteId` links them without making one the other.

**Nothing computed is stored.** `fetAmount`, `extrasTotal`, `totalPrice`,
`grossProfit` and `marginPercentage` are worked out on every read, in one place
(`quotes.pricing.ts`), from the four inputs a person actually typed. A stored
total beside its own parts is the classic accounting bug: the day an edit moves
the base price and the total does not follow, the quote contradicts itself and
nothing on screen says which half is right — and someone reads the wrong half
down the phone. The one place frozen figures *are* correct is `QuoteVersion`,
which answers "what exactly did the client see on the 9th?" and must never
recompute.

**Margins are gated behind `VIEW_FINANCIALS`**, and the keys are *absent*
rather than zeroed — a `0` margin is a number someone could repeat out loud.

> ✅ **The client's pending Quotes UI landed 25 September 2026** — a full-screen
> create/edit form with a live document preview (`QuoteDetailStats` and the
> quote detail page's own cards, reused rather than re-built), an aircraft
> exterior photo (`Quote.exteriorImageUrl`, through `PhotoTile`), and a live
> pricing preview (`POST /quotes/price-preview`, run through the same
> `priceQuote()` the save path uses). That closes the picture-picker half of
> adjustment #3. The instant-quote-calculator half of #6 is **still deferred**
> — the UI it was waiting on now exists; what is left is the client's rate
> data, on the call he offered. See
> [CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md) §3 items 3 and 6, and §4.
>
> **26 September 2026 audit:** the saved quote now shows its photo on the
> detail page (it was visible only inside the form); `exteriorImageUrl` accepts
> only a relative upload URL; delete answers 204 like every other module; and a
> quote whose airport, operator or aircraft is later archived stays editable.
>
> **27 September 2026:** the suggested-price selector (client adjustment #6)
> — pick a markup over the operator cost and it fills the base price, every
> figure from `POST /quotes/suggested-price` — and the photo library on the
> quote photo (#3). The *estimate* half of #6 shipped the same day (#31).

### 11. Trips ✅

The booked flight, and the centre of the system: client, broker, operator,
aircraft, route, dates, status, client payment state, operator payment state,
FET and profit. Almost every remaining module reads from it.

**The single largest unblocker in the project.** Landing it fills in, in the
second pass every module owes its dependants: Users `activeTrips`/`revenue`,
Operators `totalTrips` and trip history, Aircraft
`totalTrips`/`tripsThisYear`/`avgUtilization` and a *derived* `IN_SERVICE`,
Clients' trips tab and total spend, Agents' `activeTrips` — plus it is the
dependency for modules 12, 13, 14, 16, 17, 18, 19, 23 and 24.

**That second pass was made in the same pass as Trips** (27 Sep 2026):
`activeTrips` on Users and Agents, `totalTrips` and trip history on Operators,
`totalTrips` / `tripsThisYear` and the Trips tab on Aircraft, the Trips tab on
Clients, the `TRIP` notes subject and `ClientCredit.appliedToTripId`. What is
left is honest: `avgUtilization` needs flight hours nobody records, spend and
revenue need **Receivables (#16)**, and a derived `IN_SERVICE` is not built.

A trip is legs plus passengers plus the quote's pricing inputs; every total is
computed on read by the quote pricing engine. Its status machine lives in
`trips.lifecycle.ts` as pure functions.

### 12. Itineraries ✅ *(28 September 2026)*

The passenger-facing document for a trip: tail number, times, passengers and
passport numbers, catering, ground transport, FBO. Confirmed or pending.

**A thin document, not a second copy of the trip.** Aircraft, operator, tail,
route, dates and the passenger manifest are never columns on `Itinerary` —
they are read through the required, unique `tripId` on every render, from the
trip's own `Trip` / `TripLeg` / `TripPassenger` rows. That is a stricter
reading of the same rule this project already applies to money: a stored
total beside its own parts contradicts itself the day one moves without the
other, and a copied aircraft name is the identical bug wearing a different
column. The 24–25 September build form, read again against that rule, let a
broker type an aircraft and route independent of whichever trip was picked —
a real finding, not a style choice, so the rebuild removed those fields and
reads them from the trip instead.

What genuinely belongs to the document, because nothing else in the schema
tracks it: the outbound leg's arrival time (`TripLeg` keeps only departure),
flight time and miles as free text, catering, ground transport, an FBO
*override*, the operator's own itinerary file (attached for reference, never
parsed — no extraction pipeline exists anywhere in this system), a
document-specific aircraft photo, and notes.

**The FBO override sits on a fact Airports already had.** `Airport.assignedFbo`
— "the FBO the desk defaults to when building an itinerary here" — shipped
with Airports and sat unused until this module gave it a reader. An
itinerary's own `departureFbo` / `arrivalFbo` override it only when set; the
API returns the *effective* value on read, never inventing an address, phone
or email that has nowhere to live.

**One document per trip**, unique across live and archived rows — the same
rule Aircraft's tail number and Airport's ICAO already make, so a second
attempt on an already-documented trip is a 409 pointing at the existing one
rather than a silent duplicate. Uses the **trips** permissions
(`VIEW_TRIPS` / `MANAGE_TRIPS`), the same rule Trip Requests already applies:
a document is part of the trip it is for, not a separate capability —
including archive and restore, deliberately narrower than a trip's own
admin-only `DELETE_TRIPS`.

**Second pass on Trips, same day.** Three cards on the trip detail page had
shipped ahead of this module with an honest placeholder, each naming #12 in
its own code comment: `TripFlightInfoCard`'s confirmed times,
`TripFlightRouteCard`'s outbound arrival, and `TripConfirmationCard`'s
"Itinerary sent" tick all read real data now. "Payment received" on the same
checklist was wired in the same pass — Receivables' (#16) own figure, left
unwired until now.

Postman `22 · Itineraries` is written and not run (no live server in this
environment); everything else — schema, API, frontend, the Trips second
pass — was written without live testing, by the owner's instruction, and
verified with `tsc`, oxlint, vitest (185 tests) and a clean `npm run build`.

### 13. Schedule ✅ *(28 September 2026)*

A calendar of trip legs — day, week, month and a year of counts. **Read-only,
and no table**: every event is a `TripLeg`, read through `TripsService` under
the trip scope, and every fact on it is the trip's own. It is the same rule
Itineraries follows — the third module to read the trip's aircraft, route and
client, and the third not to copy them.

Moving a flight or changing its status happens on the trip; the calendar only
shows it, and its panel opens the trip and the itinerary. Arrival time and
duration exist only where the trip's itinerary recorded them, which is the
outbound leg — so every other leg says "—" rather than borrowing the
outbound's. The old screen's "Sourcing" status, outside-brokerage filter,
Departures/Arrivals tiles and do-nothing buttons are gone; the reasons are in
[MODULE_FEATURE_STATUS.md](MODULE_FEATURE_STATUS.md) #13.

### 14. Flight Tracking ✅ *(28 September 2026 — manual)*

Status for trips in the air — departure, ETA, delays. **Built manual**: a
flight is a trip leg, its reported state is four columns on the leg, and its
updates are the notes timeline on subject `FLIGHT`, which replays every
report from the audit log. No progress bar, no on-time rate and no "live"
label, because nothing here comes from a feed.

**Decided 27 Sep 2026: manual, no flight-data provider**, until the client
asks for one himself. A broker sets each flight's status and notes by hand,
and the rest of the screen (client, aircraft, tail, operator, route,
scheduled times) reads from Trips. **This is an interim step, not what the
scope ultimately wants:** §6.12 is titled *Live* Flight Tracking and asks for
delay notifications "where external data supports them", and §12 lists a
flight tracking API. But the provider is TBD there and an open decision in
§17, the text asks only for "future FlightAware/API readiness", and the
acceptance line is "verified *or dependency documented*" — so manual, with
the provider recorded as pending, is within scope. Build it so a provider can
be added later, but add none now, and never label a status "live" when a
person typed it.

### 15. Empty Legs ✅

Repositioning flights an operator is flying anyway, offered at a discount.
Available → Matched → Booked → Expired. **Expired is computed** from
`expiresAt` on every read rather than written by a job.

**Matching is client adjustment #10b:** every trip request on the same route —
lost, converted and archived included, because the client asked exactly for
the ones that did not fly — with requests within ±3 days of the leg first. It
reads through `TripRequestsService.onRoutes`, never a raw query into another
module's table.

### 16–19. The financial modules

- **Receivables** ✅ — what clients owe: an invoice on a trip, billed to a
  client, with a ledger of payments under it. Paid, balance and the state
  (Due, Partially Paid, Paid, Overdue) are computed from the payments and the
  due date on every read; only the charge, the due date and Draft / Sent /
  Cancelled are stored.
- **Operator Payments** ✅ — what Tribeca owes operators for each trip: the
  operator's bill, with a ledger of money sent under it. Settled with the same
  arithmetic as Receivables (`common/money/settlement.ts`); a separate table
  because an operator bill has no draft, no FET and the operator's own
  invoice number.
- **Commissions** ✅ — what is paid out on a trip: to a referral agent, a
  client (a travel agent) or a named person, as a percent of profit, a flat fee
  or a custom amount. Built ahead of 16 and 17 because adjustment #11 needs it.
  Percent of profit is computed in cents from the trip on read.
- **Transactions** ✅ — the money ledger: every payment received, every
  payment sent to an operator and every commission paid, by the day it moved.
  A view, not a table: each kind is read through its owning module's service
  and scope, and merged with the shared `mergePages`.

All four hang off Trips. Money is the reason soft delete is absolute here:
`deletedAt` everywhere, no hard delete anywhere in the system. Financial
history is never destroyed.

### 20. Tasks Board ✅ *(28 September 2026)*

A kanban of desk work — To Do / In Progress / Waiting on Client / Waiting on
Operator / Completed, with priority, due date, assignee and a checklist.
Tasks link to a client and a trip by real foreign key. **Overdue is computed,
never stored.** New permissions `VIEW_TASKS` / `MANAGE_TASKS`: a broker or an
assistant works the tasks assigned to them and the ones they wrote. The
top-nav bell became "your tasks due today or overdue" — the only
notification this system can truthfully raise until something generates
reminders.

### 21. Email Templates ✅ *(28 September 2026)*

Reusable templates for quote follow-ups, trip confirmations, empty-leg offers,
payment reminders, travel-agent and client updates, with merge fields — and
**sending** them, which the old screen only pretended to do. It turned out not
to be dependency-free: its merge fields read clients, operators, trips, quotes
and invoices, each through its own module, which is why it sits after them.
One shared compose form serves every screen that emails somebody; each email
is recorded as sent (the scope's "Communication") and lands on the client's
and the trip's timelines. Delivery is the system's SMTP with the sender as
Reply-To, until the Gmail workflow (§17) is decided.

### 22. Document Vault

Central storage for contracts, itineraries, invoices and operator
certificates, attached to trips, clients and operators. **Built 29 Sep
2026:** one `Document` table, each row owned by exactly one client, trip or
operator and pointing at an upload by foreign key; readable exactly when its
owner is; passports and IDs behind their own permission. It replaced
`trips.documentUrls`, which the migration carried into the vault. It stores
files — it does not generate PDFs, which several screens had been wrongly
listed as waiting on it for.

**The pipeline it was going to own already exists** — see **Uploads (#28)**.
What is left here is the vault *as a product*: a browsable store with folders,
versions, and expiry dates on certificates. Each consumer (contracts, operator
certificates, quote PDFs) needs its own screen and a URL column on the record
it belongs to — **no backend upload change**. (This paragraph used to say "a
row in `FILE_CATEGORY_RULES`"; categories were removed in the 23 Sep rebuild,
see #28.)

### 23. Reports ✅ *(4 October 2026)*

Revenue, profit, FET collected and trip counts over selectable periods, with
CSV and Excel export. **Stores nothing**: trips are read through Trips with
their own computed figures, payments through Receivables, bills through
Operator Payments. Revenue, profit and trips count by **departure date**;
cash and FET collected by **payment date**; AR/AP as of today — decided
under deadline, since §17 left KPI formulas open. PDF export waits on a PDF
generator.

### 24. Dashboard

The landing screen: upcoming trips, open requests, revenue, follow-ups due.
Aggregates from everything, so it is built last. **Built 28 Sep 2026.** It
stores nothing: three endpoints of its own (`/dashboard/summary`,
`/priorities`, `/activity`) read every figure through the owning module, and
the lists beside them are those modules' own list endpoints with one filter
each (`departure=ONWARD`, `followUp=SCHEDULED`, `open=true`). Revenue for a
period counts trips *departing* in it — a trip booked on Monday for Friday is
this week's revenue. Reports (#23) uses the same definition, and both sum
trips through the one `tallyTrips` in `trips/trips.figures.ts`.

### 25. Client Portal

An external-facing view for clients to see their quotes, trips and documents.
A separate authentication surface. **No screen exists.**

### 26. Settings / Import / Export / Backup 🟡 *(screens 6 October, API 7 October 2026)*

**One set of settings for the whole company**, in one row
(`company_settings`), behind `GET`/`PATCH /settings`; the branding (name,
logo, contact when shown) is public at `GET /settings/branding` and every
sidebar and the sign-in page read the logo from it. Integrations and Import
are hidden (owner's decision); Import and Export are built in #31. What was
dropped from the Figma file and why is in `MODULE_FEATURE_STATUS.md` (#26).
Offline/PWA support is still open.

**A setting is only real once something reads it.** Building the Settings
API makes the Save buttons work; it changes nothing else. Each setting takes
effect only when the module it governs reads it — so the map below is the
work list, and every module review checks its rows (rule in `AGENTS.md`,
"A setting is read by the module it governs").

#### Which module reads which setting

| Setting (section) | Read by | Hardcoded today | Status |
|---|---|---|---|
| Company name, email, website, phone, address, client-services label (Company) | Public branding ✅; Email Templates (sender, merge fields), Quotes/Itineraries letterhead ⬜ | `TribecaLetterhead.jsx`; `MAIL_FROM` env default | 🟡 stored; branding reads it |
| Logo (Company) | Every sidebar and the sign-in page ✅; letterhead, PDF generator ⬜ | built-in marks until one is uploaded | 🟡 app ✅, documents ⬜ |
| Show contact block / logo on PDFs / broker contact (Company) | PDF generator, Itinerary preview | always shown | ⬜ waits on PDF generator |
| Default markup + presets (Defaults) | Quotes — new-quote form | none (blank) | ⬜ |
| Quote validity (Defaults) | Quotes — new quote's expiry | — | ⬜ |
| Default FET % (Defaults) | Quotes, Trips — new records only | `0.075` in `quotes.service.ts`, `DEFAULT_FET_RATE` in `lib/quote.js` | ⬜ |
| Apply FET by default (Defaults) | Quotes, Trips — create forms | on | ⬜ |
| Default follow-up interval (Defaults) | Clients, Leads — create / follow-up dialogs | — | ⬜ |
| Default lead stage (Defaults) | Clients, Leads — create forms | `NEW` in the forms | ⬜ |
| Default quote terms (Defaults) | Quotes — new-quote form | — | ⬜ |
| Inactivity timeout (Security) | Auth — `/auth/me` and the refresh check | — (env var removed 7 Oct) | ✅ |
| Warning before logout, show warning (Security) | Auth — `IdleLogoutWatcher` via `/auth/me` → `session` | — | ✅ |
| Require 2FA for admins (Security) | Auth — sign-in (SUPER_ADMIN and ADMIN) | — | ✅ |
| Email / in-app channels (Notifications) | Tasks Board notifications, Email sending | both always on | ⬜ |
| Flight alerts to brokers (Notifications) | Flight Tracking — status change | — | ⬜ |
| Follow-up / payment / quote-expiry reminders + timing (Notifications) | A reminder scheduler (new) reading Clients, Receivables, Operator Payments, Quotes | no scheduler | ⬜ waits on scheduler |
| Import type, export scope and dates (Data) | Import / Export API (#31) — Import hidden until then | — | ⬜ not settings; screen state |
| Backup line (Data) | — (states the server's schedule) | `BACKUP_POLICY` in `lib/settings.js` | ✅ static by design |
| Quick links (Integrations) | — | `QUICK_LINKS` in `lib/settings.js` | Hidden 7 Oct (owner's decision) |

When a row is wired, mark it ✅ here and move its line in
`MODULE_FEATURE_STATUS.md` from waiting to working, in the same pass.

### 27. AI Assistant

Currently four hardcoded suggestion strings. The scope doc describes an
in-app assistant answering questions about the desk's own data.

### 28. Uploads ✅

**Not in the signed scope's module list, and built out of order deliberately.**
Four of the client's adjustments were each blocked on the same missing thing —
a per-broker tax-form folder, the referral portal's Resources section, referral
attachments, and the aircraft photo library. Building it inside any one of them
would have made it that module's private code.

**One upload surface for the whole product**, and the shape is the point:

```
POST /api/uploads/image      →  { url: "/api/uploads/<id>", ... }
POST /api/uploads/document   →  { url: "/api/uploads/<id>", ... }
```

A screen uploads a file, gets a URL, and stores that URL on whatever record it
was editing. **Nothing in the upload path knows what a file is for.**

That decoupling is what makes create forms work. An API that wanted an
`aircraftId` at upload time could not attach a photograph to an aircraft that
did not exist yet, so every create form would have to save first and upload
second — leaving a record with no picture whenever the second call failed. It
also means a new upload button anywhere in the product needs **no backend
change at all**; an earlier design keyed files to a category enum, and every
new upload spot would have needed a new value and a migration.

**Two routes, because there are two kinds of file.** `image` and `document`
describe what a file *is*. A purpose — "tax form", "id proof", "brochure" — is
not a kind, and encoding one here is how the category design went wrong.

**Four things about it are decisions, not implementation details:**

- **The content type is read from the bytes, never the upload header.** A
  multipart part's `Content-Type` is chosen by whoever sent it, so storing it
  means the fetch route eventually hands a browser exactly what an attacker
  picked — `text/html` on the API's own origin, with the session cookie
  attached. Images are strict (never SVG); since 6 Oct 2026 a document may
  be any file, and one the server cannot recognise is stored as
  `application/octet-stream` and always downloads.
- **Storage is content-addressed** — `images/<sha256>.png`. Identical bytes
  always resolve to the same object, so re-uploading overwrites a file with
  itself rather than filling the disk. There is deliberately no date folder: a
  date would put the same bytes in two places on two days and defeat the
  deduplication the key exists to provide.
- **Re-uploading returns the record already on file**, flagged
  `deduplicated: true`. Scoped to the uploader, so one person's delete is never
  a side effect on another person's record.
- **Archiving never touches the bytes.** A restore that cannot hand back the
  same file is not a restore; it is an empty row wearing a filename. The object
  may also be shared with another user's row.

**The URL stored is relative**, never absolute — an absolute URL captured at
upload time embeds whatever host was running then, so every row written in
development would point at localhost for ever.

**Per-file access control shipped with adjustment #7**, and it is two columns
rather than a category: `visibility` (PUBLIC / PRIVATE, defaulting to PRIVATE
so the failure mode is a brochure needing a flag rather than a 1099 being
readable by everyone) and `ownerUserId` (one extra reader beyond the uploader
and an administrator). That second column is an *access-control* fact, not a
purpose — which is what keeps it from becoming categories again — and it is
what makes a personal folder a **query**, `GET /uploads?ownerUserId=<id>`,
instead of a second table.

**Four screens consume it**: the Documents tab on the team member sheet
(#7), the aircraft form's exterior and interior photos, the quote form's
aircraft photo (stored on `Quote.exteriorImageUrl`,
validated by the shared `uploadUrl` so only a relative upload URL is
accepted), and the Build Itinerary form (uploads real, itinerary not yet
saved — see #12). The referral Resources section still needs its own UI.

**The photo library** (27 Sep 2026, #3's "stock image database") is a query
over it, not a table: every `PUBLIC` image, offered on every photo field.

---

### 29. Notes / Timeline ✅ *(Clients, Trips, Referrals, Flights)*

**Not in the signed scope's module list.** It is the client's adjustment #5:
*"in the trip section and client CRM section, I want to make sure there is a
section where I can write notes and add it to a timeline"*.

**`Client.notes` was not that.** It is one string, and editing it destroys what
it said before — a field, not a timeline. That column stays as the standing
summary the detail sidebar shows ("what do I need to know about this person")
and the `Note` table is the append-only record of what happened and when. Two
different questions, deliberately two different places.

**Three decisions, not implementation details:**

- **Polymorphic: `subjectType` + `subjectId`, not `clientId`.** Trips do not
  exist yet, and neither do the four other records that will want a timeline. A
  `clientId` column here means a second table the day Trips ships, and then two
  note systems with different columns, different permissions and two screens to
  keep in step. Adding TRIP is one enum value and three lines in
  `notes.subjects.ts`.

  The price is that `subjectId` cannot be a foreign key, so the service checks
  it instead — by asking the module that owns the subject. `ClientsService`
  applies the same broker scope it applies everywhere else, so *"you may read
  this note if you may read its client"* is true rather than merely intended,
  and a note on somebody else's client answers **404**.

- **It reads alongside the audit log rather than replacing it.** A timeline of
  hand-written notes alone is half a timeline: status changes, reassignments and
  archives are already recorded and are the entries nobody has to remember to
  type. `GET /notes/timeline` merges both, newest-first, paginated across two
  tables by taking `skip + take` from each — exact, not approximate, because the
  nth newest row overall cannot be older than the nth newest of either source.

- **`visibility` is #11's *Agent Update* field, built now.** *"Add a separate
  Agent Update field that Tribeca brokers/admins can intentionally share with
  the referral agent"* is a note with a flag on it. Discovering that after
  building both is how two note systems end up in one codebase. It defaults to
  INTERNAL — the same direction upload visibility defaults to PRIVATE — and
  **filters nobody today**, because the Referral Agent role does not exist yet.
  The day it lands, its read scope is `visibility: SHARED` and nothing else
  changes.

**Editing is the author only, administrators included** — deliberately narrower
than every other update in this system. The timeline renders a note under the
name of whoever wrote it, so an edit anyone else can make is a statement they
did not write attributed to them. An administrator who disagrees *withdraws* it
and writes their own, which leaves both visible. Withdrawing is wider than
editing for exactly that reason: moderation does not put words in anyone's
mouth.

**The screen** is the Activity tab on the client detail page, which was a
props-fed list with a TODO on it. `NotesTimeline` is written against
`subjectType`/`subjectId`, so the trip detail page renders the same component
with `subjectType="TRIP"` when Trips ships.

---

### 30. Client Credits ✅

**Not in the signed scope's module list.** It is the client's adjustment #9:
*"a section on their profile that says credit/money on account ... we can enter
how much that is and can always edit that number or select if it was used
towards another trip."*

**Built as a ledger rather than as that number, deliberately**, and the client's
own sentence is the argument: "edit that number" and "used towards another
trip" are two kinds of movement, so they are rows and the balance is summed
from them. A single editable field loses *why* it changed, and a balance
dropping from $18,000 to $6,000 with nothing saying which trip consumed it is
an argument waiting to happen. He still gets the edit he asked for — it lands
on an entry, which is what gives it a trail.

It is also the shape this schema forbids everywhere else: **a stored figure
beside the parts it is computed from.** There is no `balance` column. It is
summed on read, in one place, exactly as a quote's total is.

**Four decisions worth keeping:**

- **The direction is a column, never a minus sign.** `amount` is always
  positive and `type` is `CREDIT` or `APPLICATION`. A signed column invites
  `-5000` typed into a credit, which reads as a credit and behaves as an
  application.
- **The arithmetic is integer cents**, in pure functions with tests. `0.1 +
  0.2` is `0.30000000000000004` and a ledger is repeated addition. The
  conversion parses the decimal string rather than multiplying, because
  `1.005 * 100` is `100.49999999999999` — a cent lost before rounding ever
  runs.
- **An application cannot overdraw the account**, and the check runs on create,
  on edit *and* on restore. Without the last one, withdrawing an entry and
  restoring it walks around the rule.
- **`occurredAt` is not `createdAt`.** A trip cancelled on the 3rd and entered
  on the 9th is dated the 3rd, and the ledger sorts by the movement.

**Reading needs `VIEW_FINANCIALS` *and* access to the client** — two questions,
kept separate. An assistant holds the first at NONE and never learns what a
client is holding; a broker sees only their own clients, and another broker's
ledger answers **404**, never 403. The tab is hidden rather than shown and
refused.

> **The trip link was missing on purpose until Trips shipped.** "Used towards another trip" has no
> trip to point at, and a `tripReference` string "for now" would be a column
> pointing at nothing the database can check — which is exactly what
> `Client.homeAirport` cost when it held an ICAO string. `reason` carries it
> until **Trips (#11)** shipped; since 27 Sep 2026 it is `appliedToTripId`, a real foreign key.


---

### 31. Charter Rates / Instant Estimate ✅

**Not in the signed scope's module list** as a table — it is §6.10's
"Instant Quote Calculator" and the client's adjustment #6. The desk's own rate
per flight hour, average speed and typical seats for each aircraft size, and an
estimate built on them from two airports' coordinates.

**The rates are data the desk enters, never constants in code.** Scope §18
forbids AI as the source of truth for financial figures, and the same holds for
a number a developer guessed. The table ships empty; a size with no rate says
"No rate on file". One row per category, never removed, every change audited
with before and after.

**Deliberately not modelled:** positioning legs, overnight fees, winds. The
estimate is flight time × hourly rate with a minimum per leg, and says what it
leaves out. If the client's real formula differs, `charter-rates.estimate.ts`
changes and nothing else.

### 32. Referrals / Referral Agent ✅

**Not in the signed scope's module list** — the client's adjustment #11: a
`REFERRAL_AGENT` role that works like a partner portal rather than a CRM login.

**Why it is its own table:** a referral is what an agent *sent*, before anyone
knows whether it is a client or an enquiry. Its ladder (Submitted → Contacted →
Quoting → Booked → Completed) has steps the trip request's does not, so forcing
one into the other would make one screen lie about the other. Converting a
referral writes the real Client and TripRequest through their own services;
linking the booked trip raises the agent's commission.

**Everything an agent may see is decided in the service, not the screen** —
`partnerView()` strips desk data, notes are SHARED only, uploads are forced
private, and the staff directory is behind `VIEW_TEAM`. See `AGENTS.md`,
"The referral agent is a partner".

**Built:** the role, the API, the desk's Referrals page and the agent's portal
at `/portal` — its own five-item navigation in the CRM's shell, with each role
routed to its own area — and the standard-commission inputs on the team
member form.

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

**A control's value is the wire format; its label is for reading.** Enums
travel as `SCREAMING_SNAKE_CASE`, dates as `YYYY-MM-DD`. This is a rule because
`CommonDatePicker` emitted the display string from the Figma mock —
`"Aug 12, 2026"` — which every date field on the API rejects. Quotes, leads,
aircraft maintenance and sourcing requests all passed it straight through, so
**none of their dates could be saved at all**, in four modules, silently, until
someone tried one. Shared controls get used everywhere; a mock value left in
one is a wrong answer on twenty screens.

**Postman is a deliverable.** Every endpoint gets its entry in the same pass as
the code, with a real captured success example and an example for every error
it can return. Verified with `newman` before it counts as done. A folder that
creates a row archives it again in a teardown — the run is a demonstration, not
a data entry session.

**Never commit or push unless the user asks in that message.** Approval of the
work is not approval to commit. Leaving finished work uncommitted is the
correct resting state.

---

## The four gaps between the scope doc and the build

Sections the signed scope's information architecture lists, with no screen in
the frontend at all:

1. ~~Open Trip Requests~~ ✅ **closed 19 September 2026** — `/dashboard/trip-requests`
2. ~~Document Vault~~ ✅ **closed 29 September 2026** — `/dashboard/documents`
3. Client Portal
4. Settings / Backup / Import / Export
5. AI Assistant

Plus two acceptance criteria with zero code: **PWA / offline support** and
**import/export/backup**.

None of these are blocked. They just have not been scheduled, and they are the
most likely source of a surprise at delivery.

---

## If you are an agent picking this up cold

1. Read **`AGENTS.md`** at the repository root, in full. It is the whole
   rulebook and its conventions are not guessable — ESM `.js` imports on a TS
   source tree, no `.partial()` on update schemas, no `z.coerce.*` on anything
   a form touches, 404-not-403 for rows outside scope, URL-as-source-of-truth
   for table state.
2. Read **[CLIENT_ADJUSTMENTS.md](CLIENT_ADJUSTMENTS.md)** §0 — it carries the
   handoff brief, the standing constraints and the current work queue. **§0.0
   is the three-phase plan** that governs what order the rest of the project
   happens in; read it before deciding anything is "next".
3. Read this file for the module you are about to touch, and
   **[MODULE_FEATURE_STATUS.md](MODULE_FEATURE_STATUS.md)** for what it can
   actually do today.
4. **Read the frontend before writing schema.** The screens were built first
   and they are the specification.
5. **Never commit or push unless asked in that message.** Finished work sitting
   uncommitted is the correct resting state.

Setting the project up on a new machine — env, database, the commands that
hang, and the prompt to open a session with — is **[HANDOFF.md](../HANDOFF.md)**
at the repository root.
