# WhatsApp AI Integration — Super Admin Executive Copilot

**Date Planned:** 16 November 2026  
**Target:** 2-Day Sprint  
**Target User:** Super Admin only (single verified phone number)

---

## 1. Overview & Business Value

A conversational WhatsApp AI executive assistant connected directly to the Tribeca Jets Command Center NestJS backend. It empowers the Super Admin to monitor flights, review desk financial KPIs, approve/decline trips, look up clients, capture leads, and download branded PDF itineraries/quotes directly inside WhatsApp without logging into the desktop web dashboard.

---

## 2. Security & Access Architecture

Because the assistant operates with full Super Admin authority across all CRM modules, access is defended by three strict security layers:

1. **Cryptographic Webhook Validation (HMAC-SHA256):**
   - Meta signs every webhook payload with the app's secret in the `X-Hub-Signature-256` HTTP header.
   - The NestJS controller verifies this signature before parsing the payload. Tampered or spoofed requests are rejected with a 401.
2. **Strict Phone Number Whitelist:**
   - Matches `from` to a verified phone on an active Super Admin account.
   - Any message from any non-whitelisted number is immediately dropped with zero processing.
3. **Internal Context Injection:**
   - Injects the live `SUPER_ADMIN` identity and permissions into every executed service call, adhering to the project's authorization and audit log conventions (`audited: true`).
4. **Safety Confirmation Gate for Critical Actions:**
   - Read-only operations return instant answers.
   - High-stakes write operations (Trip approvals/rejections, client creation, marking payments) enter a 2-step confirmation loop stored in Redis with a 5-minute TTL:
     > *"⚠️ You are about to approve trip **TJ-1048** (KTEB → KMIA). Reply **CONFIRM** to proceed or **CANCEL** to abort."*

---

## 3. 2-Day Scoped Modules

To ensure production-grade stability, the 2-day implementation focuses on the top 5 highest-leverage workflows:

### A. Trips & Flights
- **Upcoming Flights / Schedule:** Query flights departing today, tomorrow, or a specific date range.
- **Trip Status & Details:** Query any trip by ID (`TJ-XXXX`) or client name.
- **Executive Approval / Decline:**
  - `TripsService.approve(tripId)` — marks approved, closes approval task, notifies broker.
  - `TripsService.reject(tripId, reason)` — declines trip, opens follow-up task for broker.
- **In-Chat PDF Delivery:**
  - Compiles the branded itinerary PDF (`pdf.document.ts` / `pdf.templates.ts`), uploads it to Meta WhatsApp Media API, and sends it as a downloadable `.pdf` attachment.

### B. Financials & Desk KPIs (Dashboard & Reports)
- **Revenue & Gross Profit:** Query MT/YTD metrics from `ReportsService.metrics()`.
- **Cash Flow:** Query cash collected this week/month.
- **Receivables & Overdue Invoices:** List overdue client payments with client names, amounts, and due dates.

### C. Client & Lead Management
- **Client & Broker Lookup:** Look up client contacts, assigned brokers, and credit balances.
- **Quick Lead Capture:** Create a Client + TripRequest in one conversational step (*"Add lead Alex Vance, alex@vance.com, +1-555-0100, wants KTEB to KMIA on Friday"*).

### D. Tasks & Priorities
- **Open Desk Tasks:** Query pending tasks assigned to the Super Admin or team.
- **Task Completion:** Mark a specific task completed.

### E. Quotes & Proposals
- **Pending Quotes:** List quotes awaiting client decision.
- **Quote PDF Delivery:** Generate and send the client-facing proposal PDF directly in WhatsApp.

---

## 4. Settings › WhatsApp & AI

Sign in as the Super Admin and open **Settings › WhatsApp & AI**. The
assistant switch is at the top. Turning it on requires the current password.
Turning it off stops the bot on the next message. The checklist shows whether
the OpenAI key and model are usable, which Meta settings are missing, how
many phones are linked, and whether the server needs an encryption key.

OpenAI and Meta each have one Save for the card's changed fields. Use your
current password to save. Each credential is masked until you select View
and enter your current password. The revealed value hides after 30 seconds.
Clear requires confirmation and takes effect when you save. Use Generate on
the verify token and copy it before saving so you can paste it into Meta.

