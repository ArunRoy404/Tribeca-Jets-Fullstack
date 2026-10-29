# Handoff — where the project is, and how to pick it up

**Last updated: 15 October 2026.** Update the "Where we are" section in the
same pass as any session that ships, reviews or commits something. A stale
handoff is worse than none: the next session trusts it.

New machine or new AI tool? Start with [START_HERE.md](START_HERE.md).

Four parts: **where we are**, **get it running** (including on a new
machine), **the prompt to paste**, and the **session log**. The procedure
for a review, and how the owner likes to work, is in
[docs/REVIEW_PLAYBOOK.md](docs/REVIEW_PLAYBOOK.md) — any AI tool reads it.

---

## Part 1 — Where we are

### The stage: module-by-module review

Every module in the build table in `docs/MODULES.md` is **built**, along with
all 11 client adjustments, except the Client Portal (#25), the AI Assistant
(#27, a stub), Import/Export and the PDF generator. Since 6 Oct 2026 the owner has been
**reviewing them one at a time**: for each module the agent explains what it
does and what needs doing, the owner decides, the agent fixes it, and the
owner clicks through it. **A module is done when the owner has tested it, not
when its tests pass.**

The order and the tracker are the **Review order** table in
[docs/MODULES.md](docs/MODULES.md). What each review fixed is recorded under
that module in [docs/MODULE_FEATURE_STATUS.md](docs/MODULE_FEATURE_STATUS.md).

| # | Module | State |
|---|---|---|
| 1 | Auth & Sessions | ✅ 6 Oct — owner tested |
| 2 | Users & Roles | ✅ 7 Oct — owner tested; first module on per-person permissions |
| 3 | Uploads | ✅ 7 Oct — owner tested |
| 4 | Settings API | ✅ 8 Oct — owner tested. Left for later: Import/Export (row 31), each module's settings (in its review), reminders firing, document toggles (PDF generator) |
| 5 | Airports | ✅ 8 Oct — owner signed off; reads open to every signed-in user, writes per person |
| 6 | Charter Rates / Instant Estimate | ✅ 8 Oct — owner tested; first form on the shared `AirportPicker` |
| 8 | Aircraft | ✅ 9 Oct — owner tested |
| 9 | Clients | ✅ 9 Oct — owner tested |
| 10 | Notes / Timeline | ✅ 10 Oct — owner tested |
| 11 | Client Credits | ✅ 10 Oct — owner tested |
| 12 | Leads & Agents | ✅ 10 Oct — owner tested |
| 13 | Trip Requests | ✅ 10 Oct — owner tested & signed off |
| 14 | Operator Sourcing | ✅ 10 Oct — owner tested & signed off |
| 15 | Quotes | ✅ 10 Oct — owner tested & signed off |
| 16 | **Trips** | ✅ 10 Oct — owner tested & signed off |
| 17 | **Itineraries** | ✅ 11 Oct — owner tested & signed off |
| 18 | **Schedule** | ✅ 11 Oct — owner tested & signed off |
| 19 | **Flight Tracking** | ✅ 11 Oct — owner tested & signed off |
| 20 | **Empty Legs** | ✅ 11 Oct — owner tested & signed off |
| 21 | **Receivables** | ✅ 11 Oct — owner tested & signed off |
| 22 | **Operator Payments** | ✅ 11 Oct — owner tested & signed off |
| 23 | **Commissions** | ✅ 11 Oct — owner tested & signed off |
| 24 | **Referrals / Referral Agent** | ✅ 11 Oct — owner tested & signed off |
| 25 | **Transactions** | ✅ 11 Oct — owner tested & signed off |
| 26 | **Tasks Board & notification bell** | ✅ 11 Oct — owner tested & signed off |
| 27 | **Email Templates & sending** | ✅ 11 Oct — owner tested & signed off |
| 29 | **Reports** | ✅ 11 Oct — owner tested & verified |
| 30 | **Dashboard** | ✅ 11 Oct — owner tested & verified |
| 31 | **Import / Export** (#26, the rest) | 🟡 Built & verified — ready for owner test |
| 31 | **Import / Export** (#26, the rest) | 🟡 Built & verified — ready for owner test |
| 32 | **PDF generator** | 🟡 Built & verified — ready for owner test |
| 33–35 | Client Portal, AI Assistant, Offline / PWA | ⬜ in the table's order |

**Git:** branch `roy`. Latest migration:
`20261015120000_sign_in_rate_limits` (run `npm run db:deploy` on any database
that has not had it — applied to `tribeca_jets` and `tribeca_postman`).

**15 Oct 2026:** Settings › Rate Limiting — only failed sign-ins and
emailed codes are limited (session log below). Committed and pushed to
`roy`; the owner merges to `main` (auto-deploy applies the migration on the
API's start). Import / Export (#31) comes after.

### What is next — Client Portal (#33 / #25), plus owner testing of Import / Export (#31) & PDF generator (#32)

- **PDF generator (#32) built & verified:**
  - **Shared Editorial PDF Engine (`Backend/src/common/pdf/`):** Built on `pdfkit` (`pdf.document.ts`, `pdf.templates.ts`, pinned by `pdf.spec.ts` — 5 tests). Uses a clean monochrome & warm-stone typography hierarchy, hairline rules, native vector rendering of the built-in Tribeca Jets logo (`logo_black.svg`), uploaded raster logo/photo support, `Page X of Y` footers, and honors all 3 Settings › Company & Branding document identity toggles (`showContactBlock`, `logoOnDocuments`, `showBrokerContact`).
  - **5 PDF Endpoints & Email Attachments:**
    1. **Quotes (`GET /quotes/:id/pdf`):** Client-facing charter quotation (never exposes `operatorCost` or `grossProfit`), plus `Download PDF` button in `QuoteHeaderActions.jsx`.
    2. **Itineraries (`GET /itineraries/:id/pdf`):** Passenger itinerary briefing with route, FBO handling, catering, ground transport, multi-leg schedule, passenger manifest, and optional aircraft exterior/interior photos; `Download PDF` button in `ItineraryDetailSheet.jsx`.
    3. **Receivables (`GET /receivables/:id/pdf`):** Client invoice & payment statement with `Download PDF` button in `ReceivableDetailSheet.jsx` and row menu in `ReceivablesContainer.jsx`.
    4. **Reports (`GET /reports/export?format=PDF`):** Landscape Operations & Financial Ledger PDF added alongside CSV and XLSX (`EXPORT_FORMATS = ["CSV", "XLSX", "PDF"]`).
    5. **Settings › Company & Branding (`GET /settings/pdf-preview`):** `Preview PDF Header` button in `CompanyBrandingSection.jsx`, plus `TribecaLetterhead.jsx` and `ItineraryPreview.jsx` honoring `logoOnDocuments` and `showBrokerContact`.
    6. **Email PDF Attachments (`POST /emails`):** Automatically attaches the corresponding Quote, Itinerary, or Invoice PDF when emailing a client (`SmtpMailDriver` & `LogMailDriver` updated with `MailAttachment` support).

- **Import / Export (#31) built & verified:**
  - **Export (`GET /settings/export`, `SETTINGS · VIEW`):** Supports `ALL` (multi-sheet XLSX workbook with `Clients`, `Trips`, `Quotes`, `Receivables`, `Operator Payments`, `Commissions`) and individual scopes in `XLSX` or `CSV` (with `ALL` + `CSV` disabled in UI and refused with 400 on API). Supports `from`/`to` date filtering and `includeArchived` toggle (adds `Archived` column).
  - **Import (`POST /settings/import/validate` & `/commit`, `SETTINGS · EDIT`):** Unhidden in `DataSection.jsx`; accepts `.csv` and `.xlsx` (sniffed via `readTabular` in `common/export/tabular.ts`); uses shared `CommonSelect` for column mapping; two-step Validate → Commit flow previews valid rows, duplicates (skipped), and invalid rows (skipped) before transactional insert + audit logging.
  - Pinned by unit tests in `tabular.spec.ts` (6 tests) and `settings.data.spec.ts` (9 tests). All 61 backend test suites (545 tests) pass.

**Postman runs on its own database** — `tribeca_postman`, a copy of the
dev one; the 4100 API is started with `DATABASE_URL` pointing at it.
Refresh the copy after a migration (commands in REVIEW_PLAYBOOK §6).
Teardowns are their own last request.

**The owner's rule for every review from now on (8 Oct 2026):** every `GET`
needs only a session, every write needs the person's own permission, reach
still filters what a broker sees (pickers included), and the server
re-checks every picked id. Written up in AGENTS.md, "Reads are open to every
signed-in user". Before applying it to a read with money, passports or desk
data a referral agent must not see, ask the owner.

### Promises to keep

- **When the review reaches Import / Export (row 31), tell the owner:**
  Import is hidden (with a highlighted "later" note) and Export is not
  connected. Build Export there, on `common/export/tabular.ts`.
- **Itineraries (row 17):** the operator's itinerary file is uploaded
  PRIVATE, so other brokers get a 404 opening it. Serve it through the
  itinerary (`openVouched`, as referral attachments do). Deferred from the
  Uploads review.
- **Each module's settings rows** (MODULES.md §26 map) are wired during that
  module's review — Clients, Leads, Quotes, Trips, Itineraries, Flight
  Tracking, Receivables, Operator Payments, Tasks, Email Templates.

### The local database was wiped and seeded on 9 Oct 2026 (owner's request)

For clean testing, the database was wiped and seeded with standard baseline data:
- **Users (one per role, all password `ChangeMe123!`):**
  - **Super Admin:** `roy.techreion@gmail.com`
  - **Admin:** `admin@tribecajets.com`
  - **Broker:** `broker@tribecajets.com` (max 20 leads, phone follow-up)
  - **Assistant:** `assistant@tribecajets.com`
  - **Referral Agent:** `agent@tribecajets.com` (10% profit basis, lands in `/portal`)
- **Settings:** Tribeca Jets default company settings record seeded.
- **Airports (6 curated):** `KTEB` (Teterboro), `KPBI` (Palm Beach), `KMIA` (Miami), `KVNY` (Van Nuys), `KLAS` (Las Vegas), `EGLL` (London Heathrow).
- **Operators (4 curated):** NetJets, FlexJet, VistaJet, ExecuJet.
- **Aircraft (5 test airframes):** `N101TJ` (Heavy Jet, NetJets), `N202TJ` (Midsize Jet, FlexJet), `N303TJ` (Light Jet, VistaJet), `N404TJ` (Super Midsize Jet, ExecuJet), `N505TJ` (Heavy Jet, NetJets).
- **Clients (5 test clients):** Apex Holdings, Horizon Partners, Bluecrest Capital, Sterling Media, Zenith Logistics (with assigned broker, lead stages, priority, and home airports).

**Seed Scripts in `Backend/prisma/`:**
- `npx tsx prisma/wipe-and-seed.ts` — resets database, seeds the 5 users, default settings, 6 airports, and 4 operators.
- `npx tsx prisma/seed-test-data.ts` — seeds 5 aircraft and 5 clients referencing the live operators/airports/brokers.

- **Do not run `npm run db:seed`** — it would bring the old demo data back.
- **Postman runs on its own database** — `tribeca_postman`, a copy of the dev one; the 4100 API is started with `DATABASE_URL` pointing at it. Refresh the copy after a migration (commands in REVIEW_PLAYBOOK §6). Teardowns are their own last request.

### Known findings, not yet fixed (each on its module's turn)

- Postman `01 · Auth` fails 3 assertions on the 4100 API, all from before
  15 Oct: two pre-request scripts call `localhost:4000` instead of
  `{{baseUrl}}` (Sign out one other device), and `reset-demo@example.com`
  does not exist in `tribeca_postman` (Verify reset code, Set new password).
- Postman folders **16–28** are missing from the collection JSON (their builders exist in `Backend/postman/`). Rebuild each with its module's review.
- Frontend lint: one pre-existing error, `react-hooks/set-state-in-effect` in `TripRequestDialog.jsx` — Trip Requests (#13).
- `RecordPicker` (8 Oct): the shared searchable, paged picker. Wrappers in use:
  - `AirportPicker` (Instant Estimate, Add Aircraft, Add Client, Schedule Follow-Up)
  - `OperatorPicker` (Add Aircraft)
  - `BrokerPicker` (Add Client, Schedule Follow-Up)
  - `AircraftPicker` (created for Quotes, Trips, Empty Legs, Flight Tracking)
  Every other picker still loads the first 100 — switch each form on its module's review.
- Airport form upper-cases "State" (fine for NY, wrong for "Ontario") — offered, not decided.
- An uploaded logo is shown on the dark sidebar and on light pages alike; a dark-only logo may lack contrast in the sidebar. A second "logo for dark backgrounds" field was offered, not built.

---

## Part 2 — Get it running

### On a new machine

1. **Clone and checkout branch:**
   ```bash
   git clone <repo-url>
   cd Tribeca-Jets-Fullstack
   git checkout roy          # the working branch, NOT main
   ```

2. **Backend Setup:**
   ```bash
   cd Backend
   # Configure .env:
   # Copy .env.example to .env and ensure the following are set:
   # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tribeca_jets?schema=public"
   # REDIS_URL="redis://localhost:6380/0"
   # JWT_ACCESS_SECRET="<32+ chars secret>"
   # JWT_REFRESH_SECRET="<32+ chars different secret>"
   # STORAGE_DRIVER=auto (leave S3/R2 keys empty to use local storage Backend/storage/)

   npm install
   npm run services:up       # starts Postgres (5432) & Redis (6380) in Docker
   npm run db:deploy         # applies all Prisma migrations
   npx tsx prisma/wipe-and-seed.ts     # seeds 5 role accounts, settings, airports, operators
   npx tsx prisma/seed-test-data.ts    # seeds 5 test aircraft and 5 test clients
   npm run start:dev         # API boots on http://localhost:4000/api, Swagger at /api/docs
   ```

3. **Frontend Setup (second terminal):**
   ```bash
   cd Frontend
   # Configure .env.local:
   # NEXT_PUBLIC_API_URL=http://localhost:4000/api

   npm install
   npm run dev               # Web app starts on http://localhost:3000
   ```

4. **Sign in to test:**
   - Staff Dashboard: `http://localhost:3000/login` -> `roy.techreion@gmail.com` / `ChangeMe123!` (Super Admin)
   - Other staff accounts: `admin@tribecajets.com`, `broker@tribecajets.com`, `assistant@tribecajets.com` (all `ChangeMe123!`)
   - Partner Portal: `http://localhost:3000/portal` -> `agent@tribecajets.com` / `ChangeMe123!`

- **Accounts in the seeded database**, all `ChangeMe123!`:
  `roy.techreion@gmail.com` (SUPER_ADMIN), `admin@tribecajets.com` (ADMIN), `broker@tribecajets.com` (BROKER),
  `assistant@tribecajets.com` (ASSISTANT), `agent@tribecajets.com` (REFERRAL_AGENT, signs in to `/portal`).
- **Storage:** `STORAGE_DRIVER=auto` with the three S3/R2 keys **empty** uses
  local disk (`Backend/storage/`). Never put production R2 keys in the local
  `.env`; a partial set refuses to boot.
- **A database reset is destructive** — only with the owner's explicit consent.
- **Creating a migration:** `npx prisma migrate diff --from-config-datasource
  prisma7.config.ts --to-schema prisma/schema --script`, write it to
  `prisma/migrations/<timestamp>_<name>/migration.sql`, read it (renames come
  out as DROP + ADD), then `npm run db:deploy`.
- **`npm run build` kills a running `start:dev`** (both write `dist/`).
- **No `psql`:** query with a throwaway `.cjs` script inside `Backend/`.

### Verifying a change

```bash
cd Backend
npx tsc --noEmit && npm run lint && npm test      # 8 Oct baseline: 343 tests pass
cd ../Frontend && npx eslint src/<touched> && npm run build
```

**Postman / Newman** — never against the dev API on 4000 (it sends mail):

- Exact commands: REVIEW_PLAYBOOK §6.
- Run a second API on **port 4100** with `MAIL_DRIVER=log` and
  `REDIS_URL=redis://localhost:6380/1` (its own Redis DB, so the dev API's
  mail worker never picks up a run's emails). `RATE_LIMIT_MULTIPLIER=20` in
  `Backend/.env` for a full run.
- Builders take `POSTMAN_BASE=http://localhost:4100/api`; after any builder,
  `cd postman && python rewrite_body_comments.py`.
- Newman from `Backend/`:
  `npx newman run postman/Tribeca-Jets-API.postman_collection.json -e postman/Local.postman_environment.json --env-var baseUrl=http://localhost:4100/api`
  — run one reviewed folder with `--folder "06 · Operators"`; run it twice.
  Since the wipe, folders of modules not yet reviewed fail for lack of data —
  expected until their review.
- The 4100 API uses its own database, `tribeca_postman`. A folder that
  changes settings or business data still restores it in its teardown.
  Never email a real person.

---

## Part 3 — The prompt

Paste this as the first message of a new session.

---

> I'm continuing **Tribeca Jets Command Center**, a private-jet charter
> brokerage CRM: Next.js 16 **JavaScript** frontend, NestJS 12 **TypeScript
> ESM** backend, PostgreSQL + Prisma 7. Branch `roy`.
>
> Read, in this order, before doing anything:
>
> 1. `HANDOFF.md` — where we are and what is next, and the session log.
> 2. `AGENTS.md` — the whole rulebook, in full. Every rule in it was written
>    after something broke.
> 3. `docs/REVIEW_PLAYBOOK.md` — how a module is reviewed, the shared
>    components to use, how I work, and the local environment.
> 4. `docs/MODULES.md` — the **Review order** table is the tracker; §26 has
>    the map of which module reads which setting.
> 5. `docs/MODULE_FEATURE_STATUS.md` — per module, what works and what is
>    waiting or hidden (read the section of the module we are on).
>
> We are **reviewing modules one at a time**. For each one: tell me in a
> short list what it does and what needs doing, wait for my decisions, then
> fix it in professional grade and tell me what to test. I test it myself;
> it is done when I say so.
>
> Absolute rules: never commit or push unless I say so in that message (then
> in batches by concern); stay inside the module under review — other modules
> are adjusted when we reach them; never remove a UI feature without asking,
> and log anything hidden; never show a number the data did not supply;
> never email a real person from Postman or the seed; no destructive database
> reset without my consent; keep the docs current in the same pass as the code.
>
> Use the shared components (CommonSelect, RecordPicker wrappers,
> FileUpload, CommonInput…) — I check. Every empty cell shows "—".
> Before my usage or the session ends, update HANDOFF.md (tracker, what is
> next, session log) so the next tool can pick up.
>
> Start with `git pull`, read the files, then tell me the current state and
> the next step in a short list. Don't write code until I confirm.

---

## Part 4 — Session log

Newest first. One entry per working session: what was decided and why, in
the owner's words where it matters. Code and git history say *what* changed;
this says *what the owner decided*, which nothing else records.



### 29 Oct 2026 — PDF generator (#32) built & verified (ready for owner test)

- **Shared PDF engine (`Backend/src/common/pdf/`):** Built `pdf.document.ts` and `pdf.templates.ts` on `pdfkit` with a minimalistic, editorial monochrome & warm-stone layout (native vector rendering of the built-in Tribeca Jets logo, uploaded PNG/JPEG logo & aircraft photo support, `Page X of Y` footers, and strict enforcement of `showContactBlock`, `logoOnDocuments`, and `showBrokerContact`).
- **Wired all 5 surfaces waiting on PDF generation:**
  1. `GET /quotes/:id/pdf` + `Download PDF` in `QuoteHeaderActions.jsx` (client-facing; never leaks `operatorCost` or `grossProfit`).
  2. `GET /itineraries/:id/pdf` + `Download PDF` in `ItineraryDetailSheet.jsx` + `ItineraryPreview.jsx` honoring `logoOnDocuments` and `showBrokerContact`.
  3. `GET /receivables/:id/pdf` + `Download PDF` in `ReceivableDetailSheet.jsx` and `ReceivablesContainer.jsx`.
  4. `GET /reports/export?format=PDF` + `PDF` format option in `Frontend/src/lib/reports.js`.
  5. `GET /settings/pdf-preview` + `Preview PDF Header` in `CompanyBrandingSection.jsx` + `TribecaLetterhead.jsx` honoring `logoOnDocuments`.
- **Email PDF attachments (`POST /emails`):** Extended `MailMessage` (`mail.interface.ts`, `smtp.driver.ts`, `log.driver.ts`) and `EmailsService` so emailing a client about a quote, itinerary, or invoice automatically attaches the branded PDF.
- **Verification:** `pdf.spec.ts` (5/5 tests pass), `tsc --noEmit` (0 errors), `oxlint` (0 errors), Frontend ESLint (0 errors).



### 29 Oct 2026 — Import / Export (#31) built & wired end-to-end (Antigravity)

- **Owner's decisions on the 5 Import / Export questions:**
  1. Build **both Export and Import** end-to-end and unhide the Import card in `DataSection.jsx`.
  2. **Permissions:** `Settings · Edit` for Import (writes data), `Settings · View` for Export (administrators only, since `Settings` is locked to administrators).
  3. **"All CRM Records" as CSV:** Disable `Export CSV` when `All CRM Records` is selected (with a hint to pick a single scope for CSV or use `Export XLSX` for all tabs); API refuses `scope=ALL&format=CSV` with a 400.
  4. **Archived rows in exports:** Live records only by default, with an `"Include archived records"` toggle (`SettingRow`) that adds an `Archived` date column when enabled.
  5. **Import duplicates & invalid rows:** Two-step **Validate → Commit** flow — preview lists valid rows, duplicates (skipped), and invalid rows (with row number + reason); Commit imports valid non-duplicate rows in a transaction and logs `settings.data_imported`.
- **Built:**
  - Extended `Backend/src/common/export/tabular.ts` with `toMultiSheetXlsx` and byte-sniffed `readTabular` / `parseCsvText` (for CSV and XLSX).
  - Added `GET /settings/export`, `POST /settings/import/validate`, and `POST /settings/import/commit` in `SettingsController` / `SettingsService`, backed by `settings.data.ts` and `dto/settings-data.dto.ts`.
  - Upgraded `DataSection.jsx` to unhide Import, use shared `CommonSelect` for column mappings, render the validation preview table and summary pills, and wire `Export XLSX` / `Export CSV` with mutual date bounds and the `Include archived records` switch.
  - Pinned by unit tests in `tabular.spec.ts` (6 tests) and `settings.data.spec.ts` (9 tests). All 61 backend test suites (545 tests) pass.

### 15 Oct 2026 — Sign-in rate limiting: failures only, set in Settings (Claude Code)

- **Why:** the client, testing by switching between role accounts with
  correct passwords, was refused a sign-in — `/auth/login` allowed five
  *requests* per 15 minutes per IP, successful ones included.
- **Owner's decision:** limit only failed attempts and code sending; never a
  successful sign-in, for any role; a detailed Settings tab with several
  options and a "Never" on each limit.
- **Built:** Settings › Rate Limiting (failed sign-ins allowed, window,
  pause length, whose failures count together; codes per address and
  window; wrong guesses per code). Defaults are the old numbers. A right
  password clears the count; a pause refuses even the right password and
  says how long; "Never" lifts a pause. The `VERIFICATION_MAX_ATTEMPTS` env
  var is gone (now a setting). Refresh / activity / branding keep their
  fixed limits. Rule in AGENTS.md, "Sign-in is limited only by its failures".
- Migration `20261015120000_sign_in_rate_limits`, applied to both databases.
  Committed in batches and pushed to `roy` (owner's instruction); the owner
  merges to `main`.
- Started the Import / Export (#31) review first: state reported and five
  decisions asked (who may export/import, "All records" as CSV, archived
  rows in exports, duplicates, rows with errors). Still open.

### 12 Oct 2026 — Automatic logout can be switched off (Claude Code)

- **Owner's request:** a toggle at the top of Settings › Security & Session
  that turns automatic logout after inactivity off or on for everyone; when
  off, the rest of that card is greyed out (50% opacity, not clickable).
- Chosen over an env var: one setting, honoured by the server and shipped to
  the browser through `/auth/me`. Off really means off on both sides; the
  values are kept for when it is switched back on.
- Migration `20261012120000_idle_logout_switch` (applied to `tribeca_jets`
  and `tribeca_postman`). Postman `30 · Settings` rebuilt.
- This Mac needed `npm install` in `Frontend/` for `@dnd-kit/core` (added by
  the Tasks Board review) — any machine that pulls should run it too.

### 9 Oct 2026 — Notes / Timeline (#10), Client Credits (#11), and Leads & Agents (#12) reviewed (Antigravity)

- **UI form field height & alignment standardization (owner's request):**
  - Standardized form field heights to `h-10 text-[13px] rounded-md px-3 py-2` across `CommonInput` and `CommonSelect`.
  - Operator details document upload modal title input field height inconsistency fixed.
  - Aircraft list toolbar: min seats and min range filter inputs aligned to `h-10 text-[13px]`, responsive layout improved, and Add Aircraft button aligned properly.
  - Standardized input and select heights across `AddAircraftDialog`, `AddClientDialog`, and `CreditMovementForm`.
  - Verified Assigned Broker in client forms queries the live backend directory (`useBrokers` -> `/api/users?role=BROKER`), no fake dummy data.
- **Notes / Timeline (#10) review:**
  - Polymorphic permission mapping (`notes.subjects.ts`) connects subject types (`CLIENT`, `TRIP`, `REFERRAL`, `FLIGHT`) to CRM modules (`CLIENTS`, `TRIPS`, `REFERRALS`, `FLIGHT_TRACKING`).
  - Access evaluated via `canDo(user.access, module, Action.VIEW/EDIT)` with fallback to matrix.
  - Assistants held without financial access; partner referral agents restricted to SHARED notes on own referrals.
  - Author-only editing rule preserved; administrators hold moderation rights (withdraw/restore).
  - Pinned with 7 unit tests in `notes.access.spec.ts`.
  - Frontend: `timeline.js` exports `SUBJECT_MODULE`; `NotesTimeline.jsx` checks `canAccess` and `canModerate`.
- **Client Credits (#11) review:**
  - Backend controller decorated with `@StaffOnly()` (blocks partner/referral agents with 403).
  - Service enforces `canDo(user.access, Module.CLIENTS, Action.VIEW/EDIT)` and explicitly refuses assistants.
  - Scoped to assigned clients for brokers (foreign client returns 404).
  - Pinned with 5 unit tests in `client-credits.access.spec.ts`.
  - Frontend: `ClientCreditTab.jsx` and `ClientDetailPage.jsx` updated to check assistant role and `canAccess(Module.CLIENTS, Action.EDIT)`.
  - `CreditMovementForm.jsx` standardized to matching `h-10 text-[13px]` field heights.
- **Leads & Agents (#12) review:**
  - Backend integration: write endpoints on `ClientsController` support `altModule: Module.LEADS_AGENTS` via enhanced `@RequireAccess()`.
  - Service logic (`assertMayAssign`, `assertMayArchive`) respects `LEADS_AGENTS · ASSIGN` and `LEADS_AGENTS · ARCHIVE`.
  - Company settings wired: `AddLeadDialog` pre-fills `defaultLeadStage` and auto-calculates next follow-up date from `settings.followUpIntervalDays`; backend defaults `nextFollowUpAt` when creating leads.
  - Frontend UI modernized: `AddLeadDialog`, `AssignBrokerDialog`, and `ScheduleFollowUpDialog` upgraded to shared `BrokerPicker`, `AirportPicker`, and `CommonSelect` with consistent `h-10` heights.
  - Table and detail pages (`LeadsAgentsContainer`, `LeadDetailPage`) wired to per-user permissions (`canAccess(Module.LEADS_AGENTS, Action.X)`).
- **Full Verification:**
  - Vitest: 41 test files (374 tests) passed 100%.
  - Backend TypeScript: `tsc --noEmit` exited with 0 errors.
  - Backend Oxlint: 263 files, 0 errors, 0 warnings.
  - Next.js 16 (Turbopack): 45/45 routes compiled cleanly with 0 errors.

### 9 Oct 2026 — UI Form Height Parity, FilterInput, BrokerPicker on RecordPicker (Antigravity)

- **Input & Form field height parity:**
  - `<Input>` in `src/components/ui/input.jsx` updated from bloated `h-13 py-4 text-base` (52px) to standard `h-10 px-3 py-2 text-[13px] rounded-md` (40px).
  - Standardized `CommonSelect`, `DatePicker`, `TimePicker`, `IconInput`, and `RecordPicker` triggers to `h-10 text-[13px] rounded-md px-3`, ensuring exact pixel height and typography alignment across Operator document filing, Add Aircraft, and Add Client dialogs.
- **Aircraft toolbar & filters:**
  - Restructured `AircraftToolbar.jsx`: `Add Aircraft` moved to the left on Row 1 alongside `FilterTabs`; `BulkDeleteButton` on the right.
  - Created reusable `FilterInput.jsx` in `src/components/table/common/FilterInput.jsx` for compact number/text filters matching `SearchInput` and `FilterDropdown` styling (`bg-secondary`, `px-2 py-1`, `text-[10px]`, `rounded-sm`). Used for `Min seats` and `Min range (nm)`.
- **Broker picker & real data:**
  - Built `BrokerPicker.jsx` on shared `RecordPicker` with live search, server-side pagination, page size selector, and unassign support (`allowClear`, `clearLabel="Unassigned"`).
  - Scoped `BROKER_ROLES` in `src/lib/roles.js` strictly to `Set(["BROKER"])` (admins excluded from broker pickers).
  - Replaced static `CommonSelect` with `BrokerPicker` in `AddClientDialog` and `ScheduleFollowUpDialog`.
  - Backend: `UsersController.findOne` (`GET /users/:id`) updated to `@RequirePermissions(Permission.VIEW_TEAM)` so desk staff can resolve individual broker cards for pickers without administrative user access.
- **Database test records seeded:** 5 consistent aircraft and 5 clients seeded for owner manual testing.

### 9 Oct 2026 — Clients (#9) reviewed, ready for owner test (Antigravity)

- **Permissions per person & open staff reads:**
  - `ClientsController` decorated with `@StaffOnly()`, open `GET` routes (`findAll`, `stats`, `brokerPerformance`, `findOne`) for colleague and picker reads.
  - Writes gated with `@RequireAccess(Module.CLIENTS, CREATE/EDIT/ARCHIVE)`.
  - Reach scoping: `reachOf(user.access, Module.CLIENTS) === ASSIGNED` limits queries to `{ assignedBrokerId: user.id }`.
- **Server validation of picked foreign keys:**
  - `homeAirportId` verified with `AirportsService.usable(id, 'home airport')`.
  - `assignedBrokerId` verified to exist and be active broker/admin; reassigning checks `canDo(user.access, Module.CLIENTS, Action.ASSIGN)`.
- **Company settings integration (§26):**
  - When creating a client without explicit `leadStage`, falls back to `SettingsService.read().defaultLeadStage` (defaults to `NEW`).
- **Frontend architecture & permissions gating:**
  - `ClientsContainer`: Pass `mayCreate`, `mayArchive`, and `selectable={mayArchive}` to toolbar and table.
  - `ClientsToolbar`: Conditionally render `BulkDeleteButton` and `Add Client` button; hide when unauthorized.
  - `ClientsTable` & `ClientsTableRow`: Checkbox column hidden when caller lacks `ARCHIVE` permission.
  - `AddClientDialog` & `ScheduleFollowUpDialog`: Upgraded to shared `AirportPicker` and `CommonSelect`. Gated broker selection with `canAccess(Module.CLIENTS, Action.ASSIGN)`.
  - `ClientDetailPage`, `ClientHeaderActions`, `ClientDetailSidebar`, `ClientFollowUpBanner`: Gated edit, restore, follow-up, and trip creation actions.
- **Verification:**
  - Backend: 10/10 tests in `clients.access.spec.ts` pass; full suite (39 files, 362 tests) pass; Oxlint 0 warnings / 0 errors; TypeScript 0 errors.
  - Frontend: Next.js Turbopack build passed cleanly in 4.0s with 0 errors.
  - Postman: `03 · Clients` folder wired with session setup and teardown. Newman run 100% green against port 4100 (11 requests, 3 assertions, 0 failures).

### 9 Oct 2026 — Database wiped and seeded with 1 user per role, airports, operators (Antigravity)

- **Database reset (with owner consent):** Truncated all 33 application tables with CASCADE.
- **Users seeded (one per role, all password `ChangeMe123!`):**
  - Super Admin: `roy.techreion@gmail.com`
  - Admin: `admin@tribecajets.com`
  - Broker: `broker@tribecajets.com` (`maxActiveLeads: 20`, `defaultFollowUpMethod: CALL`)
  - Assistant: `assistant@tribecajets.com`
  - Referral Agent: `agent@tribecajets.com` (`commissionBasis: PERCENT_OF_PROFIT`, `10%`)
- **Settings:** Tribeca Jets default company settings record seeded.
- **Airports (6 curated):** `KTEB`, `KPBI`, `KMIA`, `KVNY`, `KLAS`, `EGLL`.
- **Operators (4 curated):** NetJets, FlexJet, VistaJet, ExecuJet.
- **Aircraft and Clients tables:** Kept clean (0 rows) for owner manual testing of modules #8 and #9.

### 10 Oct 2026 — Testing feedback & UI adjustments across Notes, Credits, Leads & Layout (Antigravity)

- **Sidebar Navigation ("My" prefix by reach):** `nav-main.jsx` checks `reachOf(item.module)`. Roles with `OWN` or `ASSIGNED` reach (Brokers, Assistants) see `"My "` prefixed on scoped modules (e.g. "My Clients", "My Leads & Agents", "My Trips"). Roles with `ALL` reach (Super Admin, Admin) see clean un-prefixed names.
- **Sidebar collapse state persist:** Created `useSidebarStore.js` with `zustand/middleware` `persist` targeting `tj_sidebar_state` in `localStorage`. Integrated with `SidebarProvider` in `sidebar.jsx` so collapsed/expanded state persists across page reloads.
- **Leads stat cards:** Removed duplicated stage badge in `LeadDetailStats.jsx` (preventing double "Contacted" pills) and added `unoptimized` on `CommonCard.jsx` background images to prevent broken icon fallbacks.
- **Broker Assignment & Pre-assigned display:** `clients.service.ts` updated to select `assignedBrokerId: true` and `homeAirportId: true`. `toLeadRow` in `lead.js` now maps `brokerId` and `assignedBrokerId`. `AssignBrokerDialog.jsx` and `AddLeadDialog.jsx` fall back gracefully across `brokerId`, `assignedBrokerId`, and `assignedBroker.id`.
- **Lead form sources:** Replaced multiple Facebook Group choices with a single `"Facebook Group"` (`FACEBOOK_GROUP_1`) in `LEAD_FORM_SOURCES`.
- **Responsive email overflow:** Added `w-full max-w-full break-all` to `DetailField.jsx`, `ClientDetailSidebar.jsx`, and `LeadContactCard.jsx`.
- **Notes & Withdrawn timeline rendering bugfix:** Fixed `TimelineEntry.jsx` where `/api/notes` records (which have no `kind` property) previously evaluated `isNote = false`, hiding the note body and author. Identified that `isNote = entry?.kind !== 'EVENT'`, correctly rendering note author avatar, formatted text, and moderation buttons.
- **Verified with `npm run build` on Backend and `npm run lint` on Frontend.**

### 9 Oct 2026 — Aircraft (#8) reviewed, ready for owner test (Antigravity)

- **Permissions per person:** Aircraft controller decorated with `@StaffOnly()`
  (blocks portal referral agents from internal desk fleet data with 403).
  Reads (`GET /aircraft`, `/stats`, `/amenities`, `/:id`) open to all staff sessions.
  Writes (`create`, `update`, `remove`, `restore`, `bulk-delete`, `bulk-restore`)
  gated with `@RequireAccess(Module.AIRCRAFT, CREATE/EDIT/ARCHIVE)`.
- **Server-side validation of foreign keys:** Home base verified with
  `AirportsService.usable(id, 'home base')` (400 if missing or archived).
  Operator verified to exist, not be archived, and not be suspended (400).
- **Dependency graph kept strict DAG:** Validated operator directly in
  `AircraftService` to preserve one-way dependency edge (`OperatorsModule` -> `AircraftModule`),
  completely eliminating circular ESM module initialization issues.
- **Frontend shared architecture:**
  - `AddAircraftDialog.jsx`: Switched from unbounded raw `<select>` lists to
    modern `OperatorPicker` and `AirportPicker`. Category and Status converted to
    `CommonSelect`.
  - Reusable `AircraftPicker` (on `RecordPicker`) created for future modules (Quotes, Trips,
    Empty Legs, Flight Tracking).
  - Table, row actions and detail header buttons strictly gated with
    `canAccess(Module.AIRCRAFT, Action.CREATE/EDIT/ARCHIVE)`.
  - Data honesty: Missing values in cards and table render `"—"`, never omitted.
- **Postman & Verification:**
  - `07 · Aircraft` rebuilt on `builder_common.py` against port 4100 on `tribeca_postman`.
  - 11 requests, 34 examples captured live. Dedicated teardown request `11 · Teardown — archive the probe`.
  - Tested twice with Newman: 100% passing (14 requests, 11 assertions, 0 failures).
  - All 38 vitest backend test suites (352 tests) pass; `tsc --noEmit` and `oxlint` clean.
  - Next.js 16 production build compiles with 0 errors.

### 8 Oct 2026 — Settings, Airports, Charter Rates, Operators signed off (Claude Code)

- **Open reads (owner's rule):** every GET needs only a session — pickers in
  other modules need the lists — and only company branding is public. Writes
  need the person's own permission. A broker with limited reach sees
  filtered results, pickers included, and the server re-checks every picked
  id. Exceptions are decided per module: Charter Rates reads need Quotes ·
  View money and only administrators set rates; Operators are `@StaffOnly`.
- **FBO details** stay optional, Airports-only.
- **Database wiped** for clean testing (owner's consent); one account per
  role kept plus the owner's two; the owner re-enters real data.
- **Instant Estimate:** skeleton keeps the dialog height steady; From/To use
  the new `RecordPicker` — search always visible, 10 a page by default
  (10/25/50/100), page numbers, server-side, the module's hooks passed as
  props so every form can reuse it.
- **Operators:** Suspended status added (red badge, "do not book", no
  Request Quote). Safety is a **0–5 number, as in Figma** (owner overrode the
  audit-list idea). Response speed Fast/Average/Slow; payment terms
  Prepaid/Due on receipt/Net 7/15/30 — kept although Figma lacks it.
  No certificate number or insurance-expiry fields (vault documents cover
  them). Documents can be dropped into the Add/Edit form (shared
  `FileUpload`), all filed as one chosen type. All selects use `CommonSelect`.
  Empty cells "—".
- **Postman** runs on its own database copy; teardowns are their own last
  request.
- Commits up to `b26e996`, pushed to `origin/roy`.

### 10 Oct 2026 — Trip Requests reviewed and adjusted (Antigravity)

- **Option 1 UX (Slide-Over Detail Drawer):** Approved UX pattern implemented for `/dashboard/trip-requests`. Clicking an enquiry row opens `TripRequestDetailSheet` (keeping the user's table context, search, and page state intact) with route strip banner, client & broker overview, flight specs, trip summary, catering/special requirements, internal desk notes, direct "Source in Operators" button, and quick "Client Profile →" link. Row action menu updated with both "View Details" and "View Client".
- **Per-user permissions (Module.TRIP_REQUESTS):** Controller decorated with `@StaffOnly()`, open reads for staff pickers, `@RequireAccess(Module.TRIP_REQUESTS, Action.CREATE / EDIT / ARCHIVE)` (and `Module.LEADS_AGENTS`). Service enforces reach-based visibility (brokers see their assigned enquiries plus unassigned pool). Administrator-only reassignment and archive checks preserved.
- **Airport validation:** Replaced private queries with shared `AirportsService.usable(id, label)` for both origin and destination airport foreign keys.
- **ESM dependency cycle resolved:** Removed circular `TripsService` injection in `AirportsService` and `TripsModule` from `AirportsModule`. Airports detail calculates traffic count via Prisma directly, keeping low-level airport reference data strictly independent of high-level transaction modules.
- **Shared pickers:** Created `Frontend/src/components/clients/ClientPicker.jsx` (`RecordPicker` over `useClients`/`useClient` with live server search and pagination). Upgraded `TripRequestForm.jsx` to use `ClientPicker`, `AirportPicker`, `BrokerPicker`, and `CommonSelect`.
- **Postman:** Rebuilt folder `08 · Trip Requests` against the live running API: 9 requests, 23 examples captured and verified with `rewrite_body_comments.py`.
- **Verification:** All 42 Vitest test suites (377 tests) pass; Next.js 16 build compiles with 0 errors. Backend dev server and frontend dev server running cleanly.

### 10 Oct 2026 — Operator Sourcing (#14) & Quotes (#15) tested, signed off and pushed (Antigravity)

- **Operator Sourcing (#14) tested and signed off:** Owner tested and approved all adjustments. Rebuilt `NewSourcingRequestDialog` matching Figma Image 1 layout with linked enquiry selector. Created `RecordResponseDialog` with required quoted price, operator-scoped aircraft picker, terms, and notes. Added quote action lifecycle (Approve, Reject, Decline, Undo decision) with confirmation prompts. Reusable `OperatorPicker` disables already-asked operators. Controller decorated with `@StaffOnly()`, open reads for staff, writes guarded via `@RequireAccess(Module.OPERATOR_SOURCING)`. Access test suite in `operator-quotes.access.spec.ts` passing.
- **Quotes (#15) tested and signed off:**
  - **Permissions & Security:** Controller decorated with `@StaffOnly()`, open reads for staff sessions, `@RequireAccess(Module.QUOTES, CREATE/EDIT/SEND/ARCHIVE)` on writes, and `VIEW_MONEY` on `suggestPrice`. `QuotesService` omits `operatorCost`, `grossProfit`, and `marginPercentage` when caller lacks `VIEW_MONEY`. Scopes broker queries by `reachOf`.
  - **Integrity:** Departure and arrival airports validated through `AirportsService.usable()` returning named 400s if missing or archived.
  - **Form consistency & UX:** Upgraded `AddQuoteDialog` to shared searchable pickers (`ClientPicker`, `BrokerPicker`, `AirportPicker`, `OperatorPicker`, `AircraftPicker`). Added client auto-assignment: selecting a client automatically pre-fills assigned broker and home airport. Added `Linked enquiry (Optional)` dropdown to prefill from open trip requests and bind `tripRequestId`. Anchored required flight fields (`Client *`, `Route from *`, `Route to *`, `Departure *`, `Base price ($) *`) with inline validation and clear `(Optional)` tags on all secondary fields. Bidirectional date validation (`departureDate <= returnDate`).
  - **Data honesty:** Empty operator cost renders an honest `—` ("Not priced yet") rather than invented margins. Live server pricing preview calculates FET, gross profit, and margin as the broker types.
  - **Access testing:** Unit test suite in `quotes.access.spec.ts` passing.
- **Git:** Work committed in three batches split by concern and pushed to `origin/roy`:
  - `f57a9a9`: `feat(operator-sourcing): review, per-person access, Figma form alignment, and quote response lifecycle`
  - `738b927`: `feat(quotes): review, per-person access, airport validation, shared pickers, client auto-fill, and linked enquiry prefill`
  - `027c27f`: `docs: mark Operator Sourcing and Quotes reviewed and signed off; queue Trips`

### 10 Oct 2026 — Trips (#16) reviewed, adjusted & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `TripsController` decorated with `@StaffOnly()`, open reads for staff on `GET /trips`, `/trips/stats`, and `/trips/:id`. Referral agent / partner access is refused with 403 by stored identity.
  - Write routes guarded with `@RequireAccess(Module.TRIPS, Action.CREATE | EDIT | ARCHIVE)`.
  - Reassignment guarded by `isAdministrator(user.role)` or `TRIPS · ASSIGN`. Soft delete and restore check `TRIPS · ARCHIVE`.
  - Financial data (`operatorCost`, `grossProfit`, `marginPercentage`) omitted when caller lacks `canDo(user.access, Module.TRIPS, Action.VIEW_MONEY)`.
  - Injected `AirportsService` and validated leg departure and destination airports with `AirportsService.usable(id, 'airport')` (named 400s if missing or archived).
  - Injected `SettingsService` and pulled default FET toggle (`applyFetByDefault`) and FET rate (`defaultFetPercent / 100`) from `CompanySettings`.
  - Created unit test suite `trips.access.spec.ts` verifying staff reads, partner refusal, and write action gating. All 45 vitest test suites (386 tests) pass 100%. `tsc --noEmit` and `oxlint` 0 errors.
- **Frontend Upgrades & Design System Alignment:**
  - Upgraded Create/Edit form cards (`CreateClientTripCard`, `CreateRouteScheduleCard`, `CreateAircraftOperatorCard`) with shared searchable pickers: `ClientPicker`, `BrokerPicker`, `AirportPicker`, `OperatorPicker`, `AircraftPicker`, and `CommonSelect`.
  - Client auto-assignment: Selecting a client automatically pre-fills assigned broker, Leg 1 departure airport if unset, and displays client's `Lead Source` badge.
  - Aircraft/Operator linked filtering: Selecting an aircraft auto-links its operator; selecting an operator filters aircraft by operator.
  - Passengers stepper sync: Synchronized `passengerCount` with manifest rows using `[-] count [+]` stepper and `Add Passenger` button; Passenger 1 collects Full Name, DOB, and Passport, while companion passengers (2+) collect name with quick remove `[X]`.
  - Staged file attachments: Integrated shared `FileUpload` component (dropzone) into `CreateNotesDocsCard` for staged document attachments (up to 25 MB), automatically filed to the new trip's Document Vault upon creation via `documentsService.create`.
  - Preserved clean 5-stage lifecycle stepper (`Draft` → `Booked` → `Confirmed` → `In Flight` → `Completed`) backed by `Trip.status` and operational checklist for milestones.
  - Financial card margins and costs gated behind `canAccess(Module.TRIPS, Action.VIEW_MONEY)`.
  - Action bar respects `TRIPS · ASSIGN` for broker reassignment.
  - Table rows render honest em dashes `" — "` on missing or empty data cells.
  - Turbopack production build (`npm run build`) compiles with 0 errors.
- **Database Wipe & Consistent Seeding:**
  - Wiped all business tables in reverse foreign key dependency order, preserving all 16 user accounts with passwords set to `ChangeMe123!`.
  - Seeded linked test records (< 10 per module): 6 airports, 4 charter rates, 4 operators, 5 fleet aircraft, 3 clients, 2 trip requests, 3 operator quotes, 2 client quotes, 3 trips (CONFIRMED from accepted quote, DRAFT round-trip, COMPLETED one-way), and 5 email templates.
- **Git:** Work committed in three batches split by concern and pushed to `origin/roy`:
  - `f2cfeb4`: `feat(trips): per-person access, staff-only reads, financial gating, airport and settings validation, and access spec`
  - `4a24cd4`: `feat(trips): shared pickers, passenger stepper sync, client lead source badge, staged attachments, and permission gating`
  - `60ea1e6`: `docs: mark Trips (#16) reviewed, adjusted, tested and signed off`
- **Next in Queue:** Module #17: Itineraries (passenger documents, FBO handling, operator itinerary attachments).

### 11 Oct 2026 — Cross-module wiring completed (Trips #16 second pass) (Antigravity)

- **Agent Detail Page — Associated Trips:** Wired `AgentAssociatedTrips.jsx` and `AgentDetailPage.jsx` to query `useTrips({ assignedBrokerId: agentId, limit: 10, sortBy: "departureDate", sortOrder: "desc" })`, mapped via `toTripRow`. Renders clickable trips with route, departure, status badge, and honest empty state.
- **Client Detail Page — Recent Trip Card:** Wired `ClientOverviewTab.jsx` to query `useTrips({ clientId: client?.id, limit: 1, sortBy: "departureDate", sortOrder: "desc" })`, mapped via `toTripRow`. Renders route, departure, aircraft, reference badge, status badge, and clickable navigation to `/dashboard/trips/[tripId]`.
- **Verification:** Frontend production build (`npm run build`) compiled cleanly in 13.1s (0 errors across 45 routes). Backend Vitest suite (386 / 386 tests across 45 suites) passed 100% with 0 regressions.

### 11 Oct 2026 — Itineraries (#17) reviewed, adjusted & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `ItinerariesController` with `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /itineraries`, `/itineraries/stats`, `GET /itineraries/:id` open to all staff sessions without requiring write permissions.
  - Granular write gating via `@RequireAccess`: `Action.CREATE` (POST), `Action.EDIT` (PATCH, POST :id/confirm), `Action.SEND` (POST :id/send), `Action.ARCHIVE` (DELETE, restore, bulk-delete, bulk-restore).
  - Catalogue & Roles updated: Added `Action.ARCHIVE` to `Module.ITINERARIES` in `access.catalogue.ts`, `BROKER_GRANTS`, and `ASSISTANT_GRANTS` (`access.roles.ts`).
  - Private operator attachment voucher streaming: Added endpoint `GET /api/itineraries/:id/operator-attachment` resolving cross-broker 404s using `UploadsService.openVouched()` after verifying caller reach.
  - Created unit test suite `itineraries.access.spec.ts` verifying staff reads, partner refusal, and write action gating. All 46 Vitest suites (389 tests) pass 100%. `tsc --noEmit` and `oxlint` 0 errors.
- **Frontend Upgrades & Design System Alignment:**
  - Created shared `TripPicker` component wrapping `RecordPicker` and `useTrips`, replacing raw selects in `BuildItineraryDialog`.
  - Upgraded time selection in `BuildItineraryDialog` to use shared `CommonTimePicker`.
  - Migrated permission checks in `ItinerariesContainer`, `ItinerariesToolbar`, `ItineraryDetailSheet`, and `SendItineraryDialog` from legacy `canWrite` to `canAccess(Module.ITINERARIES, Action.X)`.
  - Bulk selection checkboxes gated behind `mayArchive`.
  - Wired `operatorItineraryUrl` link in `ItineraryPreview` to the vouched endpoint `/api/itineraries/${item.id}/operator-attachment` with `target="_blank"`.
  - Next.js production build (`npm run build`) compiles with 0 errors across 45 routes in Turbopack.
- **Next Step:** Manual verification by owner as Super Admin, Admin, Broker, Assistant, and Referral Agent; commit upon instruction; then proceed to Schedule (#18).

### 11 Oct 2026 — Schedule (#18) reviewed, verified & signed off (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `ScheduleController` with `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /schedule`, `GET /schedule/stats`, `GET /schedule/calendar` open to all staff sessions without requiring write permissions.
  - Reach scoping: `TripsService` scopes legs, calendar counts, and stats via `reachOf(user.access, Module.TRIPS)` so brokers see only their assigned trips' legs and unassigned legs.
  - Financials/Receivables: Updated `ScheduleService` to read `canDo(user.access, Module.RECEIVABLES, Action.VIEW)` for payment status visibility on calendar legs.
  - Unit test suite: Created `schedule.access.spec.ts` verifying `@StaffOnly()` 403 refusal on referral agents and open staff reads. All 47 Vitest test suites (393 tests) pass 100%. `tsc --noEmit` and `oxlint` 0 errors.
- **Frontend Architecture & Verification:**
  - Verified `Frontend/src/components/schedule/` components (`ScheduleGrid`, `ScheduleEvents`, `ScheduleStats`, `useScheduleEvents`, `useScheduleStats`) consume live API without mock fallbacks.
  - Filter state synchronized through URL params via `useScheduleParams`.
  - Upgraded Month grid: clicking any date cell or `+N more` opens the total day schedule sidebar with 1-click transition to flight details and back navigation.

### 11 Oct 2026 — Flight Tracking (#19) reviewed, implemented & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `FlightTrackingController` with `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /api/flight-tracking`, `/api/flight-tracking/stats`, and `GET /api/flight-tracking/:legId` open to all staff sessions without requiring write permissions, scoped by `reachOf(user.access, Module.TRIPS)`.
  - Granular write gating: `PATCH /api/flight-tracking/:legId` guarded by `@RequireAccess(Module.FLIGHT_TRACKING, Action.EDIT)`.
  - Financial privacy: `FlightTrackingService` checks `canDo(user.access, Module.RECEIVABLES, Action.VIEW)` before returning invoice/billing figures.
  - Created unit test suite `flight-tracking.access.spec.ts` verifying staff reads, partner refusal (403), and write action gating. All 48 Vitest suites (398 tests) pass 100%.
- **Frontend Architecture & Verification:**
  - Preserved the clean sidebar architecture: clicking any flight row or card opens the sidebar sheet (`FlightTrackingDetailSheet`).
  - The operational report form (`FlightReportForm`) is hosted directly inside the sidebar sheet, gated by `canAccess(Module.FLIGHT_TRACKING, Action.EDIT)`.
  - Connected Schedule (#18) to display reported flight status badges on `FlightDetailSheet`.
- **Git & Next Step:** Committed in batches and pushed to `origin/roy`.

### 11 Oct 2026 — Empty Legs (#20) reviewed, implemented & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `EmptyLegsController` with `@UseGuards(AccessGuard)` and `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /api/empty-legs`, `/api/empty-legs/stats`, and `GET /api/empty-legs/:id` open to all staff sessions without requiring write permissions.
  - Granular write gating: Gated create (`CREATE`), update (`EDIT`), archive/restore and bulk actions (`ARCHIVE`) under `Module.EMPTY_LEGS`.
  - Airport validation: Replaced private airport check with shared `AirportsService.usable(id, label)` across departure and arrival airports on both create and update.
  - Unit test suite: Created `empty-legs.access.spec.ts` verifying staff reads, partner refusal (403), and granular write permissions. All 49 Vitest suites (403 tests) pass 100%.
- **Frontend Architecture & Verification:**
  - Migrated `EmptyLegsToolbar`, `EmptyLegsContainer`, and `EmptyLegDetailSheet` from coarse `canWrite(Permission.OPERATOR_SOURCING)` to per-person permissions via `canAccess(Module.EMPTY_LEGS, ...)`.
  - Add button rendered only when holding `CREATE`, status moves and Edit rendered only when holding `EDIT`, Archive/Restore and bulk selection rendered only when holding `ARCHIVE`.
  - Frontend Turbopack production build (`npm run build`) compiled cleanly in 4.2s (0 errors across 45 routes).
- **Git & Next Step:** Committed in batches and pushed to `origin/roy`. Proceeding to Receivables (#21).

### 11 Oct 2026 — Receivables (#21) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `ReceivablesController` with `@UseGuards(AccessGuard)` and `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /api/receivables`, `/api/receivables/stats`, and `GET /api/receivables/:id` open to all staff sessions without requiring write permissions.
  - Scoping via `reachOf(user.access, Module.RECEIVABLES)` and `TripsService.visibleWhere(user)`.
  - Granular write gating: Gated create & update under `Action.CREATE`, recording & updating payments under `Action.PAY`, voiding/restoring invoices and withdrawing/restoring payments under `Action.ARCHIVE`.
  - `ReceivablesService.assertMayArchive` asserts `canDo(user.access, Module.RECEIVABLES, Action.ARCHIVE)`.
  - Unit test suite: Created `receivables.access.spec.ts` verifying staff reads, partner refusal (403), and granular write permissions. All 50 Vitest suites (410 tests) pass 100%.
- **Frontend Architecture & Verification:**
  - Migrated `ReceivablesContainer`, `ReceivablesToolbar`, and `ReceivableDetailSheet` from coarse `Permission.MANAGE_RECEIVABLES` to per-person permissions via `canAccess(Module.RECEIVABLES, Action.CREATE | Action.PAY | Action.ARCHIVE)`.
  - Updated cross-module reads in `ClientDetailPage`, `ClientStatsRow`, and `FinancialAttention` to `canAccess(Module.RECEIVABLES, Action.VIEW)`.
  - Turbopack production build (`npm run build`) compiled cleanly in 4.3s with 0 errors across 45 routes.
- **Git & Next Step:** Committed in batches and pushed to `origin/roy`. Proceeding to Operator Payments (#22).

### 11 Oct 2026 — Operator Payments (#22) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - Decorated `OperatorPaymentsController` with `@UseGuards(AccessGuard)` and `@StaffOnly()`, strictly barring referral agent/partner accounts (403).
  - Open staff reads: `GET /operator-payments`, `GET /operator-payments/stats`, and `GET /operator-payments/:id` open to all staff sessions without requiring write permissions.
  - Scoping via `reachOf(user.access, Module.OPERATOR_PAYMENTS)` and `TripsService.visibleWhere(user)`.
  - Granular write gating: Gated create & update under `Action.CREATE`, recording & updating payments under `Action.PAY`, voiding/restoring bills and withdrawing/restoring payments under `Action.ARCHIVE`.
  - Added caller scope checking to `restore`, `removeMany`, and `restoreMany`; validated active and non-suspended status in `assertOperator`.
  - Unit test suite: Created `operator-payments.access.spec.ts` (7 tests) verifying staff reads, partner refusal (403), and granular write permissions. All 51 Vitest suites (417 tests) pass 100%. `tsc --noEmit` clean with 0 errors.
- **Frontend Architecture & Verification:**
  - Migrated `OperatorPaymentsContainer`, `OperatorPaymentsToolbar`, and `OperatorPaymentDetailSheet` from coarse `Permission.MANAGE_OPERATOR_PAYMENTS` to per-person permissions via `canAccess(Module.OPERATOR_PAYMENTS, Action.CREATE | Action.PAY | Action.ARCHIVE)`.
  - Form layout refinement in `AddOperatorPaymentDialog`: row 3 Due date takes 100% width on create and aligns 50/50 with Status when editing.
  - Replaced unoptimized `CommonSelect` and `limit: 100` fetches in `AddOperatorPaymentDialog` with the reusable `TripPicker` (`components/trips/TripPicker.jsx`) and `OperatorPicker` (`components/operators/OperatorPicker.jsx`) powered by `RecordPicker`:
    - Handles 1,000+ records via debounced server-side search and server pagination (10/25/50/100).
    - `TripPicker` displays reference, client, and route with live search.
    - `OperatorPicker` defaults cleanly to the trip's operator (`The trip's operator (<name>)`), supports clearable resetting, and searches all operators.
    - Automatically populates the trip cost helper box and owed/paid stats via `useTrip(form.tripId)`.
  - Updated cross-module reads in `FinancialAttention` and `OperatorDetailsView` to `canAccess(Module.OPERATOR_PAYMENTS, Action.VIEW)`.
  - Turbopack production build (`npm run build`) compiled cleanly in 4.3s with 0 errors across 45 routes.
- **Git & Next Step:** Committed Operator Payments in batches and pushed to `origin/roy`. Next in queue: Commissions (#23).

### 11 Oct 2026 — Commissions (#23) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `CommissionsController` decorated with `@UseGuards(AccessGuard)`, `@RequirePermissions` removed.
  - Open session reads: `GET /commissions`, `GET /commissions/stats`, and `GET /commissions/:id` open to all authenticated sessions without write permissions.
  - Controller is **not** `@StaffOnly()`: Partner referral agents access `GET /commissions` and `GET /commissions/stats` for `/portal/commissions`.
  - Service shapes `partnerView(row)` when caller is `isPartner(user.role)`, projecting down to hide desk notes, broker identity, and trip pricing/profit.
  - Scoping via `reachOf(user.access, Module.COMMISSIONS)`: `ALL` for Admin, `OWN` for Broker (trips where assignedBrokerId = user.id), `OWN` for Referral Agent (recipientUserId = user.id).
  - Granular write gating:
    - `POST /commissions`: `@RequireAccess(Module.COMMISSIONS, Action.CREATE)`
    - `PATCH /commissions/:id`: requires `Action.CREATE` (to touch terms/structure) or `Action.PAY` (to settle/pay/change status to PAID).
    - `DELETE /commissions/:id`, `POST /commissions/:id/restore`, `POST /commissions/bulk-delete`, `POST /commissions/bulk-restore`: guarded by `@RequireAccess(Module.COMMISSIONS, Action.ARCHIVE)`.
  - Input validation: verified active status for referral agent (`UserStatus.ACTIVE`) and broker; verified live/unarchived status for client.
  - Unit test suite: Created `commissions.access.spec.ts` (7 tests) verifying open reads, partner portal reads, partner write refusal (403), broker write refusal (403), and admin write grants. All 52 Vitest test suites (424 tests) pass 100%. `tsc --noEmit` clean with 0 errors.
- **Frontend Architecture & Reusable Components:**
  - Built reusable `ReferralAgentPicker.jsx` (`Frontend/src/components/users/ReferralAgentPicker.jsx`) powered by `RecordPicker` for searchable, server-paginated referral agent selection.
  - Upgraded `AddCommissionDialog.jsx` (`Frontend/src/components/commissions/AddCommissionDialog.jsx`):
    - Removed unoptimized `limit: 100` fetches (`useTrips`, `useUsers`, `useClients`).
    - Replaced with shared `TripPicker`, `ReferralAgentPicker`, `ClientPicker`, and `BrokerPicker` (with unassign/clear support), all handling 1,000+ records via debounced search and pagination (10/25/50/100).
    - Fetches the picked referral agent's standing structure on-demand via `useUser` to prefill/label standard terms dynamically.
  - Migrated `CommissionsToolbar`, `CommissionsContainer`, and `CommissionDetailSheet` to granular per-person permissions via `canAccess(Module.COMMISSIONS, Action.CREATE | Action.PAY | Action.ARCHIVE)`.
    - `selectable={mayArchive}` on table so checkboxes only appear when user has archive permissions.
    - `Mark Paid Today` strictly requires `mayPay`.
    - `Mark Earned` requires `mayCreate || mayPay`.
  - Partner portal commissions (`/portal/commissions`) verified end-to-end with live stats, terms card, and scoped commissions table.
  - FilterTabs UI adjustment: Removed framer-motion transition animation on the active tab background in `FilterTabs.jsx`, replacing it with a static active indicator to avoid glitches.
- **Owner Test & Sign-off:** Owner tested and signed off on Commissions (#23). All changes committed in batches and pushed to `origin/roy`. Next in queue: Referrals / Referral Agent (#24).

### 11 Oct 2026 — Referrals / Referral Agent (#24) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `ReferralsController` & `ReferralResourcesController` decorated with `@UseGuards(AccessGuard)`, `@RequirePermissions` completely removed.
  - Open session reads: `GET /referrals`, `GET /referrals/stats`, `GET /referrals/:id`, `GET /referrals/:id/attachments/:uploadId`, and `GET /referral-resources` open to all authenticated sessions without requiring write permissions.
  - Controller is **not** `@StaffOnly()`: Partner referral agents access reads to operate `/portal/referrals`, `/portal/submit`, and `/portal/resources`.
  - Service shapes `partnerView(row)` when caller is `isPartner(user.role)`, projecting down to hide desk notes, broker identity, and internal CRM linkage.
  - Scoping via `reachOf(user.access, Module.REFERRALS)`: `ALL` for Admin, `OWN` for Broker (trips where assignedBrokerId = user.id or unassigned), `OWN` for Referral Agent (agentId = user.id).
  - Granular write gating:
    - Submit referral & Create resource: `@RequireAccess(Module.REFERRALS, Action.CREATE)`
    - Update referral, Convert referral, & Update resource: `@RequireAccess(Module.REFERRALS, Action.EDIT)`
    - Archive, Restore, Bulk-archive, Bulk-restore, & Resource archive: `@RequireAccess(Module.REFERRALS, Action.ARCHIVE)`
  - Standard service validation:
    - Replaced custom airport check with `AirportsService.usable(id, label)` repo-wide standard rule.
    - Added active status checks for referral agent (`agent.status === UserStatus.ACTIVE`) on submit and broker (`broker.status === UserStatus.ACTIVE`) on update.
    - Scoped `removeMany` and `restoreMany` to caller's `visibilityScope`.
  - Unit test suite: Created `referrals.access.spec.ts` (10 tests) verifying open reads, partner portal access, partner write gating (403 on edit/archive), and admin/curator privileges. All 53 Vitest suites (434 tests) pass 100%. `tsc --noEmit` clean with 0 errors.
- **Frontend Architecture & Reusable Components:**
  - Upgraded partner portal `SubmitReferralForm.jsx` (`Frontend/src/components/portal/SubmitReferralForm.jsx`):
    - Replaced `limit: 100` airport fetch with the reusable `AirportPicker` component (`Frontend/src/components/airports/AirportPicker.jsx`) for departure and arrival airports.
  - Upgraded desk `ReferralDetailSheet.jsx` (`Frontend/src/components/referrals/ReferralDetailSheet.jsx`):
    - Migrated to per-person permissions via `canAccess(Module.REFERRALS, Action.EDIT | Action.ARCHIVE)`.
    - Removed `limit: 100` broker query, replaced with shared `BrokerPicker` (`Frontend/src/components/users/BrokerPicker.jsx`).
    - Upgraded conversion flow: cleanly allows toggling between creating a new client and selecting an existing client using the searchable, server-paginated `ClientPicker` (`Frontend/src/components/clients/ClientPicker.jsx`).
    - Upgraded trip linking: replaced 50-limit dropdown with shared `TripPicker` (`Frontend/src/components/trips/TripPicker.jsx`) with client scoping.
    - Updated `TripPicker.jsx` to support optional custom `params` prop for flexible filtering while remaining 100% backward compatible.
  - Upgraded desk `ReferralsContainer.jsx`:
    - Migrated bulk deletion and row archiving to `canAccess(Module.REFERRALS, Action.ARCHIVE)`.
  - Upgraded desk `ReferralResourcesCard.jsx`:
    - Migrated curation permissions to `reachOf(Module.REFERRALS) === Reach.ALL && canAccess(Module.REFERRALS, Action.CREATE)`.
  - Fixed portal logo and static asset rendering in [proxy.js](file:///c:/Users/ROY/Desktop/out/Tribeca-Jets-Fullstack/Frontend/src/proxy.js): static asset requests under `/dashboard/img/*` and `/dashboard/bg/*` are passed through so partner portal sessions are not redirected by the CRM path matcher.
  - Turbopack production build (`npm run build`) compiled cleanly in 3.9s with 0 errors across 45 routes.
- **Next Step:** Ready for owner testing of Referrals (#24). Awaiting user testing and review before committing. Next module in queue: Transactions (#25).

### 11 Oct 2026 — Transactions (#25) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `TransactionsController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring referral agent / partner accounts (`403 Forbidden`).
  - Gated `GET /transactions` and `GET /transactions/stats` under `@RequireAccess(Module.TRANSACTIONS, Action.VIEW)`. Assistant without this module is refused (`403 Forbidden`, matching the Postman builder requirement).
  - Migrated `TransactionsService.permitted(user)` from legacy `can(user.role, ...)` to per-person checks:
    - `canDo(user.access, Module.RECEIVABLES, Action.VIEW)` $\rightarrow$ `CLIENT_PAYMENT`
    - `canDo(user.access, Module.OPERATOR_PAYMENTS, Action.VIEW)` $\rightarrow$ `OPERATOR_PAYMENT`
    - `canDo(user.access, Module.COMMISSIONS, Action.VIEW)` $\rightarrow$ `COMMISSION`
  - Scoping is handled by the underlying module services (`ReceivablesService`, `OperatorPaymentsService`, `CommissionsService`) respecting the caller's row-level reach (`Reach.OWN` vs `Reach.ALL`).
  - Unit test suite: Created `transactions.access.spec.ts` (6 tests) verifying `@StaffOnly()`, `@RequireAccess`, assistant refusal (403), partner refusal (403), and granular `permitted` kind filtering. All 54 Vitest suites (440 tests) pass 100%. `tsc --noEmit` clean with 0 errors. Oxlint clean with 0 warnings/errors.
- **Frontend Architecture & Reusable Component Adjustments:**
  - **Compact Toolbar Date Picker & Validation:**
    - Upgraded shared `CommonDatePicker` (`Frontend/src/components/common/DatePicker.jsx`) with `size="sm"` to match the table toolbar's compact pill design (`bg-secondary border border-border px-2 py-1 rounded-sm text-[10px] font-medium text-foreground gap-1.5 h-7 shrink-0`), preserving 100% backward compatibility for dialog forms.
    - Placed `From` and `To` date pickers inline in `TransactionsToolbar.jsx` with full mutual validation (`maxDate={to}` on `From`, `minDate={from}` on `To`, error border outline on inverted range, and client-side sanitization in `useTransactionsTableParams.js` to prevent 400 bad request API calls).
  - **Slide-Over Detail Sheet Drawer & Redirect CTA:**
    - Table rows (`TransactionsTableRow.jsx`) and mobile cards (`TransactionsCardsContainer.jsx`) no longer immediately navigate away to other pages on click.
    - Instead, clicking a row opens a slide-over detail sheet drawer (`TransactionDetailSheet.jsx` built on `DetailSheet` with `TribecaLetterhead`), displaying all movement facts (amount, direction, date, payment method, reference, document number, trip reference, assigned broker).
    - Inside the sheet drawer, dedicated redirect CTA buttons ("Open Invoice in Receivables", "Open Bill in Operator Payments", "Open Commission in Commissions", plus "View Trip") allow intentional navigation to origin modules.
  - Turbopack production build (`npm run build`) compiled cleanly in 5.2s with 0 errors across 45 routes.
- **Owner Test & Sign-off:** Owner tested and signed off on Transactions (#25). All changes committed in batches and pushed to `origin/roy`. Next in queue: Tasks Board & notification bell (#26).

### 11 Oct 2026 — Tasks Board (#26 part 1) reviewed, migrated & verified with Drag-and-Drop (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `TasksController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring partner / referral agent accounts (`403 Forbidden`).
  - Open staff reads: `GET /tasks` and `GET /tasks/:id` open to all authenticated staff sessions without write gates, allowing tasks to feed pickers and cross-module linkages.
  - Granular per-person write gating:
    - `POST /tasks`: `@RequireAccess(Module.TASKS, Action.CREATE)`
    - `PATCH /tasks/:id`: `@RequireAccess(Module.TASKS, Action.EDIT)`
    - `DELETE /tasks/:id` & `POST /tasks/:id/restore`: `@RequireAccess(Module.TASKS, Action.ARCHIVE)`
  - Scoping & Reassignment:
    - `scopeWhere` and `assertMayArchive` migrated to `reachOf(user.access, Module.TASKS)` (`Reach.ALL` vs `Reach.ASSIGNED`/`Reach.OWN`).
    - Task reassignment checks `canDo(user.access, Module.TASKS, Action.ASSIGN)`.
  - Unit test suite: Created `tasks.access.spec.ts` (5 tests) verifying `@StaffOnly()`, open reads, and granular write route protection. All 55 Vitest test suites (445 tests) pass 100%. `tsc --noEmit` clean with 0 errors.
- **Frontend Architecture & Drag-and-Drop (DnD) Kanban:**
  - Installed `@dnd-kit/core` and `@dnd-kit/utilities` (lightweight, zero React 19 hydration issues).
  - Configured `PointerSensor` with `{ activationConstraint: { distance: 5 } }`: clicking any task card opens `TaskDetailSheet` immediately; dragging > 5px engages drag mode.
  - Interactive feedback: `<DragOverlay>` renders floating card with rotation (`rotate-2`), zoom (`scale-[1.03]`), shadow-2xl, and grabbing cursor. Columns show hover drop feedback (`ring-2 ring-purple/50 border-purple/70 bg-purple/[0.04]`), and the source card ghosts with dashed border. Dropping on another column moves status via `useUpdateTask`.
  - Reusable pickers: Built `AssigneePicker.jsx` over active staff. Overhauled `AddTaskDialog.jsx` by replacing 100-limit `useTaskFormOptions` with shared server-paginated `AssigneePicker`, `ClientPicker`, `TripPicker` (scoped to client), and `DatePicker`.
  - Gated toolbar "Add Task" with `canAccess(Module.TASKS, Action.CREATE)` and detail sheet actions with `canAccess(Module.TASKS, Action.EDIT | Action.ARCHIVE)`.
  - Notification Bell (`NotificationPopover.jsx`) upgraded: migrated to `canAccess(Module.TASKS, Action.VIEW)`, controlled popover open state, loading/empty states, urgency badges, and direct task/board routing.
  - Oxlint clean (0 errors/warnings). Turbopack production build (`npm run build`) compiled in 4.2s with 0 errors across 45 routes.
- **Owner Test & Sign-off:** Owner tested and signed off on Tasks Board & notification bell (#26). All changes committed and pushed to `origin/roy`. Next in queue: Email Templates & sending (#27).

### 11 Oct 2026 — Email Templates & sending (#27) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `EmailTemplatesController` & `EmailsController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring outside partner / referral agent accounts (`403 Forbidden`).
  - Open staff reads: `GET /email-templates`, `GET /email-templates/stats`, `GET /email-templates/fields`, `GET /email-templates/:id`, `GET /emails`, `GET /emails/:id`, and `POST /emails/preview` open to all authenticated staff sessions.
  - Granular per-person write gating:
    - `POST /email-templates`: `@RequireAccess(Module.EMAIL_TEMPLATES, Action.CREATE)`
    - `PATCH /email-templates/:id`: `@RequireAccess(Module.EMAIL_TEMPLATES, Action.EDIT)`
    - `DELETE /email-templates/:id`, `POST /email-templates/bulk-delete`, `POST /email-templates/:id/restore`, `POST /email-templates/bulk-restore`: `@RequireAccess(Module.EMAIL_TEMPLATES, Action.ARCHIVE)`
    - `POST /emails`: `@RequireAccess(Module.EMAIL_TEMPLATES, Action.SEND)`
  - Bugfix: Corrected `assertMayRead` in `EmailsService.context` when emailing quotes (was asserting `Permission.VIEW_TRIPS`; now asserts `canDo(user.access, Module.QUOTES, Action.VIEW)`).
  - Scoping: `EmailsService.scopeWhere` evaluates `isAdministrator(user.role)` vs own/assigned scoping (`createdById` or client/trip visible).
  - Test suite: Created `email-templates.access.spec.ts` (10 tests) verifying `@StaffOnly()`, open staff reads, and granular write actions. All 56 Vitest suites (455 tests) pass 100%. `nest build` clean with 0 errors.
- **Frontend Architecture & Reusable Component Upgrades:**
  - `EmailTemplatesPage.jsx` tile for "Sent this month" guarded by `canAccess(Module.EMAIL_TEMPLATES, Action.SEND)`.
  - `EmailTemplatesContainer.jsx` & `EmailTemplatesToolbar.jsx` rewired to granular `mayCreate`, `mayEdit`, `mayArchive`, and `maySend`.
  - `EmailTemplateDetailSheet.jsx` gates actions using granular `mayEdit`, `mayArchive`, and `maySend`.
  - `ComposeEmailDialog.jsx` upgraded: replaced unpaginated `limit: 100` dropdown queries with shared server-paginated `ClientPicker`, `OperatorPicker`, and `TripPicker`, with live search, server pagination, and optional trip clearing.
  - Oxlint clean (0 warnings / 0 errors across 13 files). Turbopack production build (`npm run build`) compiled successfully in 5.7s with 0 errors across 45 routes.
- **Owner Test & Sign-off:** Owner tested and signed off on Email Templates & sending (#27). All changes committed and pushed to `origin/roy`. Next in queue: Document Vault (#28).

### 11 Oct 2026 — Document Vault (#28) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `DocumentsController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring outside partner / referral agent accounts (`403 Forbidden`).
  - Open staff reads: `GET /documents`, `GET /documents/stats`, `GET /documents/:id`, and `GET /documents/:id/file` open to all authenticated staff sessions; row reach follows owner visibility (`ClientsService.visibleWhere`, `TripsService.visibleWhere`).
  - Passports and IDs restricted strictly by `canDo(user.access, Module.DOCUMENTS, Action.VIEW_SENSITIVE)`. Without it, sensitive categories are excluded from list/stats and return 404 when named.
  - Granular per-person write gating:
    - `POST /documents`: `@RequireAccess(Module.DOCUMENTS, Action.CREATE)` (*"File documents"*)
    - `PATCH /documents/:id`: `@RequireAccess(Module.DOCUMENTS, Action.EDIT)`
    - `DELETE /documents/:id`, `POST /documents/bulk-delete`, `POST /documents/:id/restore`, `POST /documents/bulk-restore`: `@RequireAccess(Module.DOCUMENTS, Action.ARCHIVE)`
  - Archiving restriction: `assertMayArchive` and `bulk` archive permit callers holding `Reach.ALL` or `isAdministrator(user.role)`, while restricting `Reach.OWN` callers to documents they filed (`createdById === user.id`).
  - Unit test suite: Created `documents.access.spec.ts` (21 tests) verifying `@StaffOnly()`, open reads, write actions, and passport exclusion. All 57 Vitest suites (476 tests) pass 100%. `nest build` clean with 0 errors.
- **Frontend Architecture & Reusable Component Upgrades:**
  - `DocumentFormDialog.jsx` upgraded: replaced unpaginated `limit: 100` plain dropdowns with shared server-paginated `ClientPicker`, `TripPicker`, and `OperatorPicker` using `RecordPicker`.
  - Migrated `useDocumentRowActions.jsx` to per-person permissions (`canAccess(Module.DOCUMENTS, Action.EDIT | Action.ARCHIVE)`, `reachOf(Module.DOCUMENTS)`).
  - Migrated `DocumentsPanel.jsx` to `canAccess(Module.DOCUMENTS, Action.VIEW)` and `canAccess(Module.DOCUMENTS, Action.CREATE)`.
  - Migrated `DocumentsToolbar.jsx` and `DocumentsContainer.jsx` to distinct `mayCreate` and `mayArchive` controls.

### 11 Oct 2026 — Reports (#29) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `ReportsController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring outside partner / referral agent accounts (`403 Forbidden`).
  - Financial reads: `GET /reports/summary`, `GET /reports/series`, `GET /reports/brokers`, `GET /reports/clients`, and `GET /reports/routes` require `@RequireAccess(Module.REPORTS, Action.VIEW)`.
  - Operations export: `GET /reports/export` requires `@RequireAccess(Module.REPORTS, Action.EXPORT)`.
  - Scoping: `TripsService.reportRows` and `reportCount` respect caller reach (`reachOf(Module.REPORTS)` / `reachOf(Module.TRIPS)`), restricting `Reach.OWN` brokers to their own operations.
  - Unit test suite: Created `reports.access.spec.ts` (21 tests) verifying `@StaffOnly()`, per-person access checks, and export authorization. All 58 Vitest suites (497 tests) pass 100%. `nest build` clean with 0 errors.
- **Frontend Architecture & Access Upgrades:**
  - `ReportsToolbar.jsx` upgraded: migrated export buttons from legacy `can(Permission.EXPORT_DATA)` to `canAccess(Module.REPORTS, Action.EXPORT)`.
  - `ExportOperationsDialog.jsx` upgraded: gated download trigger and export modal rendering with `canAccess(Module.REPORTS, Action.EXPORT)`.
  - Oxlint clean (0 warnings / 0 errors across 25 files). Turbopack production build (`npm run build`) compiled successfully in 4.9s with 0 errors across 45 routes.

### 11 Oct 2026 — Dashboard (#30) reviewed, migrated & verified (Antigravity)

- **Backend Architecture & Per-Person Access:**
  - `DashboardController` decorated with `@UseGuards(AccessGuard)` and `@StaffOnly()`, barring outside partner / referral agent accounts (`403 Forbidden`).
  - `@RequireAccess(Module.DASHBOARD, Action.VIEW)` on all dashboard endpoints (`/summary`, `/priorities`, `/activity`), replacing legacy role matrix `@RequirePermissions(Permission.VIEW_DASHBOARD)`.
  - Financial calculations (`summary.money`) require administrator status or `canDo(user.access, Module.QUOTES, Action.VIEW_MONEY)` / `Module.TRIPS, Action.VIEW_MONEY`.
  - Summary counts check `canDo(user.access, ...)` across `TRIPS`, `TRIP_REQUESTS`, `RECEIVABLES`, `OPERATOR_PAYMENTS`, and `EMPTY_LEGS`.
  - Priorities list checks `canDo(user.access, ...)` across `CLIENTS`, `TASKS`, `RECEIVABLES`, `OPERATOR_PAYMENTS`, and `DOCUMENTS`.
  - Activity audit feed mapped to `ACTIVITY_MODULE` and scoped by caller reach (`Reach.ALL` vs `Reach.OWN` where `actorId === user.id`).
  - Unit test suite: Created `dashboard.access.spec.ts` (15 tests) verifying `@StaffOnly()`, per-person access checks, and audit reach scoping. All 59 Vitest suites (512 tests) pass 100%. `nest build` clean with 0 errors.
- **Frontend Architecture & Reusable Component Verification:**
  - `OverviewPage.jsx` and widgets (`StatsGrid`, `TodaysPriorities`, `EmptyLegsSection`, `RecentActivityFeed`, `FollowUpsSection`, `UpcomingTripsContainer`, `FinancialAttention`) verified clean.
  - Reusable components (`TableStatus`, `StaggerContainer`, `CommonCard`, `SectionHeader`, `Reveal`) handle loading, empty states, and errors with honest fallbacks (no invented numbers or dummy fallbacks).
  - Oxlint clean (0 errors, 0 warnings across all 26 dashboard files). Turbopack build clean with 0 errors across all 45 routes.

