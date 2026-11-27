# Codex prompt — Feedback B1: money and Settings correctness

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/feedback-b01-money-settings.md and carry out
everything below the "---" line in it. That file is your full brief.
It has been revised (see "Revision 2") to answer the three mismatches
your first run stopped on.

Before starting, read AGENTS.md in full (it is the whole rulebook), then
docs/FEEDBACK_IMPLEMENTATION_PLAN.md (§"How every batch runs" and §B1),
the B1 rows of docs/FEEDBACK_TRACKER.md (R1-01, R1-02, R1-11, R1-12,
R1-13), and every file the brief's §0 lists.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No database: do not run migrations, the seed, SQL, the API, builders or
  Newman. `npx prisma generate` (code generation only) is allowed. Do not
  open, print or copy any .env.
- No npm or pip install.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the §9 report.
```

---

## What this batch is

Five items from the October QA review (Round 1), all money or Settings,
none needing the client's answers. **No migration**: every column used
already exists.

| ID | In one line |
|---|---|
| R1-01 | Quotes and trips apply the company's Settings **on the server** when a field is absent: FET rate, apply-FET, quote validity, quote terms, and the default markup (base = operator cost + markup when no base is sent). The hardcoded `0.075` goes. |
| R1-02 | A quote's deposit can never exceed the quote's total — create and update, API and form. |
| R1-11 | Instant Estimate → quote: the estimate is the **operator cost**; the base price is the picked suggestion or, if none was picked, cost + default markup. Today both get the estimate and the quote opens at $0 profit. (The per-leg minimum-hours rule is **not** touched — it waits on the client.) |
| R1-12 | An **uninvoiced balance** — what booked trips are worth minus what has been invoiced on them — shown beside Outstanding AR on Reports and the Dashboard. |
| R1-13 | One empty-leg match count: the stats tile counts the same live matches the cards show, not the stored `MATCHED` status. |

## Revision 2 (27 Nov) — what the first run found

The first Codex run stopped correctly on three mismatches. All three were
checked and are real:

1. `GET /settings` returns sections (`data.defaults.quoteValidityHours`),
   but `AddQuoteDialog`, `AddClientDialog` and `AddLeadDialog` read
   top-level fields (`settings.quoteValidityHours`). **So the forms'
   "prefill from Settings" has never worked for anyone.**
2. `GET /settings` needs `SETTINGS · VIEW`, which brokers and assistants
   cannot hold, so those forms could not read the defaults even if the
   shape were right.
3. Add Lead sends `nextFollowUpAt: null` when blank on create, so the
   service's follow-up default never applies.

The fix is in §1a (a narrow staff read of the desk defaults), §1 (forms
move to it) and §3 (the markup stays on the server). Everything else in
the brief is unchanged.

## 0. Read first

Backend:
- `src/modules/quotes/quotes.service.ts` — `create` (~944), `update`
  (~997), `pricePreview` and `suggestPrice` (~652–715, the two
  `?? 0.075`), `serialise`.
- `src/modules/quotes/quotes.pricing.ts` (+ spec) — `priceQuote`,
  `suggestBasePrice`.
- `src/modules/quotes/dto/quote.dto.ts` — create (`basePrice` required,
  `fetEnabled .default(true)`), preview, suggest, update schemas.
- `src/modules/trips/trips.service.ts` `create` (~983) and
  `src/modules/trips/dto/*` (`fetEnabled .default(true)` at ~116).
- `src/modules/clients/clients.service.ts` ~405–420 — **already** reads
  `defaultLeadStage` and `followUpIntervalDays`. Confirm, and confirm the
  Leads screen creates through it.
- `src/modules/settings/settings.service.ts` (`read()`),
  `settings.options.ts` (`QUOTE_VALIDITY_HOURS`), `prisma/schema/settings.prisma`
  (`defaultMarkupPercent` 15, `quoteValidityHours` 24, `defaultFetPercent`
  7.5, `applyFetByDefault`, `defaultQuoteTerms`). Percent columns are
  percents; quote/trip `fetRate` is a rate (7.5 → 0.075).
- `src/modules/receivables/receivables.service.ts` ~530–660 — the
  per-trip invoice ceiling (`alreadyInvoicedCents`, `tripTotalCents`).
- `src/modules/trips/trips.figures.ts` (+ spec), `src/modules/reports/reports.service.ts`
  `summary`, `src/modules/dashboard/dashboard.service.ts` (~140–160).
- `src/modules/empty-legs/empty-legs.service.ts` `stats` (~240) and
  `empty-legs.matching.ts` (`matchCounts`, `OPEN_STATUSES`).

Frontend:
- `src/components/quotes/AddQuoteDialog.jsx` (settings prefill ~136–165,
  ~283; `DEFAULT_FET_RATE` ~365; deposit field ~751).
- `src/lib/quote.js` (`DEFAULT_FET_RATE`).
- `src/components/quotes/estimate/InstantEstimateDialog.jsx` (`startQuote`
  ~109, the copy at ~251), `SuggestedPricePicker`.
- `src/components/trips/createForm/CreateFinancialsCard.jsx` ("FET applies
  (7.5%)"), `src/components/table/upcoming-trips/TripCard.jsx` ("FET (7.5%)").
- The Reports and Dashboard components that render Outstanding AR, and the
  empty-legs stats tiles.

Docs: `docs/MODULES.md` §26 "Which module reads which setting".

## 1a. A narrow read of the desk defaults (new)

The forms need six defaults; they must not need the whole Settings screen.

- **`GET /settings/desk-defaults`**, `@StaffOnly()`, **no
  `@RequireAccess`** — an open read for every staff member, as AGENTS.md
  "Reads are open to every signed-in user" describes (a referral agent gets
  403 by stored role). It returns exactly, through a new
  `deskDefaultsView(row)` in `settings.view.ts`:
  `{ quoteValidityHours, defaultFetPercent, applyFetByDefault,
  defaultQuoteTerms, defaultLeadStage, followUpIntervalDays }`.
- **The default markup is deliberately not in it.** It is the desk's
  margin policy, and the only screens that use it already sit behind
  `QUOTES · VIEW_MONEY` (§3 reads it on the server through suggest-price).
  Say so in the route's `@ApiOperation`.
- Declare it **before** any `:param` route in the controller. Postman and
  the OpenAPI derivation pick it up like any route.
- Frontend: `settingsService.deskDefaults()`, a `useDeskDefaults()` hook in
  `hooks/settings/` (key `queryKeys.settings.deskDefaults`, under the
  settings namespace, so the Settings save that already invalidates
  `settings.all` refreshes it; timing from `queryPresets`, never a number).

## 1. R1-01 — Settings applied on the server

**One pure function decides the defaults**, so it is tested without a
database: e.g. `quoteDefaults(input, settings, now)` in a new
`quotes.defaults.ts` (or beside `priceQuote` if that reads better). It
returns the values to store for every field the caller left out:

| Field absent on create | Stored value |
|---|---|
| `fetEnabled` | `settings.applyFetByDefault` |
| `fetRate` | `settings.defaultFetPercent / 100` |
| `validUntil` | the calendar date of `now + quoteValidityHours` (UTC, as the form does today) |
| `terms` | `settings.defaultQuoteTerms` (null stays null) |
| `basePrice` | `suggestBasePrice(operatorCost, defaultMarkupPercent / 100)` — only when `operatorCost` is sent |

- **A value the caller sends always wins**, including `fetEnabled: false`
  and an explicit `terms`. A default seeds a new record; it never rewrites
  an existing one — `update` applies none of this.
- Create DTO: `basePrice` becomes optional; with neither `basePrice` nor
  `operatorCost` the API answers **400 "The base price is required"**
  (same message as today, so the form's error mapping still works). Remove
  `.default(true)` from `fetEnabled` on the quote and trip **create**
  schemas, or the setting can never apply. Keep the DTO's OpenAPI honest.
- `pricePreview` and `suggestPrice`: the `?? 0.075` fallbacks read the
  setting instead (these become async; the controller awaits them).
- **Trips** `create`: `fetEnabled` and `fetRate` from Settings when absent,
  through the same rule (reuse the function or a trips twin that calls the
  same helper — not a second copy of the arithmetic). Booking from a quote
  keeps copying the quote's own values.
- Read with `await this.settings.read()` at decision time (AGENTS.md, "A
  setting is read by the module it governs").
- Prisma's `@default(0.075)` on `Quote.fetRate` / `Trip.fetRate` stays as
  the database backstop; the service now always sends a value.

**Clients and Leads:** `ClientsService.create` already applies lead stage
and follow-up interval; do not re-implement it. Fix the forms:
- `AddQuoteDialog`, `AddClientDialog`, `AddLeadDialog` read
  `useDeskDefaults()` instead of `useSettings()`, with the correct field
  names. A missing default leaves the field empty (the server fills it) —
  never a literal like `"NEW"` or `true` standing in for it.
- Add Lead on **create** omits `nextFollowUpAt` when blank (so the
  server's interval applies); on **edit** blank still sends `null` to
  clear. Use the `lib/form.js` convention (`editing` flag). Check Add Client
  for the same bug and fix it if present.

**Frontend:**
- Delete `DEFAULT_FET_RATE` from `lib/quote.js`; every reader takes the rate
  from the price preview, the record, or `useSettings()` — never a literal.
- `CreateFinancialsCard`: "FET applies (x%)" from `useDeskDefaults()`.
  `TripCard`: the trip's own `fetRate`, formatted; nothing when unknown.
- Grep both apps for `0.075`, `7.5%`, `"7.5"` (placeholders in the Settings
  form are fine) and report every remaining hit.

## 2. R1-02 — Deposit cap

- A pure check (e.g. `depositWithinTotal(deposit, totalPrice)` in
  `quotes.pricing.ts`, in cents) used on **create and update**. On update
  it is measured against the total **after** the edit — the merged base,
  FET, extras — so lowering the price below an existing deposit is refused
  too.
- Refusal: **400** naming the maximum, e.g. "The deposit can't be more than
  the quote total of $12,345.00", on the field `depositAmount` in the
  project's usual error shape. Amounts formatted with commas, two decimals.
- Form: under the deposit field, "Maximum $X" from the live price preview's
  total (the server's figure, never re-derived); the API's message is shown
  on the field when it refuses.

## 3. R1-11 — Estimate → quote

- `startQuote`: `operatorCost` = the estimate's `estimatedCost`.
  `basePrice` = the price the broker picked in `SuggestedPricePicker`; if
  none was picked, the **default-markup suggestion from the server**.
  Make `markupRates` **optional** on `POST /quotes/suggested-price`: absent,
  the server uses `[settings.defaultMarkupPercent / 100]` (read at decision
  time); each suggestion already returns its `markupRate`. The frontend
  calls it without `markupRates` and uses the one suggestion's
  `basePrice` — it never learns or computes the markup itself. The route
  keeps `QUOTES · VIEW_MONEY`, the same permission that shows the Instant
  Estimate button, so every caller of this flow passes. If the call fails,
  open the quote with the operator cost only and an empty base — never the
  estimate as the base.
- Fix the copy: the operator cost is **not** empty; say the quote opens with
  the route, the estimated operator cost and the chosen (or default-markup)
  price.
- Leave the estimate engine's per-leg minimum alone.

## 4. R1-12 — Uninvoiced balance

- Definition: for every live trip in the caller's scope whose status is in
  the existing revenue statuses (the set `stats` and reports already use),
  with a price: `max(0, trip total − sum of its live invoices' totals)`,
  summed. As of today, whatever the report window — like Outstanding AR.
- **One function** in `trips.figures.ts`, in cents, with specs. The invoice
  totals come through `ReceivablesService` (the owner), via a method that
  returns invoiced cents per trip id; lift the summing the ceiling check
  already does at ~543 into that shared piece so the ceiling and the
  uninvoiced figure cannot disagree. Do not query invoices from the trips or
  reports module.
- Visible exactly to whoever already sees Outstanding AR (same permission /
  `seesReceivables` gate); absent otherwise, never zero.
- API: `outstanding.uninvoiced` on `GET /reports/summary` and the matching
  place on the dashboard payload. Document it in the controller
  `@ApiOperation` text.
- Screens: a tile or line labelled **"Not yet invoiced"** beside Outstanding
  AR on Reports and the Dashboard, same styling family; em dash when the
  figure is absent.

## 5. R1-13 — One empty-leg match count

- `stats().matched` = open legs (`OPEN_STATUSES`, not lapsed) with at least
  one live match by `matchCounts`, computed over the same candidates and
  scope the list uses — not `status = MATCHED`. `available` keeps meaning
  what it means today; say in the report if the two tiles now overlap and
  how you labelled them.
- The dashboard's empty-leg figures read the same `stats()`.
- Spec: a leg whose stored status is AVAILABLE but has a matching request
  counts as matched; a MATCHED leg with no live match does not.

## 6. Tests (vitest)

- Desk defaults: `deskDefaultsView` returns exactly the six fields and
  never the markup; the route is open to staff and refused to a referral
  agent (pin it the way the other `*.access.spec.ts` files do).
- Suggest-price without `markupRates` uses the setting.
- Defaults: each absent field takes the setting; each sent field wins,
  including `fetEnabled: false` and terms; base from cost + markup;
  neither base nor cost → 400; trips take FET from settings.
- Deposit: equal to total OK; one cent over → 400 with the maximum named;
  update lowering the base below the deposit → 400.
- `uninvoiced`: no invoices, partly invoiced, fully invoiced, over-invoiced
  legacy row clamps at 0, unpriced trip adds nothing, archived invoice
  ignored.
- Empty-leg matched count as in §5.

## 7. Postman (written now, captured by the reviewer)

Update the builders; do not run them or Newman.
- `build_quotes_folder.py`: create **without** `basePrice` (operator cost
  only → base from markup, 201), create with neither (`400 · Base price
  required`), deposit above total on create and on update (`400 · Deposit
  over total`). Create bodies omit absent fields (never `null`).
- `build_quotes_folder.py` also: suggested price without `markupRates`
  (200, one suggestion at the default markup).
- `build_settings_folder.py`: `GET /settings/desk-defaults` — `200` as a
  broker, `403 · Referral agent`, `401 · No session`.
- `build_trips_folder.py`: create without `fetEnabled` / `fetRate`.
- `build_reports_folder.py`, `build_dashboard_folder.py`: the
  `uninvoiced` field in the descriptions; `build_empty_legs_folder.py`: the
  stats description.
- Every new example asserted by the builder's label check.

## 8. Docs (same pass)

- `docs/MODULES.md` §26: mark ✅ the rows Default markup, Quote validity,
  Default FET %, Apply FET by default, Default quote terms, and (if
  confirmed in §1) Default follow-up interval and Default lead stage —
  naming the reader and deleting the "hardcoded today" value.
- `docs/MODULE_FEATURE_STATUS.md`: Quotes, Trips, Reports, Dashboard, Empty
  Legs — move the matching lines to "working".
- `docs/MODULES.md` §26: add the desk-defaults route to the Settings
  section (who reads it, why the markup is not in it).
- `AGENTS.md`, part one, "A setting is read by the module it governs",
  point 2: on the frontend, **a staff form reads `useDeskDefaults()`;
  `useSettings()` is for the Settings screens only** (it needs
  Settings · View). Add any other durable rule that emerged; say which.
- Do **not** edit `HANDOFF.md`, `docs/FEEDBACK_TRACKER.md` or anything in
  `docs/feedback-replies/` — the reviewer does those after review.

Then run and paste:

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
npm run build
```

## 9. Report

1. Files created / changed, one line each.
2. Anything in this brief that did not match the code, and what you did.
3. Decisions the brief left to you (where the defaults function lives, the
   empty-leg tile labels, the dashboard field's place), and what you found
   in Add Client's follow-up payload.
4. Every remaining `0.075` / `7.5%` hit and why it stays.
5. The run output (counts).
6. Confirmation that nothing was committed or run against a database, and
   no `.env` was opened (`git status`).
