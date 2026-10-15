# Tribeca Jets Command Center — context for a full website test

**For:** an AI agent testing the running website in a browser (for example
Claude in Chrome), on behalf of the project owner.
**Written:** 12 Oct 2026, from the code, the database and the project docs on
the owner's Mac. Everything here was checked against the source; where
something is a design intention rather than a verified behaviour, it says so.

Your job: click through the whole CRM as each role, check that every screen
does what this document says it should, and report what does not. You are
testing, not fixing. Do not change code.

---

## 1. Ground rules for the tester (read first)

1. **Never send email to a real address.** The API on this machine is
   connected to a real mail server: invitations, password-reset codes,
   two-factor codes and every email composed in the CRM are actually sent.
   - Only ever send to addresses ending in **`example.com`** (they are never
     delivered) — for example `qa.client@example.com`.
   - **Do not email** the operator named **"test"** (its contact address is
     a real Gmail address), the company address `fly@tribecajets.com`, or
     any `@gmail.com` / `@tribecajets.com` address.
   - In the compose form, check the recipient before pressing Send.
2. **Name everything you create with a `QA ` prefix** (`QA Apex Test`,
   `QA N999QA`), so the owner can tell test data from real data. At the end,
   **archive** what you created (there is no permanent delete — archiving
   is the correct clean-up).
3. **Do not touch the owner's own accounts** (any `…techreion@gmail.com`
   address): do not change their role, permissions or status, and do not
   sign in as them.
4. **Settings are company-wide.** If you change a setting to test it, put it
   back exactly as it was before moving on, and note the original value
   first. Do **not** switch on "Require two-factor for administrators" — the
   admin accounts' codes go to `example.com` addresses nobody can read, which
   would lock them out.
5. **Do not suspend or withdraw** any of the seeded accounts.
6. **Do not try "Forgot password" to completion, and do not sign in as
   `security@example.com` beyond the code screen** — both need a code
   emailed to an `example.com` inbox that cannot be read. Seeing the code
   screen appear is the test.
7. If something blocks you, report it and move on — do not work around it.

---

## 2. The environment

| What | Where |
|---|---|
| Website (frontend) | **http://localhost:3000** |
| API (backend; the website calls it for you) | http://localhost:4000/api — API docs at http://localhost:4000/api/docs |
| Branch | `roy` |

Both servers must be running (`npm run start:dev` in `Backend/`, `npm run dev`
in `Frontend/`). If a page shows "could not load" everywhere, the API is down
— tell the owner rather than testing further.

### Accounts on this machine (owner's Mac)

All share the password **`ChangeMe123!`**.

| Email | Role | Notes |
|---|---|---|
| `admin@example.com` | Super Admin | Full access. **Use this as the main admin account.** |
| `security@example.com` | Admin | Two-factor is ON — sign-in stops at the code screen (rule 6). |
| `broker@example.com` | Broker | Role defaults. Sees only their own/assigned records. |
| `assistant@example.com` | Assistant | Role defaults (mostly view-only). |
| `agent@example.com` | Referral Agent | Signs in to the **partner portal** at `/portal`, never `/dashboard`. |
| two `…techreion@gmail.com` accounts | Super Admin, Referral Agent | **The owner's. Do not use or edit.** |

> On the owner's other machine the database was re-seeded on 9 Oct with
> different accounts (`admin@tribecajets.com`, `broker@tribecajets.com`, …)
> and data (6 airports, 4 operators, 5 aircraft, 5 clients). If the
> accounts above do not exist, you are on that machine — use those, same
> password, and treat `@tribecajets.com` addresses as real: never email them.

### Data on this machine at the time of writing (live rows)

5 airports (KTEB, KOPF, KVNY, KHPN, EGGW) · 1 operator ("test") · 2 aircraft
(N101NJ, N350FJ) · 7 clients (Elena Rostova, Marcus Vance, Sarah Jenkins,
Julian Sterling, David Chen, Arthur Pendelton, "test lead") · 5 trip
requests · 5 operator quotes · 2 quotes · 1 trip · 4 client-credit entries ·
9 notes · 1 vault document · 5 charter rates. **Nothing yet** in itineraries,
empty legs, invoices (receivables), operator bills, commissions, referrals,
tasks or email templates — you will create those.

### Current settings worth knowing

