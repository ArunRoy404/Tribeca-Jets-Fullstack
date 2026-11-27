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
