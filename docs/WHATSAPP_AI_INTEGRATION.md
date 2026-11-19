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
   - Evaluates `from` against `SUPER_ADMIN_WHATSAPP_PHONE` (E.164 format).
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

## 4. Credentials & Environment Configuration

As built (16 Nov 2026) — `Backend/.env`, **all six or none** (a partial set
refuses to boot):

```bash
# Meta WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=""          # Permanent System User token with whatsapp_business_messaging
WHATSAPP_PHONE_NUMBER_ID=""       # Meta App -> WhatsApp -> API Setup -> Phone number ID
WHATSAPP_APP_SECRET=""            # Meta App -> App settings -> Basic -> App secret
WHATSAPP_VERIFY_TOKEN=""          # Any string we choose; typed into Meta's webhook form
WHATSAPP_GRAPH_VERSION=v25.0      # optional, defaults to v25.0

# The one phone the bot answers, and the account it acts as
SUPER_ADMIN_WHATSAPP_PHONE="+1…"  # E.164
SUPER_ADMIN_WHATSAPP_EMAIL=""     # sign-in email of an ACTIVE SUPER_ADMIN

# AI provider (OPENAI_API_KEY existed before this feature; the model is step 2's)
OPENAI_API_KEY=""
OPENAI_MODEL=gpt-6.1-sol          # no default in code — the developer chooses
```

### Getting the Meta values (walkthrough, 17 Nov 2026)

Meta moves its menus; take the nearest label if one differs.

**Setup**
1. **business.facebook.com** — a business portfolio (skip if one exists).
2. **developers.facebook.com → My Apps → Create App**, use case "Connect
   with customers through WhatsApp", linked to that portfolio.
3. **WhatsApp → API Setup**: Meta has created a free **test number**
   ("From"). Under "To" → *Manage phone number list* → add the Super
   Admin's own WhatsApp number and confirm the code. *Send message* there
   should deliver "Hello World" to the phone.

**The values**
| Variable | Where |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → API Setup → "Phone number ID" (the id, not the number) |
| `WHATSAPP_APP_SECRET` | App settings → Basic → App secret → Show |
| `WHATSAPP_ACCESS_TOKEN` | Quick: API Setup → temporary token (expires in 24 h). Permanent: Business settings → Users → System users → Add (Admin) → assign the app and the WhatsApp account (full control) → Generate token, expiry Never, permissions `whatsapp_business_messaging` + `whatsapp_business_management` — copy at once, it is shown once |
| `WHATSAPP_VERIFY_TOKEN` | Made up — any long random string, typed into Meta's webhook form later |
| `SUPER_ADMIN_WHATSAPP_PHONE` | The Super Admin's WhatsApp number, E.164 (`+8801…`, no spaces) |
| `SUPER_ADMIN_WHATSAPP_EMAIL` | An active SUPER_ADMIN's sign-in email |

Into `Backend/.env` only, never into a chat or a commit. A real business
number for production cannot stay logged into the ordinary WhatsApp app —
use one that is on nobody's phone; the test number is enough for step 3.

Sending uses the phone number id, not the WABA id — but the WABA id is
needed **once**: Meta delivers a phone's messages only to apps subscribed to
its WhatsApp Business Account, and saving the webhook form does not do
that. On 19 Nov the webhook verified, `messages` showed Subscribed, and
four messages from the phone reached nobody — only Meta's own "WA DevX
Webhook Events" app was on the account. One call fixed it (the WABA id is
"Messaging account ID" under Step 1 · Try it out):

```
curl -X POST -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps
```

A `GET` on the same URL lists what is subscribed; our app must be on it.
Messages sent before the subscription are not redelivered.

### Going to production (checklist, 19 Nov 2026)

What worked locally works on Dokploy for the same reasons — production
already has HTTPS, Traefik sends `/api/*` straight to the API (so the
signature sees the raw body), and Redis. But nothing carries over by
itself:

1. **Deploy `roy`.** Production runs `8127edd` (9 Nov), with no WhatsApp
   code — 57 commits behind on 19 Nov. Every migration newer than what it
   has applies on start, at least `20261116120000_whatsapp_assistant_switch`
   and `20261119120000_time_zones` (users' and the company's time zone);
   read the list against production's `_prisma_migrations` first, and back
   the database up.
2. **Dokploy env:** all six `WHATSAPP_*` / `SUPER_ADMIN_WHATSAPP_*` (all or
   none — a partial set refuses to boot), `OPENAI_API_KEY`, `OPENAI_MODEL`.
3. **The permanent system-user token** (table above). The 24-hour token
   goes silent with code 190.
4. **`SUPER_ADMIN_WHATSAPP_EMAIL` an active SUPER_ADMIN in the production
   database**, not only in dev.
