# Codex prompt — WhatsApp assistant, step 6b: operations

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-6b-operations.md and carry out everything
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

You are implementing **step 6b** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center. Steps 1–5 and 6a (sales desk reads) are
built, reviewed and live. 6b adds the operations reads. Another engineer
will review your work line by line against `AGENTS.md`.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two (especially "The
   WhatsApp assistant is one phone…"), `docs/WHATSAPP_AI_INTEGRATION.md`,
   every file in `Backend/src/modules/whatsapp/`. Then the services and DTOs
   §2 names. **6a's five tools are the pattern** (`list_trip_requests`,
   `list_quotes`, `client_follow_ups`, `lead_pipeline`, `client_notes`) —
   match their style, comment density and naming exactly.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, which
   loads it through `dotenv`; that is the tool reading its config, not you.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`. No new package.
6. **Read tools only. No frontend, no Postman, no schema, no migration, no
   new HTTP route, no change to any service outside `whatsapp/`.** If a tool
   seems to need a service change — or a service's `where` looks like it
   could let a search widen a caller's reach (the bug 6a found twice) — stop
   and report it.

## 1. The rules every tool follows (as 6a)

- **An explicit permission** on the definition; a second module read inside
  `run` is checked too with `canDo`.
- **Through the owning service**, with its own query schema's `.parse(...)`.
  Never Prisma from the bot.
- **An explicit field allowlist** — a small Zod row schema per tool, only the
  fields listed below, never a spread row. Ids only where the table says.
- **At most ten rows** plus `total`, except `trip_details` (one record).
- **Dates:** a calendar day as `YYYY-MM-DD` (`isoDay`); a moment through
  `formatMomentIn(value, context.timeZone)`. Flight times (`departureTime`,
  `estimatedArrival`) are stored as airport-local `"HH:MM"` — return them as
  stored and label them local; never convert them.
- **Money:** formatted with `formatDollars(toCents(...))` as 6a's
  `list_quotes` does (the model drops cents from a bare number), and only
  what the service returned to this caller — never computed here.
- **Never personal documents:** no passport number, date of birth or any
  passenger field beyond the name.

## 2. The five tools

| Tool | Args (Zod, `.strict()`) | Calls | Permission | Returns |
|---|---|---|---|---|
| `trip_details` | `{ trip }` — `TJ-1048` or `1048` (reuse `tripReference`) | step 4's `resolveTrip`, then `TripsService.findOne(user, trip.id)` | `TRIPS · VIEW` | reference, status, approval status, type, client, assigned broker, operator, aircraft (model and tail), every leg (sequence, origin and destination ICAO, departure date, local departure time — **no flight status**: `findOne`'s leg select does not carry it, and `list_flight_status` answers that), passenger **count and names only**, total price (formatted, or `null` while unpriced), and — **only when the service returned them** (`TRIPS · VIEW_MONEY`) — operator cost, gross profit, margin %; the client payment summary only when the service returned `clientPayment` |
| `list_flight_status` | `window?` (`ACTIVE` default / `TODAY` / `PAST`), `flightStatus?` (`FlightStatus` or `NONE`), `search?` (2–100) | `FlightTrackingService.findAll` with `on: nowIn(context.timeZone).date` — so "today" is the asker's day, not UTC — `limit: 10` | `FLIGHT_TRACKING · VIEW` | per leg: trip reference, leg sequence / leg count, origin and destination ICAO, departure date, local departure time, flight status, estimated arrival (local), when the status was last set (moment, asker's zone), aircraft tail, operator |
| `list_empty_legs` | `status?` (`EmptyLegStatus`, default `AVAILABLE`), `search?` (2–100) | `EmptyLegsService.findAll`, `limit: 10` | `EMPTY_LEGS · VIEW` | origin and destination ICAO, departure date and local time, aircraft (tail/model or the free-text description), operator, seats if stored, asking price (formatted, or `null` when not set), status, offer expiry (moment) |
| `find_operator` | `query` (2–100), `status?` (`OperatorStatus`) | `OperatorsService.findAll({ search })`, `limit: 5` | `OPERATORS · VIEW` | name, status, contact name, contact email and phone, general phone, reliability and safety rating (numbers or `null` — **never a default**), response speed, payment terms, fleet size if the list returns one |
| `find_aircraft` | `query?` (2–100), `category?` (`AircraftCategory`), `minPassengers?` (int 1–200, the aircraft DTO's own bounds), `status?` (`AircraftStatus`) — at least one of them | `AircraftService.findAll(...)`, `limit: 10` | `AIRCRAFT · VIEW` | tail number, model, category, status, passenger capacity, operator name, home base ICAO |

Notes for each:

- **`trip_details`** — `findOne` already applies reach and the money and
  receivables gates; read what it returns and pass through only what is
  there. A field it left `undefined` is absent from the result, not `null`
  and not computed. The trip's own read permission covers the operator and
  aircraft names it carries. Its description tells the model to use
  `list_flight_status` for whether a leg has departed, is delayed or landed.
- **`list_flight_status`** — check that `FlightTrackingService.findAll`
  accepts `on` as a `YYYY-MM-DD` day through `queryFlightsSchema`; if it
  does not, stop and report. Do not touch the service's `todayUtc()`
  default (the desk rules move to the company zone in a later pass); the
  bot passing the asker's day is what makes "today" right here.
- **`list_empty_legs`** — the service decides `EXPIRED` vs `AVAILABLE`
  (a lapsed offer); do not recompute it. Read the schema for the seats and
  expiry columns' real names; omit a field the model does not have.
- **`find_operator`** — ratings are the desk's own 0–5 numbers: `null` stays
  `null` ("not rated"). Leave out `sourcingNotes` and the cancellation
  policy (long free text the model does not need to answer "who is X").
- **`find_aircraft`** — "what can carry nine people" is `minPassengers: 9`.
  Refuse a call with none of the four args (`{ error }` via the args
  schema) rather than listing the whole fleet.

The schedule is already covered — `list_flights` takes any window up to 14
days. Do not add a schedule tool.

## 3. The agent's instructions

One line in `whatsapp.agent.ts`'s instructions: flight times are local at
the airport and are said as "local"; never convert them to the Super
Admin's zone. Nothing else changes there.

## 4. What must not change

- The gates, CONFIRM, the pending rules, PDFs and every existing tool.
- Nothing logs message text, arguments or results.
- No tool returns a field the table does not list.

## 5. Tests — `whatsapp.tools.spec.ts`

Every case must exist and pass (stub the services, as 6a's tests do):

- **each tool** calls its service with exactly the query described (assert
  the parsed object; `list_flight_status` passes `on` as the context zone's
  day — use a zone and a clock where that differs from the UTC day);
- **each tool** returns only allowlisted fields — feed a row with an extra
  field carrying `secretMarker` and assert the JSON result lacks it;
  `trip_details` is fed a passenger with a passport number and date of
  birth, and neither appears;
- **without its permission** each tool returns not permitted and never calls
  the service;
- `trip_details`: with `operatorCost` / `grossProfit` / `marginPercentage`
  absent from the service's row they are absent from the result; present,
  they are formatted; an unknown reference → `{ error }`;
- money formatted (`$35,935.10`); a null price stays `null`;
- `find_operator` keeps a null rating `null`;
- `find_aircraft` with no args → `{ error }` and no service call;
  `minPassengers` reaches the query;
- local flight times are returned exactly as stored.

## 6. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: mark 6b `🔍 <date> — built by
  Codex, awaiting review` with the test counts.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": a Working line for
  the five operations reads; the "More tools" waiting row now says 6c–6d.
- Do **not** edit `HANDOFF.md` or `AGENTS.md`.

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
