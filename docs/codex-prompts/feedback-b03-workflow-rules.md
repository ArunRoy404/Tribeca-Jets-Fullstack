# Codex prompt — Feedback B3: workflow rules

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this batch is

Seven items that make the system follow the desk's workflow. **One
migration** (three nullable columns). Items are independent: if one does
not match the code, report it and carry on with the rest.

| ID | Item |
|---|---|
| R1-06 | Commissions: Mark Paid asks method and reference behind a confirmation; a commission becomes EARNED automatically when its trip completes |
| R1-07 | Confirming a trip also requires the operator-confirmed tick and a departure time |
| R1-08 | Completing a trip warns (dialog, not a block) when the operator is unpaid or part of the trip is uninvoiced |
| R1-10 | Client lifecycle: booking's auto-advance writes its timeline entry; sending a quote moves the client to QUOTED; the client summary strip reads the latest trip |
| R2-T2 | "Edit financials" button on the trip approval banner |
| R2-C1 | Lead source OTHER takes free text (`Client.leadSourceOther`) |
| R2-C3 | Operator "OA required?" Yes / No / not set (`Operator.oaRequired`) |

Read AGENTS.md in full first. Most in play: audit rows for state changes,
"Never build an update schema with `.partial()`", "A field the DTO accepts
must be in the select", the migration rules ("Read every generated
migration"), `ConfirmDialog` (never `window.confirm`), hooks own side
effects, and the 24-hour clock.

## Migration

One hand-checked migration, `20261127120000_feedback_b3`:
- `commissions."paymentReference"` TEXT NULL (the payout's reference —
  cheque number, transfer ID). `method` and `paidAt` already exist.
- `clients."leadSourceOther"` TEXT NULL.
- `operators."oaRequired"` BOOLEAN NULL (null = not set).

No defaults, no backfill, no `DROP`. Generate with Prisma, then read the
SQL and confirm it is exactly three `ADD COLUMN`s. Do not run it.

## 1. R1-06 — Commissions

- **Mark Paid** (the action that sets PAID): the API requires `method`
  (existing `PaymentMethod` enum) and accepts `paymentReference` (trimmed,
  max 120) and `paidAt` (`calendarDate`, default today). Refuse PAID
  without a method: 400 on `method`. Reference and method are in the
  select, the detail sheet and the audit metadata. A partner's view
  (`partnerView`) includes the paid date, method **and reference** — the
  reference is the agent's proof of payment.
- The frontend Mark Paid opens a small form (method, reference, date) and
  then a `ConfirmDialog` ("Mark commission CM-… paid: $X by wire?"), not
  a one-click write. Hooks own the toast and invalidation.
- **EARNED on completion:** whenever a trip becomes COMPLETED — the trip
  status change **and** the flight-tracking path that completes a trip when
  every leg lands — every live PENDING commission on that trip moves to
  EARNED **in the same transaction**, with an audit row per commission
  (`commission.earned`, metadata: trip reference, amount). CANCELLED and
  PAID are untouched. Reopening a trip does not reverse it.
- Avoid a module cycle (commissions already depends on trips): prefer an
  exported function owned by the commissions module that takes the
  transaction client (`earnOnTripCompletion(tx, tripId, actorId)`), called
  from both completion paths. Report what you chose.

## 2. R1-07 — Confirm needs the operator and a time

`trips.service.ts` status change to CONFIRMED: today it requires operator,
date and passengers. Also require `operatorConfirmedAt` set and a
`departureTime` on the first leg (use whichever field the trip actually
stores — check). Refuse with 400 naming every missing item in one message
("Before confirming: tick Operator confirmed, add a departure time"), in the
same style as the existing checks. The trip page shows the same list next to
the Confirm action so the broker knows before clicking.

## 3. R1-08 — Complete warns about open money

- `GET /trips/:id/open-items` (session + the trip's read scope; 404
  outside it): `{ operatorUnpaid: boolean, operatorBalance: number|null,
  uninvoiced: number|null }`. Operator balance through
  `OperatorPaymentsService` (the owner); uninvoiced through
  `ReceivablesService.invoicedCentsByTrip` and the trip's total, using B1's
  `uninvoicedCents` for one trip. Money only for a caller who holds the
  relevant money permission — otherwise those fields are null and the
  booleans still say whether something is open (no figure leaks).