5. **Meta webhook** → `https://tribecajetscommandcenter.com/api/webhooks/whatsapp`,
   Verify and save. The WABA subscription above is per account, not per
   URL — it stays.
6. **Settings › Security › "WhatsApp assistant" on in production** — each
   database has its own switch, off by default.
7. **Settings › Company time zone** — check it is the desk's zone
   (`America/New_York` by default) and that the Super Admin's own zone is
   set (the web app asks once).
8. **One live message from the admin phone** — "What flights go out
   tomorrow?" — and read the API log for `Sent a reply`. Then one CONFIRM
   action, cancelled.

Two things that catch people out:

- **One webhook URL per Meta app.** Pointing it at production stops local
  delivery. Either swap it back and forth, or make a second Meta app for
  development.
- **The test number reaches at most five hand-added numbers.** The
  client's real use needs a registered business number, business
  verification, a payment method and a published app (Meta's "Step 2 /
  Step 3"). None of it is done.

**Hold the deploy until** the timezone fix is in and the owner has said
yes to client data going to OpenAI (§6, "Needed from the developer /
owner"). Production holds real clients.

**And Settings › Security › "WhatsApp assistant (Super Admin)"** must be on.
It is off by default, and switching it off stops the bot at the next message
— the switch for a lost phone.

**Webhook URL for Meta:** `https://<domain>/api/webhooks/whatsapp`, verify
token = `WHATSAPP_VERIFY_TOKEN`, subscribed field `messages`. Locally, expose
port 4000 through a tunnel (ngrok, cloudflared).

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
| 8 | **The phone linked in Settings** — Super Admin links their own number by sending a code to the bot; own Settings tab; the two `SUPER_ADMIN_WHATSAPP_*` env variables removed (§7) | ⬜ agreed 18 Nov, straight after step 7 |

**Needed from the developer / owner:**

| Item | For | State |
|---|---|---|
| `OPENAI_API_KEY` in `Backend/.env` | step 2 live check | ✅ 17 Nov — the developer's own key, for local testing on seed data |
| `OPENAI_MODEL` in `Backend/.env` | step 2 live check | ✅ 17 Nov — `gpt-6.1-sol` (balance of tool-calling reliability and cost; `gpt-6.1-terra` is the cheaper one to compare) |
| Meta credentials (§4, with the walkthrough): permanent system-user token, phone number id, app secret, verify token, Super Admin phone and email | step 3 live check | 🟡 18 Nov — Meta app "Tribeca Jets Assistant" (portfolio Fedson), test number +1 555 138 2534, "Hello World" delivered to the developer's phone; all six values in the developer's `Backend/.env` with `WHATSAPP_GRAPH_VERSION=v25.0`. The token is the **temporary 24-hour** one — the permanent system-user token is still to make |
| Owner's OK to send client data (names, routes, figures) to OpenAI — passports, IDs and sensitive documents stay out regardless | first live call | ⏳ to ask |
| **Timezone fix — crucial** (found 19 Nov). The bot used the UTC date for "today" (`whatsapp.agent.ts`, `Today's date (UTC)`), so "tomorrow" was a day off whenever UTC and the reader's day differ. The fix is a **company timezone setting** (the desk is in the US, the developers in Dhaka — opposite sides of the earth), read when the agent builds its instructions, with the date and weekday given in that zone. Meta's webhook carries no timezone — only a UTC Unix `timestamp` and the sender's number — so the zone cannot come from the message. Row in `docs/MODULES.md` §26's settings map. **Design agreed 19 Nov:** (1) a `timeZone` (IANA name) on each user, used for their "today"; (2) a company timezone in Settings, default `America/New_York`, for anyone without one and later for the desk rules (Overdue, "flights today", report windows — today `todayUtc()` in `common/money/settlement.ts`, 14 modules); (3) the bot takes "I'm in London" / "use Dubai time" to change it and says which zone it uses when asked; (4) the web app asks once — never silently — when the browser's zone differs from the saved one; (5) every bot answer about a relative day names the date and the zone ("Tomorrow, Fri 20 Nov (Dhaka time)"); (6) flight times stay airport-local, as stored. Built together with the 24-hour clock rule (AGENTS.md part one) | before step 4 | ✅ 19 Nov 2026 — built by Codex, reviewed by Claude. Fixed in review: the bot answered "I'm in Dhaka" in Dhaka time without saving it (tool and instructions now say: when they say where they are, call `set_my_timezone` first); the browser prompt compared zone spellings literally, so Firefox's `Asia/Kolkata` vs the API's `Asia/Calcutta` would ask on every visit (now compared canonically); `TimePicker`'s bug history restored. Checked: backend 75 files / 715 tests, tsc, oxlint; frontend lint and `next build`; migration applied to the dev DB; the API boots with the new module import; `PATCH /auth/me` and `PATCH /settings` take a zone and refuse unknown names and fixed offsets; branding does not carry it; live via `whatsapp:ask` (OpenAI, seed data): company default → "Tomorrow, Fri 20 Nov (America/New_York)", "I'm in Dhaka" → stored `Asia/Dhaka`, audited as the WhatsApp assistant, "go back" → null. Postman: `timeZone` examples on `01 · Auth › 05 · My Account › Update your own profile` and `companyTimeZone` on `30 · Settings › 02` (5 captured on the 4100 test API; Newman green twice on both folders; 784 examples, 0 mislabelled). **Live through Meta, 19 Nov 14:00 Dhaka:** "What flights go out tomorrow?" → "Tomorrow, Fri 20 Nov (Asia/Dhaka)"; "I'm in London" → Europe/London, 08:00; "Go back to the company time" → America/New_York, 03:01 — all correct, no errors logged. The developer clicked through the browser prompt, the pickers (Asia/Dhaka saved) and 24-hour times on Trips. Nothing left open |

Secrets go straight into `Backend/.env` (git-ignored), never into a chat.

**Where the code is:** `Backend/src/modules/whatsapp/` — `whatsapp.controller.ts`
(routes), `whatsapp.signature.ts` (HMAC), `whatsapp.payload.ts` (Meta payload
reader), `whatsapp.service.ts` (gates, shared live Super Admin lookup and replies),
`whatsapp.sender.ts` (Graph text replies, read receipts and typing indicator), `whatsapp.ai-client.ts` (Responses API adapter and nullable
provider), `whatsapp.agent.ts` (bounded tool loop and confirmation commands),
`whatsapp.memory.ts` (Redis text history), `whatsapp.tools.ts` (permission
checks, reads and proposals), `whatsapp.pending.ts` (frozen proposals in
Redis), and `whatsapp.actions.ts` (confirmed writes through the owning
services). Tests: `whatsapp.sender.spec.ts`, `whatsapp.spec.ts`,
`whatsapp.agent.spec.ts`, `whatsapp.tools.spec.ts`, `whatsapp.pending.spec.ts`,
and `whatsapp.actions.spec.ts`.
The terminal entry point is `Backend/src/scripts/whatsapp-ask.ts` —
`npm run whatsapp:ask -- [--as <email>] "question"` compiles with Nest first.
It needs `OPENAI_API_KEY` and a developer-chosen `OPENAI_MODEL`. With the six
WhatsApp variables set it acts as `SUPER_ADMIN_WHATSAPP_EMAIL` and shares the
phone's memory; without them, `--as <email>` is required and the conversation
is kept under the key `0`, which no phone number reduces to — so the brain can
be tried before Meta's credentials arrive. `--as` uses the webhook's own
active, non-deleted Super Admin query, and the all-or-none env rule is untouched.
It skips webhook gates and is a development tool that sends CRM data to OpenAI.
Desk action proposals and confirmation are available only through the webhook.

---

## 7. After the seven steps: the phone is linked in Settings (agreed 18 Nov 2026)

Until the assistant is finished, the phone and the account stay in `.env`
(`SUPER_ADMIN_WHATSAPP_PHONE`, `SUPER_ADMIN_WHATSAPP_EMAIL`). **Straight after
step 7 they move into Settings**, the developer's decision. Not started.

**There is one Super Admin, and one phone.** The bot answers exactly one
number, and it acts as the one Super Admin.

**What was agreed:**

1. **No email field.** The Super Admin links *their own* WhatsApp number from
   their own session; the bot acts as whoever linked it. Nobody can point the
   bot at another account.
2. **The number is proven, not typed.** The screen shows a one-time code
   (`LINK 482913`); the Super Admin sends it *to* the bot on WhatsApp, and the
   webhook links the number only when the code arrives from it. Inbound on
   purpose: a business may message someone who has not written first only
   with a Meta-approved template, so a code sent *from* us would need one.
3. **Guards:** the password is re-entered to link or change the number; an
   audit row and an email to the account on every link and unlink; an
   **Unlink** button. The existing on/off switch stays the lost-phone switch.
4. **"Send test message"** once a number is linked. With Meta's test number it
   reaches only the (at most five) numbers on Meta's recipient list; in
   production a free-text message reaches the phone only within 24 hours of
   its last message, otherwise an approved template is needed.

**Where:** its own Settings tab, **"WhatsApp assistant"**, shown to the Super
Admin only. The on/off switch moves there from Settings › Security, so
everything about the assistant is in one place.

**What stays in `.env` regardless:** the access token, the app secret, the
verify token, the phone number id and the Graph version. They are server
secrets; settings travel to the browser and these never may.

**This reverses a rule.** AGENTS.md says the phone and account "live in the
env, never in the database". The pass that builds this rewrites that rule,
and removes the two env variables (one source for one number).
