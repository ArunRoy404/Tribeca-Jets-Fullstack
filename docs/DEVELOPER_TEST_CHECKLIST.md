# Developer test checklist — feedback batches

Batches are marked done once Claude has reviewed the code and every check
(typecheck, lint, tests, build) is green (developer's rule, 27 Nov 2026).
The developer tests on screen later, from this list. Anything that fails
is logged under the batch and fixed then — the batch is not reopened in
the tracker unless the fix is large.

Tick a line when it passes; write what you saw under it when it does not.

**Before testing:** restart the API and the frontend. Note any migration a
batch lists and run `npm run db:deploy` first.

---

## B1 — Money and Settings (27 Nov 2026) · no migration

- [ ] **Settings reach the forms.** As admin, put recognisable text in
  Settings › Defaults › quote terms. Sign in as a **broker**, open New
  Quote: validity, the FET switch and the terms are already filled in.
- [ ] **FET follows Settings.** Change the default FET to 5%. A new quote
  shows 5%; an existing quote keeps its own rate. (Put it back to 7.5%.)
- [ ] **Price from cost.** New quote, operator cost $10,000, base price
  blank → saves at $11,500 (15% default markup).
- [ ] **Deposit cap.** A deposit above the total is refused, naming the
  maximum. Editing a quote so its price drops below its deposit is refused.
- [ ] **Estimate → quote.** Instant Estimate, pick a size but no price,
  "Start a quote": operator cost = the estimate, base = cost + markup,
  profit is not $0.
- [ ] **Not yet invoiced.** A trip invoiced at 50%: Reports and the
  Dashboard show "Not yet invoiced" beside Outstanding AR, including that
  half.
- [ ] **Empty legs.** The "With live matches" tile agrees with the match
  counts on the cards.
- [ ] **Leads and clients.** As a broker, Add Lead and Add Client open with
  the default stage and a follow-up date. Clear the follow-up and save: the
  server fills it from the interval.
- [ ] **New trip.** "FET applies (x%)" shows the Settings rate, not 7.5%.

Issues found:

- none yet

**B1 Postman verified (27 Nov 2026):** all six builders captured on the
isolated 4100 API: Quotes 49, Trips 34, Reports 19, Dashboard 24, Empty
Legs 18, Settings 27 examples (171 recaptured; collection total 840 across
338 request entries). Both full Newman runs passed without reseeding
between them: 471 requests, 341 assertions, 0 failures each. Label audit:
840 examples, 0 mislabelled. Each rebuilt folder also passed standalone
twice. The 4100 API was stopped and its process killed. Reports' stale fixture and unsupported-format
probes were corrected in its builder; no API code changed. Setup required
clearing `empty_legs` on the copy before seeding because the seed omits its
cleanup; the seed itself was not changed.

## B2 — Small fixes (27 Nov 2026) · no migration

- [ ] **Requirements stay internal.** New quote from a trip request with
  requirements: they land in Internal notes, not Terms. Preview says "QUOTE".
- [ ] **Same airport refused.** Add Lead, a trip request and a quote with
  KTEB → KTEB: refused with "Departure and arrival can't be the same airport".
- [ ] **Sign-in page** shows no 240+ / $18M / 96%.
- [ ] **Book Trip** in the quote list's row menu (and the mobile card) on an
  approved quote with no booking; it opens the same booking flow.
- [ ] **Timeline words.** Edit a client's phone and email: the timeline reads
  "updated phone and email". Record a payment on that client's invoice: it
  shows on the client's timeline. (Older payments are not back-filled.)
- [ ] **Coordinates.** Airport latitude 100 → "Latitude must be between -90
  and 90".
- [ ] **Lead stages** are the same list in Add Client and Add Lead.
- [ ] **Passenger Names** (trip checklist) opens the passengers card in edit
  mode with a brief highlight; add, edit, remove, save; Cancel asks before
  losing changes.
- [ ] **Ask AI** is in the top bar beside the bell at phone, tablet and
  desktop widths; no floating button.
- [ ] **Avinode** link on the trip contract card goes to avinode.com.

Issues found:

- none yet

**B2 Postman verified (27 Nov 2026):** all three builders ran on the
isolated 4100 API and refreshed `tribeca_postman`: Airports 36, Trip
Requests 25, Quotes 50 examples (111 written; collection total 844 across
338 request entries). Captures include both coordinate range messages and
the trip request and quote `400 · Same airport` refusals. Both full Newman
runs passed without reseeding between them: 471 requests, 341 assertions,
0 failures each. Each rebuilt folder also passed standalone twice. Label
audit: 844 examples, 0 mislabelled. No builder fixes or product code changes
were needed. The copy seeded successfully with the B2 `empty_legs` cleanup;
no manual clearing was needed. The 4100 API and its launcher were stopped
and their processes killed.

## B3 — Workflow rules (27 Nov 2026) · one migration

Migration `20261127120000_feedback_b3` was applied to dev by Claude earlier.
This run refreshed `tribeca_postman` and ran `db:deploy` against the copy only;
B3 was already present in the snapshot, with no pending migrations.

Checked boxes mean the **API portion passed (API walk, 27 Nov)**. The API
walk is complete, including re-verification of Claude's first-leg landing
fix. Screen behavior remains **screen — not walked**.

- [x] **Mark Paid.** PAID without method → 400; date, method and trimmed
  reference save → 200. The form, Review Payment and confirmation are
  **screen — not walked**. (API walk, 27 Nov)
- [x] **Old paid commissions still edit.** A disposable pre-B3 fixture
  (PAID, method null, earlier paidAt) accepts a notes-only PATCH (200) and
  preserves PAID / null method. Fixture SQL targeted the copy and that probe
  only. The edit dialog/confirmation is **screen — not walked**.
  (API walk, 27 Nov)
- [x] **Agent portal data.** Agent commission read and list → 200 with date,
  method and reference, without desk notes or broker data. Portal rendering
  is **screen — not walked**. (API walk, 27 Nov)
- [x] **Earned on completion.** Status action COMPLETED
  passes (200), earning PENDING while PAID/CANCELLED statuses, payment fields
  and update timestamps stay unchanged; reopening preserves EARNED.
  Fresh two-leg probe: first landing (200) leaves the trip IN_FLIGHT and its
  commission PENDING while leg 2 is null; last landing (200) completes it
  with reason all_flights_landed and earns it once (one commission.earned
  audit row). PAID/CANCELLED statuses, payment fields and updatedAt are
  unchanged after both landings. (API walk, 27 Nov)
- [x] **Confirm needs operator + time.** API refuses confirmation (400),
  naming both “tick Operator confirmed” and “add a departure time”; filling
  them permits confirmation (200). Disabled button and page hint are
  **screen — not walked**. (API walk, 27 Nov)
- [x] **Complete warns.** Admin open-items → 200 with
  operatorBalance 7000 / uninvoiced 10000. Broker without the two money-view
  modules → 200 with both warning flags and null amounts. Completion with
  open money succeeds (200). An absent operator bill warns with null balance.
  Fully paid operator bill and fully invoiced trip: both warning flags false,
  admin amounts zero, broker amounts null; completion succeeds (200).
  Complete Anyway dialog, warning layout and hidden amounts are **screen —
  not walked**. (API walk, 27 Nov)
- [x] **Client lifecycle.** Send quote: NEW → QUOTED with client.stage_changed
  / via quote_sent. Book: ACTIVE / WON, via booking and trip reference.
  Sending another quote preserves WON and the stage-event count (reads/actions
  200; booking 201). (API walk, 27 Nov)
- [x] **Latest trip strip.** Client detail → 200 with latestTrip null when
  there are no trips. After booking, latestTrip returns route airports,
  status, operator name, aircraft tail/model, leg departure date/time and
  estimatedArrival; basePrice, operatorCost and grossProfit are absent.
  A broker skips a newer trip outside their reach and receives the newest
  visible trip, or null when none is visible (200; hidden trip itself 404).
  Layout, “No trips yet” and 24-hour rendering are **screen — not walked**.
  (API walk, 27 Nov)
- [ ] **Edit financials.** Approver's pending-trip banner opens the edit form
  scrolled to Financials — **screen — not walked**.
- [x] **Lead source Other.** Missing description on create or switch to OTHER
  → 400; description trims and persists; changing source clears it to null
  (201 / 200). Add Client/Add Lead controls and display are **screen — not
  walked**. (API walk, 27 Nov)
- [x] **OA required.** true / false / null persist and read back (201 / 200);
  create null → 400. Form/Overview Yes / No / Not set display is **screen —
  not walked**. (API walk, 27 Nov)

Issues found:

- **27 Nov — new product bug, API walk stopped.** On two-leg probe **TJ-90**,
  `PATCH /flight-tracking/:firstLegId` IN_FLIGHT → 200, then LANDED → 200,
  completes the trip and makes its PENDING commission EARNED while leg 2
  still has flightStatus null. Read-only copy queries and the audit trail
  confirm first leg LANDED / ETA 16:45, second leg null, trip COMPLETED,
  `reason: all_flights_landed`, and commission.earned. The unlanded count in
  `TripsService.updateFlight()` uses `flightStatus: { not: LANDED }`, which
  excludes SQL NULL, so an unreported leg is not counted. **No product code
  was changed or fixed.** All probes archived; the 4100 process killed.
  **Fixed (Claude, 27 Nov):** the count now includes `flightStatus: null`
  legs (an explicit `OR`); a test pins the query. Read-only on dev: the old
  filter counted 3 not-landed legs, the new one 19 (16 unreported). The bug
  predates B3 (Flight Tracking #14 auto-completed early too); B3 made it
  earn commissions.
  **Re-verified (API walk, 27 Nov):** fresh probe TJ-23 stays IN_FLIGHT /
  PENDING after leg 1, then COMPLETED / EARNED after leg 2, with one earned
  event. PAID/CANCELLED payment fields and timestamps remain unchanged.
- **Previous blocker resolved:** Claude's estimatedArrival select fix is in
  the temporary build; valid client detail reads now return 200, including
  latestTrip null for a client without trips.
- **Builder correction:** removed request 09's obsolete Clients cleanup
  script, which archived/cleared the probe before B3's final teardown. The
  final teardown now has its own captured 204. Both standalone runs pass;
  no status label was relaxed.
- **Copy preparation:** inherited WhatsApp settings needed clearing to match
  the collection's fixture. An immediate full repeat hit the configured
  email-code quota; let its window expire naturally, then reran successfully.
  No limits or counters changed. The copied broker held money-view grants;
  temporarily removed those two modules for the no-view test, then restored
  its exact raw permissions and update stamps on the copy.

**B3 Postman result, 27 Nov:** all four builders completed: Commissions
**21**, Trips **38**, Clients **26**, Operators **29** examples (**114** in
these folders). Final collection: **341 request entries / 852 examples**.
Both successful full Newman runs: **473 requests / 344 assertions / 0 failures**
each, without reseeding between runs. Each rebuilt folder passed standalone
twice: Clients 12 requests / 5 assertions, Operators 11 / 10, Trips 33 / 15,
Commissions 23 / 12 per run; all zero failures. Label audit: **0 mislabelled**,
0 missing status labels across 852 examples. The initial API walk stopped
under the product-bug rule above; the walk-finish run below completed it.
All **28** probe rows from both initial walk attempts were archived (204).
Port 4000 retained its original PID; dev was not written.
Report: `docs/codex-reports/feedback-b03-postman.txt`.

**Walk finish result, 27 Nov:** API walk complete; only the developer's screen
checks remain. Refreshed tribeca_postman, ran copy-only db:deploy (no pending
migrations), and compiled the current tree into a new temporary 4100 API.
First-/last-leg completion, commission preservation, fully settled completion
and latestTrip fields/reach all passed. Flight Tracking passed standalone
twice (**13 requests / 8 assertions / 0 failures** each); Trips twice
(**33 / 15 / 0** each); full collection once (**473 / 344 / 0**). No builders
ran; read-only label audit: **852 examples / 0 mislabelled / 0 missing labels**.
All **15** new walk probes archived/withdrawn; copied broker permissions and
update stamps restored exactly. No product changes; 4100 stopped; dev and
4000 untouched. All screen checks above remain **screen — not walked**.
