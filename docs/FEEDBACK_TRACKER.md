# Feedback tracker

Every piece of feedback from the client (Ari) and the tester, one section
per round, newest last. Each item is checked against the code before it
gets a verdict. **Nothing here is implemented until the developer starts
the implementation phase**; then each item's status moves along:
`open` → `brief written` → `building` → `in review` → `done` → `committed`.

The build order is in `docs/FEEDBACK_IMPLEMENTATION_PLAN.md` (batches B1–B12).

**Replies** go in `docs/feedback-replies/`: `REPLIES_TO_TESTER.md` (per
issue, with how to retest) and `REPLIES_TO_CLIENT.md` (plain message for
Ari, plus open questions). A reply is drafted when its item is agreed and
rewritten to match the build when the item is done — same pass as the
status change here.

---

## Round 1 — QA Test Report v2.0 (tested 11–13 Oct 2026)

**Source:** `reviews/Tribeca_Jets_CRM—Module_Issues_Explained.pdf` (the
tester, as Super Admin, on records labelled TEST).
**Checked against the code:** 25 Nov 2026.
**Finalised:** 25 Nov 2026. The developer accepted every recommendation in
§5; two questions are with Ari.

A fix pass ran on 30 Oct (`docs/QA_REVIEW_REMEDIATION.md`, which claims
100%). The check on 25 Nov found about a third of it partial or not done;
this section is the record of what is actually true.

### 1.1 Done — verified in the code

| # | Issue | What fixed it |
|---|---|---|
| 1, 2, 8, 10, 14, 19 | Settings page, blank notes, approving before a price, invalid email, withdrawing an invite, estimate not refreshing | Fixed before the report was written (the report says so) |
| 3 | Schedule Follow-up fails with "uuid is expected" | Whole client passed to the dialog (`ClientDetailPage.jsx`) |
| 4 | FET counted as profit | Profit = base + extras − operator cost (`quotes.pricing.ts`, `trips.figures.ts`); commissions ($190, not $275.50), reports and the Dashboard follow; pinned by `commissions.amounts.spec.ts` |
| 5 | Old prototype data (with passwords) in browser storage | `purgeLegacyStorage()` on load and sign-out (`lib/session.js`) |
| 6 | `.exe` accepted as a document | `acceptsAnyFile: false` + `BLOCKED_EXTENSIONS` (`uploads.rules.ts`), type read from the bytes |
| 7 | Withdrawing a used credit leaves a negative balance | Refused (`client-credits.service.ts` `remove()`) |
| 13 | Lead stage lists differ between Add Client and Add Lead | Same values now (two copies remain — see 1.2 cleanup) |
| 16 | "Active Agents" counts invited users | Only `ACTIVE` users (`clients.service.ts` `brokerPerformance`) |
| 17 | Invite phone accepts "abc"; aircraft year 2099; empty weight > MTOW | All refused (`user.dto.ts`, `aircraft.dto.ts`) |
| 22 (part) | Itinerary has no departure time; passengers show "—" | Departure time field; passenger count shown when names are missing |
| 23 | A trip can be invoiced twice | Ceiling on create and update (`receivables.service.ts`); form offers "Bill remaining balance" |
| 24 | Edit Quote fails with "Use a YYYY-MM-DD date" | `calendarDate` strips the time; form seeds through `toDateInput` |
| 25 | Flight set to Landed before its departure date | Refused; trip status follows the flight |
| 27 | Sourcing result not carried into the quote | "Build Client Quote" on an approved operator quote |
| 28 | "Source in Operators" / "TR-3" search finds nothing | `referenceFromSearch` in trip-request search |
| 34 (users) | Owner not offered as a broker | `BROKER_ROLES` includes Super Admin and Admin |
| 37 | Email money shows `$12255.00` | `formatMoney` in merge fields → `$12,255.00` |

### 1.2 Fix — agreed

**High — money and trust**

