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
WHATSAPP_GRAPH_VERSION=v21.0      # optional, defaults to v21.0

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

The WABA id is not needed: sending uses the phone number id.

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
   - `whatsapp.service.ts`:
     - Outbound text message sending via Meta Graph API (`v21.0`).
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
| 2 | **AI brain** — OpenAI tool-calling loop, Redis conversation memory, first read tools (trips today/upcoming, dashboard KPIs, client lookup), tested from a script before WhatsApp is wired | 🔍 17 Nov — built by Codex, code-reviewed by Claude (two fixes: `--as` works without the Meta env, and `handle()` asks `agent.ready` rather than re-reading config). 51 new mocked tests; backend total 72 files / 673 tests, tsc and oxlint clean; compiled script boots and refuses without a key. **Live check passed 17 Nov** on the dev database (seed data) with the developer's own key and `gpt-6.1-sol`: no flights tomorrow answered as not on file, this week's KPIs as the service computed them, a client card matching the database field by field, a follow-up answered from memory, and "approve" declined as coming. It found three things, fixed: the script hung after answering (now exits), the model sent full names to a search that matches one column at a time (tool description now says one name), and money had no thousands separators. **Left: commit** |
| 3 | **Connect WhatsApp** — replies sent through Meta's Graph API; webhook pointed at the API (tunnel locally); first real message on the phone | ⬜ 17 Nov — decided: build and Meta setup run in parallel. **Next: write the Codex brief** (sending against a faked Graph API, as step 2 faked OpenAI); the credentials are needed only for the live check. Developer doing the Meta setup (walkthrough in §4) |
| 4 | **Actions with CONFIRM** — approve/decline trip, create lead, complete task, record payment; 2-step confirmation held in Redis for 5 minutes | ⬜ |
| 5 | **PDFs in the chat** — itinerary, quote, invoice via the existing PDF generator, uploaded to Meta media and sent as documents | ⬜ |
| 6 | **More tools, module by module** — until the bot covers the CRM (bulk operations, permissions and Settings stay out on purpose) | ⬜ |
| 7 | **Finish** — Postman folder for the two webhook routes (signed in a pre-request script), docs, deploy when the developer says | ⬜ |

**Needed from the developer / owner:**

| Item | For | State |
|---|---|---|
| `OPENAI_API_KEY` in `Backend/.env` | step 2 live check | ✅ 17 Nov — the developer's own key, for local testing on seed data |
| `OPENAI_MODEL` in `Backend/.env` | step 2 live check | ✅ 17 Nov — `gpt-6.1-sol` (balance of tool-calling reliability and cost; `gpt-6.1-terra` is the cheaper one to compare) |
| Meta credentials (§4, with the walkthrough): permanent system-user token, phone number id, app secret, verify token, Super Admin phone and email | step 3 live check | ⏳ Meta setup in progress (17 Nov) — not needed to start building |
| Owner's OK to send client data (names, routes, figures) to OpenAI — passports, IDs and sensitive documents stay out regardless | first live call | ⏳ to ask |

Secrets go straight into `Backend/.env` (git-ignored), never into a chat.

**Where the code is:** `Backend/src/modules/whatsapp/` — `whatsapp.controller.ts`
(routes), `whatsapp.signature.ts` (HMAC), `whatsapp.payload.ts` (Meta payload
reader), `whatsapp.service.ts` (gates, shared live Super Admin lookup and reply
preparation), `whatsapp.ai-client.ts` (Responses API adapter and nullable
provider), `whatsapp.agent.ts` (bounded tool loop), `whatsapp.memory.ts`
(Redis text history), `whatsapp.tools.ts` (permission checks and three read
tools), `whatsapp.spec.ts`, `whatsapp.agent.spec.ts`, `whatsapp.tools.spec.ts`.
The terminal entry point is `Backend/src/scripts/whatsapp-ask.ts` —
`npm run whatsapp:ask -- [--as <email>] "question"` compiles with Nest first.
It needs `OPENAI_API_KEY` and a developer-chosen `OPENAI_MODEL`. With the six
WhatsApp variables set it acts as `SUPER_ADMIN_WHATSAPP_EMAIL` and shares the
phone's memory; without them, `--as <email>` is required and the conversation
is kept under the key `0`, which no phone number reduces to — so the brain can
be tried before Meta's credentials arrive. `--as` uses the webhook's own
active, non-deleted Super Admin query, and the all-or-none env rule is untouched.
It skips webhook gates and is a development tool that sends CRM data to OpenAI.