- Before Complete, the trip page calls it; if anything is open, a
  `ConfirmDialog` lists it ("Operator not fully paid · $4,000 not yet
  invoiced — complete anyway?"). Nothing open → completes as today. **The
  API never blocks completion** (owner's rule: operators are sometimes paid
  late).

## 4. R1-10 — Client lifecycle

- `autoAdvanceClientOnBooking` changes the client's stage/status without
  an audit row. Write one on the Client (`client.stage_changed`, metadata
  `{ from, to, via: 'booking', tripReference }`) in the same transaction,
  only when it actually changed something.
- Sending a quote (`QuotesService.send`) moves its client's `leadStage` to
  `QUOTED` when the client is a lead at an earlier stage (NEW, CONTACTED,
  QUALIFIED, PROPOSAL); never moves a client backwards (WON, LOST, QUOTED
  stay). Audited the same way with `via: 'quote_sent'`. Do it through
  `ClientsService` (the owner), not a raw Prisma write from quotes.
- The client summary strip (the one removed on 30 Oct for showing invented
  values) comes back filled from the client's **latest trip** — route,
  date, status — read through `TripsService` in the client's scope. No
  trip → the strip says "No trips yet". Find the removed strip in git
  history (`git log -S` is read-only and allowed) and reuse its markup
  rather than inventing a new design.

## 5. R2-T2 — Edit financials

On the trip approval banner (shown to `TRIPS · APPROVE` holders on a
pending trip), add "Edit financials", which opens the trip's existing edit
form on its Financials section. Edit already resubmits; no new endpoint.

## 6. R2-C1 — Lead source "Other"

`leadSourceOther` on create and update DTOs (separate update schema, no
`.partial()`), list and detail selects. Required (400) when `leadSource` is
OTHER; cleared to null when the source changes away from OTHER. Add Client,
Add Lead and the client edit form show a text box when Other is picked; the
client page shows "Other — <text>".

## 7. R2-C3 — OA required

`oaRequired` (nullable boolean) on operator create/update DTOs and both
selects. Operator form: a three-way control (Yes / No / Not set — a
`CommonSelect` over a fixed set). Operator details: "OA required: Yes / No /
Not set". Never defaulted.

## Tests (vitest)

PAID without method → 400; reference stored and in the partner view;
completion moves PENDING → EARNED in both paths and leaves PAID/CANCELLED;
confirm refused naming each missing item; open-items with and without money
permission; booking auto-advance audited only on change; quote send moves
only earlier stages; leadSourceOther required with OTHER and cleared
otherwise; oaRequired round-trips null/true/false.

## Postman (written now, captured later)

Commissions (Mark Paid with method/reference, `400 · Method required`),
Trips (`400 · Not ready to confirm`, `GET open-items` 200/404), Clients
(`leadSourceOther`, `400 · Describe the source`), Operators (`oaRequired`).
Do not run builders or Newman.

## Docs (same pass)

- `docs/MODULE_FEATURE_STATUS.md` for touched modules.
- `AGENTS.md`: add under part two "A commission becomes EARNED in its trip's
  completion transaction, on every completion path" and any other durable
  rule; say which.
- Do **not** edit `HANDOFF.md`, `docs/FEEDBACK_TRACKER.md`,
  `docs/DEVELOPER_TEST_CHECKLIST.md` or `docs/feedback-replies/`.

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

## Report

Write it to `docs/codex-reports/feedback-b03-workflow-rules.txt`, with a
short summary in chat:

1. Files changed, one line each, and the migration SQL in full.
2. Per item: done / partly / not done, and any mismatch with the code.
3. Decisions left to you (EARNED wiring, departure-time field, the summary
   strip you restored).
4. Run output (counts).
5. Confirmation: nothing committed, migration not run, no database or
   `.env` touched (`git status`).