- **OpenAI › Test connection** checks the entered or saved API key and lists
  supported chat models. Pick a model and save it on the OpenAI card.
- **Meta › Test connection** checks the entered or saved access token, phone
  number ID and Graph version. When connected, it shows the business number
  and verified name. Save the phone number ID and Graph version on the Meta card.

The connection tests check the values entered on the card, falling back to
saved values. A successful test on a card with unsaved edits reminds you to
save them.

| Field | Where it comes from |
|---|---|
| OpenAI API key | The project's OpenAI credential |
| OpenAI model | The model selected by the developer |
| Phone number ID | Meta › WhatsApp › API Setup › Phone number ID |
| Access token | Meta API Setup for a temporary token. For production use a system user assigned to the app and WhatsApp account, with `whatsapp_business_messaging` and `whatsapp_business_management` |
| App secret | Meta › App settings › Basic › App secret |
| Verify token | Generate a random value on the Meta card and use the same value in Meta's webhook form |
| Graph version | Meta Graph API version, defaults to `v25.0` |
| Webhook URL | Read-only URL from `API_PUBLIC_URL`, with `/api/webhooks/whatsapp` appended |
| My phones | Link up to five of your own numbers. Give each a name and enter the code sent on WhatsApp. |

Use **Setup** to link, rename or unlink a phone. Sending a code and
unlinking require your current password. Unlinking archives the phone and
clears its conversation and pending confirmation. Use **History** to
review assistant activity and settings changes. Filter by phone, including
unlinked phones, event type, or date. Each event shows the phone's name and
last four digits at the time. Link and unlink events from before phone
names appear without a phone. A proposal older than five minutes with no
confirmation or cancellation is marked **Proposed — not confirmed**.

The API needs one environment value to seal the four credentials at rest.
Generate it with Node and set `SETTINGS_ENCRYPTION_KEY` on the API server.
It is a base64-encoded 32-byte key. Keep it with the deployment's secrets
so the database credentials remain readable across restarts and restores.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Import legacy credentials once

With the WhatsApp settings migration applied and the encryption key configured,
run `npm run whatsapp:import-env` from `Backend/`. The command reads the former
OpenAI and Meta environment values, imports only valid values for empty fields,
and prints imported and skipped field names. A saved value takes precedence,
including the default Graph version. Link the Super Admin phone in the panel
using a WhatsApp code. A running API picks up the import after its settings
cache expires, within 15 seconds, and a panel refresh shows the new values.

### Getting the Meta values

In the Meta business portfolio, create or select the app with the
WhatsApp use case. Go to WhatsApp › API Setup to find the business phone
number ID and add a test recipient if you are using the test number.
Select the permanent system-user token for a production setup. The short-lived
token expires and the API logs Meta code 190 when it is rejected.

Meta delivers incoming events only to apps subscribed to the WhatsApp Business
Account. Configure the callback URL and subscribe to the `messages` field.
Check that the app is subscribed to the account through `GET /<WABA_ID>/subscribed_apps`
and add it through `POST /<WABA_ID>/subscribed_apps` if needed. The WABA ID is
the **Messaging account ID** in Meta's setup. The sender itself uses the phone
number ID.

### Going to production

1. Back up the production database and review the pending migrations, including
   `20261120120000_whatsapp_settings` and
   `20261120130000_whatsapp_assistant_switch_moves` and
   `20261120140000_whatsapp_phones`. The phone migration carries the existing
   verified number and verification time forward as **Phone 1**. Deploy only
   when authorized.
2. Set `SETTINGS_ENCRYPTION_KEY` in Dokploy and verify that `API_PUBLIC_URL`
   reflects the public HTTPS entry point.
3. Sign in as the production Super Admin and enter the OpenAI and Meta
   credentials in **Settings › WhatsApp & AI**. Use the permanent token.
4. Copy the panel's webhook URL to Meta, verify with the saved verify token,
   and check the `messages` and WABA subscriptions. For local testing, the
   callback URL can point at the tunnel to port 4000. Meta allows one callback
   URL per app.
