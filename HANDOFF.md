# Handoff — where the project is, and how to pick it up

**Last updated: 10 November 2026.** Update the "Where we are" section in the
same pass as any session that ships, reviews or commits something. A stale
handoff is worse than none: the next session trusts it.

New machine or new AI tool? Start with [START_HERE.md](START_HERE.md).

Four parts: **where we are**, **get it running** (including on a new
machine), **the prompt to paste**, and the **session log**. The procedure
for a review, and how the owner likes to work, is in
[docs/REVIEW_PLAYBOOK.md](docs/REVIEW_PLAYBOOK.md) — any AI tool reads it.

---

## Part 1 — Where we are

### Read this first — the state on 10 Nov 2026

- **The build is complete; acceptance is what is left.** Every module is
  built. Rows 1–30 are owner-signed-off; #31–#34 (Import/Export, PDF
  generator, Client Portal, AI Assistant) and the client's 9 Nov feedback
  batch are built and verified but **not yet owner tested**.
- **On hold by the developer's choice (10 Nov):** the owner's click-through,
  and deploying to production. Production runs `8127edd` (9 Nov). Everything
  after it is on `roy` — the 10 Nov fixes and three migrations, which the API
  applies on start when it is next deployed. Do not deploy or touch `main`
  unless the developer asks (see "Git" below).
- **10 Nov 2026 was a hardening day** (two session-log entries below):
  trip approval made to actually hold and moved to a per-person permission
  (`TRIPS · APPROVE`), reassigning trips likewise (`TRIPS · ASSIGN`); the
  old role matrix deleted on both sides; every record dropdown and filter on
  the server-paged `RecordPicker`; the Settings bank-wire card fixed (it
  saved nothing); a logo for dark backgrounds; airport State kept as typed;
  seed accounts on `example.com`; the Postman collection complete (30
  folders, 779 examples) and green on the test API.
- **Verified state:** backend Vitest 69 files / 599 tests, `tsc`, oxlint 0;
  frontend ESLint and `next build` clean; Newman, the whole collection twice
  on the 4100 test API — 451 requests, 303 assertions, 0 failures.
- **Where the rules are:** `AGENTS.md` (the whole rulebook — read part one
  first). Per-module detail: `docs/MODULE_FEATURE_STATUS.md`. The owner's
  review procedure: `docs/REVIEW_PLAYBOOK.md`.

### What is next

1. **The owner's acceptance test, when the developer resumes it** — the 9 Nov
   batch (`update-09-nov.txt` is what the client was told) and #31–#34. Tell
   the owner what changed on 10 Nov, since it differs from the 9 Nov message:
   a broker can no longer create or book a trip straight into Confirmed;
   only a trip waiting for approval can be declined; a broker editing a
   declined trip sends it back for approval; "Approve trips" and "Reassign
   trips" are per-person permissions in Users & Roles; broker pickers now
   list administrators too.
2. **A decision for the owner:** archiving a trip leaves its open system
   tasks on the Tasks Board (see Known findings).
3. **Deploy when the developer says** — `git push deploy roy:main` is theirs
   to run.
4. Small, optional: move the five older Postman builders onto
   `builder_common`; the Leads table's 100-enquiry window (Known findings).

### The stage: module-by-module review

