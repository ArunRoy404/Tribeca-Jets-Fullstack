# Codex prompt — WhatsApp assistant, step 4: actions with CONFIRM

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-4-actions-with-confirm.md and carry out
everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (parts one and two), 
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env.
- No npm install. No database, no migration — this step changes no schema.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §9 commands exactly as written and finish with the §9 report.
```

---

You are implementing **step 4 of 7** of the Super Admin's WhatsApp assistant
in the Tribeca Jets Command Center. Steps 1–3 and the time-zone pass are
built, reviewed and live. Another engineer will review your work line by
line against `AGENTS.md`, so precision matters more than speed.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two (part three is the
   frontend — not touched), `docs/WHATSAPP_AI_INTEGRATION.md`, and every
   file in `Backend/src/modules/whatsapp/`. Match their style, comment
   density and naming exactly.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, and
   `prisma7.config.ts` loads `.env` through `dotenv`: that is fine — the
   tool reading its config, not you. Run §9's commands as written; no
   workarounds.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`.
6. **No frontend, no Postman, no schema, no migration.** No new HTTP route:
   everything here lives behind the existing webhook.

## 1. What step 4 is

Until now the bot only reads (plus the caller's own time zone). Step 4 lets
the Super Admin **change desk data from WhatsApp — but never on the first
message.** Every action is two steps:

1. The Super Admin asks ("approve TJ-1048"). The model calls a **proposal
   tool**. The tool resolves the record through its owning service, in the
   caller's scope, checks the permission and that the action is possible
   now, and **stores a frozen pending action** in Redis. Nothing changes.
   The bot replies with a fixed summary built from server data:
   > ⚠️ Approve trip *TJ-1048* — Elena Rostova, KTEB → KMIA, Fri 27 Nov.
   > Reply *CONFIRM* to proceed or *CANCEL* to abort (expires in 5 minutes).
2. The Super Admin replies `CONFIRM`. **The model is not asked.** The agent
   takes the pending action out of Redis (once), re-checks the permission,
   calls the same service the web app calls, and replies with the result.

The five actions (the plan's §3 and §6):

| Action | Service call | Permission (mirror the route exactly) |
|---|---|---|
| Approve a trip | `TripsService.approve(user, id)` | `TRIPS · APPROVE` |
| Decline a trip | `TripsService.reject(user, id, { reason })` | `TRIPS · APPROVE` |
| Create a lead | `ClientsService.create` then, if trip details were given, `TripRequestsService.create` | `CLIENTS · CREATE` or `LEADS_AGENTS · CREATE`; `TRIP_REQUESTS · CREATE` or `LEADS_AGENTS · CREATE` (the routes' `altModule`) |
| Complete a task | `TasksService.update(user, id, { status: COMPLETED })` | `TASKS · EDIT` |
| Record a payment | `ReceivablesService.recordPayment(user, invoiceId, payment)` | `RECEIVABLES · PAY` |

Plus two small **read** tools the actions need to find their records:
`list_pending_approvals` and `list_open_tasks` (§4).

**The safety rules — each one is tested (§8):**

- **What runs is exactly what was shown.** The pending action stores
  resolved ids and an already-validated payload; CONFIRM executes that, not
  anything the model says afterwards. The summary is built by the tool from
  server data, never written by the model.
- **The model never executes.** CONFIRM and CANCEL are handled before the
  model is called. No tool performs a write except `set_my_timezone`.
- **Once.** Taking the pending action is atomic (Redis `GETDEL`), so a
  double CONFIRM — or Meta redelivering it — runs it once.
- **Five minutes.** The key's TTL is 300 s; an expired action is gone.
- **One at a time.** Any new message drops a pending action first (next
  rule), so there is never more than one.
- **Anything other than CONFIRM cancels it.** A different message drops the
  pending action first (the reply says so), then is answered normally. A
  half-remembered "approve" must never run because of a later "ok".
- **Re-checked when it runs.** The permission is checked again at CONFIRM
  (it may have been withdrawn in the web app since), and the service
  re-checks every rule it always does (approval state, balance, scope).
- **Bound to the person.** The pending action records the acting user's id;
  CONFIRM runs it only for that same id.
- **A failure is reported as a failure.** Never "done" unless the service
  returned. A refusal (`HttpException`) is shown with its message; anything
  else is "Not done — the CRM could not complete it."

## 2. Redis — `core/redis/redis.service.ts`

Add one method beside `getString` / `setString`:

```ts
/** Reads and deletes in one step, so a value can be taken at most once. */
async takeString(key: string): Promise<string | null>
```

using `GETDEL`. Document why in the comment (a double CONFIRM).

## 3. The pending action — `whatsapp.pending.ts` (new)

An `@Injectable() WhatsappPending`, injecting `RedisService`:

- Key `whatsapp:pending:<phone>`, TTL `PENDING_TTL_SECONDS = 300`.
- `put(phone, action)` → stores JSON. (No "replaced" result: by the time
  a proposal is stored, §5 has already dropped any earlier one.)
- `take(phone)` → `takeString` + `JSON.parse`; malformed → null.
- `drop(phone)` → returns the dropped action's summary, or null.

`PendingAction` is a discriminated union on `kind`
(`TRIP_APPROVE`, `TRIP_DECLINE`, `LEAD_CREATE`, `TASK_COMPLETE`,
`PAYMENT_RECORD`), each with `userId`, `summary` (the exact text shown),
`createdAt`, and its own resolved ids and payload. Keep it a plain JSON
shape; dates as `YYYY-MM-DD` strings, re-parsed with the owning DTO's
schema at execution (§6).

## 4. Tools — `whatsapp.tools.ts`

Keep `defineTool`, its validation and its `canDo` check. Each proposal tool
**also returns a marker** the agent recognises — e.g.
`{ proposed: true, summary }` — after storing the pending action through
`WhatsappPending` (inject it; pass `phone` through `ToolContext`).

**Reads**

- `list_pending_approvals` — `TRIPS · VIEW`. `TripsService.findAll` with
  `approvalStatus: PENDING`, newest first, up to 10. Allowlist (parse
  with Zod at the boundary, like `flightRow`): reference `TJ-n`, client
  display name, first leg's origin/destination ICAO and departure date,
  assigned broker's name. Read `TRIP_LIST_SELECT` for the real field
  names; report it if a field is not there.
- `list_open_tasks` — `TASKS · VIEW`. `TasksService.findAll` with the new
  `view: 'OPEN'` (below), soonest due first, up to 10; optional `search`
  (2–100 chars). **Add `OPEN` to the Tasks module itself:** one value in
  `TASK_VIEWS` (`task.dto.ts`) and one case in `TasksService.viewWhere`
  returning the existing `open` condition (status not COMPLETED), with the
  view's doc comment updated. Filtering in the database, before paging, is
  the point — never filter a page afterwards (AGENTS.md, "A computed state
  is filtered by computing it"). It is additive; the board's views are
  unchanged. Add a tasks test that `OPEN` excludes COMPLETED.
  Allowlist: `id`, title, status, priority, due date, assignee name,
  client display name. The id is what `complete_task` takes.

**Proposals** (each: validate → resolve in scope → check it can happen now
→ store → return the marker). Resolving uses the owning service's own
read, never Prisma:

- `approve_trip { reference }` — `"TJ-1048"` or `"1048"`. Resolve with
  `TripsService.findAll({ search })` and accept **exactly one** row whose
  reference equals the number; none → `{ error: 'No trip TJ-1048 you can
  see' }`. Refuse when its approval status is not one `approve` accepts —
  read `approveBlockedBy` and reuse it rather than re-deriving the rule.
  Summary: `Approve trip TJ-1048 — <client>, <origin> → <destination>,
  <departure as "Fri 27 Nov">.` (dashes for missing parts, never guesses).
- `decline_trip { reference, reason? }` — same resolution, `rejectBlockedBy`.
  Summary names the reason, or "no reason given".
- `create_lead { firstName, lastName, email?, phone?, companyName?,
  originIcao?, destinationIcao?, departureDate?, passengers?, notes? }` —
  - `lastName` is required, as the client form requires it; with only one
    name given, the model asks for the other rather than inventing one.
  - At least one of email or phone.
  - If `email` exactly matches a live client the caller can see
    (`ClientsService.findAll({ search: email })`, then compare
    case-insensitively), **propose a trip request for that client** instead
    of a duplicate client, and say so in the summary.
  - Airports by ICAO through the Airports module's own read (find how
    other modules look an ICAO up; `AirportsService.usable(id, label)`
    must check the resolved id — AGENTS.md, "A picked airport is checked
    with `AirportsService.usable`"). Unknown ICAO → `{ error }`.
  - `departureDate` is `YYYY-MM-DD`, which the model works out from the
    "Now:" line; the summary shows it with its weekday so a wrong
    "Friday" is visible before CONFIRM.
  - Validate the client half with `createClientSchema` and the request half
    with `createTripRequestSchema` **at proposal time** (with a
    placeholder `clientId` for the request when the client is new), so a
    bad payload fails before anything is shown. A trip request is
    proposed only if any trip detail was given.
  - Summary: `Create lead <name> (<email/phone>)` plus `, with a trip
    request KTEB → KMIA on Fri 27 Nov for 4` when there is one.
- `complete_task { taskId }` — a uuid from `list_open_tasks`. Resolve with
  `TasksService.findOne`; refuse a task already completed or archived.
  Summary: `Complete task "<title>"` (+ due date, client).
- `record_payment { invoice, amount, method, paidAt?, reference? }` —
  `invoice` is `"INV-2026-0042"`; resolve through `ReceivablesService.findAll({
  search })` to **exactly one** invoice whose number matches. Validate the
  payment with `createPaymentSchema` (amount two decimals at most; `method`
  one of `PaymentMethod`). Refuse at proposal what the service would
  refuse (not SENT; amount above the balance — read how the service
  decides and reuse its rule from `common/money/settlement.ts`). Summary:
  `Record $12,500.00 by wire on INV-2026-0042 — <client>; balance after
  $0.00.` Money as the service formats it, never re-derived.

Every proposal tool's description says it **only proposes** — nothing
changes until the Super Admin replies CONFIRM.

**One proposal per message.** If a second proposal tool is called in the
same reply, it returns `{ error: 'One action at a time — confirm or cancel
the first' }` and stores nothing.

## 5. The agent — `whatsapp.agent.ts`

In `reply()`, before memory and before the model:

1. `CONFIRM` (case-insensitive, trimmed, optional trailing `.`/`!`) →
   `take(phone)`. Nothing → `NOTHING_PENDING_REPLY` ("Nothing is waiting
   for confirmation — it may have expired after 5 minutes."). Otherwise run
   it (§6) and reply with the fixed result text. Save the exchange to
   memory (user text and final reply only, as today).
2. `CANCEL` (same normalisation) → `drop(phone)`; reply "Cancelled —
   nothing was changed." or `NOTHING_PENDING_REPLY`.
3. Any other text → `drop(phone)`; if something was dropped, prefix the
   final reply with `(Not done: <summary> — cancelled.)` and a blank line.
   Then the normal model loop.

In the model loop: when a tool result carries the proposal marker, **end
the loop at once** and reply with the fixed text — the model's own wording
is not used:

```
⚠️ <summary>

Reply *CONFIRM* to proceed or *CANCEL* to abort (expires in 5 minutes).
```

(prefixed by step 3's `(Not done: <summary> — cancelled.)` note when
this message dropped an earlier pending action).

Update `WHATSAPP_INSTRUCTIONS`: replace the "only change you can make…"
line with: actions are proposed with the proposal tools and run only when
the Super Admin replies CONFIRM; never say an action is done; use
`list_pending_approvals` / `list_open_tasks` to find what to act on; work
dates like "Friday" out from the Now line; ask for anything missing (a
payment method, an amount) rather than guessing it.

## 6. Running a confirmed action — `whatsapp.actions.ts` (new)

An `@Injectable() WhatsappActions` with `run(user, action): Promise<string>`:

- Refuse if `action.userId !== user.id` → "Not done — that action belongs
  to another session." (no detail).
- Re-check the permission with `canDo` (for lead creation, the module or
  its `altModule`, both halves) → "Not done — your account can no longer
  do this."
- Re-parse the stored payload with the owning DTO's schema, then call the
  service. The services audit themselves — do not write a second audit
  row, and never a raw Prisma write.
- Lead creation: create the client (or use the matched one), then the
  trip request with its id. If the request fails after the client was
  created, say exactly that: "Created lead <name>, but the trip request
  was not filed: <message>."
- Results (fixed text, from the service's answer):
  `✅ Trip TJ-1048 approved.` · `✅ Trip TJ-1048 declined.` ·
  `✅ Lead <name> created` (+ `, trip request filed`) · `✅ Task "<title>"
  completed.` · `✅ $12,500.00 recorded on INV-2026-0042 — balance
  $0.00.`
- `HttpException` → `❌ Not done: <its message>`. Anything else → log the
  error **class** only and reply `❌ Not done — the CRM could not complete
  it.`
- Log one line per run: `WhatsApp action <kind> confirmed` / `… refused
  (<status>)` / `… failed (<class>)`. Never ids beyond the kind, never
  names, amounts or text.

Wire `WhatsappPending` and `WhatsappActions` into `WhatsappModule`; import
whatever modules the new services need (Trips, Tasks, Receivables,
TripRequests, Airports — check each exports its service). Report a
circular import rather than working around it with `forwardRef`.

## 7. What must not change

- The gates in `WhatsappService` (a message failing one still gets no reply
  and touches no pending action).
- `list_flights`, `dashboard_kpis`, `find_client`, `set_my_timezone`.
- Memory still holds only user text and final replies; tool calls and the
  pending action never enter it.
- Nothing logs message text, summaries, names or amounts.

## 8. Tests

Stub Redis with an in-memory map that honours TTL and `GETDEL`; stub the
services. Every case must exist and pass:

**Pending store** — put/take/drop; take twice → second is null; TTL 300 is
passed; malformed JSON → null.

**Proposal tools**
- each one stores exactly one pending action with resolved ids and the
  summary, and returns the marker; **no service write is called**;
- `approve_trip`: no match / two matches / reference mismatch → error, no
  store; a trip `approveBlockedBy` refuses → error, no store;
- `create_lead`: an email that matches an existing client → a request for
  that client, no new client; unknown ICAO → error; neither email nor
  phone → error; a bad date → error;
- `record_payment`: amount over the balance → error; three decimals →
  error; an unknown method → error; invoice not SENT → error;
- `complete_task`: an already completed task → error;
- a second proposal in the same reply → error, the first stays;
- without the permission → `Not permitted`, no store.

**Agent**
- a proposal ends the loop: the reply is the fixed text with the summary,
  the model is **not** called again, and its text is not used;
- `CONFIRM` with a pending action → `WhatsappActions.run` called once, the
  model **not** called; `confirm.` and `Confirm!` work too;
- `CONFIRM` twice → the second gets `NOTHING_PENDING_REPLY`, run called
  once;
- `CONFIRM` after expiry → `NOTHING_PENDING_REPLY`;
- `CANCEL` → dropped, nothing run;
- any other message while pending → dropped, the reply starts with the
  "Not done … cancelled" note, then the model answers;
- a new proposal while one is pending → the old one is dropped, and the
  reply is the cancellation note followed by the new proposal's fixed text;
  only the new one is stored.

**Actions**
- each kind calls exactly its service method with the stored ids/payload;
- permission withdrawn before CONFIRM → refused, no service call;
- another user's id → refused, no service call;
- `HttpException` → `❌ Not done: <message>`; other error → generic text,
  log has the class only;
- lead: request failure after the client is created → the partial-success
  text;
- no log line contains a name, an amount, a summary or message text
  (assert across logger methods with distinctive strings).

The existing WhatsApp tests must all still pass unchanged in intent.

## 9. Docs (same pass) and done

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: step 4's state → `🔍 <date> —
  built by Codex, awaiting review` with the test counts; add the new files
  to "Where the code is".
- `AGENTS.md`, "The WhatsApp assistant is one phone…": **at most two
  bullets** — (1) an action is proposed by a tool that stores a frozen
  pending action and runs only on CONFIRM, handled before the model, taken
  once, within five minutes, bound to the user, re-checked when it runs;
  (2) anything other than CONFIRM cancels a pending action. Match the
  section's voice.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": move the actions
  line from Waiting to Working as built.
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
