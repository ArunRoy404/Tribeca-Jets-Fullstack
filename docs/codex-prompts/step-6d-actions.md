# Codex prompt — WhatsApp assistant, step 6d: new actions with CONFIRM

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-6d-actions.md and carry out everything below
the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (parts one and two),
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env. Tests stub every service and Redis.
- No npm install. No database, no migration — this step changes no schema.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §8 commands exactly as written and finish with the §8 report.
```

---

You are implementing **step 6d** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center — the last part of step 6. Steps 1–5 and
6a–6c are built, reviewed and live. 6d adds **six new desk actions**, each
proposed first and run only on CONFIRM, exactly like step 4's five. Another
engineer will review your work line by line against `AGENTS.md`. These
tools change data: precision matters more than anything.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two — especially "The
   WhatsApp assistant is one phone…" and its CONFIRM bullets —
   `docs/WHATSAPP_AI_INTEGRATION.md`, every file in
   `Backend/src/modules/whatsapp/` (**`whatsapp.pending.ts`,
   `whatsapp.actions.ts` and step 4's five proposal tools are the pattern**:
   `approve_trip`, `decline_trip`, `create_lead`, `complete_task`,
   `record_payment`). Then the services and DTOs §3 names.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, which
   loads it through `dotenv`; that is the tool reading its config, not you.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`. No new package.
6. **No frontend, no Postman, no schema, no migration, no new HTTP route.**
   Outside `whatsapp/` you may only (a) export an existing service from its
   module for injection, and (b) add the one shared helper in §2. Any other
   service change: stop and report.
7. **The bot never emails a client, and adds no email of its own.**
   Marking a quote sent records the act; it emails nobody (the route says
   so too). What an owning service already does on the same write in the
   web app still happens, exactly as on screen — reassigning a trip makes
   `TripsService.update` give the new broker a "Review Assigned Trip" task
   and an assignment email. That is staff notification, wanted, and not
   this step's to suppress or bypass.

## 1. How every new action works (step 4's design, unchanged)

- The **proposal tool** resolves everything up front — the trip, client,
  quote, broker — through the owning services in the caller's scope, checks
  the permission, validates the payload with the **owning DTO's schema**,
  and stores a frozen `PendingAction` with a one-line summary via
  `propose(...)`. It changes nothing.
- The model's turn ends with `⚠️ summary` + the CONFIRM prompt, as today.
- **CONFIRM** takes it once (GETDEL), checks it belongs to this user, checks
  the **current** permission again (`ACTION_ACCESS` / `canRun`), re-parses
  the payload with the owning DTO, and calls the owning service — which
  applies reach, lifecycle rules and the audit log exactly as in the web
  app. Anything else cancels it.
- The **summary names the record in words** a person can check before
  confirming: `TJ-1048`, the client's name, the broker's full name, the
  date and time with its zone — never an id.
- `✅` / `❌ Not done:` replies as `WhatsappActions.run` already writes them;
  a service `HttpException` message is passed through.

## 2. One shared helper — a time in a zone to a moment

`client_follow_up` takes a day and a time **in the Super Admin's zone** and
must store a UTC moment. Add to `common/dates/time-zone.ts`:

```ts
/** "2026-11-20" + "14:30" in `zone` → that instant, or null for a time the zone skips. */
export function momentIn(date: string, time: string, zone: string): Date | null
```

