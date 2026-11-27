# Feedback implementation plan

Rounds 1–3 of `docs/FEEDBACK_TRACKER.md` merged into one build, in batches.
Written 25 Nov 2026. The tracker stays the record of **what** was agreed;
this file is **the order and the shape** of the build.

## How every batch runs

1. Claude writes the brief: `docs/codex-prompts/feedback-bNN-<name>.md`,
   with the tracker IDs, files to touch, rules from `AGENTS.md` that apply,
   migrations, tests to add, and the definition of done.
2. Codex builds it — always Codex, never Claude (developer, 27 Nov). One
   batch at a time, never two in flight.
3. Claude reviews the diff against the brief and `AGENTS.md`, runs
   `npm test`, typecheck, lint and build on both apps, and fixes what is
   wrong.
4. **Same pass, docs — every batch, no exceptions (developer, 27 Nov):**
   tracker status → `done`; tester reply → `final`;
   `feedback-replies/PROGRESS_FOR_ARI.md` (the batch's lines → ✅ in plain
   words, the next batch → 🔨, the date); `HANDOFF.md`; `MODULE_FEATURE_STATUS.md`,
   `MODULES.md` §26 (settings rows ✅) and `AGENTS.md` for any new durable
   rule; Postman entries for every changed or new endpoint.
