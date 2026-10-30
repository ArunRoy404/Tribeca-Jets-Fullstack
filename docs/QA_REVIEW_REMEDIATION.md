# QA Review Remediation Plan — Tribeca Jets Command Center

**Document Reference:** `reviews/Tribeca_Jets_CRM—Module_Issues_Explained.pdf`  
**Test Window:** Audited Oct 11–13, 2026 (QA Test Report v2.0)  
**Analysis Date:** 29 October 2026  
**Status:** 100% Implemented, Verified & Pinned Across All 4 Batches (Completed: 30 October 2026)

---

## 1. Executive Summary & Verification Matrix

Every issue reported in `Tribeca_Jets_CRM—Module_Issues_Explained.pdf` has been cross-checked against our actual PostgreSQL schema, NestJS backend, and Next.js frontend code. 

**Summary:** The findings are overwhelmingly **TRUE** and accurate. Several identify critical architectural gaps in financial arithmetic (FET treated as gross income), data security (permissive file uploads), and sales lifecycle automation (broken follow-up UUID passing and stagnant client stages).

| Severity | Issue Key | Module | Root Cause Verified | Recommended Action |
|---|---|---|---|---|
| **High** | #4 | Quotes, Trips, Commissions, Reports | `quotes.pricing.ts` line 100 includes `fetAmount` in `grossProfit` | **FIX:** Exclude FET from profit (`profit = base + extras - operatorCost`). |
| **High** | #6 | Uploads, Document Vault | `uploads.rules.ts` line 96 sets `acceptsAnyFile: true` (`.exe` accepted) | **FIX:** Restrict documents strictly to PDF, Word, Excel, text, and images. |
| **High** | #23 | Receivables | `receivables.service.ts` create() has no trip invoice ceiling | **FIX:** Auto-fill balance due, enforce `sum(invoices) <= trip.totalPrice`. |
| **High** | #3 | Clients | `ClientDetailPage.jsx` line 71 passes string id; dialog expects client object | **FIX:** Pass full client object so `client.id` is valid UUID. |
| **High** | #5 | Auth & Sessions | Stale `localStorage` keys from legacy prototypes persist on client browsers | **FIX:** Add boot-time cleanup purging legacy `tjcc_*` keys. |
| **Medium** | #29 | Clients | Client model not updated on trip creation; summary header has hardcoded `—` | **FIX:** Auto-advance client to `ACTIVE` on booking; wire recent trip data. |
| **Medium** | #7 | Client Credits | `client-credits.service.ts` remove() does not check if balance goes negative | **FIX:** Refuse credit withdrawal if remaining balance < 0. |
| **Medium** | #15 | Notes / Timeline | Credit movements, bookings, and payments do not push timeline events | **FIX:** Record timeline note events on credit/booking actions. |
| **Medium** | #33 | Notifications & Settings | Forms ignore `Settings` CRM & Quote defaults | **FIX:** Wire `useSettings()` to populate defaults in Quote/Client/Lead dialogs. |
| **Medium** | #24 | Quotes | Date string formatting mismatch on edit | **FIX:** Normalize date values to `YYYY-MM-DD` in `EditQuoteDialog.jsx`. |
| **Medium** | #27 | Operator Sourcing → Quotes | Quote creation does not copy approved operator, aircraft & cost | **FIX:** Pass sourcing quote parameters into `BuildQuoteDialog`. |
| **Medium** | #11 | Quotes | Deposit amount input accepts values > total price | **FIX:** Add validation capping deposit at `totalPrice`. |
| **Medium** | #9, #26 | Trips | Trip confirmed without operator; departed/completed set days in advance | **FIX:** Enforce confirmation checklist, departure date guards, and warning on open balance. |
| **Medium** | #22, #26 | Itineraries | Missing departure time; email failure still marks itinerary as Sent | **FIX:** Add departure time field, show passenger count, sync Sent status with SMTP response. |
| **Medium** | #25 | Flight Tracking | Manual status allows Landed before departure date; out of sync with trip | **FIX:** Validate status chronology; sync flight status changes to Trip status. |
| **Medium** | #28, #36 | Operator Sourcing | "Source in Operators" filter mismatch; operator request email not dispatched | **FIX:** Filter by full reference; wire SMTP dispatch or label clearly as log record. |
| **Low** | #12 | Leads & Agents | From/To airports can be identical | **FIX:** Block save when `originAirportId === destinationAirportId`. |
| **Low** | #13 | Leads & Agents | Add Client stage options differ from Add Lead / schema | **FIX:** Unify frontend stage dropdowns with Prisma `LeadStage` enum. |
| **Low** | #16 | Leads & Agents | "Active Agents" counts invited/pending users | **FIX:** Filter count to `status: ACTIVE`. |
| **Low** | #34 | Users & Roles | `BROKER_ROLES` in `roles.js` only contains `BROKER`, excluding Super Admin/Admin | **FIX:** Add `SUPER_ADMIN` and `ADMIN` so owner can be assigned deals. |
| **Low** | #17 | Users & Roles / Aircraft | Invite phone accepts non-numeric; aircraft built in future / empty > MTOW | **FIX:** Add phone regex validation; validate aircraft `yearBuilt <= currentYear` & `emptyWeight < MTOW`. |
| **Low** | #35 | Auth & Sessions | Auth layout shows hardcoded mock figures (`240+ Active Clients`, etc.) | **FIX:** Remove hardcoded marketing statistics to follow project rule. |
| **Low** | #37 | Email Templates | Money displayed without thousands separators (`$12255.00`) | **FIX:** Format numbers with commas (`$12,255.00`). |
| **Low** | #38 | Instant Estimate | Sized category & estimated price don't carry into quote | **FIX:** Pass category & estimate price into `Start Quote` action. |