5. Check the migrated phone in the panel or link the Super Admin's numbers.
   Add each test recipient to Meta's list before linking. For free-text codes outside that setup, the
   recipient needs to have opened Meta's customer service window by messaging
   the business number.
6. Check the company and Super Admin time zones. Turn on **Settings ›
   WhatsApp & AI › WhatsApp assistant** when ready. That switch
   stops the bot on the next message when turned off.
7. After the owner approves sending client data to OpenAI, send one live
   question from the verified phone. Check the reply and try a CONFIRM
   proposal that you cancel.

---

## 5. Technical Implementation Plan

1. **Backend Module Structure (`Backend/src/modules/whatsapp/`):**
   - `whatsapp.controller.ts`: 
     - `GET /api/webhooks/whatsapp` (Meta verification challenge).
     - `POST /api/webhooks/whatsapp` (Inbound message processing).
   - `whatsapp.sender.ts`:
     - Outbound text message sending via Meta Graph API (`v25.0`).
   - `whatsapp.service.ts`:
     - Media / PDF document upload & dispatch.
     - Signature verification helper (`verifyMetaSignature`).
   - `whatsapp.agent.ts`:
     - OpenAI tool calling loop with conversation memory (persisted in Redis).
     - WhatsApp markdown formatting parser (`*bold*`, `_italic_`, bullet points).
   - `whatsapp.tools.ts`:
     - Tool definitions & execution dispatch to NestJS services (`TripsService`, `ClientsService`, `ReportsService`, `TasksService`, `QuotesService`).
2. **Verification & Testing:**
   - Unit tests for signature verification, phone whitelisting, and tool routing.
   - Live end-to-end testing with WhatsApp test number.

---

## 6. Progress

The plan in seven steps (agreed 16 Nov 2026). **Update this section in the
same pass as every change of state** — a step started, built, reviewed,
committed, or a credential arriving.

**How the work is split (from 17 Nov 2026):** Claude writes each step's
blueprint as a self-contained Codex prompt; Codex (GPT-6.1 Sol, high effort)
builds it in a fresh chat and does **not** commit; Claude reviews the result
against `AGENTS.md`, fixes or sends it back, runs the live check, and commits
on the developer's word. One step at a time — the next prompt is written only
after the previous step passes review.

Each step moves through: ⬜ not started → ✍️ prompt written → 🔨 Codex
building → 🔍 in review → ✅ reviewed and committed.

