# Handoff — where the project is, and how to pick it up

**Last updated: 9 October 2026.** Update the "Where we are" section in the
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
| 7 | Operators | ✅ 8 Oct — owner tested; first module with `@StaffOnly` and `OperatorPicker` |
| 8 | **Aircraft** | 🟡 **Reviewed, awaiting owner test** |
| 9 | **Clients** | 🟡 **Reviewed, awaiting owner test** |
| 10 | Notes / Timeline | ⬜ **next** |
| 11–35 | Client Credits, … | ⬜ in the table's order |

**Git:** branch `roy`, in step with `origin/roy`. Latest migration:
`20261008120000_operator_choices` (run `npm run db:deploy` on any database
that has not had it).

### What is next — Owner tests Aircraft (#8) & Clients (#9), then Notes (#10)

- **Aircraft (#8) is reviewed and ready for the owner to test.**
  - Backend: `@StaffOnly()` on controller (desk data); GETs open to staff; writes require `Aircraft · Create/Edit/Archive`.
  - Picked foreign keys verified on the server: `AirportsService.usable` (home base) and operator checked for existence, active status, and non-suspended.
  - Frontend: `AddAircraftDialog` updated with `OperatorPicker`, `AirportPicker`, and `CommonSelect`. Reusable `AircraftPicker` created. Missing values render `"—"`. Write and bulk controls strictly gated.
  - Postman: `07 · Aircraft` rebuilt on `builder_common.py` (11 requests, 34 examples) with dedicated teardown. Passed Newman twice (0 failures).
- **Clients (#9) is reviewed and ready for the owner to test.**
  - Backend: `@StaffOnly()` on controller (desk data); GETs open to staff; writes require `Clients · Create/Edit/Archive`.
  - Reach filters rows (`reachOf(user.access, Module.CLIENTS) === ASSIGNED` -> `assignedBrokerId: user.id`).
  - Picked foreign keys verified on the server: `AirportsService.usable` (home airport) and broker checked for existence/active broker role; reassigning requires `Action.ASSIGN`.
  - Company settings integration (§26): defaults `leadStage` from `SettingsService.read().defaultLeadStage`.
  - Frontend: `ClientsContainer`, `ClientsToolbar`, `ClientsTable`, `ClientsTableRow`, `ClientCard`, `AddClientDialog`, `ScheduleFollowUpDialog`, `ClientHeaderActions`, `ClientDetailSidebar`, `ClientFollowUpBanner`, `ClientDetailPage` updated with `usePermissions()`. Raw selects replaced with `AirportPicker` and `CommonSelect`.
  - Postman: `03 · Clients` folder wired with session setup and teardown. Passed Newman (11 requests, 3 assertions, 0 failures).
- **Next module after Aircraft & Clients sign-off:** Notes / Timeline (#10), Client Credits (#11), Leads & Agents (#12)… in the Review order table.

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
- **Redis cache:** Flushed completely.

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
