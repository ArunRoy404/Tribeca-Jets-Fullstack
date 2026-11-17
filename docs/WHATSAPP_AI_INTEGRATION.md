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

# AI provider (already in the env before this feature)
OPENAI_API_KEY=""
```

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

The plan in seven steps (agreed 16 Nov 2026). Update this table in the same
pass as each step.

| Step | What | State |
|---|---|---|
| 1 | **Secure entry point** — env (six variables, all or none), Settings › Security switch (off by default), webhook (`GET` verify, `POST` signed events), gates: configured, switched on, one phone, redelivery dropped, ≤10 min old, active Super Admin re-read per message | ✅ 16 Nov — 53 tests + live curl run on a test API; committed 17 Nov |
| 2 | **AI brain** — OpenAI tool-calling loop, Redis conversation memory, first read tools (trips today/upcoming, dashboard KPIs, client lookup), tested from a script before WhatsApp is wired | ⬜ next — needs `OPENAI_API_KEY` |
| 3 | **Connect WhatsApp** — replies sent through Meta's Graph API; webhook pointed at the API (tunnel locally); first real message on the phone | ⬜ needs the Meta credentials |
| 4 | **Actions with CONFIRM** — approve/decline trip, create lead, complete task, record payment; 2-step confirmation held in Redis for 5 minutes | ⬜ |
| 5 | **PDFs in the chat** — itinerary, quote, invoice via the existing PDF generator, uploaded to Meta media and sent as documents | ⬜ |
| 6 | **More tools, module by module** — until the bot covers the CRM (bulk operations, permissions and Settings stay out on purpose) | ⬜ |
| 7 | **Finish** — Postman folder for the two webhook routes (signed in a pre-request script), docs, deploy when the developer says | ⬜ |

**Needed from the developer / owner:** the OpenAI key (step 2), the Meta
credentials listed in §4 (step 3), and the owner's OK to send client data
(names, routes, figures) to OpenAI — passports, IDs and sensitive documents
stay out regardless.

**Where the code is:** `Backend/src/modules/whatsapp/` — `whatsapp.controller.ts`
(routes), `whatsapp.signature.ts` (HMAC), `whatsapp.payload.ts` (Meta payload
reader), `whatsapp.service.ts` (gates and acting user; `handle()` is where
step 2 plugs in), `whatsapp.spec.ts`.