Built on `Intl` only (no package), correct across DST: a time the zone
skips (spring forward) is `null`, and a repeated hour takes the first
occurrence. Test it in `time-zone.spec.ts` (create it beside the file if
none exists, matching the repo's spec style) for `America/New_York` on an
ordinary day, both DST transition days, `Asia/Dhaka` and `Europe/London`.

## 3. The six actions

| Tool (proposal) | Args (Zod, `.strict()`) | Resolves | Payload validated by | Runs (on CONFIRM) | Permission (`ACTION_ACCESS`) | `kind` |
|---|---|---|---|---|---|---|
| `create_task` | `title`, `dueDate?` (`YYYY-MM-DD`), `priority?` (`TaskPriority`), `assignee?` (a staff member's name, or `"me"`), `clientId?` (uuid, from `find_client`), `trip?` (`TJ-…`), `description?` | assignee via §4; trip via `resolveTrip` | `createTaskSchema` | `TasksService.create` | `TASKS · CREATE`, **plus `TASKS · ASSIGN` when the assignee is someone other than the caller** — the rule `TasksService.create` applies; check it in the proposal and again on CONFIRM | `TASK_CREATE` |
| `client_follow_up` | `clientId`, `date` (`YYYY-MM-DD`), `time?` (`HH:MM`, default `09:00`), `method?` (`FollowUpMethod`), `note?` | client via **`ClientsService.findOne`** (scoped; it carries the current follow-up and broker, which `subjectRef` does not) — refuse an archived client with `{ error }`; moment via `momentIn(date, time, context.timeZone)` — `null` → `{ error }` naming the skipped time | `updateClientSchema` with only `nextFollowUpAt`, `followUpMethod`, `followUpNote` | `ClientsService.update` | `CLIENTS · EDIT` | `CLIENT_FOLLOW_UP` |
| `add_client_note` | `clientId`, `body` (1–the DTO's max) | client via `subjectRef` (live) | `createNoteSchema` with `subjectType: CLIENT`, **`visibility: INTERNAL` always** — the bot never shares a note with a referral agent | `NotesService.create` | `CLIENTS · EDIT` | `NOTE_CREATE` |
| `change_trip_status` | `trip` (`TJ-…`), `status` (`TripStatus`), `note?` | `resolveTrip` | `changeTripStatusSchema` | `TripsService.changeStatus` | `TRIPS · EDIT` | `TRIP_STATUS` |
| `reassign` | `record` (`TRIP` / `CLIENT`), `trip?` or `clientId?` (exactly the one `record` names), `broker` (name) | the trip via `resolveTrip` (its row carries the assigned broker), the client via `ClientsService.findOne` as above; broker via §4 | `updateTripSchema` / `updateClientSchema` with **only** `assignedBrokerId` | `TripsService.update` / `ClientsService.update` | TRIP: `TRIPS · EDIT` **and** `TRIPS · ASSIGN`; CLIENT: `CLIENTS · EDIT` and (`CLIENTS · ASSIGN` or `LEADS_AGENTS · ASSIGN`) — the same rule the clients service applies | `TRIP_ASSIGN` / `CLIENT_ASSIGN` |
| `mark_quote_sent` | `quote` (`Q-1042` / `1042`), `validUntil?` (`YYYY-MM-DD`), `note?` | quote via step 5's quote resolution (lift it into a helper both `send_quote` and this use) | `sendQuoteSchema` | `QuotesService.send` | `QUOTES · SEND` | `QUOTE_SEND` |

Notes:

- **`create_task`** — an absent `assignee` leaves the task unassigned (the
  DTO's own rule); `"me"` is the caller. The summary names the assignee,
  the due date and the linked trip or client.
- **`client_follow_up`** — the summary says the day, the 24-hour time and
  the zone: `Follow up with Marcus Chen on Fri 20 Nov, 09:00 (Asia/Dhaka) by
  phone`. It overwrites the client's existing follow-up; when one is set,
  the summary says what it replaces (read it from the client row the
  proposal resolved).
- **`add_client_note`** — the summary quotes the first 80 characters of the
  body.
- **`change_trip_status`** — the proposal does **not** pre-check the
  lifecycle; `changeStatus` refuses a disallowed move on CONFIRM with a
  message naming the allowed ones, which the `❌` reply passes through. The
  summary names the current and the new status:
  `Move TJ-1048 from BOOKED to CONFIRMED`. A move to `CANCELLED` adds
  `— this cancels the trip` to the summary.
- **`reassign`** — refuse in the proposal when the broker is already the
  assignee (`{ error }`, nothing stored). Compare by **id**: `tripRow`
  carries only the broker's name today, so add `assignedBrokerId` to it if
  the trips list returns that field (check the select; if it does not,
  stop and report). The summary names both brokers:
  `Reassign TJ-1048 from Jordan Broker to Barry Wilson`. For a **trip**, it
  adds `— Barry Wilson gets a task and an email about it`, so the Super
  Admin knows before confirming (the service skips both when the new
  broker is the caller — say nothing then).
- **`mark_quote_sent`** — the summary ends `— records it as sent; no email
  is sent`. The tool description says the same, so the model never tells
  the Super Admin a quote was emailed.

## 4. Finding a staff member by name

`create_task`'s assignee and `reassign`'s broker are names. Resolve them
with one helper in `whatsapp.tools.ts` through the staff directory
(`UsersService.findAll`, the same read the broker pickers use):

- active accounts only; for `reassign`, only `BROKER_ROLES` from
  `common/authorization/roles.ts` (added by the reviewer on 19 Nov, paired
  with the frontend's list; Clients now uses it). Pass them to the users
  query as its comma-separated `role` filter. Trips' own `assertBroker`
  still accepts any live account — a logged finding for that module's
  review, **not** this step's: do not change it;
- match the full name case-insensitively with `exactMatches`; first name
  alone only when it is unique;
- none → `{ error: 'No active staff member named …' }`; two or more →
  `{ error }` listing the full names to choose from. Never guess.

## 5. Pending payloads

Each new `kind` gets its entry in `pendingActionSchema` (discriminated, as
today), carrying ids and the **parsed DTO payload** only — never a name to
resolve again later, and nothing the CONFIRM step would have to look up. The
existing five kinds do not change.

## 6. What must not change

- The gates, CONFIRM / CANCEL handling, the five-minute TTL, the
  one-action-per-reply rule, "anything else cancels", PDFs and every
  existing tool.
- `common/authorization/roles.ts`'s `BROKER_ROLES` and the Clients service
  that uses it (the reviewer's change) — use them, do not edit them.
- Nothing logs message text, arguments, payloads or note bodies (the
  existing `WhatsApp action <KIND> confirmed / refused (<status>)` lines
  only).
- No email, no notification beyond what the owning service already does.

## 7. Tests

Every case must exist and pass:

**`time-zone.spec.ts`** — §2's cases.

**`whatsapp.tools.spec.ts`** (per tool)
- stores the expected `PendingAction` (kind, ids, parsed payload, summary
  text exactly) and changes nothing — no write service method called;
- without its permission: not permitted, nothing stored; `reassign` without
  `ASSIGN` too;
- an unknown trip / quote / client / broker → `{ error }`, nothing stored;
  two staff with the name → `{ error }` listing both;
- `client_follow_up` turns `2026-11-20` `14:30` in `Asia/Dhaka` into
  `2026-11-20T08:30:00.000Z`, a skipped DST time → `{ error }`, and the
  summary names the zone and the follow-up it replaces;
- `add_client_note` always stores `INTERNAL`, even when the model asks for
  SHARED (the args schema has no visibility field — assert a call with one
  is refused);
- `reassign` to the current broker → `{ error }`; `record: TRIP` with a
  `clientId` → `{ error }`;
- `mark_quote_sent`'s summary says no email is sent.

**`whatsapp.pending.spec.ts`** / actions
- each new kind round-trips through `put` / `take`; a tampered payload that
  fails the DTO is refused on CONFIRM with nothing written;
- CONFIRM calls exactly the owning service method with the stored ids and
  payload, and replies `✅ …`; a service `BadRequestException` (e.g. a
  refused trip move) → `❌ Not done: <its message>`;
- permission removed between proposal and CONFIRM → refused, nothing
  written;
- CONFIRM by a different user id → refused.

## 8. Docs and done

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: mark 6d `🔍 <date> — built by
  Codex, awaiting review` with the test counts.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": a Working line for
  the six new actions; remove the "More tools" waiting row (step 6 done).
- `AGENTS.md`, "The WhatsApp assistant is one phone…": **one** bullet — a
  note written by the bot is always INTERNAL, and marking a quote sent
  emails nobody and says so in its summary.
- Do **not** edit `HANDOFF.md`.

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