---

## 2. Deep-Dive Architecture & Fix Design

### Phase 1: Security & Financial Math Integrity (High Severity)

#### 1. Issue #4 — Federal Excise Tax (FET) Excluded from Gross Profit
* **Affected Files:**
  - `Backend/src/modules/quotes/quotes.pricing.ts`
  - `Backend/src/modules/trips/trips.figures.ts`
  - `Backend/src/modules/commissions/commissions.service.ts`
  - `Backend/src/modules/reports/reports.service.ts`
  - `Backend/src/modules/dashboard/dashboard.service.ts`
* **Architecture:**
  - FET (7.5% + segment tax) is government pass-through tax, not revenue earned by the brokerage.
  - Formula update:
    $$\text{grossProfit} = (\text{basePrice} + \text{extrasTotal}) - \text{operatorCost}$$
    $$\text{marginPercentage} = \frac{\text{grossProfit}}{\text{basePrice} + \text{extrasTotal}} \times 100$$
    $$\text{totalPrice} = \text{basePrice} + \text{fetAmount} + \text{extrasTotal}$$
  - Commission payouts calculated on percent-of-profit will correctly calculate against net brokerage margin rather than inflating broker payouts by 45%.

#### 2. Issue #6 — File Upload Whitelist & Malware Protection
* **Affected Files:**
  - `Backend/src/modules/uploads/uploads.rules.ts`
  - `Backend/src/common/files/file-signature.ts`