- **Automatic logout after inactivity is switched OFF** on this machine
  (Settings › Security & Session). You will not be signed out for being idle.
- Require two-factor for administrators: off.

---

## 3. What the product is

A CRM for a private-jet **charter brokerage**: the desk takes a client's trip
enquiry, asks operators (the companies that own the jets) for prices, sends
the client a quote with a markup, books the trip, issues the itinerary,
tracks the flight, invoices the client, pays the operator, and pays
commission to whoever referred the client.

**Glossary:** *Operator* — aircraft owner/charter company. *Tail* — an
aircraft's registration (N101NJ). *ICAO* — 4-letter airport code. *Leg* —
one flight of a trip. *Empty leg* — a repositioning flight sold cheaply.
*FET* — US Federal Excise Tax (7.5 % default) on a charter. *Referral agent*
— an outside partner who refers clients for a commission.

### The record flow (dependencies)

```
Client ──► Trip Request ──► Operator Sourcing (operator quotes) ──► Quote ──► Trip
                                                                             │
     Itinerary ◄── Schedule / Flight Tracking ◄───────────────────────────────┤
     Receivables (client invoice + payments) ◄────────────────────────────────┤
     Operator Payments (operator bill + payments) ◄───────────────────────────┤
     Commissions (referral agent / client / manual) ◄─────────────────────────┘
Transactions = ledger of all money movements · Reports + Dashboard = read-only summaries
Referral (from the agent portal) ──► converted into a Client by the desk
```

---

## 4. Roles and what each should see

