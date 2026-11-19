# Codex prompt — WhatsApp assistant, step 6a: the sales desk

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-6a-sales-desk.md and carry out everything
below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (parts one and two),
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env. Tests stub every service.
- No npm install. No database, no migration — this step changes no schema.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §7 commands exactly as written and finish with the §7 report.
```

---

You are implementing **step 6a** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center. Steps 1–5 are built, reviewed and live.
Step 6 adds tools module by module in four briefs (6a sales desk, 6b
operations, 6c money, 6d new actions); this is the first. Another engineer
will review your work line by line against `AGENTS.md`.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two (especially "The
   WhatsApp assistant is one phone…"), `docs/WHATSAPP_AI_INTEGRATION.md`,
   every file in `Backend/src/modules/whatsapp/`. Then the services and DTOs
   §2 names. Match the existing tools' style, comment density and naming
   exactly — `list_pending_approvals`, `list_open_tasks` and `find_client`
   are the pattern.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, which
   loads it through `dotenv`; that is the tool reading its config, not you.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`. No new package.
6. **Read tools only. No frontend, no Postman, no schema, no migration, no
   new HTTP route, no change to any service outside `whatsapp/`.** If a tool
   seems to need a service change, stop and report it.

## 1. The rules every new tool follows (already true of the existing ones)

- **An explicit permission** on the definition; when a tool reads a second
  module, check that one too with `canDo` inside `run` (as `send_itinerary`
  does for `TRIPS · VIEW`).
- **Through the owning service's `findAll`**, with its own query schema's
  `.parse(...)` — so reach, archive filtering and validation are the
  service's. Never Prisma from the bot.
- **An explicit field allowlist**: parse each row with a small Zod schema
  (as `tripRow`, `taskRow`) and return only the fields listed below. Never
  spread a row. No ids except where the table says so (an id the model needs
  for a follow-up call).
- **At most ten rows** per call, plus `total` from `meta.total`, so the model
  can say "10 of 23 — narrow it down".
- **Dates:** a calendar day (`@db.Date`) as `YYYY-MM-DD` (`isoDay`); a
  moment through `formatMomentIn(value, context.timeZone)` — 24-hour, as
  every time the bot shows.
- **Money as the service returns it, never computed here.** A quote's
  `totalPrice` is the offer the client sees and is returned to anyone with
  `QUOTES · VIEW`; only the desk's margin (operator cost, gross profit,
  margin) sits behind `QUOTES · VIEW_MONEY`, and this step returns none of
  those. Never compute or guess a figure.
- **Descriptions** tell the model what the tool returns and when to use it,
  in the style of the existing ones.

## 2. The five tools