| Step | What | State |
|---|---|---|
| 1 | **Secure entry point** — env (six variables, all or none), Settings › Security switch (off by default), webhook (`GET` verify, `POST` signed events), gates: configured, switched on, one phone, redelivery dropped, ≤10 min old, active Super Admin re-read per message | ✅ 16 Nov — 53 tests + live curl run on a test API; committed 17 Nov (`210d87a`, `b1f8cdc`, `1c48031`) |
| 2 | **AI brain** — OpenAI tool-calling loop, Redis conversation memory, first read tools (trips today/upcoming, dashboard KPIs, client lookup), tested from a script before WhatsApp is wired | ✅ 17 Nov — built by Codex, code-reviewed by Claude (two fixes: `--as` works without the Meta env, and `handle()` asks `agent.ready` rather than re-reading config). 51 new mocked tests; backend total 72 files / 673 tests, tsc and oxlint clean; compiled script boots and refuses without a key. **Live check passed 17 Nov** on the dev database (seed data) with the developer's own key and `gpt-6.1-sol`: no flights tomorrow answered as not on file, this week's KPIs as the service computed them, a client card matching the database field by field, a follow-up answered from memory, and "approve" declined as coming. It found three things, fixed: the script hung after answering (now exits), the model sent full names to a search that matches one column at a time (tool description now says one name), and money had no thousands separators. Committed 17 Nov (`98acbb4`, `efbf3f3`) |
| 3 | **Connect WhatsApp** — replies sent through Meta's Graph API; webhook pointed at the API (tunnel locally); first real message on the phone | ✅ 19 Nov — 18 Nov — built by Codex (`whatsapp.sender.ts`: text with one retry on 429/5xx/network, read receipt + typing; fixed replies for non-text and AI-not-set-up; failed delivery receipts logged by code; Graph default v25.0), code-reviewed by Claude (one fix: a reply that throws now sends a short "something went wrong" instead of silence after "typing…"). 15 new tests; backend 73 files / 688, tsc and oxlint clean. **Live check passed 19 Nov** (Windows machine, cloudflared tunnel, dev database): "What flights go out tomorrow?" from the admin phone → read receipt, typing, a reply quoting the question ("No flights are on file departing tomorrow, Thu 19 Nov"). It needed the app subscribed to the WABA (§4) — the webhook form alone delivered nothing. Found: "tomorrow" is reckoned from the **UTC** date (`whatsapp.agent.ts`), so after 18:00 in Dhaka it is a day behind the phone — to settle with the owner which timezone the desk uses, before step 4 |
| 4 | **Actions with CONFIRM** — approve/decline trip, create lead, complete task, record payment; 2-step confirmation held in Redis for 5 minutes | ✅ 19 Nov — built by Codex, reviewed by Claude. Fixed in review: a payment with no date defaulted to the **UTC** day (now the asker's day, `nowIn(timeZone)`); the webhook's error path now also cancels a pending action, so nothing stays confirmable that was never shown; the bot asks when a day is ambiguous ("next Friday" on a Thursday became the next day in the live check). Backend 78 files / 780 tests, tsc, oxlint. **Live through Meta, 19 Nov 20:22–20:32 Dhaka:** pending approvals (none), open tasks listed, "complete the dfgdfgdfg task" → ⚠️ summary → CONFIRM → ✅ and COMPLETED in the database with one `TASK_COMPLETE confirmed` log line; a lead proposal → CANCEL → nothing created. Not tried live (no data in the dev database): approve/decline, record payment — unit-tested. Original build note: Five proposal tools and two reads for pending approvals and open tasks. CONFIRM takes the frozen proposal once with GETDEL, checks the acting user and their current permissions, then calls the owning service. Any other message cancels it. 65 new tests, 78 files / 780 tests passing. TypeScript and oxlint clean. |
| 5 | **PDFs in the chat** — itinerary, quote, invoice via the existing PDF generator, uploaded to Meta media and sent as documents | ✅ 19 Nov — built by Codex, reviewed by Claude. Codex found a real leak on the way: the quotes list spread its visibility `OR` and its search `OR` into one `where`, so any search showed a limited broker every quote — fixed in review (`AND`, `quotes.scope.spec.ts`, AGENTS rule). Fixed in the live check: the itinerary PDF printed the flight-leg arrow as `!'` (Helvetica has no `→`; now drawn, as the route banner's is — the web Download had it too). Backend 79 files / 813 tests, tsc, oxlint. **Live through Meta, 19 Nov 21:15–21:20 Dhaka:** "Send me the itinerary for TJ-5" → one-line text + `Itinerary-TJ-5.pdf` (2.3 MB); "Send quote Q-10 and invoice INV-2026-0001" → both PDFs; "the itinerary for TJ-999" → "not found among the trips you can access", no file. The server log carried status codes and sizes only — no filename. |
| 6a | **Sales desk** — trip requests, quotes, client follow-ups, lead pipeline and client notes | ✅ 19 Nov — built by Codex, reviewed by Claude. Codex stopped on a second scope leak of the same kind as Quotes: the **Trip Requests** list let a search replace the broker's visibility — fixed in review (one `AND` for visibility, search and `clientIds`; `trip-requests.scope.spec.ts`; AGENTS rule widened), and every other list was audited (none else). Fixed in review: the quote total went to the model as a bare number and came back as "35,935.1" (now `formatDollars`, "$35,935.10"). 25 new tests; backend 80 files / 843, tsc, oxlint. **Live via `whatsapp:ask` (OpenAI, dev database):** open trip requests (3, TR-9/8/7, matching the board), open quotes expiring soonest (Q-10, already past its date), follow-ups overdue/today/upcoming, the pipeline per stage (4 leads), and "no notes on file" for a client with none — all checked against the database. |
| 6b | **Operations** — trip details, flight status, empty legs, operator and aircraft lookup | ✅ 19 Nov — built by Codex, reviewed by Claude, no fixes needed. Codex stopped once on the brief (a per-leg flight status `findOne` does not select; `minPassengers` is 1–200 in the DTO) — both settled in the brief, no service change. `FlightTrackingService` is now exported for the bot. "Today" for flight status is the asker's day (`on`), flight times stay airport-local, passengers are names only. 19 new tests; backend 80 files / 862, tsc, oxlint. **Live via `whatsapp:ask` (OpenAI, dev database), each checked against the database:** TJ-5 in full ($48,500 + 7.5% FET = $52,137.50; profit $10,300; 4 passengers by name, no documents); active flights (TJ-8, TJ-15, TJ-22 IN_FLIGHT, TJ-21 upcoming — the bot flagged the stale October statuses itself); no AVAILABLE empty legs (the one on file is MATCHED); ExecuJet's contact; the five aircraft with 9+ seats. |
| 6c | **Money** — invoices, operator bills, client credit, commissions, recent transactions and financial summary | ✅ 19 Nov — built by Codex, reviewed by Claude, no fixes needed. Codex stopped once on the brief (§3 said every money figure arrives formatted, but `dashboard_kpis` still returns plain numbers — wording fixed, dashboard untouched). The bot computes no figure and no state: every total, balance, OVERDUE and summary comes from its service. `ReportsService` and `TransactionsService` exported for the bot. 29 new tests; backend 80 files / 891, tsc, oxlint. **Live via `whatsapp:ask` (OpenAI, dev database), each checked against the database:** no invoices owed (the only one is a DRAFT); FlexJet owed $2,667.00 on OP-2026-0001 ($36,000 − $33,333 paid), overdue since 12 Oct; Marcus Chen $0.00 credit with no entries; no commissions owed (the only one is PAID); no movements in the last 30 days (last payment 11 Oct); October 2026 revenue $516,428.00, profit $108,428.00, 15 trips, worded as by departure date. |
| 6d | **New actions with CONFIRM** | ✅ 19 Nov — built by Codex, reviewed by Claude, no code fixes needed. Codex stopped twice on the brief: (1) the backend had no `BROKER_ROLES` — added to `common/authorization/roles.ts` by the reviewer, Clients moved onto it, and the wider gap (Trips, Trip Requests, Quotes accept any account as broker) logged in HANDOFF; `subjectRef` lacks the current follow-up and broker (now `findOne`); a task for someone else needs `TASKS · ASSIGN`; (2) rule 7 forbade every email, but reassigning a trip correctly emails the new broker (reworded: the bot never emails a client; the summary now says the broker gets a task and an email). New shared `momentIn` (a local day and time in a zone → UTC, DST-safe). 91 new tests; backend 80 files / 982, tsc, oxlint. **Live through Meta, 19 Nov 23:28–23:29 Dhaka**, each checked in the database and the audit log: a note on Marcus Chen → INTERNAL, by the Super Admin; a follow-up "tomorrow at 14:30 by phone" → stored 08:30 UTC (14:30 Dhaka), CALL; a task for me due Monday → due 23 Nov, assigned to the Super Admin, linked to TJ-5; "Move TJ-5 to booked" → DRAFT → BOOKED; "Reassign TJ-5 to Barry Wilson" → summary named both brokers and the task and email → CANCEL → still Jordan Broker. One audit row and one `confirmed` log line per action; no message text in the log. Not tried live: mark quote sent (the only open quote is already SENT) — unit-tested. |
| 7 | **Finish** — Postman folder for the two webhook routes (signed in a pre-request script), docs, deploy when the developer says | 🟡 19 Nov — **Postman done:** `31 · WhatsApp Webhook` (3 requests, 9 examples: verify 200/403/403/400, a message 200/401/401/401, a receipt 200), builder by Codex, captured by Claude on the 4100 test API with test-only WhatsApp values (fake secret, verify token, admin phone and Meta token, no OpenAI key) and messages only from an unknown number, so nothing can reach Meta or OpenAI — the log confirms none did. Fixed in capture: the signing script redeclared the sandbox global `CryptoJS` (a SyntaxError Newman showed and a mocked runtime did not; AGENTS rule added). Newman green twice; collection 793 examples, 0 mislabelled. Codex stopped once (the brief showed the POST answer without the `{ success, data }` envelope). Docs pass done the same day (HANDOFF state, session log and What is next; the production checklist above gained migrations, the time zone check and a live check). **Left:** the deploy, when the developer says. |
| 8 | **WhatsApp & AI settings** — sealed credentials, password re-check and a verified phone linked to the Super Admin (§7) | ✅ 20 Nov — **8a ✅** built by Codex (8a, then 8a-2 after the developer's review: connection tests for OpenAI and Meta, a model picker filled from the key, per-row Save / Cancel for secrets, the one-off `whatsapp:import-env`), reviewed by Claude. Codex stopped four times, all right: the verification service could not carry the phone (now a nullable `target`, PASSWORD_RESET alone stays "verified"); `sendText` is boolean (fixed message, no Meta status); `config.ai` had no reader but the bot and health (eleven env variables removed, one added: `SETTINGS_ENCRYPTION_KEY`); and **errors echoed and logged the query string** — the verify token and searched client names — fixed for every route in `AllExceptionsFilter`. Claude's one change after the live check: the code message says to enter it in Settings, not the chat. Backend 86 files / 1032, tsc, oxlint; frontend lint and build. **Live, 20 Nov 01:20–01:30 Dhaka:** migration applied; the import sealed the four Meta values (stored `v1:…`, audit names only); the screen showed each secret as "Set · ends in …"; the Meta test answered "Connected: +1 555-138-2534 · Test Number"; the link code arrived on WhatsApp and linked the Super Admin's number (`user.whatsapp_linked`, last four only; code consumed); a question from that phone was answered. **8b ✅** Postman, built by Codex (one stop, right: `security@` has two-factor on, so its 403s are captured through `two_factor_session()`), captured and run by Claude on `tribeca_postman`. New `prepare_whatsapp_test_db.sql` blanks the copy's sealed credentials and linked phones, switches the assistant off and gives `broker@` the fixture `15550000777`; it refuses any other database (tried on dev: refused, nothing changed). `31 · WhatsApp Webhook` now saves fake Meta settings through the API in `00 · Setup` and clears them in its teardown (the env block is gone from the README); new `32 · WhatsApp Settings` (6 requests, 13 examples: 200/403 read, 400/409/400 send-code with no 200, 200/400/400/403 save, 400 verify, 200/400 unlink). The connection tests are documented in the folder description, never run. Newman: each folder alone twice and together, 0 failures (31: 11 assertions, 32: 12); label audit 808 examples, 0 mislabelled; the 4100 log shows no connection test, send or reply, so no call reached Meta or OpenAI. **Production, 20 Nov:** `3ecdd63` deployed; a new `SETTINGS_ENCRYPTION_KEY` in Dokploy; settings entered and the phone linked in production's panel; Meta's webhook verified against production (a first 404 was an unsaved Meta field: the webhook stays hidden until all four are saved); the assistant switched on; "what flights do we have this week?" answered from production data at 12:07 Dhaka. |

**8c ✅ 20 Nov — the tab reworked after the production setup** (built by
Codex, reviewed, captured and live-checked by Claude). The developer's
decisions: the switch moves to WhatsApp & AI, Super Admin only, on needs the
password and off does not; secrets are hidden by default and viewable one at
a time after the password, audited, **no rate limit**; the verify token gets
Generate; one Save per card (a forgotten per-row Save caused production's
first webhook 404). Built: `whatsapp_settings.assistantEnabled` (migration
`20261120130000` copies the value and drops the company column — on dev the
switch stayed on, keys untouched), `PATCH …/assistant`, `POST …/reveal`
(`no-store`, audit `whatsapp_settings.revealed` with the field only), view
adds `masked`, `assistantEnabled` and `readiness` (the readiness check and
the webhook's 404 share one function), shared `SecretField`. Codex stopped
once, right: the brief's "no secret in a URL" read as covering Meta's own
`hub.verify_token`; clarified. Claude's change after the developer's look:
Generate sits beside View and Edit, not only inside Edit. Backend 86 files /
1046, tsc, oxlint; frontend lint and build. Postman: `30 · Settings`
recaptured (no switch in Security), `32 · WhatsApp Settings` 9 requests /
22 examples (reveal 400/200/400/403, switch 200/400/400/200); Newman 30,
31, 32 each alone twice and together, 0 failures (40 assertions); label
audit 817 examples, 0 mislabelled; the 4100 log has no outbound call and no
secret value. **Not yet on production** — the migration applies on the next
deploy and keeps production's switch on.

**8d ✅ 20 Nov — up to five phones and a History tab** (built by Codex,
reviewed and live-checked by Claude; **Postman not yet captured** — the
developer chose to ship first). The Super Admin can link up to five named
phones. Each number keeps separate Redis memory and pending confirmations.
The migration preserves the verified number as **Phone 1** (dev: …9550
carried over; `migrate diff` empty after it). History reads the audit log
and shows which phone answered, proposed, confirmed, cancelled, or received
a PDF, alongside setup changes. The bot records send failures and matches
failed Meta receipts to replies for up to 24 hours. Codex stopped four
times, all right: an expiry cannot be recorded (Redis drops the proposal);
`AuditService` already swallows failures; pre-8d link events cannot be
tied to a phone; Prisma 7.10 *can* declare a partial index
(`partialIndexes` preview) — and a creation has no ref until confirmed
(a `proposalId` ties the entries). Claude's changes after review: the
older SQL-only `operator_quotes_one_live_per_operator` index, which a
generated migration would have dropped, is now declared in the schema
too; the History date filter reads days in the reader's own zone (it
used UTC days, so a Dhaka morning fell on the day before) and its
filters use the shared toolbar pieces; the Ask Anything button is
smaller. Backend 87 files / 1066; frontend lint and build. **Still to
do:** capture `32 · WhatsApp Settings` with the builder and
`whatsapp_five_phones.sql`, Newman, label audit.

**Needed from the developer / owner:**

| Item | For | State |
|---|---|---|
| OpenAI key and model in the panel | production setup | Enter after the encryption key is configured |
| Meta credentials and verified Super Admin phone (?4) | production setup | Enter the permanent system-user token in the panel and link the phone |
| Owner's OK to send client data (names, routes, figures) to OpenAI — passports, IDs and sensitive documents stay out regardless | first live call | ⏳ to ask |
| **Timezone fix — crucial** (found 19 Nov). The bot used the UTC date for "today" (`whatsapp.agent.ts`, `Today's date (UTC)`), so "tomorrow" was a day off whenever UTC and the reader's day differ. The fix is a **company timezone setting** (the desk is in the US, the developers in Dhaka — opposite sides of the earth), read when the agent builds its instructions, with the date and weekday given in that zone. Meta's webhook carries no timezone — only a UTC Unix `timestamp` and the sender's number — so the zone cannot come from the message. Row in `docs/MODULES.md` §26's settings map. **Design agreed 19 Nov:** (1) a `timeZone` (IANA name) on each user, used for their "today"; (2) a company timezone in Settings, default `America/New_York`, for anyone without one and later for the desk rules (Overdue, "flights today", report windows — today `todayUtc()` in `common/money/settlement.ts`, 14 modules); (3) the bot takes "I'm in London" / "use Dubai time" to change it and says which zone it uses when asked; (4) the web app asks once — never silently — when the browser's zone differs from the saved one; (5) every bot answer about a relative day names the date and the zone ("Tomorrow, Fri 20 Nov (Dhaka time)"); (6) flight times stay airport-local, as stored. Built together with the 24-hour clock rule (AGENTS.md part one) | before step 4 | ✅ 19 Nov 2026 — built by Codex, reviewed by Claude. Fixed in review: the bot answered "I'm in Dhaka" in Dhaka time without saving it (tool and instructions now say: when they say where they are, call `set_my_timezone` first); the browser prompt compared zone spellings literally, so Firefox's `Asia/Kolkata` vs the API's `Asia/Calcutta` would ask on every visit (now compared canonically); `TimePicker`'s bug history restored. Checked: backend 75 files / 715 tests, tsc, oxlint; frontend lint and `next build`; migration applied to the dev DB; the API boots with the new module import; `PATCH /auth/me` and `PATCH /settings` take a zone and refuse unknown names and fixed offsets; branding does not carry it; live via `whatsapp:ask` (OpenAI, seed data): company default → "Tomorrow, Fri 20 Nov (America/New_York)", "I'm in Dhaka" → stored `Asia/Dhaka`, audited as the WhatsApp assistant, "go back" → null. Postman: `timeZone` examples on `01 · Auth › 05 · My Account › Update your own profile` and `companyTimeZone` on `30 · Settings › 02` (5 captured on the 4100 test API; Newman green twice on both folders; 784 examples, 0 mislabelled). **Live through Meta, 19 Nov 14:00 Dhaka:** "What flights go out tomorrow?" → "Tomorrow, Fri 20 Nov (Asia/Dhaka)"; "I'm in London" → Europe/London, 08:00; "Go back to the company time" → America/New_York, 03:01 — all correct, no errors logged. The developer clicked through the browser prompt, the pickers (Asia/Dhaka saved) and 24-hour times on Trips. Nothing left open |

Enter credentials directly in **Settings › WhatsApp & AI**. Keep the encryption key in the deployment secret store.

**Where the code is:** `Backend/src/modules/whatsapp/` — `whatsapp.controller.ts`
(routes), `whatsapp.signature.ts` (HMAC), `whatsapp.payload.ts` (Meta payload
reader), `whatsapp.service.ts` (gates, shared live Super Admin lookup and replies),
`whatsapp.sender.ts` (Graph text replies, read receipts and typing indicator), `whatsapp.ai-client.ts` (Responses API adapter and nullable
provider), `whatsapp-settings.service.ts` (sealed configuration and panel views),
`whatsapp-phone.service.ts` (password and phone verification), `whatsapp.agent.ts` (bounded tool loop and confirmation commands),
`whatsapp.memory.ts` (Redis text history), `whatsapp.tools.ts` (permission
checks, reads and proposals), `whatsapp.pending.ts` (frozen proposals in
Redis), and `whatsapp.actions.ts` (confirmed writes through the owning
services). Tests: `whatsapp.sender.spec.ts`, `whatsapp.spec.ts`,
`whatsapp.agent.spec.ts`, `whatsapp.tools.spec.ts`, `whatsapp.pending.spec.ts`,
and `whatsapp.actions.spec.ts`.
The terminal entry point is `Backend/src/scripts/whatsapp-ask.ts` —
`npm run whatsapp:ask -- [--as <email>] "question"` compiles with Nest first.
It needs the OpenAI key and model configured in the panel. With a verified
phone it acts as the linked Super Admin and shares the earliest-linked
live phone's memory.
Without a verified phone, pass `--as <email>` to select an active Super Admin.
The development conversation then uses the Redis key for phone `0`.
It skips webhook gates and is a development tool that sends CRM data to OpenAI.
Desk action proposals and confirmation are available only through the webhook.

---

## 7. WhatsApp & AI settings (20 Nov 2026)

The Super Admin enters the assistant's OpenAI and Meta values in the
panel. The key, access token, app secret and verify token are hidden by
default and sealed with AES-256-GCM using `SETTINGS_ENCRYPTION_KEY`. Reads
include the mask and the last four characters when available. Reveal requires
the current password and returns one value with `Cache-Control: no-store`.
The audit trail records the revealed field name. Saving provider settings
requires the current password and records the changed field names.

To link a number, name it, enter it with its country code, and re-enter the current
password. The business number sends a six-digit code. Enter that code in
the panel before it expires. The server hashes the code, stores its target,
and binds the challenge to the browser with an httpOnly cookie scoped to
the link routes. A successful check consumes the code and verifies the
phone against the caller's own account. The phone is unique across
accounts while linked. Unlinking also needs the current password. A fresh
code for a previously unlinked number restores its original phone row.

The webhook acts as the active Super Admin with the verified sending
number, checking the account on each message. The lost-phone switch lives
in `whatsapp_settings` and on Settings › WhatsApp & AI. Turning it off
requires only the Super Admin session. `GET /api/health` reports whether the panel has a
readable OpenAI key and a model. Ask Anything continues to use its own
CRM-backed service.

The first migration creates the settings and verification fields. The
switch migration copies its existing value out of company settings.
Deployment, live validation, and Postman capture are separate review steps.