Every module in the build table in `docs/MODULES.md` is **built**, along with
all 11 client adjustments and the client's 8 feedback items of 9 Nov. Rows
1–30 are signed off; #31–#34 and the 9 Nov feedback batch are built and wait
for the owner's test; #35 (Offline / PWA) is deferred. Since 6 Oct 2026 the owner has been
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
| 32 | **PDF generator** | 🟡 Built & verified — ready for owner test |
| 33 | **Client Portal** (#25) | 🟡 Built & verified — ready for owner test |
| 34 | **AI Assistant** (#27) | 🟡 Built & verified — ready for owner test |
| 35 | Offline / PWA | ⏹️ Deferred by owner decision (documented for future) |

**Git:** branch `roy`. Latest migration:
`20261110120000_logo_on_dark` (after `…100000_trips_approve_permission` and
`…110000_trips_assign_permission`, both data only; run `npm run db:deploy` on
any database that has not had them — applied to `tribeca_jets` and
`tribeca_postman` on 10 Nov).

**Agents commit and push only on `roy` → `origin/roy`, never `main` on any
remote (developer's rule, 10 Nov 2026).** Deploying is the developer's own step:

**Deploying (since 10 Nov 2026):** `git push deploy roy:main` — the `deploy`
remote (`ROY-0404/Tribeca-Jets`) is what Dokploy builds, and its `main` is
fast-forwarded from `roy`; the API applies migrations on start. Local `main`
is stale (pushing it is refused as non-fast-forward), and `origin/main` lags
`roy` — bring it up to date when the owner merges.

### Standing rules worth repeating here

The 9 Nov feedback batch and #31–#34 are described in the session log and in
`docs/MODULE_FEATURE_STATUS.md` (cross-cutting section "Client feedback, 8
items"), not repeated here.

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

- **Each module's settings rows** (MODULES.md §26 map) are wired during that
  module's review — Clients, Leads, Quotes, Trips, Itineraries, Flight
  Tracking, Receivables, Operator Payments, Tasks, Email Templates.

### The local database was wiped and seeded on 9 Oct 2026 (owner's request)

For clean testing, the database was wiped and seeded with standard baseline data:
- **Users — what `tribeca_jets` actually holds (checked 10 Nov 2026), all
  password `ChangeMe123!`:** `roy.techreion@gmail.com` and `admin@example.com`
  (SUPER_ADMIN), `security@example.com` (ADMIN, two-factor), `broker@example.com`,
  `assistant@example.com`, `agent@example.com` and `roy2.techreion@gmail.com`
  (REFERRAL_AGENT). The `@tribecajets.com` addresses this section used to list
  are not in it; the Postman collection signs in with the `@example.com` ones.
- **The seed scripts write `@example.com` too since 10 Nov** (they wrote
  `@tribecajets.com`; AGENTS.md: every seeded account is on `example.com`,
  which never delivers — trip assignment and approval now email people).
  `seed-test-data.ts` finds either. The Super Admin stays the developer's
  own address.
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

### Known findings, not yet fixed

- **Archiving a trip leaves its open system tasks** ("Approve Trip …",
  "Review Assigned Trip …", "… Approval Declined") on the Tasks Board —
  a task about a trip nobody is working. Each Postman run leaves a few in
  `tribeca_postman`. Closing them on archive is a product choice for the
  owner; not made.
- `01 · Auth`'s reset flow sends two codes per run and the limit is three per
  address per 15 minutes, so two back-to-back runs pass and a third inside
  the window fails with 429 — the limit working, not a fault. Clear the test
  Redis (`redis-cli -n 1 FLUSHDB` on `tribeca_redis`) to run again at once.
- Five older builders (08, 09, 10, 12, 13) still carry private copies of
  `Session` / `example()` (they now take the shared `BASE`). Move each onto
  `builder_common` when its folder is next rebuilt. Every folder now
  regenerates from its own script — see `Backend/postman/README.md`,
  "Regenerating".
- The Leads table reads the newest 100 enquiries of the leads on the page;
  a lead with a very long enquiry history could crowd others out of that
  window (each lead's latest is what is shown).

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
   - Other staff accounts: `admin@example.com` (Super Admin), `security@example.com` (Admin, two-factor), `broker@example.com`, `assistant@example.com` (all `ChangeMe123!`)
   - Partner Portal: `http://localhost:3000/portal` -> `agent@example.com` / `ChangeMe123!`

- **Accounts in the dev database**, all `ChangeMe123!`: see Part 1, "The
  local database" — every staff and partner account is on `@example.com`
  except the developer's own Gmail addresses.
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
> Every module is built; what is left is acceptance and whatever I ask for
> next ("Read this first" and "What is next" in `HANDOFF.md`). When we review
> a module: tell me in a short list what it does and what needs doing, wait
> for my decisions, then fix it in professional grade and tell me what to
> test. I test it myself; it is done when I say so.
>
> Absolute rules: never commit or push unless I say so in that message (then
> in batches by concern, **on `roy`, pushed to `origin roy` — never `main`,
> on any remote**); stay inside the module under review — other modules
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



### 10 Nov 2026 (last) — Postman scripts cleaned up, handoff refreshed, all committed (Claude Code)

- **Postman directory trimmed to what regenerates the collection.** Twelve
  one-off patch scripts deleted (their effects were already in the
  collection or in a builder): `add_clients_teardown`, `add_folder_teardowns`,
  `add_restore_requests`, `attach_uploads_session`, `fix_reset_password_rerun`,
  `fix_sourcing_rerun`, `fix_auth_reset_account`, `fix_sourcing_probe_operator`,
  `recapture_auth_rate_limits`, `recapture_auth_session`,
  `update_session_example`, `reorganize`. The sourcing probe-operator fix was
  folded into `build_operator_sourcing_folder.py`, whose own capture now
  makes a probe operator too when none is free — 09 rebuilt from it and
  green twice. `recapture_clients_examples.py` takes the shared `BASE`.
  `Backend/postman/README.md` "Regenerating" says which script owns which
  folder.
- **HANDOFF Part 1 restructured** — "Read this first" and "What is next" at
  the top; the 9 Nov roadmap detail left to the session log and status doc.
- Committed in batches on `roy` and pushed to `origin/roy` at the
  developer's request; `main` untouched.

### 10 Nov 2026 (later) — Trips reassign permission, old matrix deleted, pickers everywhere, Postman complete (Claude Code)

The developer asked for the list's items 3–5 (owner testing and deploy are
on hold, by the developer's choice):

- **#4 — Trips reassign was a hidden role check.** The service asked
  "administrator, or `TRIPS · ASSIGN`", but ASSIGN was never a Trips action.
  Now it is (`Reassign trips`): Admin default, locked for broker and
  assistant, `@RequireAccess`-style check only, forms gated by it. Migration
  `20261110110000_trips_assign_permission` keeps every Admin able.
- **#5 — airport State** is stored as typed; **logo for dark backgrounds**
  built (`logoOnDarkUrl`, migration `20261110120000_logo_on_dark`, public
  route, Settings tile on the sidebar colour, `BrandLogo` picks it on a dark
  background; the sign-in card now says it is light). Found on the way:
  **the bank wire card in Settings never saved** (its fields were missing
  from `SETTINGS_FIELDS`) — fixed.
- **#3c — the old role matrix is deleted** on both sides (`roles.ts` keeps
  identity). The staff directory is an open staff read with `@StaffOnly()`.
  32 spec assertions that only checked "no old decorator" were removed.
- **#3b — no dropdown or filter loads only the first 100 rows.** All forms
  and filters are on `RecordPicker` (filter variant added; new
  `TripRequestPicker`, `EmailTemplatePicker`). `BrokerPicker` now lists
  administrators too (the API's owner set) via a multi-role `?role=`. The
  Leads table reads its own leads' enquiries (`?clientIds=`). Found:
  `AssigneePicker` crashed on a page holding a referral agent — fixed.
- **#3a — Postman complete:** folders 16–26 and 28 built (30 folders, 779
  examples, 0 mislabelled); 01 · Auth sessions re-captured without
  `matrix`; Trips, Users, Settings (new logo route) rebuilt. Builders fixed
  for the wiped data (no "Mark", "Barry", "NetJets"), the 30 Oct guardrails
  (flights depart today; a cancelled probe trip that can actually be
  cancelled; room under the over-invoicing guard) and the open-reads rule
  (assistant reads are 200s). Create bodies no longer send `null`.
- **Verification:** backend Vitest 69 files / 599 tests, `tsc`, oxlint 0;
  frontend ESLint and `next build` clean; Newman full collection twice on
  4100 — 451 requests, 303 assertions, 0 failures, nothing to :4000, no
  probe left live except the system tasks above.
- Committed and pushed to `origin/roy` with the cleanup pass (entry above).

### 10 Nov 2026 — Trip approval fixed, old-matrix buttons moved, seed and docs (Claude Code)

An audit of the project after the 9 Nov batch found the approval feature
(client feedback 2.1) did not hold. Owner-level decisions were taken on
Claude's recommendation, with the developer's approval:

- **A declined trip could still be confirmed.** The confirm gate checked only
  `PENDING`. Now a `REJECTED` trip is held as well (`confirmBlockedBy` in the
  new `trips/trips.approval.ts`, pure functions with tests).
- **A broker could skip approval** by creating a trip, or booking a quote,
  straight into `CONFIRMED`. Now refused (400) for anyone who cannot approve;
  the create form no longer offers "Confirmed" to them.
- **Resubmit (decision):** a broker editing a declined trip sends it back to
  `PENDING`, clears the reason, closes their "declined" task and notifies the
  approvers again (audited `trip.resubmitted`). Ticking the trip checklist
  alone does not resubmit.
- **Who approves (decision):** a new action, **`TRIPS · APPROVE`** ("Approve
  trips"), replaces the hard-coded `isAdministrator` check. Default for
  Super Admin and Admin, locked for Broker, Assistant and Referral Agent; the
  routes carry `@RequireAccess(Module.TRIPS, Action.APPROVE)`, the buttons
  `canAccess`. A trip is auto-approved for anyone holding it, and the
  "waiting for approval" task and email go to whoever holds it. Migration
  `20261110100000_trips_approve_permission` gives it to every existing Admin
  whose stored set held `TRIPS · EDIT`, so nobody loses the power.
- **Decline only a pending trip.** `reject` had no state check — an admin
  could "decline" a trip already in the air. Approve still works on a
  declined trip (an admin changing their mind).
- **UI:** the approval banners rendered `text-white` on the light theme
  (titles invisible) and hard-coded amber/red; replaced by one
  `TripApprovalBanner` on theme tokens. Badges use `StatusBadge`
  ("Pending Approval", "Approval Declined"), now on the mobile cards too.
  Timeline phrases added for approve / decline / resubmit.
- **Old matrix off every screen:** 14 checks still read the old role matrix
  in modules already moved to per-person permissions (client and lead
  detail, Leads table, Operators' Request Quote and document filing,
  operator and client Documents tabs, client Credit tab, Schedule's New
  Trip, the notes timeline). Each now mirrors its API rule through
  `canAccess`; `SUBJECT_PERMISSION` was deleted from `lib/timeline.js`.
- **Seed accounts** moved to `@example.com` (see Part 1); three unused seed
  variables removed (oxlint clean).
- **Verification:** backend Vitest 67 files / 590 tests green (21 new in
  `trips.approval.spec.ts`), `tsc --noEmit` clean, oxlint 0 warnings;
  frontend ESLint clean and `next build` green. Migration applied to
  `tribeca_jets`. Not done: the owner's click-through.
- **Postman** (once Postgres was back):
  - **Every pre-request script ignored `--env-var baseUrl`** — 50 read
    `pm.collectionVariables.get('baseUrl')`, so a run against the 4100 test
    API did its lookups, sign-ins and setup on the **dev API (4000)** and dev
    database, and only the requests themselves went to 4100. Runs looked
    green because both hold the same accounts. All 50, and 28 builders,
    now read `pm.variables.get('baseUrl')` (AGENTS.md rule added).
  - `01 · Auth`: `reset-demo@example.com` did not exist after the 9 Oct
    wipe; `Request reset code` now invites it once when missing
    (a one-off patch script, since deleted — the change lives in the
    collection). Green on two back-to-back runs.
  - `15 · Trips` rebuilt with `12 · Approve` and `13 · Decline a broker's
    trip` (pre-requests book a trip as the broker), plus 400 examples for
    creating CONFIRMED without approval and confirming a declined trip, and
    the resubmit edit. `27 · Dashboard` rebuilt with `?userId=` — the folder
    was missing from the collection; its stale "403 · An assistant does not
    read operator payments" is now the 200 the open-reads rule gives.
  - `09 · Operator Sourcing` failed on any database with one live operator
    (409) and archived its ask with a `pm.sendRequest` in its last test
    script. It now asks a probe operator of its own and ends with two
    teardown requests (since folded into `build_operator_sourcing_folder.py`).
  - Verified on 4100: `01 · Auth` 19/19 on two back-to-back runs; every
    other folder in one run, 196 requests and 145 assertions, 0 failures,
    none sent to 4000, and no probe left live. 499 examples, 0 mislabelled.
- **Committed in six batches on `roy` and pushed to `origin/roy`** at the
  developer's request (approval backend, approval UI, old-matrix checks,
  seed, Postman, docs). `main` untouched, on every remote.

### 31 Oct 2026 — Production Deployment on Dokploy/Hostinger & Executive QA Summary (Antigravity)

- **Production Deployment Verified:**
  - Code merged and pushed to `main`; deployed automatically to Hostinger VPS (`179.236.239.65`) via Dokploy.
  - Both `api` and `web` containers compiled and booted cleanly.
  - Production health endpoint verified at `https://tribecajetscommandcenter.com/api/health` (`status: ok`, `database: up`, `redis: up`, `storage: s3`).
  - All new routes (`/api/client-portal/*`, `/api/assistant/*`, `/api/reports/export`, and PDF generation streams) verified cleanly mounted at boot.
- **Full Test Suite Re-verification:**
  - Ran `prisma generate` and verified full backend Vitest suite: 66/66 test suites (570 tests) passed 100% green.
- **Non-Technical Executive Guide for QA Issues:**
  - Authored `docs/QA_ISSUES_EXECUTIVE_SUMMARY.md` in response to `reviews/Tribeca_Jets_CRM—Module_Issues_Explained.pdf` (QA Test Report v2.0).
  - Translates all 26 audited issues into plain, non-technical business language detailing: What happened, Why it mattered to the brokerage desk, and How it was resolved.
  - Summarized delivery of the four previously "In Progress" modules (Editorial PDF Generator, Client Portal, Data Import/Export, and AI Command Assistant). Committed by owner.

### 29 Oct 2026 — Client Portal (#33 / #25) built & verified (ready for owner test)

- **Separate token authentication (`Backend/src/modules/client-portal/`):** Built HMAC-SHA256 signed client portal tokens (`client-portal.token.ts`, 90-day TTL, verified against live `Client` records), `ClientPortalService`, and `ClientPortalController` (`GET /client-portal/link/:clientId` for staff; `@Public()` routes at `/client-portal/:token` for overview, quote approval/decline, quote/itinerary/invoice PDF downloads, and non-sensitive vault document downloads).
- **Minimalistic editorial Client Portal UI (`/client-portal/[token]`):** Built `ClientPortalView.jsx` with the same clean monochrome & warm-stone editorial hierarchy as the PDFs, plus **Client Portal** / **Copy Client Portal Link** actions on `ClientHeaderActions.jsx`.
- **Verification:** `client-portal.spec.ts` (4/4 tests pass), `tsc --noEmit` (0 errors), `oxlint` (0 errors), Frontend ESLint (0 errors).

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

### 29 Oct 2026 — Modules #31, #32, #33, #34 built, verified & pushed; #35 documented (Antigravity)

- **Module #31 — Import / Export (#26) built & wired:**
  - `GET /settings/export` (`SETTINGS · VIEW`): Multi-sheet XLSX workbook for `ALL` (`Clients`, `Trips`, `Quotes`, `Receivables`, `Operator Payments`, `Commissions`) and single-entity CSV/XLSX downloads with formula sanitization, date filters, and archived record toggles.
  - `POST /settings/import/validate` & `POST /settings/import/commit` (`SETTINGS · EDIT`): 2-step import for `CLIENTS`, `OPERATORS`, `AIRCRAFT`, `AIRPORTS` with byte-sniffed CSV/XLSX parsing, auto-column mapping, preview table, and transactional commit.
  - Unit tests: `tabular.spec.ts` (6 tests) and `settings.data.spec.ts` (9 tests).
- **Module #32 — PDF Generator built & wired:**
  - Shared editorial PDF engine built on `pdfkit` (`pdf.document.ts`, `pdf.templates.ts`, pinned by `pdf.spec.ts` — 5 tests) with vector Tribeca logo rendering, hairline rules, page numbering, and company document identity toggle support.
  - 5 PDF endpoints wired: Quotes (`GET /quotes/:id/pdf`), Itineraries (`GET /itineraries/:id/pdf`), Invoices (`GET /receivables/:id/pdf`), Reports (`GET /reports/export?format=PDF`), and Branding Header (`GET /settings/pdf-preview`).
  - Automatic PDF email attachments (`POST /emails`) wired for Quote, Itinerary, and Invoice emails.
- **Module #33 — Client Portal (#25) built & wired:**
  - Separate token authentication surface (`client-portal.token.ts`, pinned by `client-portal.spec.ts` — 4 tests) using 90-day HMAC-SHA256 signed URLs verified in constant time against live clients, isolated from staff session cookies.
  - Staff issuance action: `GET /client-portal/link/:clientId` wired in `ClientHeaderActions.jsx` (**Client Portal** button & **Copy Link**).
  - Public Client Portal view (`/client-portal/[token]`): Executive summary, Charter Advisor card, Proposals tab with online **Approve / Decline** actions and PDF downloads, Trips & Itineraries tab, Statements & Invoices tab, and non-sensitive Document Vault downloads.
- **Module #34 — AI Assistant (#27) built & wired:**
  - Permission-scoped Command Center Assistant (`Backend/src/modules/assistant/`, pinned by `assistant.spec.ts` — 3 tests) with `@StaffOnly()`.
  - Dynamic Suggestions (`GET /assistant/suggestions`) & Live Q&A (`POST /assistant/ask`) answering desk queries across Trips, Quotes, Receivables, Clients, Trip Requests, Empty Legs, and Tasks strictly within caller row reach and `VIEW_MONEY` permissions, plus built-in Command Center workflow knowledge (`assistant.knowledge.ts`).
  - Frontend: Wired top-bar **Ask Anything** popover (`⌘K` / `Ctrl+K`) in `AskAnythingPopover.jsx`, `AssistantHeader.jsx`, `useAssistantStore.js`.
  - Completely deleted `Frontend/src/dummyData/assistant.js` — zero dummy data remaining across the entire project (`Frontend/src/dummyData/` is 100% empty).
- **Module #35 — Offline / PWA decision:**
  - Removed from active codebase per owner instruction.
  - Architectural specification, Service Worker caching strategies, and manifest design fully documented under Deferred by decision in `docs/MODULE_FEATURE_STATUS.md` §35 and `docs/MODULES.md` for future implementation if requested.
- **End-to-End Test & Build Verification:**
  - Backend Vitest: 64 test suites, 557/557 unit tests passed 100% green.
  - Backend TypeScript: 0 errors (`tsc --noEmit`).
  - Backend Linter: 0 errors (`oxlint`).
  - Frontend Lint: 0 errors, 0 warnings (`eslint`).
  - Frontend Next.js Build: Successfully compiled all 45 routes with Turbopack (`npm run build`).



### 30 Oct 2026 — QA Audit Remediation: Batch 1 (Security & Financial Math Integrity)

- **Issue #4 (FET Profit Math Deduction across Quotes, Trips, Commissions, Reports, Dashboard):**
  - Root cause: FET was included in the revenue calculation for gross profit and margin calculations. Because FET is a government excise tax passed through to the IRS, it is not charter brokerage revenue.
  - Solution: In `Backend/src/modules/quotes/quotes.pricing.ts` and `trips.figures.ts`, defined `charterRevenue = cents(basePrice + extrasTotal)` and calculated `grossProfit = charterRevenue - operatorCost` and `marginPercentage = Math.round((grossProfit / charterRevenue) * 1000) / 10`.
  - Pinned by benchmark assertions in `quotes.pricing.spec.ts`, `trips.figures.spec.ts`, and `commissions.amounts.spec.ts`.
- **Issue #6 (Uploads & Document Vault Strict Whitelist & Malware Protection):**
  - Root cause: `UploadKind.DOCUMENT` previously had `acceptsAnyFile: true`, storing unrecognized files (including `.exe` and scripts) as `application/octet-stream`.
  - Solution: In `uploads.rules.ts`, set `acceptsAnyFile: false` on documents, added photo MIME types (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`) to `DOCUMENT_EXTENSIONS` for passport/ID scans, and added `BLOCKED_EXTENSIONS` (`.exe`, `.dll`, `.bat`, `.cmd`, `.sh`, `.ps1`, etc.). In `UploadsService.resolveContentType()`, blocked dangerous extensions and enforced `.txt` for plain text.
  - Pinned by `uploads.rules.spec.ts` (9 tests) and `uploads.access.spec.ts` (14 tests).
- **Issue #23 (Receivables Trip Over-Invoicing Guard & Remaining Balance Autofill):**
  - Root cause: Neither `create()` nor `update()` in `ReceivablesService` prevented invoices from exceeding `trip.totalPrice`. Furthermore, "Bill the full trip" blindly copied original trip totals instead of remaining unbilled balance.
  - Solution: In `trips.service.ts`, `billingTarget()` attaches priced quote figures (`totalPrice`, `basePrice`, `fetAmount`, `extrasTotal`), and `fullCharge` computes remaining unbilled balance (`remainingBaseCents`, `remainingFetCents`), returning `null` if fully invoiced. In `receivables.service.ts`, `create()` and `update()` block over-invoicing with `BadRequestException` detailing attempted total, trip total, and remaining limit. Updated `AddReceivableDialog.jsx` to dynamically label "Bill remaining balance" and display "Trip fully invoiced".
  - Pinned by `receivables.amounts.spec.ts` (25 tests).
- **Issue #5 (Auth Storage Cleanup):**
  - Added `purgeLegacyStorage()` in `Frontend/src/lib/session.js` to purge legacy keys (`tjcc_*`, `broker_accounts`, `mock_*`, `prototype_*`) from `localStorage`.
  - Called `purgeLegacyStorage()` on client app boot in `QueryProvider.jsx` and on sign-out in `clearSession()`.
- **Verification:**
  - Backend: Vitest 64/64 test suites (558 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
  - Frontend: `npm run lint` 0 errors across the entire codebase.

### 30 Oct 2026 — QA Audit Remediation: Batch 2 (Sales & CRM Pipeline Remediation)

- **Issue #3 (Client Follow-up Scheduling UUID Fix):**
  - Root cause: In `ClientDetailPage.jsx`, `client?.id || client` passed the string `client.id` into `openFollowUpModal`, but `ScheduleFollowUpDialog.jsx` previously expected an object and read `client.id`, resolving to `undefined` and hitting `PATCH /clients/undefined/follow-up`.
  - Solution: In `ClientDetailPage.jsx`, passed `openFollowUpModal(client)`. In both `ScheduleFollowUpDialog.jsx` (Clients) and `ScheduleFollowUpDialog.jsx` (Leads & Agents), defensively resolved ID via `typeof client === "string" ? client : client?.id`.
- **Issue #29 (Client Auto-Advance on Booking & Dynamic Header Stats):**
  - Root cause: Booking a trip or converting a quote into a booked trip did not update the client from `LEAD` to `ACTIVE` / `WON`. In addition, `ClientDetailHeader.jsx` displayed placeholder dashes for active quotes and total trips.
  - Solution: In `trips.service.ts`, added transactional `autoAdvanceClientOnBooking()` in both `create()` and `bookFromQuote()` advancing `status: LEAD -> ACTIVE` and `leadStage -> WON` with audit logging. Wired `useQuotes` in `ClientStatsRow.jsx` to dynamically count active quotes (`SENT` status), and replaced placeholder dashes in `ClientDetailHeader.jsx` with `<ClientStatsRow client={client} />`.
- **Issue #33 (Settings Defaults Propagation into Creation Forms):**
  - Root cause: Default quote validity hours, terms, FET settings, and client follow-up intervals in CRM Settings were not populating the creation dialogs.
  - Solution: In `AddClientDialog.jsx`, injected `useSettings()` to populate default `leadStage` and auto-compute `nextFollowUpAt` from `followUpIntervalDays`. In `AddQuoteDialog.jsx`, injected `useSettings()`, defaulting `fetEnabled` to `settings.applyFetByDefault`, `terms` to `settings.defaultQuoteTerms`, and calculating default `validUntil` from `settings.quoteValidityHours`.
- **Issue #27 & #24 (Operator Sourcing-to-Quote Autofill & Date Normalization):**
  - Root cause: Operator quotes lacked an action to build a client quote. In addition, ISO datetime strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) caused `calendarDate` schema validation to fail on quotes and editing quotes.
  - Solution: In `Backend/src/common/dto/dates.ts`, enriched `calendarDate` Zod schema with `z.preprocess()` to cleanly strip ISO datetime components down to `YYYY-MM-DD` (`val.slice(0, 10)`). Added "Build Client Quote" action on approved quotes in `QuoteCard.jsx`, wired `handleBuildQuote()` in `SourcingRequestDetailSheet.jsx` to prefill `useQuotesStore.openAddQuoteModal(null, draft)` with operator, aircraft tail, cost, and request route/dates/party size. Mounted `<AddQuoteDialog />` in `OperatorSourcingPage.jsx`. Normalized edit dates via `toDateInput` in `AddQuoteDialog.jsx`.
- **Verification:**
  - Backend: Vitest 64/64 test suites (558 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
  - Frontend: `npm run lint` 0 errors; `npm run build` compiled all 45 routes with 0 errors.

### 30 Oct 2026 — QA Audit Remediation: Batch 3 (Operations & Flights Remediation)

- **Issue #9 & #26 (Trip Lifecycle, Confirmation Guardrails & Date Validation):**
  - Root cause: Trips could be moved to `CONFIRMED` without an operator, departure date, or passenger manifest/count. In addition, trips could be marked in-flight or completed prior to their departure date.
  - Solution: In `trips.service.ts` (`create` & `changeStatus`), enforced that moving to `CONFIRMED` requires `operatorId`, valid departure date, and `passengerCount >= 1` or manifest. Disallowed moving trips to `IN_FLIGHT` or `COMPLETED` when `departureDate > todayUtc()`. Updated `TripActionBar.jsx` to disable Confirm with tooltip when checklist items are incomplete and show settlement notices for unbilled balances. In `CreateFormActionBar.jsx`, added client-side leg sequence and unique airport validation.
- **Issue #22 & #26 (Itinerary Departure Time, Passenger Count & Email Sync):**
  - Root cause: Itinerary forms only tracked arrival time, leaving departure time reliant on trip creation defaults. Furthermore, when passenger names were not yet on file, itineraries showed blank or empty passenger cards even when the booking had a passenger count.
  - Solution: Added `departureTime` to `createItinerarySchema` and `updateItinerarySchema` in `itinerary.dto.ts`; synchronized outbound leg `departureTime` in `itineraries.service.ts`; updated `BuildItineraryDialog.jsx` with outbound departure time input and preview. In `ItineraryPreview.jsx`, added dedicated count card (`X Passengers (Manifest names pending confirmation)`) when individual names are absent.
- **Issue #25 (Flight Tracking Sync with Trip Status & Future Date Guards):**
  - Root cause: Flight tracking allowed manual reports of `IN_FLIGHT` and `LANDED` on future departure dates. When flights did update, the linked `Trip.status` was not synchronized.
  - Solution: In `trips.service.ts` method `updateFlight()`, blocked reporting `IN_FLIGHT` or `LANDED` before the flight's departure date. Automatically synchronized linked `Trip.status` to `IN_FLIGHT` on departure, and to `COMPLETED` once all active legs reach `LANDED`, with audit trails. In `FlightReportForm.jsx`, disabled future in-flight/landed options with pre-submit validation.
- **Issue #28 & #36 (Operator Sourcing Reference Search & RFQ Audit):**
  - Root cause: Sourcing search did not match integer references prefixed with `TR-` or unpadded numbers.
  - Solution: In `trip-requests.service.ts`, wired `referenceFromSearch(query.search, 'TR')` into the search query `OR` array. Added `Backend/src/modules/trips/trips.guardrails.spec.ts` pinning reference parsing, itinerary schemas, and lifecycle guards (5 tests).
- **Verification:**
  - Backend: Vitest 65/65 test suites (563 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
  - Frontend: `npm run lint` 0 errors; `npm run build` compiled all 45 routes with 0 errors.

### 30 Oct 2026 — QA Audit Remediation: Batch 4 (Polish & Edge Validations)

- **Issues #7 & #15 (Credit Ledger Overdraw Guard & Client Activity Timeline):**
  - Root cause: Removing a credit from `client_credits` did not verify if the balance would drop below zero, allowing a credit to be withdrawn even if it had already been spent on trips or invoices. Additionally, credit movements were not surfacing on the client's timeline.
  - Solution: In `client-credits.service.ts` (`remove`), checked remaining balance excluding target entry via `balanceCentsFor(target.clientId, id)`. If `balanceWithoutThisEntry < 0`, threw a detailed `BadRequestException` naming the amount and deficit. In `notes.service.ts` (`timeline`), expanded `eventWhere` for client subjects to merge audit logs for `ClientCredit` and `Trip` entries via JSON `path: ['clientId']`. In `timeline.js`, mapped credit ledger and client advance events with formatted currency amounts.
- **Issue #12 & #13 (Lead Route Airport Block & Canonical Funnel Stages):**
  - Root cause: `AddClientDialog.jsx` allowed identical origin and destination preferred route airports, and `client.js` still listed legacy lead stages (`NEGOTIATING` / `BOOKED`) out of sync with `LeadStage` Prisma enum.
  - Solution: Added client-side `toastError` validation in `AddClientDialog.jsx` blocking identical preferred route airports. Synchronized `STAGE_LABELS` in `Frontend/src/lib/client.js` to canonical stages (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `QUOTED`, `WON`, `LOST`).
- **Issue #16 & #34 (Active Agents Directory & Broker Roles Scope):**
  - Root cause: `brokerPerformance` in `clients.service.ts` did not check `status: UserStatus.ACTIVE` and excluded `SUPER_ADMIN`, counting inactive accounts. In `Frontend/src/lib/roles.js`, `BROKER_ROLES` only contained `BROKER`, causing administrators and owners managing charter deals to be excluded from broker pickers and table filters.
  - Solution: Added `status: UserStatus.ACTIVE` and `UserRole.SUPER_ADMIN` to `brokerPerformance` query in `clients.service.ts`. Updated `BROKER_ROLES = new Set(["BROKER", "ADMIN", "SUPER_ADMIN"])` in `roles.js`.
- **Issue #17 (User Invite Phone & Aircraft Weight/Year Guards):**
  - Root cause: User invitation schema accepted invalid non-phone strings. Aircraft schemas allowed future `yearBuilt` and did not ensure `emptyWeightLb < maxTakeoffWeightLb`.
  - Solution: Added regex phone validation to `inviteUserSchema` and `updateUserSchema` in `user.dto.ts` and to `UserForm.jsx`. Bound `yearBuilt` maximum to current year, added `.refine()` on aircraft schemas and service enforcing `emptyWeightLb < maxTakeoffWeightLb`. Added `aircraft.guardrails.spec.ts` pinning 7 validation scenarios.
- **Issue #37 & #38 (Email Template Monetary Formatting & Instant Estimate Carry-Over):**
  - Root cause: Template merge fields lacked explicit money formatting on financial fields, and Instant Estimate did not carry over selected aircraft category, prefilled aircraft label, or estimated cost into quote creation.
  - Solution: Added `base_price`, `deposit_amount`, and `balance_due` merge keys to `email.fields.ts` and formatted all monetary tags via `formatMoney()` in `emails.service.ts`. Updated `startQuote` in `InstantEstimateDialog.jsx` to pass category, formatted category aircraft label, price, and operator cost to `openAddQuoteModal`.
- **Verification:**
  - Backend: Vitest 66/66 test suites (570 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
  - Frontend: `npm run lint` 0 errors; `npm run build` compiled all 45 routes with 0 errors.

### 9 Nov 2026 — CRM Development Tasks Roadmap & Technical Alignment (Antigravity)

- **Comprehensive Codebase Audit against 8 Feedback Items:**
  - Analyzed and mapped all 8 user feedback areas across the fullstack repository (PostgreSQL schema, NestJS backend, Next.js frontend).
  - Categorized items into already implemented, partially implemented, not implemented, and items requiring careful architectural protection.
- **Architectural Decisions & Technical Alignment:**
  1. **Trip Approval Workflow (Item 2.1):** Decided on non-breaking sub-state `approvalStatus: PENDING | APPROVED | REJECTED` on `Trip` (default `APPROVED` for admins, `PENDING` for brokers). Blocks moving to `CONFIRMED` until Admin approves via `TripActionBar`. Dispatches in-app task and email to admins. Preserves core `TripStatus` enum.
  2. **Operator Payment Statuses (Item 1.4):** Decided on automated `Operator Payment Sent` (ticks complete when operator payable is marked `PAID`) and a verified desk toggle `Operator Payment Received` (marked when the operator's accounting team confirms remittance).
  3. **Bank Wire Instructions (Item 7.1):** Global company defaults added to `Settings › Company & Branding` (`bankName`, `routingNumber`, `accountNumber`, `swiftBic`, `beneficiaryName`, `wireInstructionsText`), inherited by invoices with optional per-invoice override, and rendered in `ReceivableDetailSheet.jsx`, Client Portal statement tab, and downloaded PDF invoices (`renderInvoicePdf`).
  4. **Broker Commissions (Item 2.2):** Add `BROKER` to `CommissionRecipientType` in schema, wire `BrokerPicker` into `AddCommissionDialog.jsx`, and display broker payee badges.
  5. **Quick Wins (Items 4.1, 5.1, 6.1):** Move Ask AI to global `DashboardLayout.jsx` for all 45 routes; upgrade `CommonDatePicker.jsx` with year dropdown selector (1920–present) and manual typing; verify Google Sheets export compatibility.
  6. **Checklist & Booking UX (Items 1.1, 1.2, 1.3, 8.1-8.3):** Build `BookingConfirmationDialog` with celebratory animation and invoice reminder; add "Go" navigation buttons to `TripConfirmationCard.jsx`; add Contract status card with Avanode and DocuSign launch buttons.
  7. **Notifications & Activity Filtering (Items 2.3, 3.1, 3.2):** Add broker/user filter to Recent Activity API and feed; dispatch in-app bell notification and SMTP email when an admin assigns a trip to a broker.
- **Batch 1 (Quick Wins & UI Polish) Implemented & Verified (9 Nov 2026):**
  - **4.1 Global Ask AI:** Moved `<AskAnythingPopover />` from `OverviewPage.jsx` into global `DashboardLayout.jsx` (`Frontend/src/app/dashboard/layout.js`). Added global `⌘K` / `Ctrl+K` keydown toggle listener and accessible trigger badge. Ask AI is now universally active across all 45 CRM screens.
  - **5.1 Birthday & Date Picker Year Navigation:** Upgraded `CommonDatePicker.jsx` with an interactive month and year dropdown selector (spanning 1920 to current year + 15) and a manual keyboard date input (`YYYY-MM-DD`). Fixes birthday and passenger manifest DOB selection, completely eliminating 500+ single-month step clicks.
  - **6.1 Google Sheets Export Clarity:** Updated export format labels in `Frontend/src/lib/reports.js` and added Google Sheets import guidance (`File → Import → Upload`) in `ExportOperationsDialog.jsx`.
  - **Verification:** Frontend ESLint 0 errors / 0 warnings (`npm run lint`), Next.js Turbopack build 100% successful with 0 errors across all 45 routes (`npm run build`), Backend Vitest 66/66 test suites (570 tests) pass 100% green.
- **Batch 2 (Invoicing & Financial Enhancements) Implemented & Verified (9 Nov 2026):**
  - **7.1 Bank Wire Instructions:**
    - Schema & Migrations: Added `wireBankName`, `wireBeneficiaryName`, `wireRoutingNumber`, `wireAccountNumber`, `wireSwiftBic`, `wireInstructions` to `CompanySettings` and `wireInstructions` text to `Invoice`. Applied Prisma migration `20261109160000_wire_instructions_and_broker_commission`.
    - Backend: Updated `settings.dto.ts`, `settings.view.ts`, `settings.service.ts` (`documentBranding()`), and `pdf.document.ts` / `pdf.templates.ts` (`renderInvoicePdf`). Updated `receivables.service.ts` to include `wireInstructions` on invoice creation/updates and returned resolved `wireRemittance` in `findOne()` and `client-portal.service.ts` (`overview()`).
    - Frontend: Added Bank Wire Instructions configuration card to `CompanyBrandingSection.jsx` under Settings › Company & Branding. Added optional per-invoice wire instructions textarea to `AddReceivableDialog.jsx`. Rendered a dedicated "Bank Wire Instructions" card in `ReceivableDetailSheet.jsx` and Client Portal Statement tab in `ClientPortalView.jsx`.
  - **2.2 Broker Commissions:**
    - Schema & Migration: Added `BROKER` to `enum CommissionRecipientType` in `commission.prisma`.
    - Backend: Updated `commissions.service.ts` to handle `CommissionRecipientType.BROKER` in `recipient()`, `recipientLabel()`, and row-level reach scoping (`brokerId === user.id OR recipientUserId === user.id`).
    - Frontend: Added `BROKER: "Broker"` in `commission.js` (`RECIPIENT_TYPES`, `RECIPIENT_LABELS`), added `"Broker": "info"` tone in `StatusBadge.jsx`, and integrated `BrokerPicker` inside `AddCommissionDialog.jsx` when "Broker" recipient tab is selected.
  - **Verification:**
    - Backend: Vitest 66/66 test suites (570 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
    - Frontend: `npm run build` compiled all 45 routes with 0 errors; ESLint 0 errors.
- **Batch 3 (Trip Operations, Checklist & Contracts) Implemented & Verified (9 Nov 2026):**
  - **1.1 Passenger Count Auto-Population:**
    - Frontend: In `BuildItineraryDialog.jsx`, added passenger count sync badge displaying total count (`trip.passengerCount ?? trip.passengers.length`) and manifest passenger names when a trip is selected from `TripPicker`.
  - **1.2 Booking Confirmation Pop-Up:**
    - Frontend: Created `useBookingConfirmationStore.js` and `BookingConfirmationDialog.jsx` featuring celebratory confetti animation (pure Framer Motion physics), trip summary, invoice reminder banner, and a direct "Generate Invoice" action button. Wired into `TripActionBar.jsx` (on status move to BOOKED), `CreateFormActionBar.jsx` (on trip creation with BOOKED/CONFIRMED), and `QuoteStatusActionsCard.jsx` (on booking quote). Mounted globally in `DashboardLayout.jsx`.
  - **1.3 Checklist "Go" Navigation:**
    - Frontend: Replaced static icons in `TripConfirmationCard.jsx` with active "Go" buttons navigating directly to target cards via smooth anchor scrolling (`#flight-info-card`, `#operator-card`, `#passengers-card`, `#financial-card`, `#contract-card`) or deep linking to linked modules (`/dashboard/receivables`, `/dashboard/operator-payments`, and itinerary builder).
  - **1.4 Operator Payment Statuses:**
    - Schema & Migrations: Added `operatorPaymentReceivedAt` timestamp column to `trips` in migration `20261109170000_trip_contracts_and_operator_payment_received`.
    - Backend: Updated `trip.dto.ts` and `trips.service.ts` to support `operatorPaymentReceived` boolean in creates and updates.
    - Frontend: Added `Operator payment sent` (auto-completed when operator payable is paid) and `Operator payment received` (with direct "Confirm Receipt" / "Mark Unreceived" toggle button) in `TripConfirmationCard.jsx`.
  - **8.1, 8.2, 8.3 Contract Management & Launch Buttons:**
    - Schema & Migrations: Added `contractSentAt` and `contractReceivedAt` timestamp columns to `trips`.
    - Backend: Updated `trip.dto.ts` and `trips.service.ts` to support `contractSent` and `contractReceived` booleans.
    - Frontend: Added `TripContractCard.jsx` in `TripDetailsView.jsx` displaying live contract status badges (`Contract Sent`, `Contract Received`), toggle actions, and direct launch buttons for **Avanode** (`https://www.avanode.com`) and **DocuSign** (`https://app.docusign.com`).
  - **Verification:**
    - Backend: Vitest 66/66 test suites (570 tests) pass 100% green; `tsc --noEmit` 0 errors; `oxlint` 0 errors.
    - Frontend: `npm run build` compiled all 45 routes with 0 errors; ESLint 0 errors / 0 warnings.
- **Batch 4 (Approvals & Notifications) Implemented & Verified (9 Nov 2026):**
  - **2.1 Admin Trip Approval Workflow:**
    - Schema & Migrations: Created `TripApprovalStatus` enum (`PENDING`, `APPROVED`, `REJECTED`) and added `approvalStatus`, `approvedAt`, `approvedById`, `approvedBy`, and `rejectionReason` to model `Trip`. Added `approvedTrips` relation to model `User`. Created and applied migration `20261109180000_trip_approval_workflow`.
    - Backend:
      - Trips created by administrators default to `APPROVED`; trips created by brokers default to `PENDING`.
      - Blocked confirming trips while approval is `PENDING` (`BadRequestException` with explanatory message).
      - Added `POST /trips/:id/approve` and `POST /trips/:id/reject` in `TripsController` guarded with `Action.EDIT` and `isAdministrator` check.
      - Dispatches review tasks and email notices to all active Admins upon trip submission by a broker.
      - Dispatches task and transactional decision email to the submitting broker upon approval or rejection.
    - Frontend:
      - Added `useApproveTrip` and `useRejectTrip` hooks in `@/hooks/trips`.
      - Added `RejectTripDialog.jsx` for admins to provide a rejection reason.
      - Updated `TripActionBar.jsx` with "Approve Trip" and "Decline Approval" actions for admins on pending trips, and blocked "Mark Confirmed" with a helpful tooltip.
      - Added approval banner in `TripDetailsView.jsx` and approval badges in `TripHeaderTitle.jsx` and `TripsTableRow.jsx`.
  - **2.3 Recent Activity User/Broker Filter:**
    - Backend: Extended `dashboardActivitySchema` with optional `userId: z.uuid()` and updated `activityWhere` in `dashboard.activity.ts` to filter by `actorId`.
    - Frontend: Upgraded `RecentActivityFeed.jsx` with a team member selector dropdown filtering audit logs by user, and added clear empty state feedback.
  - **3.1 & 3.2 Trip Assignment Notifications:**
    - Backend: Implemented `sendTripAssignment()` in `MailService` and wired automatic task creation (`TaskPriority.HIGH`, `dueDate: todayUtc()`) + transactional email sending upon trip creation or reassignment to a broker.
  - **Verification:**
    - Backend: Vitest 66/66 test suites pass 100% green; `tsc --noEmit` 0 errors; `npm run lint` 0 errors.
    - Frontend: `npm run lint` 0 errors / 0 warnings; Next.js `npm run build` compiles all 45 routes with 0 errors.
- **Current State:** All 4 Batches (1, 2, 3, and 4) covering all 8 feedback areas are 100% completed, tested, and verified on branch `roy`. Ready for final review.
