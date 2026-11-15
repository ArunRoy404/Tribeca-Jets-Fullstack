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

The following keys will be configured in `Backend/.env`:

```bash
# Meta WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=""         # Meta App -> WhatsApp -> API Setup -> Phone number ID
WHATSAPP_WABA_ID=""                 # Meta App -> WhatsApp -> API Setup -> WhatsApp Business Account ID
WHATSAPP_ACCESS_TOKEN=""            # Permanent System User token with whatsapp_business_messaging
WHATSAPP_APP_SECRET=""               # Meta App -> App settings -> Basic -> App secret
WHATSAPP_VERIFY_TOKEN=""             # Custom secret handshake string (configured in Meta Webhooks)

# AI Provider
OPENAI_API_KEY=""                    # OpenAI API key (gpt-4o / gpt-4o-mini)

# Super Admin Whitelisted Phone Number
SUPER_ADMIN_WHATSAPP_PHONE="+1..."   # International E.164 format without spaces or dashes
```

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