5. **A batch is done once Claude's review passes and every check is green**
   (developer's rule, 27 Nov) — the docs in step 4 are written then. Claude
   adds the batch's on-screen tests to `docs/DEVELOPER_TEST_CHECKLIST.md`;
   the developer runs them later, and anything that fails is fixed then.
   Live runs (browser, Newman) happen only when the developer says so.
6. Commit only when the developer asks, split by concern.

Each migration is read by hand before it ships (no generated `DROP
COLUMN`), and a new action that takes over an existing power ships with
its grant migration.

## Order, and why

Batches 1–6 need nothing from Ari. Batches 7–12 wait on answers, at least
in part. Inside that, the order follows dependencies:

- **The email and PDF design system (B5) comes before every batch that
  sends or renders something new:** Ask an Operator, invoice emails,
  notification emails and FET reports are then built once, in the new
  design, not twice.
- **Notifications (B7) come before** booking alerts, trip transfers and FET
  reminders, which all post to it.
- **Invoice changes (B8) come before FET Accounting (B9).** This changes
  D13's order (FET, then invoice changes) for a dependency reason: an FET
  entry hangs off a client payment, and B8 changes what a payment is
  (credit as payment) and what an invoice is (no trip). Building FET first
  means reworking it a week later. **Needs the developer's OK.**

| Batch | Name | Tracker items | Ari blocks | Migration |
|---|---|---|---|---|
| B1 | Money and Settings correctness | R1-01, R1-02, R1-11 (carry-over), R1-12, R1-13 | — (R1-11's min-hours rule waits on R1 Q1) | — |
| B2 | Small fixes and polish | R1-03, R1-09, R1-14, R1-15, R1-16, R1-18, R1-19, R2-B1, R2-B2, R2-B4 | — | — |
| B3 | Workflow rules | R1-06, R1-07, R1-08, R1-10, R2-T2, R2-C1, R2-C3 | — | yes |
| B4 | Trip data | R3-04, R3-05, R3-06, R2-T1, R2-T4 | — | yes |
| B5 | Email and document design system | R3-01, R3-02, R3-03 | — (font Q14 and jet image Q13 slot in later) | — |
| B6 | Emails that tell the truth, and invoices | R1-04, R1-05, R2-F3, R2-F2, R2-F5 | — | maybe |
| B7 | Notifications | R2-N, R2-T5 | Q15 (preference layer only) | yes |
| B8 | Invoices and credit | R2-F4, R2-F1b | Q17, Q3 | yes |
| B9 | FET Accounting | R2-FET (incl. FET-4 pricing mode) | Q1, Q2, Q3, Q5 | yes |
| B10 | Expenses and receipts | R2-F6, R2-F7 | Q6, Q7 | yes |
| B11 | Trips, clients, referrals, look | R2-T3, R2-C2 (+R2-C2b), R2-C4, R2-C5, R2-C6, R2-B5b, R1-11 rule, #35 invite | Q8–Q14, Q16, R1 Q1, R1 Q2 | yes |
| B12 | Ask AI on OpenAI | R2-B3 | Q19 (OpenAI OK) | — |

Round 3 part two, when it arrives, is slotted into the matching batch or
gets its own.

---

## B1 — Money and Settings correctness

**R1-01 Quotes read Settings on the server.** In `quotes.service.ts` the
create path reads `settings.read()` for FET rate, apply-FET, validity and
terms when the field is absent; base price = operator cost + default
markup when no base is sent. Delete `fetRate ?? 0.075`. The form keeps
prefilling from `useSettings()`. New leads and clients take the default
stage and follow-up interval in their services. `MODULES.md` §26 rows ✅.

**R1-02 Deposit cap.** The deposit is refused above the quote total (the
total from `quotes.pricing.ts`), on create and update, and the form says
the maximum.

**R1-11 Estimate → quote (carry-over only).** The estimate goes in as
operator cost; base = cost + default markup (uses R1-01). The per-leg
minimum stays as is until R1 Q1.

**R1-12 Uninvoiced balance.** Trip total minus invoiced, summed by
`tallyTrips` (`trips.figures.ts`) and shown beside Outstanding AR on
Reports and the Dashboard. One function, both screens.

**R1-13 One empty-leg match count.** Stats, Dashboard and cards use the
same live match function; the stored `MATCHED` count goes.

Tests: Settings applied when absent and ignored when sent; deposit above
total → 400; uninvoiced figure in `tallyTrips` specs; match count spec.

## B2 — Small fixes and polish

- **R1-03:** client requirements go to the quote's existing
  `internalNotes`, never `terms` (`AddQuoteDialog.jsx:186`); preview title
  "QUOTE". The new quote layout itself comes in B5.
- **R1-09:** same From/To refused on Add Lead, trip requests and in the API.
- **R1-14:** the invented sign-in figures in `app/(auth)/layout.js` go.
- **R1-15:** Book Trip in the quote row menu and card (one `getRowActions`).
- **R1-16:** timeline describes changes in words; client payments appear
  on the client timeline.
- **R1-18:** latitude/longitude messages name the range.
- **R1-19:** one lead-stage list; aircraft year cap computed per request.
- **R2-B1:** "Passenger Names" opens passenger editing and highlights it.
- **R2-B2:** Ask AI trigger moves into the top navbar (no floating button).
- **R2-B4:** Avinode, avinode.com.
- **Seed fix (found by the B1 Postman run, 27 Nov):** `prisma/seed.ts`
  does not clear `empty_legs` in its cleanup, so re-seeding a worked
  database fails; add it in the right order. Dev fixture only.

## B3 — Workflow rules

- **R1-06:** Mark Paid asks method and reference, behind `ConfirmDialog`;
  a commission becomes EARNED when its trip completes, in the trip's
  completion transaction, audited.
- **R1-07:** Confirm requires the operator-confirmed tick and a departure
  time (`trips.service.ts` `changeStatus`), with the reason named.
- **R1-08:** Complete warns (dialog, not a block) when the operator is
  unpaid or part of the trip is uninvoiced; the API returns the open items.
- **R1-10:** `autoAdvanceClientOnBooking` writes its audit entry; sending a
  quote moves the client to QUOTED, audited; the client summary strip reads
  the latest trip.
- **R2-T2:** "Edit financials" on the approval banner.
- **R2-C1:** `Client.leadSourceOther` text, required when source is OTHER.
- **R2-C3:** `Operator.oaRequired` nullable boolean (Yes / No / not set).

Migration: `leadSourceOther`, `oaRequired`.

## B4 — Trip data

- **R3-04:** `Quote.interiorImageUrl` (`uploadUrl`), in the DTOs and both
  selects; two photo fields on the quote form, each with `library` and
  `suggested`; both in the quote preview and PDF; booking a quote passes
  both photos to the trip's itinerary.
- **R3-05:** `TripPassenger.weightLb` (optional, positive integer) on the
  passenger cards (create and edit).
- **R3-06:** `luggageCount` and `luggageWeightLb` on `Trip` and
  `TripRequest`, a Luggage section under Passengers, shown on the trip.
- **D15:** weights and luggage never reach the client quote/itinerary PDF
  or the portal; they do go to the operator (operator-facing views and the
  Ask an Operator email in B6).
- **R2-T1:** Convert to Trip on a request: the new-trip form prefilled
  (client, broker, route, date, passengers, luggage), stored through the
  existing `Trip.tripRequestId`; the request shows its trip.
- **R2-T4:** saved passengers derived from the client's past trips,
  de-duplicated by name + date of birth, offering the last weight (D17).
  No new table.

Migration: the five columns above.

## B5 — Email and document design system

**R3-01 Emails.** A new shell in `core/mail/mail.layout.ts`, built from
table layout and inline styles (what Gmail and Outlook honour), with a
few blocks every email composes from: header, heading, paragraph, button,
details table (label / value rows for money and trip facts), notice,
footer. Single column, fluid to 600px, readable at 320px; a plain-text
part always. Montserrat where the reader allows it, then a close system
match (D14; Ari's font Q14 swaps in when answered). Account emails,
composed emails, reminders and every later email use only these blocks.

**R3-02 Branding everywhere.**
- Email header uses the logo-on-dark setting, falling back to the main
  logo, then the wordmark; footer carries the contact block, all or
  nothing, like the letterhead.
- PDFs: WebP, GIF and AVIF logos converted to PNG at render, so any
  uploaded logo prints; PDF Creator/Producer use the company name.
- Grep both apps for hardcoded "Tribeca" in emails and documents; each goes
  to the Settings value.

**R3-03 Documents.** One PDF design in `common/pdf/`: page grid and
margins, type scale, header (logo, document title and number), footer
(contact block, page x of y), tables, totals block, notes and terms block.
Quote, itinerary, invoice and report PDFs move onto it; FET reports in B9
are built on it. The quote form preview and itinerary preview match the
PDFs.

Done means: sample of every email and PDF rendered to files in the review,
checked at phone and desktop width, and in Outlook's rendering limits by
inspection.

## B6 — Emails that tell the truth, and invoices

- **R1-04:** Ask an Operator opens the shared compose form, addressed to
  the operator, with the trip facts (including weights and luggage, D15);
  logged in Sent.
- **R1-05:** the mail worker's FAILED path takes a quote or itinerary back
  from Sent and tells the sender (a task now; a notification once B7
  ships). Same rule for invoice emails.
- **R2-F3:** email any invoice, draft or sent, with its PDF attached,
  through the compose form; marked Sent only when delivered.
- **R2-F2:** Receivables renamed Invoices under Finance; the old route
  redirects.
- **R2-F5:** client invoice and operator payable due dates on the Schedule
  calendar, two colours, each under its own permission, keys under the
  trips namespace.

## B7 — Notifications

`Notification` table (recipient, kind, subject, read at, link), a bell in
the top navbar replacing the tasks-only popover, a paged list, mark read,
and email through the mail queue and B5's shell. One service other modules
call: `notify(recipients, kind, subject)`.
First users: R2-T5 (every booking notifies Admins and Super Admins, in-app
and email) and R1-05's failed-send notice. The opt-out (per person or
company, Q15) is added when Ari answers; the bell itself is not optional.

## B8 — Invoices and credit (waits on Q17, Q3)

- **R2-F4:** `Invoice.tripId` optional; tripless invoices scoped by client;
  the ceiling applies only with a trip; reports and the portal handle both.
- **R2-F1b:** apply credit to an invoice: one transaction writes a
  `CLIENT_CREDIT` payment and the linked credit APPLICATION, with both
  balance guards, re-checked on restore.

## B9 — FET Accounting (waits on Q1, Q2, Q3, Q5)

Split into five briefs:
1. `FET` permission module (locked for Broker, Assistant, Referral Agent),
   grant migration, `FetEntry` created per client payment.
2. `FetAdjustment`, `FetReport` (frozen snapshot, number, delivery status —
   documented as an exception in `AGENTS.md`), PDF / XLSX / CSV.
3. Settings › Accountant; Send to Accountant through the mail queue,
   marked sent only on SENT.
4. FET dashboard (month and quarter totals, filters) and reminders through
   B7 (−3 days, due, overdue until sent).
5. FET-included pricing mode in `quotes.pricing.ts`, read by quotes,
   trips, invoices, reports and commissions; both modes pinned by tests.

## B10 — Expenses and receipts (waits on Q6, Q7)

`TripExpense` (Catering / Transportation / Other + amount, internal, in
Reports; changes profit only if Q6 says so) and `Receipt` under Finance
(photo, classification, the fields Q7 names).

## B11 — Trips, clients, referrals, look (waits on several answers)

R2-T3 trip transfer (Q8; uses B7), R2-C2 referred by and desk Log
referral (Q9, Q10), R2-C4 airport FBOs (Q12), R2-C5 itinerary airports
(Q11), R2-C6 contract category (Q16), R2-B5b font and jet image (Q13,
Q14), R1-11 minimum-hours rule (R1 Q1), the invitation password (R1 Q2).
Cut into briefs by what is answered first.

## B12 — Ask AI on OpenAI (waits on Q19)

The in-app assistant runs on the WhatsApp assistant's OpenAI agent and read
tools, with the caller's own permissions (D12); auto-scroll fixed. The
keyword engine in `assistant.service.ts` goes.