| Tool | Args (Zod, `.strict()`) | Calls | Permission | Returns per row |
|---|---|---|---|---|
| `list_trip_requests` | `status?` (`TripRequestStatus`), `departure?` (`OVERDUE` / `TODAY` / `UPCOMING`), `search?` (2–100 chars) | `TripRequestsService.findAll` with `openOnly: true` unless a `status` is given, `limit: 10` | `TRIP_REQUESTS · VIEW` | reference as `TR-<n>` (check the label the module uses), client display name, origin and destination ICAO, departure date, passengers, aircraft preference, status, assigned broker |
| `list_quotes` | `status?` (`QuoteStatus`), `expired?` (boolean) — **never both** (the args schema refuses the pair with a message), `sort?` (`NEWEST` default / `EXPIRING`), `search?` (2–100) | `QuotesService.findAll`; `openOnly: true` unless `status` or `expired` is given; `EXPIRING` → `sortBy: 'validUntil', sortOrder: 'asc'`; `limit: 10` | `QUOTES · VIEW` | reference as `Q-<n>`, client, origin and destination ICAO, departure date, status, valid until, total price (the client's offer, as the service returns it), assigned broker |
| `client_follow_ups` | `window` (`OVERDUE` / `TODAY` / `UPCOMING`, required) | `ClientsService.findAll` with `followUp: window`, `sortBy: 'nextFollowUpAt', sortOrder: 'asc'`, `limit: 10` | `CLIENTS · VIEW` | `id`, display name, status, lead stage, next follow-up (moment, asker's zone), follow-up method, follow-up note, assigned broker |
| `lead_pipeline` | `stage?` (`LeadStage`) | Without `stage`: one `ClientsService.findAll({ status: LEAD, leadStage, limit: 1 })` per stage, reading only `meta.total` → `{ stage, count }` for every `LeadStage`. With `stage`: that stage's leads, newest first, `limit: 10` | `LEADS_AGENTS · VIEW` **and** `CLIENTS · VIEW` (it reads through Clients) | counts; or per lead: `id`, display name, company, lead source, priority, next follow-up, assigned broker |
| `client_notes` | `clientId` (uuid — from `find_client`, `client_follow_ups` or `lead_pipeline`) | `NotesService.findAll` with `subjectType: CLIENT, subjectId: clientId`, live notes only, newest first, `limit: 10` | `CLIENTS · VIEW` (a note is readable when its client is — the service resolves the subject) | date (moment, asker's zone), author name, visibility, body cut to 500 characters with `…` |

Notes for each:

- **`list_trip_requests`** — check how the module labels its reference
  (schema says `"TR-1042"`); use the module's own helper if there is one.
  Leave the **budget out**: it is money, and this tool carries no money
  permission. **The scope leak you found is fixed already** (19 Nov, by
  the reviewer): `findAll` now joins visibility, search and `clientIds` in
  one `AND`, pinned by `trip-requests.scope.spec.ts`. Do not undo it.
- **`list_quotes`** — "which quotes expire this week" is `sort: EXPIRING`
  over open quotes; the model reads the dates. Expiry is derived by the
  service (`expired`); do not recompute it. The service's `expired: true`
  replaces any `status`, which is why the tool refuses the two together
  rather than silently dropping one.
- **`client_follow_ups`** — the windows are computed by the service against
  the **server's** day (desk rules still move to the company time zone in a
  later pass). Return the window name the model asked for and do not
  re-derive it; the description says the window is the CRM's.
- **`lead_pipeline`** — seven small count queries are fine; do not add a
  service method. If `ClientsService.findAll` cannot filter by both `status`
  and `leadStage` together, stop and report.
- **`client_notes`** — notes only, **not** the timeline (its audit events
  carry metadata this tool has no allowlist for). An unknown or unreachable
  client is the service's 404 → the dispatcher's `{ error }`; check that is
  how it surfaces and say so in the description ("No client you can see").

`find_client` already returns the client card; do not add a second one.
Its description may point the model at `client_notes` for the notes.

## 3. The agent's instructions

One line in `whatsapp.agent.ts`'s instructions, beside the existing tool
guidance: when a list's `total` is larger than what came back, say how many
there are in all and offer to narrow it down. Nothing else changes there.

## 4. What must not change

- The gates, CONFIRM, the pending rules, PDFs and every existing tool.
- Nothing logs message text, arguments or results.
- No tool returns a field the table does not list.

## 5. Tests — `whatsapp.tools.spec.ts`

Every case must exist and pass (stub the services, as the existing tests do):

- **each tool** calls its service with exactly the query described (assert
  the parsed object: `openOnly`, `followUp`, `sortBy`/`sortOrder`,
  `subjectType`/`subjectId`, `limit: 10`);
- **each tool** returns only the allowlisted fields — feed a row carrying an
  extra field with a distinctive value (`secretMarker`) and assert the JSON
  result does not contain it;
- **without its permission** each tool returns not permitted and never calls
  the service; `lead_pipeline` without `CLIENTS · VIEW` too;
- `list_quotes` returns `totalPrice` as the service gave it and none of
  operator cost, gross profit or margin (feed them in, assert they are
  absent); `status` together with `expired` → `{ error }` and no service
  call; `EXPIRING` sorts by `validUntil` ascending; `status` turns
  `openOnly` off;
- `list_trip_requests` never returns the budget;
- `lead_pipeline` without a stage returns one count per `LeadStage`, in
  enum order; with a stage, lists that stage;
- `client_notes` cuts a long body to 500 characters with `…`, and a service
  404 comes back as `{ error }`;
- moments are formatted in the context's zone, 24-hour.

## 6. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: split step 6's row into 6a–6d
  (6a sales desk, 6b operations, 6c money, 6d new actions with CONFIRM) and
  mark 6a `🔍 <date> — built by Codex, awaiting review` with the test counts;
  6b–6d `⬜`.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": a Working line for
  the five sales-desk reads; the "More tools" waiting row now says 6b–6d.
- Do **not** edit `HANDOFF.md` or `AGENTS.md` (no new rule in this step).

## 7. Done

Run from `Backend/` and paste the output:

```
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report file and test counts
```

Then a short report:

1. Files created / changed (one line each).
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that the brief did not cover.
4. Confirmation that nothing was committed and `.env` was not opened
   (`git status`).