Permissions are **per person** (each user has their own set, starting from
their role's defaults); the accounts above are on their role's defaults.
**Reach** decides which rows they see: *ALL*, *OWN* (records they own) or
*ASSIGNED* (records assigned to them).

**Super Admin / Admin:** every screen, every action, all records.

**Broker** — sidebar shows everything **except Users & Roles and Settings**.

| Area | Broker can (defaults) | Should NOT see |
|---|---|---|
| Dashboard | view, incl. money (own figures) | other brokers' figures |
| Trips | view / create / edit, money — **own trips** | Archive/Remove |
| Schedule | view own | — |
| Operator Sourcing, Trip Requests | view / create / edit, own | Archive |
| Flight Tracking | view / edit, own | — |
| Itineraries | view / create / edit / send, own | Archive |
| Empty Legs | view / create / edit, **all** | Archive |
| Clients, Leads & Agents | view / create / edit — **assigned clients only** | Archive; reassigning a client to another broker |
| Referrals | view / edit, own | create, archive |
| Quotes | view / create / edit / send, money, own | Archive |
| Email Templates | view and send (use templates) | create / edit / archive templates |
| Operators, Aircraft | view / create / edit, all | Archive |
| Airports | **view only** | Add / Edit / Archive |
| Document Vault | view / add / edit, incl. passports & IDs, own | Archive |
| Receivables | view / create invoice / record payment, own | Export |
| Operator Payments | **view only**, own | create bill, pay |
| Commissions, Transactions, Reports | view, own | Export |
| Tasks Board | view / create / edit own tasks | assign to others, archive |
| Instant Estimate (charter rates) | use it | change the rates (administrators only) |

**Assistant** — sidebar: Dashboard, Trips, Schedule, Operators Sourcing,
Flight Tracking, Itineraries, Empty Legs, Clients, Leads & Agents, Trip
Requests, Quotes, Email Templates, Operators, Aircraft, Airports, Document
Vault, Tasks Board. **Not:** Referrals, Receivables, Operator Payments,
Commissions, Transactions, Reports, Users & Roles, Settings.
Almost everything is **view-only**; the exceptions are Flight Tracking (edit),
Email Templates (send) and their own Tasks (create/edit). **No money
figures** on quotes, trips or the dashboard. Reach is ASSIGNED (records they
are assigned to); empty legs, operators, aircraft and airports are ALL.

**Referral Agent** — lands on **`/portal`**, a separate area: Submit
Referral, My Referrals, Commissions, Resources. Sees **only their own**
referrals and commissions, never desk data: no broker notes, no prices,
no profit (only their own commission). Opening any `/dashboard/...` URL
must send them back to the portal; the desk's Operators API refuses them.

---

## 5. Rules that apply on every screen — check them everywhere

These are the project's own rules; a breach is a bug.

1. **No invented data.** An empty value shows **"—"**, "Not rated" or "Not
   on file" — never a blank cell, never a made-up number, never a default
   rating. Stars appear **only** beside a real rating.
2. **Hide, don't disable.** A person never sees a button they cannot use
   (no greyed-out Edit/Remove, no 403 error toast after clicking). The
   checkbox column appears only if the person has a bulk action to use it for.
3. **Nothing is permanently deleted.** "Remove" archives. Every list with
   Remove has an **Archived** tab; archived rows show "Removed On / Removed
   By" and only **Restore**. A restored record shows a **Restored** badge
   permanently. The detail page of an archived record still opens, says it is
   archived, and offers Restore instead of Edit.
4. **Bulk actions:** selecting rows shows a bulk Remove (Restore on the
   Archived tab); the confirmation **lists the selected rows by name**; the
   selection clears afterwards.
5. **The URL holds the table state.** Tab, page, filters, search, sort and
   rows-per-page are in the address bar; reloading or pasting the URL shows
   the same view; changing a filter returns to page 1; Back does not step
   through every keystroke. A hand-edited `?page=-5&limit=99999` falls back
   to defaults without an error.
6. **Pagination is server-side:** page numbers (not only Prev/Next),
   rows-per-page 10 / 25 / 50 / 100 in the toolbar, default 10, newest first.
7. **Pickers over records** (airport, operator, aircraft, broker, client) are
   searchable, paged dropdowns: search box always visible, 10 per page,
   page numbers. Fixed choices (statuses) are ordinary dropdowns.
8. **Forms:** required fields are marked and the server agrees; "(Optional)"
   fields can be left blank and, on edit, **cleared**; dates save as dates
   (no "invalid date"); after a save, reopening Edit shows every value
   prefilled correctly. Questions ("Archive this?") use the app's own
   dialog — never a browser `confirm()` or `alert()` (one known exception:
   the AI assistant stub, §6b). (Only the Users & Roles invite/edit form
   warns about unsaved changes when you leave it; other forms do not yet —
   not a bug.)
9. **Errors are named.** A refused save shows a clear message tied to the
   field ("That aircraft has been archived. Restore it, or choose another.");
   a validation error never closes the dialog as if it succeeded.
10. **Toasts** confirm every save, archive and restore.
11. **Responsive:** check each screen at ~375 px (phone), ~768 px (tablet)
    and ~1440 px (desktop). Below ~1024 px, tables become **cards** (no
    sideways scrolling); stat tiles are 2 per row on a phone; the sidebar
    becomes a slide-out menu.
12. **Uploaded images** open in a full-screen preview on click; private
    documents download rather than open inline.
13. **Money** is shown with currency formatting; totals, tax, profit and
    margin are computed by the server — if two screens show the same trip's
    total, they must match.

---

## 6. Screen-by-screen guide

Format: **route** — what it is · what to check · *known, not a bug*.

### Sign-in and account
- **`/sign-in`** — email + password, "Remember me". Wrong password → clear
  error. Super Admin/Admin/Broker/Assistant land on `/dashboard`, the agent on
  `/portal`. `security@example.com` → `/sign-in/two-factor` code screen
  (stop there). Only *failed* sign-ins are limited (Settings › Rate Limiting,
  5 within 15 minutes by default): the message warns when two attempts are
  left, then sign-in pauses with a 429 saying how long. Correct sign-ins,
  however many, are never refused.
- **`/forgot-password`** — asks for an email and sends a code; check the
  screens only (rule 6).
- **`/dashboard/account`** (profile menu → My Account) — edit name, phone,
  photo; change password (wrong current password → error, not sign-out);
  two-factor on/off (**do not turn it on**); **signed-in devices** list with
  revoke. *No location column — by design.*
- Sign-out returns to sign-in; Back afterwards must not show CRM data.

### Dashboard — `/dashboard`
Tiles, priorities and an activity feed, each read from its module. Check
figures agree with the modules they come from; broker sees only their own;
assistant sees no money. *"Ask Anything" / AI assistant is a stub — not a bug.*

### Operations
- **Trips — `/dashboard/trips`**, detail `/dashboard/trips/[id]`, new
  `/dashboard/trips/new`, edit `/dashboard/trips/[id]/edit`.
  Statuses: DRAFT → BOOKED → CONFIRMED → IN_FLIGHT → COMPLETED, or CANCELLED.
  Allowed moves: Draft→Booked/Cancelled; Booked→Confirmed/Draft/Cancelled;
  Confirmed→In flight/Booked/Cancelled; In flight→Completed/Confirmed (cannot
  be cancelled once airborne); Completed→In flight; Cancelled→Draft. A
  Completed or Cancelled trip cannot be edited until moved back a step (named
  error). A trip can also be **booked from an approved quote** (once only —
  a second attempt names the existing trip). Check legs, passengers, notes
  timeline, documents, money (hidden from the assistant).
- **Schedule — `/dashboard/schedule`** — calendar (week/month) of trip legs,
  with a phone layout (day picker + agenda). *Flight status not shown on the
  calendar; more than 100 legs shows a "first 100" notice — known.*
- **Operators Sourcing — `/dashboard/operator-sourcing`** — board of trip
  requests with the operator quotes received (Awaiting response → Received →
  Approved/Rejected/Declined). *Deposit column is "—"; emailing a request to an
  operator is not built — known.*
- **Flight Tracking — `/dashboard/flight-tracking`** — **manual** flight
  status per leg (Not departed, Delayed, In flight, Landed, Diverted).
  Archived or cancelled trips refuse a report with a named error. *No live
  data provider — known.*
- **Itineraries — `/dashboard/itineraries`** — itinerary per trip
  (Pending/Confirmed); it reads aircraft, route and passengers **from the
  trip** (change the trip → the itinerary follows). Optional operator file
  attachment. *No PDF output — known. An operator file uploaded by one broker
  may 404 for another broker — known, deferred.*
- **Empty Legs — `/dashboard/empty-legs`** — Available / Matched / Booked /
  Expired; same departure and arrival airport is refused; matching against
  open trip requests.

### Sales & CRM
- **Clients — `/dashboard/clients`**, detail `/dashboard/clients/[id]` —
  type (Direct / Travel agent), status (Lead / Active / VIP / Inactive),
  priority, lead source and stage, assigned broker, home airport, follow-ups,
  preferences, notes timeline (notes + automatic history), client credits,
  documents. Broker sees assigned clients only and cannot reassign. *Average
  trip value not built; the detail page's drop zone was removed — known.*
- **Leads & Agents — `/dashboard/leads-agents`**, lead detail
  `/dashboard/leads-agents/leads/[id]`, agent detail
  `/dashboard/leads-agents/[agentId]` — leads are clients viewed by stage
  (New → Contacted → Qualified → Proposal → Quoted → Won/Lost). *Agent
  "associated trips" panel not wired; "Log Call Activity" disabled and
  labelled; revenue per agent not shown — known.*
- **Trip Requests — `/dashboard/trip-requests`** — client enquiries (Open →
  Sourcing → Quoted → Converted / Lost), one-way / round / multi-leg.
- **Referrals — `/dashboard/referrals`** — what agents submitted (Submitted →
  Contacted → Quoting → Booked → Completed / Lost / Cancelled). Linking a trip
  needs the referral **converted into a client** first (named error). Only an
  administrator can archive or reassign. Notes marked **Shared** are visible
  to the agent; Internal ones are not.
- **Quotes — `/dashboard/quotes`**, detail `/dashboard/quotes/[id]` — Draft →
  Sent → (Viewed) → Approved / Rejected / Expired; reopen, duplicate. An
  unsent quote cannot be approved (named error). Total, FET, profit and
  margin are computed by the server; each sent version is frozen. **Instant
  Estimate** (uses the charter rates) lives here — administrators can edit
  the rates, others only use the estimate; people without money access do
  not see rates. *No PDF; "Viewed" needs the client portal — known.*
- **Email Templates — `/dashboard/email-templates`** — templates with merge
  fields (`{client_name}` etc.) and **one** compose form used everywhere. A
  merge field that cannot be filled stays visible and blocks sending. Status
  after send: Sent (mail server accepted), Logged, Failed — **only send to
  `example.com`**. *Scheduled emails, attachments, HTML body, Gmail — not built.*

### Database
- **Operators — `/dashboard/operators`**, detail `/dashboard/operators/[id]`
  — status Active / Preferred / Inactive / **Suspended** (red badge, "do not
  book", no Request Quote); reliability and safety are 0–5 desk ratings (stars
  only when entered, else "Not rated"); response speed Fast/Average/Slow;
  payment terms Prepaid … Net 30; documents tab; fleet; trip history and
  payments. Referral agent is refused.
- **Aircraft — `/dashboard/aircraft`**, detail `/dashboard/aircraft/[id]` —
  tail, category, operator (picker), home base (picker), status
  (Available / In service / Maintenance / Inactive), photos (photo library),
  amenities. Picking an archived operator/airport → named error.
  *Utilisation is "—"; availability search not built — known.*
- **Airports — `/dashboard/airports`** — ICAO/IATA, name, city, coordinates,
  optional FBO. Archived airports cannot be picked elsewhere (named error,
  e.g. "KTEB has been archived"). *"State" is upper-cased on save — known.*
- **Document Vault — `/dashboard/documents`** — folders per client, trip and
  operator; categories (Passport, ID, Charter agreement, …). **Passports and
  IDs** are hidden from anyone without the sensitive-documents permission.

### Finance (not visible to the assistant)
- **Receivables — `/dashboard/receivables`** — client invoices
  ("INV-2026-0001"), Draft → Sent → Cancelled, with a payment ledger; states
  Due / Partly paid / Paid / **Overdue** are computed. A payment needs the
  invoice **sent** first; a cancelled invoice takes no payment; an invoice
  with payments cannot be archived (withdraw them first) — all named errors;
  overpayment refused. *No PDF invoice, no export — known.*
- **Operator Payments — `/dashboard/operator-payments`** — bills owed to
  operators, same ledger rules (Open / Cancelled; bill with payments cannot be
  cancelled or archived). Broker: view only.
- **Commissions — `/dashboard/commissions`** — to a referral agent, a client
  or a manual payee; basis % of profit / flat / custom; Pending → Earned →
  Paid / Cancelled. Suspended agent or broker refused (named error).
- **Transactions — `/dashboard/transactions`** — read-only ledger of every
  money movement from the three modules above, each filtered by what the
  person may see. *Export not built — known.*

### Reports — `/dashboard/reports`
Revenue, profit and trip counts **by departure date**; cash and FET collected
**by payment date**; outstanding as of today. Operations export as CSV /
Excel (needs the Export permission — broker has none by default). Figures
must match the Dashboard for the same period. *"Export PDF" removed; client
lifetime value, funnel, forecast not built — known.*

### System
- **Tasks Board — `/dashboard/tasks-board`** — Kanban (To do, In progress,
  Waiting on client, Waiting on operator, Completed), drag and drop, priority
  (Low → Urgent), links to trips/clients; the **notification bell** in the
  header. *Automatic reminders and browser push not built — known.*
- **Users & Roles — `/dashboard/users-roles`**, invite
  `/dashboard/users-roles/invite`, edit `/dashboard/users-roles/[id]/edit` —
  invite with a **first password** set by the admin (invitee is "Invited"
  until first sign-in, then Active); per-person permission ticks by module and
  action; suspend/activate. There is **no delete** for an account (suspend is
  the way out); a pending invitation can be **withdrawn** (do not, rule 5).
  You cannot edit your own permissions or the owner's. If you test an invite,
  use a new `qa.invitee@example.com` address.
- **Settings — `/dashboard/settings`** — tabs: Company & Branding, CRM &
  Quote Defaults, Security & Session, Notifications & Automation, Data Import
  & Export. Company name and logo appear in the sidebar, tab titles and the
  sign-in page. **Security & Session:** the automatic-logout switch at the
  top; when off, the timeout/warning controls are greyed (50 % opacity, not
  clickable) and nobody is signed out for inactivity (rule 4: restore what
  you change). *Import is hidden and Export "not connected" (next module to
  build); the Integrations tab is hidden; reminders do not fire yet — all
  known.*
- **`/dashboard/no-access`** — shown when someone opens a screen they cannot
  view.

### Referral portal (`agent@example.com`)
- **`/portal`** home, **`/portal/submit`** (submit a referral with optional
  attachments), **`/portal/referrals`** (own referrals and Shared updates
  only), **`/portal/commissions`** (own commissions, no profit figures),
  **`/portal/resources`**.

---

## 6b. Switched off on purpose, or not built yet — do NOT report these

Checked in the code on 12 Oct 2026. Each is deliberate and logged by the
owner; report it only if it behaves *differently* from what is written here.

**Visible but switched off**

| Where | What you will see | Why |
|---|---|---|
| Settings › Data Import & Export | **Export XLSX / Export CSV** buttons show an info toast "Export isn't connected yet — It arrives with the Import & Export API." | Import & Export is the next module to build |
| Settings › Notifications & Automation | Toggles save, and the cards say "Saved now — nothing is sent until the alerts below are built." Nothing is ever sent by them | No scheduler / alert senders yet |
| Leads & Agents › an agent's page › actions menu | **"Log Call Activity"** is greyed out, labelled "With Communications" | Needs a communications log that does not exist |
| Dashboard › **"Ask Anything"** (AI assistant) | A chat popover with suggestions; sending a message shows a **browser alert** "Assistant message sent: …" and nothing answers | AI Assistant (#27) is a stub |
| Users & Roles › permission ticks | Some actions read "Not available for <role>" or a grey ✕ | Locked for that role by design (e.g. a broker can never hold Settings) |
| Document Vault › add document | The folder dropdown is greyed with "Choose a folder first" until you pick client / trip / operator | Depends on the first choice — correct |
| Settings › Security & Session | With automatic logout OFF, the timeout / warning controls are greyed at 50 % | Correct — they apply again when it is switched on |
| "Send Direct Email" (agent page), phone / email links on referrals and empty-leg matches | They open **your computer's own mail or phone app** (`mailto:` / `tel:`), not the CRM | By design — do not actually send from your mail app |

**Hidden or removed (absent from the screen)**

- Settings: the **Import** card (switched off in code, `IMPORT_ENABLED =
  false`), the **Integrations** tab, the Overview tab, backup controls, record
  retention, API & webhooks, WhatsApp / weather / Gmail / flight-API rows,
  "Preview PDF Header".
- Every **PDF** feature: quote, itinerary and invoice PDFs, Reports "Export
  PDF" — there is no PDF generator.
- **Client Portal** (#25) — no screen exists; only the referral-agent portal does.
- Session **location** column on the devices list.
- Clients detail page attachment drop zone (documents go through the Document Vault).

**Not built (no control at all, or "—")**

Automatic reminders and scheduled emails (nothing runs on a timer) ·
live flight tracking (manual only) · weather · emailing a sourcing request to
an operator · operator remittance emails · bulk email campaigns · HTML emails
· quote "Viewed" tracking · deposit column on the sourcing board · aircraft
utilisation · average trip value · revenue per broker/agent · agent
"associated trips" panel · client lifetime value / funnel / forecast in
Reports · export in Transactions and Receivables.

**Known finding, already noted for the owner (no need to report again)**

- Operator detail › **Fleet** tab: the footer pager is static — "← Prev" and
  "Next →" are always disabled and the page "1" button does nothing, whatever
  the fleet size (and it uses a hard-coded colour). It is a leftover, not a
  planned switch-off.

---

## 7. Suggested test plan

1. **Smoke:** as `admin@example.com`, open every sidebar item; note any page
   that errors, shows a placeholder, or a blank cell (rules §5).
2. **End to end (as admin), one `QA` record through the whole flow:**
   client → trip request → operator quote on the sourcing board → quote (send,
   approve) → book trip from the quote → move it through its statuses →
   itinerary → flight status → invoice (send, partial payment, full payment)
   → operator bill and payment → commission → check Transactions, Reports and
   Dashboard reflect it. Email only to `example.com`.
3. **Roles:** repeat key screens as broker and assistant: sidebar contents,
   hidden buttons, own-records-only, no money for the assistant (§4).
4. **Portal:** as the agent, submit a `QA` referral; as admin, see it, add a
   Shared and an Internal note, convert it to a client; back as the agent,
   only the Shared note shows.
5. **Archive / restore** one record in each module; check the Archived tab,
   the Restored badge, and that archived records cannot be picked in forms.
6. **Responsive pass** at 375 / 768 / 1440 px on the main tables and forms.
7. **Clean up:** archive every `QA` record; put back any setting you changed.

---

## 8. How to report

One entry per problem:

```
[Severity: Blocker / Major / Minor / Cosmetic]  Module — screen
Account used: broker@example.com
Steps: 1… 2… 3…
Expected: (cite the rule or section of this file)
Actual: what happened, exact error text, screen width if relevant
```

Group by module, Blockers first. List separately anything you could not test
and why. Do **not** report the items marked *known* above as bugs.
