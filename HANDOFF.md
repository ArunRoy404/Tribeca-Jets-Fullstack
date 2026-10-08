# Handoff — where the project is, and how to pick it up

**Last updated: 8 October 2026.** Update the "Where we are" section in the
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
| 8 | **Aircraft** | ⬜ **next** |
| 9–35 | Clients, … | ⬜ in the table's order |

**Git:** branch `roy`, in step with `origin/roy`. Latest migration:
`20261008120000_operator_choices` (run `npm run db:deploy` on any database
that has not had it).

### What is next — Aircraft (#8)

What was found when the session ended (8 Oct), for the agent that starts it:

- **Backend** (`modules/aircraft/aircraft.controller.ts`): still on the old
  matrix — every GET has `@RequirePermissions(MANAGE_AIRCRAFT)`, writes have
  `@RequireWritePermissions`. Move GETs to session-only and writes to
  `@RequireAccess(Module.AIRCRAFT, CREATE/EDIT/ARCHIVE)`. Ask the owner
  whether aircraft reads are desk data (`@StaffOnly`) — the referral portal
  may not need them.
- **Picked ids:** `assertHomeBase` is a private copy → replace with
  `AirportsService.usable(id, 'home base')`. `assertOperator` refuses missing
  and archived; **ask the owner** whether a *Suspended* operator may get a
  new aircraft (recommendation: refuse — and this is the natural place to
  create `OperatorsService.usable`, which Sourcing, Quotes, Trips and Empty
  Legs will reuse).
- **Form** (`components/aircraft/AddAircraftDialog.jsx`): loads operators and
  airports as plain lists via `useOperators` / `useAirports` → switch to
  `OperatorPicker` and `AirportPicker`. Check every select is `CommonSelect`
  and photos/documents use `FileUpload`. `ChangeStatusDialog` too.
- **Table/card:** "—" in every empty cell; `canAccess` gating (hide, not
  disable); checkbox column only with a bulk action.
- **Figma check:** keep/drop review of the aircraft fields with the owner,
  as was done for Operators.
- **Postman:** `build_aircraft_folder.py` → `builder_common`, teardown as its
  own last request, run on `tribeca_postman`. It needs an operator and an
  airport to exist in that copy (refresh the copy first).
- **Data:** the owner's DB has one test operator ("test") and five airports
  (KTEB, KOPF, KVNY, KHPN, EGGW); enough to add an aircraft.

After Aircraft: Clients (#9), Notes (#10), Client Credits (#11), Leads &
Agents (#12)… in the Review order table.

**Postman now runs on its own database** — `tribeca_postman`, a copy of the
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

### The local database was wiped on 8 Oct 2026 (owner's request)

For clean testing, everything was removed except: the company settings, seven
accounts (admin@, security@, broker@, assistant@, agent@ on example.com, and
the owner's own Super Admin and Referral Agent accounts) and the owner's
profile photo. Airports, operators, clients, trips, quotes, rates, audit log
and every other upload are gone; the owner re-adds real data while testing.
A backup was taken first. Since then the owner added five airports (KTEB,
KOPF, KVNY, KHPN, EGGW), one test operator ("test", with a document) and
some charter rates while testing.

**Backups, outside the repo** (they hold password hashes — never commit them),
in `~/Desktop/works/Tribeca-Jets-Handoff/` on the owner's Mac:
- `db/tribeca_jets_2026-10-08_after_operators.dump` — the dev database as
  it stood at Operators' sign-off. **Restore this on a new machine** (Part 2).
- `storage_now/` — `Backend/storage/` at the same moment (the owner's
  photo, the test operator's document). Copy it to `Backend/storage/`.
- `backup_before_wipe/` — the database and storage before the 8 Oct wipe.

- **Do not run `npm run db:seed`** — it would bring the demo data and the
  removed accounts back.
- **Postman needs data now:** folders that read a client, operator or
  airport, or sign in as `mark@` / `reset-demo@` / `senior@`, fail until
  each module's review points them at what exists. Expect red runs until then.
- The Q-code test airports came from a Postman teardown that ran as a
  background call in the last request; when a folder is run on its own,
  Newman can stop before that call finishes. Make teardowns their own final
  request (fix per folder, on its review).

### Known findings, not yet fixed (each on its module's turn)

- Postman folders **16–28** are missing from the collection JSON (their
  builders exist in `Backend/postman/`). Rebuild each with its module's review.
- Frontend lint: one pre-existing error, `react-hooks/set-state-in-effect` in
  `TripRequestDialog.jsx` — Trip Requests (#13).
- `RecordPicker` (8 Oct): the shared searchable, paged picker. Wrappers so
  far: `AirportPicker` (used by the Instant Estimate) and `OperatorPicker`
  (not used yet — Aircraft is first). Every other airport/operator picker
  still loads the first 100 — switch each form on its module's review.
- `OperatorsService.usable` (refuse a suspended or archived operator) does
  not exist yet — create it on Aircraft, reuse it in Sourcing, Quotes,
  Trips, Empty Legs.
- Airport form upper-cases "State" (fine for NY, wrong for "Ontario") — offered, not decided.
- An uploaded logo is shown on the dark sidebar and on light pages alike; a
  dark-only logo may lack contrast in the sidebar. A second "logo for dark
  backgrounds" field was offered, not built.
- Probe files (~70 MB) from upload testing sit in `Backend/storage/documents`
  (local disk only; safe to delete).

---

## Part 2 — Get it running

### On a new machine, carrying the owner's data across

Follow **[START_HERE.md](START_HERE.md)** — what to copy, restoring the dev
database instead of seeding, the uploads folder, the Postman copy, and the
start/end-of-session routine for Claude Code and Antigravity.

### From scratch

```bash
git checkout roy          # the working branch, NOT main

# ---- Backend ----
cd Backend
cp .env.example .env      # set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ chars, different)
npm install
npm run db:generate       # Prisma client is generated and gitignored
npm run services:up       # Postgres 5432 + Redis 6380 via docker compose
npm run db:deploy         # applies migrations. NOT db:migrate (interactive, hangs)
npm run db:seed           # development fixture only — never in production
npm run start:dev         # http://localhost:4000/api, docs at /api/docs

# ---- Frontend (second terminal) ----
cd ../Frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

- **Accounts in the owner's (wiped) database**, all `ChangeMe123!`:
  `admin@example.com` (SUPER_ADMIN), `security@` (ADMIN, 2FA on), `broker@`,
  `assistant@`, `agent@` (referral agent, signs in to `/portal`), plus the
  owner's own two. A freshly seeded database also has `mark@`, `barry@`,
  `reset-demo@` and demo data.
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