| ID | # | What to do | Why | Status |
|---|---|---|---|---|
| R1-01 | 33 | **Quotes apply Settings on the server**: FET rate, validity, terms and apply-FET when the field is absent; **default markup used** (base = cost + markup); delete the hardcoded `0.075` in `quotes.service.ts`. Mark the rows ✅ in `MODULES.md` §26 | Settings reach only the form today; the markup setting does nothing anywhere | done (B1, 27 Nov) |
| R1-02 | 11 | **Deposit capped at the quote total**, in the API and the form | A deposit above the total breaks invoicing | done (B1, 27 Nov) |
| R1-03 | 32 | **Client requirements move to an internal field**, out of Terms (`AddQuoteDialog.jsx` copies them into `terms`); preview title "QUOTE", not "QUOTES" | The client reads desk notes ("Catering for 4") as contract terms | open |
| R1-04 | 36 | **Ask an Operator sends a real email** through the shared compose form, logged in Sent | Toast says "Request sent" and nothing is sent; a charter can be lost waiting | open |
| R1-05 | 22 | **A failed email undoes "Sent" on the quote/itinerary and tells the broker** (the worker's FAILED path) | Today a quote stays Sent when the worker later fails it, and nobody is told | open |
| R1-06 | 30 | **Commissions**: Mark Paid asks for method and reference, with a confirmation; a commission becomes **EARNED automatically when its trip completes** | Payouts with no trail; status never leaves PENDING | open |

**Medium — workflow safety**

| ID | # | What to do | Why | Status |
|---|---|---|---|---|
| R1-07 | 9 | Confirming a trip also requires the **operator-confirmed tick** and a **departure time** (operator, date and passengers already required) | Trips confirmed before the operator has said yes | open |
| R1-08 | 26 | Completing a trip **warns** (confirm dialog, not a block) when the operator is unpaid or part of the trip is uninvoiced | Open money is easy to miss; operators are sometimes paid late, so no block | open |
| R1-09 | 12 | **Same From/To airport refused in Add Lead and in the API** (only Add Client checks it) | KTEB → KTEB enquiries | open |
| R1-10 | 29 | Client lifecycle: a **timeline entry** when booking moves the client to Active/Won (none is written); **client stage → QUOTED when a quote is sent**; **summary strip filled from the latest trip** (it was removed, not filled) | Half-done on 30 Oct | open |
| R1-11 | 38 | Instant Estimate → quote: estimate goes in as **operator cost**, base = cost + default markup (needs R1-01). Today both fields get the estimate, so the quote opens at $0 profit | Wrong starting figures | carry-over done (B1, 27 Nov); min-hours rule waits on Ari Q1 |
| R1-12 | 4 (reports) | **Uninvoiced balance** shown next to Outstanding AR (Reports, Dashboard) | "AR $0" hides money the client still owes | done (B1, 27 Nov) |
| R1-13 | 31 | **One empty-leg match count** used by the counters, the Dashboard and the cards (stats count stored `MATCHED`, cards count live matches) | "0 matched" beside "1 match" | done (B1, 27 Nov) |

**Low — polish**

| ID | # | What to do | Status |
|---|---|---|---|
| R1-14 | 35 | Remove the invented sign-in figures (240+ / $18M / 96%) in `app/(auth)/layout.js` — breaks "never display a number the data did not supply" | open |
| R1-15 | 21 | **Book Trip** in the quote row menu (and card) | open |
| R1-16 | 15 | Timeline in plain words ("updated phone, email", not raw field names); client payments on the client timeline | open |
| R1-17 | 34 (referrals) | Desk **"Log referral"** form (API already accepts staff + `agentId`); **agent picker when lead source = Referral** | **merged into R2-C2** |
| R1-18 | 18 | Friendly latitude/longitude range message (today Zod's default "Too big…") | open |
| R1-19 | — | Cleanup: one shared lead-stage list (`CLIENT_LEAD_STAGES` and `LEAD_STAGES` are two copies); aircraft year cap computed per request, not at server start | open |

### 1.3 Not fixing, or not in this round

| # | Item | Why |
|---|---|---|
| 35 | Invite email carries a starting password | Owner's decision, 6 Oct 2026 — **pending Ari Q2** |
| 25 | Live flight feed | Needs a paid provider; signed scope keeps tracking manual. Impossible statuses are already refused |
| 18 | Airport auto-fill from ICAO | A new feature (possible later from the free OurAirports list), not a bug |
| 33 | Notifications & alerts (flight, payment, quote-expiry) | ~~Its own item after this round~~ — **now in scope as R2-N** (Ari asked for it on 19 Nov) |
| 22 | Detecting bounces that happen later inside the recipient's mail server | Needs the mail provider's bounce webhook; R1-05 covers every failure the server sees |
| 5 | Reset the passwords found in browser storage | They were the prototype's dummy accounts; the purge is done |
| 6 | Return to "a document may be any file" | Allowlist kept (decision D1); AGENTS.md updated 25 Nov |

### 1.4 Retest — built after the QA window, or untestable then

| Area | Why | Who |
|---|---|---|
| Import / Export | Import built 29 Oct; QA saw "no import yet" | tester |
| PDF Generator | Built 29 Oct; QA saw no PDFs | tester |
| Client Portal | Built 29 Oct, extended 7 Nov; QA stopped at sign-in | tester |
| AI Assistant popover | Froze the tab in October; rebuilt since — fix if it still freezes | tester |
| Permissions per role | Needs one login per role (Admin, Broker, Assistant, Referral Agent); rebuilt by 10 Nov | tester |
| Report exports | Never tested (file downloads) | tester |
| Every item in 1.1 | Confirm on screen, especially #4, #6, #23 | tester |

### 1.5 Decisions

**Made by the developer, 25 Nov 2026** (all as recommended):

| ID | Decision |
|---|---|
| D1 | Keep the upload allowlist; the 6 Oct "any file" rule is withdrawn |
| D2 | Confirming a trip requires the operator-confirmed tick and a departure time |
| D3 | Completing a trip with open money **warns**, does not block |
| D4 | Commission becomes EARNED automatically when its trip completes; Mark Paid asks for method and reference |
| D5 | Ask an Operator sends a real email |
| D6 | A failed email undoes "Sent" and notifies the broker |
| D7 | Client requirements live in an internal field, never in Terms |
| D8 | Referrals: both a desk form and an agent picker on leads |
| D9 | ~~Notifications & alerts are a separate item after this round~~ — **superseded 25 Nov by R2-N** |

**Waiting on Ari:**

| ID | Question | Blocks |
|---|---|---|
| Ari Q1 | Minimum billable hours are applied **per leg**, so a round trip is charged the minimum twice. Intended? | R1-11 (the estimate's rule; the carry-over itself can go ahead) |
| Ari Q2 | Keep the starting password in the invitation email, or switch to a link where the person sets their own? | #35 invite part |

### 1.6 Docs corrected

- `docs/QA_REVIEW_REMEDIATION.md` — marked partial, points here (25 Nov).
- `AGENTS.md` — "A document may be any file" replaced by the allowlist (25 Nov, D1).
- `docs/MODULES.md` §26 — rows to be marked ✅ as R1-01 wires them.

---

## Round 2 — Ari's list (19 Nov 2026)

**Source:** `reviews/19.11.2026.md` (Ari, 37 items in five sections).
**Checked against the code:** 25 Nov 2026.
**Finalised:** 25 Nov 2026 — the developer accepted every recommendation;
16 questions are for Ari (2.8). Overlaps with other rounds are merged (2.7).

### 2.1 Already exists

| ID | Item | What is there | Left |
|---|---|---|---|
| R2-F1a | Client credit shown on the profile | **Credit** tab on the client page (`CLIENTS · VIEW_MONEY`) | — (applying it is R2-F1b) |
| R2-F2 | One Invoices section | **Receivables** is that list — every invoice, trip-raised included | Rename to **Invoices** under Finance (label + route, old route redirects) |
| R2-F8 | Wire details admin-only | Broker and Assistant can never hold Settings (`access.roles.ts`) | — ; wire details still print on invoices, as intended |
| R2-T2 | Broker booking → admin approval | `TRIPS · APPROVE`, Approve / Decline, declined held, edit resubmits (9–10 Nov) | **"Edit financials"** shortcut in the approval banner |
| R2-C6 | "Contract" document category | `CHARTER_AGREEMENT` ("Charter Agreement") exists | Relabel or separate category — Ari Q16 |
| R2-B5a | Emails use the logo | Every email uses the Settings logo; the wordmark only while none is uploaded | Upload the logo on production |

### 2.2 Bugs — checked in the code

| ID | Bug | Cause | Fix | Status |
|---|---|---|---|---|
| R2-B1 | "Passenger Names" in the checklist does nothing | Scrolls to the passengers card, which sits just below — no visible move, never opens editing | Open passenger editing and highlight it | open |
| R2-B2 | Ask AI covers the bottom of the page | `fixed bottom-5 right-5` trigger | Move into the top navbar | open |
| R2-B3 | Ask AI: bad answers, no auto-scroll | The in-app assistant is keyword matching (`assistant.service.ts` `ask()`), not AI | Run it on the **WhatsApp assistant's OpenAI agent and tools** (same permissions, read tools); fix auto-scroll. Needs Ari's OpenAI OK (pending since 20 Nov) | open |
| R2-B4 | "Avanode" | `AVANODE_URL` + label in `TripContractCard.jsx` | Avinode, avinode.com | open |
| R2-C5 | Airports missing in the itinerary builder | Not reproducible from the code — the route comes from the picked trip by design and the trip detail sends leg airports | Reproduce — Ari Q11 | open — waits on Q11 |
| R2-C2b | "Referrals not working at all" | Desk page is wired; most likely empty because the desk cannot add one | Covered by R2-C2 — confirm with Ari Q10 | open — waits on Q10 |

### 2.3 Changes to existing features

| ID | What to do | Status |
|---|---|---|
| R2-F1b | **Apply credit to an invoice**: one transaction writes an invoice payment (new method `CLIENT_CREDIT`) and a linked credit APPLICATION; both balance guards apply | open — Ari Q3 |
| R2-F3 | **Email any invoice** (draft or sent, PDF attached, shared compose form); marks it Sent only when delivered | open |
| R2-F4 | **Invoice without a trip**: `Invoice.tripId` optional; tripless invoices scoped by client; ceiling only with a trip | open — Ari Q17 |
| R2-F5 | **Due dates on the Schedule calendar**: client invoices and operator payables, two colours, "Client payment due" / "Pay operator", each under its own permission | open |
| R2-T5 | **Every booking notifies all Admins and Super Admins** — in-app + email (today: only a broker's booking, as a task + email, to approvers). Needs R2-N | open |
| R2-C1 | Lead source **Other** takes free text (`leadSourceOther`) | open |
| R2-C2 | **"Referred by"** on clients and leads, shown in Referrals; desk **"Log referral"** form. *Absorbs R1-17* | open — Ari Q9, Q10 |
| R2-C3 | Operator **"OA needed?"** Yes / No / not set, on operator details | open |
| R2-C4 | **FBO list per airport** — new `AirportFbo` table; airport default FBO and itinerary departure/arrival FBO become links; existing text migrated into it | open — Ari Q12 |
| R2-B5b | Emails in Tribeca's font (with fallback); swap `plane.png` (`CommonCard` default background) for a private-jet image | open — Ari Q13, Q14 |

### 2.4 New features

| ID | Feature | Shape | Status |
|---|---|---|---|
| R2-FET | **FET Accounting** (13 sub-items, high priority) — admins only, refused on the server | New `FET` permission module, locked for Broker, Assistant and Referral Agent. `FetEntry` (one per client payment, due = payment date + 14 days, at most one per payment; collected / reported / paid-to-IRS kept apart), `FetAdjustment` (corrections after sending, never overwrites), `FetReport` (frozen snapshot + PDF, report number, delivery status — a deliberate snapshot exception like `QuoteVersion`). Accountant details in Settings. Report as PDF / XLSX / CSV (shared PDF engine, `tabular.ts`). Send to Accountant through the mail queue; entries marked sent only when the worker reports SENT. Dashboard with month / quarter totals and filters. Ready for a daily auto-report later; never auto-sends now | open — Ari Q1, Q2, Q3, Q5 |
| R2-N | **Notifications** — in-app bell + email | Feeds FET reminders (−3 days / due / overdue until sent), booking alerts (R2-T5), transfer approvals (R2-T3). Supersedes Round 1 D9 | open — Ari Q15 |
| R2-F6 | **Trip expenses** | `TripExpense`: Catering / Transportation / Other (text) + amount; internal; in Reports | open — Ari Q6 |
| R2-F7 | **Receipt vault** (Finance) | `Receipt`: uploaded photo, classified Legitimate / Potential / Non-expense before saving | open — Ari Q7 |
| R2-T1 | **Convert to Trip** on a trip request | New-trip form pre-filled from the request, linked by `tripRequestId` | open |
| R2-T3 | **Trip transfer** | Admin direct (`TRIPS · ASSIGN`); broker request with a note waits for admin approval (`TripTransfer` request + notifications) | open — Ari Q8 |
| R2-T4 | **Saved passengers** | No new table: the client's past trips' passengers, de-duplicated by name + date of birth, one click to add | open |

**New navigation:** Finance › Invoices (renamed), Finance › FET Accounting,
Finance › Receipts, Settings › Accountant.

### 2.5 Major changes

1. **FET Accounting** — new admin-only module, three tables, a snapshot exception, Settings additions, scheduler-ready.
2. **Notifications** — new infrastructure that FET, bookings and transfers depend on.
3. **FET included in the price** (FET-4) — a second pricing mode in `quotes.pricing.ts`, read by quotes, trips, invoices, reports and commissions; both modes pinned by tests.
4. **Invoices without trips** — `Invoice.tripId` nullable: scope, ceiling, reports, portal, FET entries.
5. **Credit as payment** — the credit ledger linked to invoice payments, guarded on both sides.
6. **Trip expenses** — if they reduce profit, the profit formula changes everywhere (Q6).
7. **Airport FBOs** — new table, text migrated.
8. **In-app Ask AI on OpenAI** — replaces the keyword engine.
9. **Permission catalogue** — FET and Receipts modules, broker transfer requests; any action that takes over an existing power ships with its grant migration.

### 2.6 Not doing

| Item | Why |
|---|---|
| A separate saved-passenger directory (R2-T4) | The passengers are already on past trips; a second table drifts |
| Auto-sending FET reports (FET-13) | Ari's own instruction; built ready for it, switched off |
| A web font guaranteed in every inbox (R2-B5b) | Gmail and Outlook ignore web fonts; set with a matching fallback |

### 2.7 Merged with other rounds

| Item | Merge |
|---|---|
| R1-17 (desk referral form, agent on leads) | → **R2-C2** |
| R1 D9 (notifications later) | → superseded by **R2-N** |
| R1-05 (failed email undoes Sent) | Same rule applies to invoice emails (R2-F3) and FET reports |
| R1-01 (Settings defaults) | The default FET rate feeds FET entries |

### 2.8 Decisions

**Made by the developer, 25 Nov 2026** (as recommended):

| ID | Decision |
|---|---|
| D10 | Brokers keep the FET line on their own quotes, trips and invoices; FET figures are hidden from non-admins' Reports; FET Accounting is refused to them on the server |
| D11 | Saved passengers are derived from past trips, never a second table |
| D12 | In-app Ask AI moves to the WhatsApp assistant's OpenAI agent and tools |
| D13 | Implementation order: quick fixes → Notifications → FET Accounting → invoice changes, expenses, receipts, transfers, FBOs, Ask AI |

**Waiting on Ari** (sent 25 Nov 2026, with Round 1's two and the OpenAI OK, as `docs/feedback-replies/QUESTIONS_FOR_ARI.md`):

| ID | Question | Blocks |
|---|---|---|
| Ari Q1 | On a partial payment, how much is FET — a proportional share, or FET first? | FET-3 |
| Ari Q2 | "FET already included in the price" — decided per trip, or per client? | FET-4 |
| Ari Q3 | Does credit applied to an invoice count as a payment that creates an FET entry? | FET-1, R2-F1b |
| Ari Q5 | Who marks "paid to IRS", and does it carry a date and amount? | FET-5 |
| Ari Q6 | Do trip expenses lower the trip's profit (and the broker's commission)? | R2-F6 |
| Ari Q7 | Receipts: which fields (amount, date, vendor, linked trip?), and who uploads and sees them? | R2-F7 |
| Ari Q8 | Trip transfer: does the client move to the new broker, and does the commission follow? | R2-T3 |
| Ari Q9 | "Referred by": a referral agent from the list, a free-text name, or both? | R2-C2 |
| Ari Q10 | "Referrals not working": an empty page, an error, or no way to add one? | R2-C2b |
| Ari Q11 | Airports in the itinerary builder: which trip, and did you expect to choose airports there? | R2-C5 |
| Ari Q12 | Multi-leg trips: one FBO pair per itinerary, or per leg? | R2-C4 |
| Ari Q13 | The private-jet image: will you send one, and on every screen or Email Templates only? | R2-B5b |
| Ari Q14 | Which font is Tribeca's? | R2-B5b |
| Ari Q15 | Notification emails "optional": per person, or one company switch? | R2-N |
| Ari Q16 | Contract: rename "Charter Agreement", or keep both categories? | R2-C6 |
| Ari Q17 | An invoice without a trip — what is it for, and can it carry FET? | R2-F4 |

(Q4 was answered by the developer as D10.)

---

## Round 3 — the developer's own list (25 Nov 2026)

Given in chat, part one; the developer will add more items later. Checked
against the code on 25 Nov 2026.

### 3.1 What the code does today

| # | Point | Today |
|---|---|---|
| 1 | Emails look poor, unaligned, not responsive | One shell, `core/mail/mail.layout.ts`: a 560px dark header bar and text paragraphs, Helvetica, no mobile layout beyond the viewport tag, a plain footer |
| 2 | Logo and company details from the database everywhere | **Emails** carry the name and logo only (`MailService.brand()`), no contact details, and the dark header uses the **normal logo**, not the logo-on-dark. **PDFs** read name, contact block, logo and wire details (`documentBranding()`), but the logo is used only when PNG or JPEG (`readUploadRaster`); WebP/GIF/AVIF silently fall back to the built-in mark. PDF metadata hardcodes "Tribeca Jets Command Center" (`pdf.document.ts`) |
| 3 | PDFs need a premium, aligned design | One engine (`common/pdf/pdf.document.ts`, `pdf.templates.ts`) for quote, itinerary, invoice, report and settings-preview PDFs |
| 4 | Quote needs interior and exterior photos | `Quote` has only `exteriorImageUrl`; `Itinerary` has both |
| 5a | Passenger weight in pounds | `TripPassenger`: name, date of birth, passport only |
| 5b | Luggage: bag count and total weight | Nothing on the trip; only `Aircraft.baggageCapacityCuFt` |

### 3.2 Agreed

| ID | What | Merges |
|---|---|---|
| R3-01 | **One premium email design system.** A new shared shell in `mail.layout.ts`: branded header, aligned content blocks, button, a details table for money and trip facts, contact footer; responsive (single column on phones) and checked in Gmail, Outlook and Apple Mail. Every email goes through it — account emails, composed emails, reminders, notifications | R2-B5b |
| R3-02 | **Branding from Settings everywhere.** Email header uses the logo-on-dark; email footer carries the contact block, all or nothing like the letterhead. PDFs convert WebP/GIF/AVIF logos to PNG when rendering, so any uploaded logo works; PDF metadata uses the company name. Audit every email and document for hardcoded "Tribeca" | R2-B5a |
| R3-03 | **Premium PDF redesign** — quote, itinerary, invoice, reports (and FET reports when built) on one shared design: grid, type scale, header and footer, tables, totals block. The on-screen previews (quote form, itinerary preview) match the PDFs | R1-03 |
| R3-04 | **Quote: interior and exterior photos** (`Quote.interiorImageUrl`), each with the photo library and suggestions, both on the quote PDF and preview. Booking a quote carries both photos to the trip's itinerary | — |
| R3-05 | **Passenger weight (lb)**, optional, per passenger (`TripPassenger.weightLb`) | R2-T4 (offered again when a past passenger is picked) |
| R3-06 | **Luggage** on the trip — bag count and total weight (lb) — in a section under Passengers; also captured on the trip request and carried over by Convert to Trip | R2-T1 |

**Major changes:** R3-01 and R3-03 together redesign every email and
document — design-heavy, one batch of its own. R3-04–R3-06 are small schema
additions.

### 3.3 Decisions

**Made by the developer, 25 Nov 2026** (as recommended):

| ID | Decision |
|---|---|
| D14 | No Figma: emails and PDFs are designed from the app's own look (dark ink, purple accent, Montserrat where the reader allows it, a close match elsewhere) |
| D15 | Passenger weights and luggage show on the trip and to the operator, **never** on the client's quote or itinerary PDF |
| D16 | Luggage is captured on the trip request too and carried over by Convert to Trip |
| D17 | A passenger's weight is offered again when that passenger is picked from past trips (R2-T4) |
| D18 | No weight-and-balance warning now (passengers + luggage vs the aircraft); possible later |

Ari's font answer (Q14) and jet image (Q13) slot into R3-01/R3-03 when they
arrive; neither blocks starting the redesign.
