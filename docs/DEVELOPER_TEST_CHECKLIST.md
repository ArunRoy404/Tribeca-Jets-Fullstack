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
