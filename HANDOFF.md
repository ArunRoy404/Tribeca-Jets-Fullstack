# Handoff — where the project is, and how to pick it up

**Last updated: 8 October 2026.** Update the "Where we are" section in the
same pass as any session that ships, reviews or commits something. A stale
handoff is worse than none: the next session trusts it.

Three parts: **where we are**, **get it running**, **the prompt to paste**.

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
| 6 | **Charter Rates / Instant Estimate** | ⬅ **Next** |
| 7–35 | Operators, Aircraft, Clients, … | ⬜ in the table's order |

**Git:** branch `roy`, in step with `origin/roy`. Latest migration:
`20261007180000_company_settings` (run `npm run db:deploy` on any database
that has not had it).

### What changed in the last session (7 Oct)

- **Role restrictions back on.** The 4–7 Oct "everyone is SUPER_ADMIN" switch
  is `true` again on both sides; unreviewed modules follow the old role
  matrix until their review moves them to per-person permissions. Identity
  (`isAdministrator`, `isPartner`) never goes through the switch.
- **Uploads review:** private files no longer leak, removal is narrower than
  reading (403 vs 404), filenames cleaned, size limits in three places agreed,
  partial S3/R2 config refuses to boot, filenames shown middle-truncated so
  the extension stays visible, AVIF accepted as an image.
- **Settings (#26) API built:** one `company_settings` row for the whole
  company; `GET/PATCH /settings` (`SETTINGS · VIEW/EDIT`), audited; public
  `GET /settings/branding` and `/settings/branding/logo`. Auth reads the idle
  timeout, warning and "require 2FA for admins" from it (the
  `AUTH_IDLE_TIMEOUT_MINUTES` env var is gone). Every email is branded from it.
- **Branding everywhere:** `BrandLogo` in every sidebar (CRM and portal),
  auth screens, splash, loader and 404; company name in tab titles, the
  portal wording and the assistant; `TribecaLetterhead`'s contact block is
  **all or nothing** (name, website, email, phone, address — or none).
  The sign-in page's stats (240+, $18M, 96%) are kept as they are, by the
  owner's decision.
- **Hidden, by the owner's decision (logged in MODULE_FEATURE_STATUS):** the
  Integrations tab, and the Import card on the Data tab. Export stays visible
  but is not connected yet.

### What is next

1. **Charter Rates / Instant Estimate (#6).** It resolves airports
   through `AirportsService.findOne(id)`, which also returns archived
   airports — its review should refuse an archived origin/destination.

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

### Known findings, not yet fixed (each on its module's turn)

- Postman folders **16–28** are missing from the collection JSON (their
  builders exist in `Backend/postman/`). Rebuild each with its module's review.
- Frontend lint: one pre-existing error, `react-hooks/set-state-in-effect` in
  `TripRequestDialog.jsx` — Trip Requests (#13).
- Airport form upper-cases "State" (fine for NY, wrong for "Ontario") — offered, not decided.
- An uploaded logo is shown on the dark sidebar and on light pages alike; a
  dark-only logo may lack contrast in the sidebar. A second "logo for dark
  backgrounds" field was offered, not built.
- `Frontend/src/hooks/operators/README.md` describes the old role table
  (`SENIOR_BROKER`) like the airports one — rewrite it in Operators' review.
- Probe files (~70 MB) from upload testing sit in `Backend/storage/documents`
  (local disk only; safe to delete).

---

## Part 2 — Get it running

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

- **Seeded accounts** are all on `example.com` with password `ChangeMe123!`:
  `admin@` (SUPER_ADMIN), `broker@`, `mark@`, `barry@`, `assistant@`,
  `security@` (ADMIN, 2FA on), `reset-demo@`, and the referral agent
  `agent@example.com`, who signs in to `/portal`.
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
npx tsc --noEmit && npm run lint && npm test      # 7 Oct baseline: 327 tests pass
cd ../Frontend && npx eslint src/<touched> && npm run build
```

**Postman / Newman** — never against the dev API on 4000 (it sends mail):

- Run a second API on **port 4100** with `MAIL_DRIVER=log` and
  `REDIS_URL=redis://localhost:6380/1` (its own Redis DB, so the dev API's
  mail worker never picks up a run's emails). `RATE_LIMIT_MULTIPLIER=20` in
  `Backend/.env` for a full run.
- Builders take `POSTMAN_BASE=http://localhost:4100/api`; after any builder,
  `cd postman && python rewrite_body_comments.py`.
- Newman from `Backend/`:
  `npx newman run postman/Tribeca-Jets-API.postman_collection.json -e postman/Local.postman_environment.json --env-var baseUrl=http://localhost:4100/api`
  — 7 Oct baseline: 205 requests, 0 failures. Run twice.
- The two APIs **share one database**: a folder that changes settings or
  business data restores it in its teardown. Never email a real person.

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
> 1. `HANDOFF.md` — where we are and what is next.
> 2. `AGENTS.md` — the whole rulebook, in full. Every rule in it was written
>    after something broke.
> 3. `docs/MODULES.md` — the **Review order** table is the tracker; §26 has
>    the map of which module reads which setting.
> 4. `docs/MODULE_FEATURE_STATUS.md` — per module, what works and what is
>    waiting or hidden.
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
> Start by reading the four files, then tell me the current state and the
> next step in a short list. Don't write code until I confirm.