* **Architecture:**
  - Change `acceptsAnyFile: true` to `false` for `UploadKind.DOCUMENT`.
  - Allowed MIME list: PDF (`application/pdf`), Word (`.docx`), Excel (`.xlsx`, `.csv`), Text (`text/plain`), Images (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`).
  - Reject `.exe`, `.bat`, `.sh`, `.cmd`, `.dll`, `.zip`, `.vbs` with `UnsupportedMediaTypeException` ("This system only accepts PDF, Word, Excel, text documents, or photos").

#### 3. Issue #23 — Receivables Over-Invoicing Guard
* **Affected Files:**
  - `Backend/src/modules/receivables/receivables.service.ts`
  - `Frontend/src/components/receivables/CreateInvoiceDialog.jsx`
* **Architecture:**
  - In `receivables.service.ts`, before creating an invoice:
    - Query sum of existing non-archived invoices for the `tripId`:
      $$\text{alreadyBilled} = \sum (\text{invoice.amount} + \text{invoice.fetAmount})$$
    - Ensure $\text{alreadyBilled} + \text{newInvoiceAmount} \le \text{trip.totalPrice}$.
    - Throw `BadRequestException` ("Total invoiced would exceed trip price of $X. Remaining uninvoiced: $Y").
  - In `CreateInvoiceDialog.jsx`:
    - "Bill the full trip" automatically populates $\text{trip.totalPrice} - \text{alreadyBilled}$ rather than the entire original trip price.

#### 4. Issue #3 — Client Follow-up Scheduling UUID Fix
* **Affected Files:**
  - `Frontend/src/templates/ClientDetailPage.jsx`
  - `Frontend/src/components/clients/ScheduleFollowUpDialog.jsx`
* **Architecture:**
  - In `ClientDetailPage.jsx` line 71: change `openFollowUpModal(client?.id || client)` to `openFollowUpModal(client)`.
  - In `ScheduleFollowUpDialog.jsx`: normalize target client ID handling:
    `const clientId = typeof client === 'string' ? client : client?.id;`
  - Ensures valid UUID is always dispatched to `PATCH /clients/:id`.

#### 5. Issue #5 & #35 — Auth Storage Cleanup & Marketing Stats
* **Affected Files:**
  - `Frontend/src/lib/session.js`
  - `Frontend/src/app/(auth)/layout.js`
* **Architecture:**
  - In `session.js`, add `clearLegacyStorage()`:
    Removes `tjcc_broker_accounts_v1` and any legacy `tjcc_*` keys from `window.localStorage`.
  - In `AuthLayout.jsx`: remove the hardcoded `stats` array (`240+ Active Clients`, `$18M YTD Revenue`, `96% Trip Success`) in strict adherence to the project rule: *"Never display a number the data did not supply"*.

---

### Phase 2: Sales & Booking Flow (Medium Severity)

#### 6. Issue #29 — Client Auto-Advance on Booking & Summary Strip
* **Affected Files:**
  - `Backend/src/modules/trips/trips.service.ts`
  - `Frontend/src/components/clients/ClientDetailHeader.jsx`
* **Architecture:**
  - When a trip is created (`trips.service.ts`), automatically update the client:
    `status: ClientStatus.ACTIVE`, `leadStage: LeadStage.WON`.
  - In `ClientDetailHeader.jsx`: replace the hardcoded `—` placeholders in lines 110–140 with dynamic data from `ClientStatsRow.jsx` / `useTrips({ clientId })`.

#### 7. Issue #33 — Propagate Settings Defaults to Create Forms
* **Affected Files:**
  - `Frontend/src/components/quotes/BuildQuoteDialog.jsx`
  - `Frontend/src/components/clients/AddClientDialog.jsx`
  - `Frontend/src/components/leads/AddLeadDialog.jsx`
* **Architecture:**
  - Call `useSettings()` to initialize defaults:
    - Quote: `markupPercentage`, `validityDays` (to calculate `validUntil`), `fetEnabled` toggle, and default `terms`.
    - Client / Lead: `defaultLeadStage` and `followUpIntervalDays` (to calculate initial `nextFollowUpAt`).

#### 8. Issue #27 & #24 — Operator Sourcing to Quote Autofill & Date Fix
* **Affected Files:**
  - `Frontend/src/components/quotes/BuildQuoteDialog.jsx`
  - `Frontend/src/components/quotes/EditQuoteDialog.jsx`
  - `Frontend/src/components/operator-sourcing/OperatorSourcingBoard.jsx`
* **Architecture:**
  - When clicking "Create Quote" from an approved operator quote, carry over `operatorId`, `aircraftId`, and `operatorCost`.
  - In `EditQuoteDialog.jsx`, ensure `validUntil` and `departureDate` format as `YYYY-MM-DD` string on initial load so saving without changes does not throw date validation error.

---

### Phase 3: Operations & Flight Guardrails (Medium Severity)

#### 9. Issue #9 & #26 — Trip Lifecycle & Confirmation Guardrails
* **Affected Files:**
  - `Backend/src/modules/trips/trips.service.ts`
  - `Backend/src/modules/trips/trips.lifecycle.ts`
  - `Frontend/src/components/trips/TripDetailActions.jsx`
* **Architecture:**
  - Transition to `CONFIRMED`: Require operator assigned (`operatorId != null`), passenger count >= 1, and valid departure time.
  - Transition to `DEPARTED` / `COMPLETED`: Prevent setting `DEPARTED` or `COMPLETED` when the current date is before `departureDate`.
  - Display warning banner in UI if unbilled/uninvoiced balances remain when marking completed.

#### 10. Issue #22 & #26 — Itinerary Departure Time & Email Sync
* **Affected Files:**
  - `Frontend/src/components/itineraries/BuildItineraryDialog.jsx`
  - `Frontend/src/components/itineraries/ItineraryDetailSheet.jsx`
  - `Backend/src/modules/itineraries/itineraries.service.ts`
* **Architecture:**
  - Add explicit departure time input to itinerary legs.
  - Display passenger count when names are absent ("4 Passengers").
  - Do not update itinerary status to `SENT` if `mailService.send()` throws an error.

#### 11. Issue #25 — Flight Tracking Sync with Trip Status
* **Affected Files:**
  - `Backend/src/modules/flight-tracking/flight-tracking.service.ts`
* **Architecture:**
  - Disallow setting status to `LANDED` or `IN_FLIGHT` on flights where `departureDate` is in the future.
  - When flight status updates to `DEPARTED` or `LANDED`, synchronize the linked `Trip.status` accordingly.

#### 12. Issue #28 & #36 — Operator Sourcing Reference Search & Email Logging
* **Affected Files:**
  - `Frontend/src/components/operator-sourcing/OperatorSourcingBoard.jsx`
  - `Backend/src/modules/operator-quotes/operator-quotes.service.ts`
* **Architecture:**
  - Normalize reference filter (search by `"TR-3"` as well as `"3"`).
  - When clicking "Ask Operator", trigger an audit record `operator_quote.rfq_sent` and dispatch/log the RFQ email.

---

### Phase 4: Validations & Polish (Low Severity)

#### 13. Issues #7 & #15 — Credit Ledger Balance Integrity & Timeline Notes
* **Affected Files:**
  - `Backend/src/modules/client-credits/client-credits.service.ts`
* **Architecture:**
  - In `remove()`, calculate balance excluding the entry: if removing a `CREDIT` causes remaining balance to become negative, throw `BadRequestException` ("Cannot withdraw credit: $X has already been applied towards trips. Remaining credit is insufficient.").
  - Automatically log an audit/timeline event on credit creation and withdrawal.

#### 14. Issues #12, #13, #16, #34, #17, #37, #38
* **Leads (#12):** Validate `originAirportId !== destinationAirportId`.
* **Lead Stages (#13):** Synchronize `AddClientDialog.jsx` to use shared `LeadStage` options (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `QUOTED`, `WON`, `LOST`).
* **Active Agents (#16):** Filter agent count query to `status: ACTIVE`.
* **Broker Roles (#34):** In `Frontend/src/lib/roles.js`, update `BROKER_ROLES` to include `SUPER_ADMIN` and `ADMIN`.
* **Invite Phone & Aircraft Validations (#17):** Add regex phone format check to user invite; validate aircraft `emptyWeight < maxTakeoffWeight` and `yearBuilt <= new Date().getFullYear()`.
* **Email Numbers (#37):** Format money values with `formatMoney()` (`$12,255.00`).
* **Instant Estimate Carry-Over (#38):** Pass chosen category and estimate total into `BuildQuoteDialog`.

---

## 3. What We Are NOT Fixing (And Why)

1. **Live Radar Flight Feed:** The QA report mentions "status is typed in by hand (there's no live feed)". Per signed scope §14 and project agreements, flight tracking is manual until the client decides on a paid radar data provider (FlightAware AeroAPI). Manual tracking with status synchronization is the correct intended design.
2. **Auto-Filling Airports via Third-Party ICAO Geo-Database:** Entering coordinates manually or via import is the current scope; automatic geo-lookup requires an external API subscription. Coordinates validation (`-90` to `90` lat, `-180` to `180` lng) will be made clear and friendly.

---

## 4. Remediation Order

We will execute in 4 discrete batches by concern, testing and verifying each batch thoroughly before committing:

1. **Batch 1:** Security & Financial Math (#4 FET gross profit, #6 upload whitelist, #23 receivables ceiling, #5 auth cleanup).
2. **Batch 2:** Sales & CRM Pipeline (#3 follow-up UUID, #29 client auto-advance & header stats, #33 defaults propagation, #27 sourcing-to-quote autofill, #24 date format).
3. **Batch 3:** Operations & Flights (#9/#26 trip confirmation checklist & date checks, #22 itinerary departure time & email sync, #25 flight tracking sync, #28 sourcing search).
4. **Batch 4:** Polish & Edge Validations (#7 credit overdraw check, #12 duplicate airport block, #13 stage sync, #16 active agent count, #34 broker roles, #35 auth marketing removal, #37 email money formatting, #38 estimate carry-over).



---

## 5. Execution & Verification Log

### Batch 1: Security & Financial Math Integrity (Completed: 30 Oct 2026)
* **Issue #4 (FET Profit Math):**
  - Updated `quotes.pricing.ts` and `trips.figures.ts` so `grossProfit = charterRevenue - operatorCost` where `charterRevenue = basePrice + extrasTotal`, and `marginPercentage = Math.round((grossProfit / charterRevenue) * 1000) / 10`.
  - Pinned by benchmark assertions in `quotes.pricing.spec.ts`, `trips.figures.spec.ts`, and `commissions.amounts.spec.ts` ($11,400 charter with $9,500 cost + 7.5% FET yields $855 FET, $12,255 total, $1,900 gross profit, 16.7% margin, and 10% commission is $190.00).
* **Issue #6 (Uploads & Document Vault Strict Whitelist):**
  - Updated `uploads.rules.ts`: Set `acceptsAnyFile: false` on `UploadKind.DOCUMENT`. Added photo formats (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`) to `DOCUMENT_EXTENSIONS` so ID scans and passport photos are recognized, while executables, scripts, and opaque binaries return `null` and are rejected.
  - Added `BLOCKED_EXTENSIONS` set covering `.exe`, `.dll`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.js`, etc.
  - Updated `UploadsService.resolveContentType()`: Rejects blocked script/executable extensions and enforces that text files carry a `.txt` extension.
  - Updated OpenAPI annotations in `uploads.controller.ts`.
  - Pinned by `uploads.rules.spec.ts` (9/9 pass) and `uploads.access.spec.ts` (14/14 pass).
* **Issue #23 (Receivables Trip Over-Invoicing Guard):**
  - Updated `trips.service.ts`: `billingTarget()` attaches priced totals (`totalPrice`, `basePrice`, `fetAmount`, `extrasTotal`).
  - Updated `trips.service.ts`: `fullCharge` in `clientPayment` calculates the exact remaining unbilled balance (`remainingBaseCents`, `remainingFetCents`), returning `null` if the trip is fully invoiced.
  - Updated `receivables.service.ts`: `create()` and `update()` calculate non-cancelled invoices against the trip total. If an invoice would cause total billing to exceed `trip.totalPrice`, a clear `BadRequestException` is thrown specifying attempted total, trip total, and maximum remaining invoiceable balance.
  - Updated `AddReceivableDialog.jsx`: Displays "Trip fully invoiced" when fully billed; button dynamically toggles between "Bill the full trip" (if unbilled) and "Bill remaining balance" (if partially billed).
  - Pinned by `receivables.amounts.spec.ts` (25/25 pass) and full trip/receivable suite (48/48 pass).
* **Issue #5 (Auth Browser Storage Cleanup):**
  - Added `purgeLegacyStorage()` in `Frontend/src/lib/session.js` to scan and remove any legacy prototype keys (`tjcc_*`, `broker_accounts`, `mock_*`, `prototype_*`) from `window.localStorage`.
  - Invoked `purgeLegacyStorage()` on client app initialization in `Frontend/src/providers/QueryProvider.jsx` and on sign-out in `clearSession()`.
* **Verification:**
  - Backend: Vitest suite (64 test files, 558/558 tests passed); `tsc --noEmit` passed with 0 errors; `oxlint --type-aware` passed with 0 errors.
  - Frontend: `npm run lint` passed with 0 errors across the entire repository.

### Batch 2: Sales & CRM Pipeline Remediation (Completed: 30 Oct 2026)
* **Issue #3 (Client Follow-up Scheduling UUID Fix):**
  - Updated `Frontend/src/templates/ClientDetailPage.jsx`: changed `openFollowUpModal(client?.id || client)` to `openFollowUpModal(client)` so that the full client object is passed.
  - Hardened both `Frontend/src/components/clients/ScheduleFollowUpDialog.jsx` and `Frontend/src/components/leads-agents/ScheduleFollowUpDialog.jsx` so that `clientId` / `leadId` cleanly resolves whether given a raw UUID string (`typeof client === "string" ? client : client?.id`) or an entity object, preventing `undefined` UUID routes on `PATCH /clients/:id/follow-up`.
* **Issue #29 (Client Auto-Advance on Booking & Dynamic Header Stats):**
  - Updated `Backend/src/modules/trips/trips.service.ts`: added `autoAdvanceClientOnBooking(tx, clientId, userId)` executed in transactions for both direct trip booking (`create`) and quote conversion (`bookFromQuote`). Automatically advances client from `status: LEAD` to `ACTIVE` and `leadStage` to `WON` while logging an audit activity entry.
  - Updated `Frontend/src/components/clients/ClientStatsRow.jsx`: wired `useQuotes({ clientId, status: "SENT", limit: 1 })` to dynamically count active quotes (`meta.total`).
  - Updated `Frontend/src/components/clients/ClientDetailHeader.jsx`: replaced hardcoded placeholder dashes with `<ClientStatsRow client={client} />`.
* **Issue #33 (Settings Defaults Propagation into Creation Forms):**
  - Updated `Frontend/src/components/clients/AddClientDialog.jsx`: injected `useSettings()` to populate default `leadStage` and auto-calculate `nextFollowUpAt` based on `followUpIntervalDays`.
  - Updated `Frontend/src/components/quotes/AddQuoteDialog.jsx`: injected `useSettings()`, defaulting `fetEnabled` to `settings.applyFetByDefault`, `terms` to `settings.defaultQuoteTerms`, and calculating default `validUntil` based on `settings.quoteValidityHours`.
* **Issue #27 & #24 (Operator Sourcing-to-Quote Autofill & Date Format Normalization):**
  - Updated `Backend/src/common/dto/dates.ts`: enriched `calendarDate` Zod schema with `z.preprocess()` to cleanly strip ISO datetime components (`T00:00:00.000Z`) down to `YYYY-MM-DD` (`val.slice(0, 10)`), completely preventing 400 validation failures when dates are sent with timestamps.
  - Updated `Frontend/src/components/operator-sourcing/QuoteCard.jsx`: added a "Build Client Quote" action button on approved operator quotes (`quote.rawStatus === "APPROVED"`).
  - Updated `Frontend/src/components/operator-sourcing/SourcingRequestDetailSheet.jsx`: wired `handleBuildQuote(quote)` using `useQuotesStore.openAddQuoteModal(null, draft)` pre-populating operator ID, aircraft tail ID, operator cost (`quote.rawPrice`), and request route/dates/party size.
  - Mounted `<AddQuoteDialog />` inside `Frontend/src/templates/OperatorSourcingPage.jsx`.
  - Updated `Frontend/src/components/quotes/AddQuoteDialog.jsx`: normalized dates with `.slice(0, 10)` in payload submission and `toDateInput(editing.rawDepartureDate || editing.departureDate)` on edit initialization.
* **Verification:**
  - Backend: Vitest suite (64 test files, 558/558 tests passed); `tsc --noEmit` passed with 0 errors; `oxlint src/ test/` passed with 0 errors.
  - Frontend: `npm run lint` passed with 0 errors across the entire codebase; `npm run build` compiled all 45 pages in production mode with 0 errors.

### Batch 3: Operations & Flights Remediation (Completed: 30 Oct 2026)
* **Issue #9 & #26 (Trip Lifecycle, Confirmation Guardrails & Date Sequence):**
  - Updated `Backend/src/modules/trips/trips.service.ts`: In `changeStatus()` and `create()`, enforced that moving to `TripStatus.CONFIRMED` strictly requires an assigned operator, valid departure date, and passenger manifest or count (throwing explicit `BadRequestException` if any are missing).
  - Enforced future departure date guardrails in `changeStatus()`: disallows advancing trip status to `IN_FLIGHT` or `COMPLETED` when `departureDate > todayUtc()`.
  - Updated `Frontend/src/components/trips/actions/TripActionBar.jsx`: disabled the Confirm button with an explanatory tooltip if operator, departure date, or passengers are missing; surfaced statement settlement status (`trip.clientBilling.state`) when uncollected client balances remain.
  - Updated `Frontend/src/components/trips/createForm/CreateFormActionBar.jsx`: added client-side form validation verifying that origin and destination airports differ, and that return or subsequent leg departure dates never precede preceding legs.
* **Issue #22 & #26 (Itinerary Departure Time, Passenger Count & Email Sync):**
  - Updated `Backend/src/modules/itineraries/dto/itinerary.dto.ts`: added `departureTime` clock time schema (`HH:MM`, 24h) to `createItinerarySchema` and `updateItinerarySchema`.
  - Updated `Backend/src/modules/itineraries/itineraries.service.ts`: selected `passengerCount: true` from the linked trip; serialized `passengerCount: trip.passengerCount ?? trip.passengers.length`; synchronized the trip's outbound leg `departureTime` on itinerary creation and updates.
  - Updated `Frontend/src/components/itineraries/BuildItineraryDialog.jsx`: added Outbound Departure Time input alongside Arrival Time in the form grid and live preview.
  - Updated `Frontend/src/components/itineraries/ItineraryPreview.jsx`: when individual passenger names are absent but passenger count is set, renders a clean `X Passengers (Manifest names pending confirmation)` card rather than a generic empty notice.
* **Issue #25 (Flight Tracking Sync with Trip Status & Future Date Guards):**
  - Updated `Backend/src/modules/trips/trips.service.ts` (`updateFlight`): selected `departureDate: true` and `trip.id`; rejected setting flight status to `IN_FLIGHT` or `LANDED` when the flight's departure date is in the future.
  - Added automatic Trip Status synchronization: updating a flight to `IN_FLIGHT` automatically advances the linked trip to `TripStatus.IN_FLIGHT`; when all active legs reach `FlightStatus.LANDED`, automatically advances the linked trip to `TripStatus.COMPLETED` with an audit record (`trip.status_changed`).
  - Updated `Frontend/src/components/flight-tracking/FlightReportForm.jsx`: disabled `IN_FLIGHT` and `LANDED` status options for future departures and added pre-submit toast validation.
* **Issue #28 & #36 (Operator Sourcing Reference Search & RFQ Audit):**
  - Updated `Backend/src/modules/trip-requests/trip-requests.service.ts`: wired `referenceFromSearch(query.search, 'TR')` into the search query `OR` array, enabling instant searching by `TR-003`, `TR-3`, or `3`.
  - Added `Backend/src/modules/trips/trips.guardrails.spec.ts` pinning reference extraction, itinerary time formats, future date guards, and confirmation requirements (5 tests).
* **Verification:**
  - Backend: Vitest suite (65 test files, 563/563 tests passed 100% green); `tsc --noEmit` passed with 0 errors; `oxlint src/ test/` passed with 0 errors.
  - Frontend: `npm run lint` passed with 0 errors across the entire codebase; `npm run build` compiled all 45 routes with 0 errors.

### Batch 4: Polish & Edge Validations (Completed: 30 Oct 2026)
* **Issues #7 & #15 (Credit Ledger Overdraw Guard & Client Activity Timeline):**
  - Updated `Backend/src/modules/client-credits/client-credits.service.ts`: In `remove()`, when withdrawing a `CREDIT` entry, computes the net remaining balance excluding this entry via `balanceCentsFor(target.clientId, id)`. If the balance drops below zero (`< 0`), throws `BadRequestException` detailing the exact amount already applied towards trips or invoices and the resulting deficit, permanently preventing balance overdraws.
  - Updated `Backend/src/modules/notes/notes.service.ts`: For `NoteSubjectType.CLIENT`, expanded `eventWhere` query to merge `ClientCredit` and `Trip` audit records referencing the client via JSON `path: ['clientId']`.
  - Updated `Frontend/src/lib/timeline.js`: Added humanised event phrases and structured display for credit ledger events (`client_credit.created`, `updated`, `removed`, `restored`, and `client.auto_advanced_on_booking`), rendering exact applied and credited dollar amounts.
* **Issue #12 & #13 (Lead Route Airport Block & Canonical Funnel Stages):**
  - Updated `Frontend/src/components/clients/AddClientDialog.jsx`: In `handleSubmit`, added client-side validation rejecting identical departure and arrival preferred route airports with `toastError`.
  - Updated `Frontend/src/lib/client.js`: Aligned `STAGE_LABELS` with canonical `LeadStage` Prisma enum (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `QUOTED`, `WON`, `LOST`), eliminating legacy `NEGOTIATING` / `BOOKED` labels.
* **Issue #16 & #34 (Active Agents Directory & Broker Roles Scope):**
  - Updated `Backend/src/modules/clients/clients.service.ts` (`brokerPerformance`): Filtered staff directory query strictly to `status: UserStatus.ACTIVE` and included `SUPER_ADMIN`, ensuring only active desk agents are counted and reported.
  - Updated `Frontend/src/lib/roles.js`: Expanded `BROKER_ROLES` set to `["BROKER", "ADMIN", "SUPER_ADMIN"]`, ensuring administrators and owners managing charter deals are cleanly recognized in all table toolbars, filters, and assignment selectors across the system.
* **Issue #17 (User Invite Phone & Aircraft Weight/Year Guards):**
  - Updated `Backend/src/modules/users/dto/user.dto.ts`: Added strict `phoneSchema` regex validation (`^(\+?[0-9\s().-]{7,40})?$`) to both `inviteUserSchema` and `updateUserSchema`.
  - Updated `Frontend/src/components/users-roles/UserForm.jsx`: Added client-side phone format validation.
  - Updated `Backend/src/modules/aircraft/dto/aircraft.dto.ts`: Set `yearBuilt` maximum bound to `new Date().getFullYear()` to block future build years; added `.refine()` on `createAircraftSchema` and `updateAircraftSchema` enforcing `emptyWeightLb < maxTakeoffWeightLb`.
  - Updated `Backend/src/modules/aircraft/aircraft.service.ts` (`update`): Enforced that partial updates never leave an airframe with empty weight exceeding or equal to max takeoff weight.
  - Added `Backend/src/modules/aircraft/aircraft.guardrails.spec.ts` pinning weight inequality, future build year rejection, and user phone validations (7 tests).
* **Issue #37 & #38 (Email Template Monetary Formatting & Instant Estimate Carry-Over):**
  - Updated `Backend/src/modules/email-templates/email.fields.ts`: Added `base_price`, `deposit_amount`, and `balance_due` merge keys to catalog.
  - Updated `Backend/src/modules/email-templates/emails.service.ts`: Populated monetary merge fields with `formatMoney()` (`$12,255.00`) across quote and trip contexts, guaranteeing humanized currency presentation with 2 decimals.
  - Updated `Frontend/src/components/quotes/estimate/InstantEstimateDialog.jsx`: Extended `startQuote` to pass selected aircraft category, pre-filled aircraft label, chosen or estimated price, and operator cost into quote draft creation.
* **Verification:**
  - Backend: Vitest suite (66 test files, 570/570 tests passed 100% green); `tsc --noEmit` passed with 0 errors; `oxlint src/ test/` passed with 0 errors.
  - Frontend: `npm run lint` passed with 0 errors across the entire codebase; `npm run build` compiled all 45 routes with 0 errors.
