# Codex prompt — WhatsApp assistant, step 2: the AI brain

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher — it points
Codex at the brief below the line rather than pasting the whole thing:

```
Read docs/codex-prompts/step-2-ai-brain.md and carry out everything below the
"---" line in it. That file is your full brief for this task.

Before starting, read AGENTS.md, docs/WHATSAPP_AI_INTEGRATION.md and every
file in Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to OpenAI, Meta or any external service.
- Don't run nvm commands. If npm or npx is blocked, stop and report.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the report described in §7 of the brief: lint, tsc and test
output, plus git status.
```

Before launching on a fresh machine, check `cd Backend && npm -v && npm test`
works — Codex cannot fix a broken Node install and should not try.

---

You are implementing **step 2 of 7** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center repository. Another engineer will review your
work line by line against the project rulebook, so precision matters more than
speed.

## 0. Ground rules — read before anything else

1. **Read these first, in full:** `AGENTS.md` (the whole rulebook — part one and
   part two apply; part three does not, this step has no frontend),
   `docs/WHATSAPP_AI_INTEGRATION.md`, and every file in
   `Backend/src/modules/whatsapp/`. Step 1 is built there; match its style,
   comment density and naming exactly.
2. **Never run `git commit`, `git push`, `git stash`, `git reset` or any other
   command that changes git history or the index.** Leave every change
   uncommitted in the working tree. The reviewer commits.
3. **Stop and report instead of guessing.** If something this prompt assumes is
   not true in the code (a method signature, a module export, a field name),
   stop, say exactly what differs, and propose the smallest fix — do not
   invent a workaround. Never invent a value: no default model name, no
   placeholder figure, no fake data.
4. **No live calls.** Do not call the OpenAI API, Meta, or any external
   service. There is no `OPENAI_API_KEY` in `.env` and you must not ask for
   one. Everything is tested with a fake AI client.
5. Backend is **NestJS 12, TypeScript, ESM**: every relative import ends in
   `.js`; tests are **vitest**; lint is **oxlint**; Prisma 7 enums come from
   `generated/prisma/enums.js`; Zod 4. Never edit `src/generated/`.
6. Do **not** touch the frontend, the Postman collection, migrations or the
   Prisma schema. This step needs none of them.

## 1. What step 2 is

Step 1 built the secure entry point: Meta's signed webhook, the gates, and
`WhatsappService.handle(admin, message)`, which today only logs. Step 2 puts an
**AI brain** behind `handle()`:

- an **OpenAI tool-calling loop** that answers a text message, calling CRM read
  tools as needed;
- **conversation memory in Redis**, per phone;
- the **first three read tools**: flights in a date window, dashboard KPIs,
  client lookup;
- a **developer script** that runs the brain from the terminal as the Super
  Admin, so it can be tested live before WhatsApp sending exists (step 3).

`handle()` produces the reply text and **logs only its length** — sending it
over WhatsApp is step 3. Do not build any sending.

## 2. Configuration

- Add the official **`openai`** npm package to `Backend/package.json`
  (`npm install openai` inside `Backend/`). Use the **Responses API** with
  function tools.
- Add `OPENAI_MODEL: z.string().optional()` to `src/config/env.validation.ts`
  beside `OPENAI_API_KEY`, with a one-line doc comment, and `openaiModel` to the
  `ai` block in `src/config/configuration.ts`. **No default value** — the
  developer chooses the model. Add `OPENAI_MODEL=` to `Backend/.env.example`
  under `OPENAI_API_KEY`, with a comment that the WhatsApp assistant needs both.
- The brain is **ready** only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are
  set. When it is not ready, `handle()` logs one warning ("WhatsApp assistant
  accepted a message but OPENAI_API_KEY / OPENAI_MODEL are not set") and
  returns — no OpenAI client is constructed, nothing is thrown.
- Do not change how `ai.enabled` or `AI_PROVIDER` behave for anything else.

## 3. Files to create in `Backend/src/modules/whatsapp/`

### `whatsapp.ai-client.ts` — the only file that imports `openai`

- Export an interface `AiClient` with one method, e.g.
  `respond(input: { instructions: string; messages: AiMessage[]; tools: AiToolSpec[] }): Promise<AiTurn>`,
  where `AiTurn` is either a final text or a list of tool calls
  (`{ id, name, argumentsJson }`). Design these types yourself, minimal and
  provider-neutral, so the loop never sees an OpenAI type.
- Export `OpenAiClient implements AiClient` wrapping the SDK. Requirements:
  - `store: false` on every request — conversation history lives in our Redis,
    not on OpenAI's servers.
  - A request timeout (30 s) and **no SDK auto-retries beyond 1**; the loop
    decides what failure means.
  - Never log request or response content.
- Provide it through a Nest injection token (e.g. `WHATSAPP_AI_CLIENT`) with a
  factory that returns `null` when the brain is not ready, so tests can inject
  a fake and production never builds a client without a key.

### `whatsapp.memory.ts` — conversation memory

- Stores the last turns of the conversation for the admin phone in Redis, key
  `whatsapp:memory:<phoneDigits>`.
- Stores **only the user's text and the assistant's final reply** — never tool
  calls or tool results (they hold CRM rows and would be re-sent to OpenAI on
  every later message).
- Keeps at most **12 messages** (6 exchanges), trimming the oldest.
- Expires **30 minutes** after the last write (TTL refreshed on each write).
- `reset(phone)` deletes the key.
- `RedisService` (`src/core/redis/redis.service.ts`) has no string get/set
  today. Add two small generic methods there — e.g. `getString(key)` and
  `setString(key, value, ttlSeconds)` — in the style of the existing ones, with
  a doc comment each. **Do not** add a second Redis connection or use
  `redis.client` directly from the whatsapp module.

### `whatsapp.tools.ts` — tool definitions and dispatch

Each tool is one object: `name`, `description` (written for the model),
a **Zod schema** for its arguments (converted to JSON Schema with
`z.toJSONSchema` for the tool spec — no hand-written JSON Schema), the
**permission it requires** (`{ module, action }` from
`src/common/authorization/access.ts`), and `run(user, args)`.

**The dispatcher is the security boundary for tools.** The webhook has no
`AccessGuard`, so the check a route's `@RequireAccess` would make must happen
here, every call:

1. Unknown tool name → return a tool error result (`"Unknown tool"`), do not
   throw.
2. Arguments fail the Zod schema → return a tool error result naming the
   problem (Zod's message), do not throw.
3. `canDo(user.access, module, action)` false → return a tool error result
   ("Not permitted for this account") **without calling the service**.
4. Otherwise call `run`. A thrown Nest `HttpException` (404, 400…) becomes a
   tool error result carrying its message; any other error becomes a generic
   "The CRM could not answer that" result and is logged **without** the
   arguments.

Tools call the **owning module's service, as the acting admin** — never Prisma
directly from the whatsapp module (AGENTS.md: "Cross-module reads go through
the owning module's service" and the WhatsApp section: "Never a raw Prisma
write from the bot" — the same holds for reads here). Reach, scoping and
field-level permissions then apply exactly as in the web app.

Each tool returns a **compact, explicitly-shaped object** — pick the fields,
never spread a service row into the result. This is what gets sent to OpenAI,
so send the least that answers the question.

The three tools:

1. **`list_flights`** — flights (trip legs) departing in a date window.
   - Args: `from` and `to`, `YYYY-MM-DD` (use the existing `calendarDate`
     helper from `common/dto/dates.ts`, never `z.coerce.date()`), window at most
     14 days; optional `status` filter only if the schedule DTO supports one.
   - Calls `ScheduleService.findAll(user, query)` (it reads through
     `TripsService`; check `schedule/dto/schedule.dto.ts` for the exact query
     shape and limits, and pass `page`/`limit` explicitly, limit ≤ 25).
   - Permission: what `ScheduleController`'s list route would require — read
     the controller. If the GET carries no `@RequireAccess` (open reads), use
     `SCHEDULE · VIEW` and say so in a comment, because the bot is a screen,
     not a picker.
   - Result per leg: trip reference (`TJ-…` as the rest of the app formats
     it), departure date/time, origin and destination codes, aircraft (tail +
     model or description), client display name, status. Plus `total`.
2. **`dashboard_kpis`** — the desk's headline figures.
   - Args: `period`, the enum the dashboard DTO already uses
     (`DASHBOARD_PERIODS` from `dashboard/dashboard.period.ts`), default the
     same as the DTO.
   - Calls `DashboardService.summary(user, { period })`.
   - Permission: `DASHBOARD · VIEW` (as the controller requires).
   - Result: the tiles the summary returns, each as label + value + the
     comparison figure — **pass through exactly what the service computed**;
     never compute, round differently or derive a figure in the tool
     (AGENTS.md: "Never display a number the data did not supply" and trip
     money is summed only by `tallyTrips`). A null stays null.
3. **`find_client`** — look a client up by name, company, email or phone.
   - Args: `query`, string, 2–100 chars.
   - Calls `ClientsService.findAll(user, …)` with the list's existing `search`
     param, limit 5.
   - Permission: `CLIENTS · VIEW`.
   - Result per client: id, display name, company, email, phone, status, lead
     stage, assigned broker's name, home airport code, next follow-up date.
     **Nothing else** — no notes, no preferences, no birthday, no documents.

**Module wiring:** `DashboardModule` and `ScheduleModule` do not export their
services today. Add `exports: [DashboardService]` / `exports:
[ScheduleService]` and import `DashboardModule`, `ScheduleModule` and
`ClientsModule` into `WhatsappModule`. Before doing so, confirm nothing those
modules import would import `WhatsappModule` back (no cycle); if there would
be one, stop and report.

### `whatsapp.agent.ts` — the loop

`WhatsappAgent.reply(user, phone, text): Promise<string>`:

1. **Reset command:** if the trimmed text, case-insensitive, is `reset` or
   `new`, clear the memory and return a one-line confirmation. No AI call.
2. Load memory, append the user's text, call `AiClient.respond` with the
   instructions, the history and the tool specs.
3. While the model asks for tools: dispatch every call (sequentially is fine),
   feed the results back, call again. **At most 5 rounds**; on the sixth,
   stop and return a fixed reply saying the question needs narrowing.
4. On a final text: clamp it to **3,500 characters** (WhatsApp's limit is
   4,096; leave headroom), save user text + reply to memory, return it.
5. If the AI client throws or times out: return a fixed reply ("I couldn't
   reach the AI service just now — please try again in a minute."), log the
   error class/message only, and **do not** save the turn to memory.

**Instructions (system prompt)** — a constant in this file, written plainly:

- It is the Tribeca Jets Command Center assistant, speaking to the company's
  Super Admin on WhatsApp.
- Answer **only from tool results**. If the tools do not return it, say it is
  not on file — never estimate, guess or invent a figure, name, date or status.
- Use WhatsApp formatting: `*bold*`, `_italic_`, `- ` bullets; no Markdown
  headings, tables or links syntax. Short — this is read on a phone.
- Dates as "Mon 18 Nov", money as the tool gives it.
- It cannot change anything yet; if asked to act (approve, create, pay…), say
  that is coming and the web app does it today.
- Today's date (UTC) is injected per call — the model has no clock.

Keep the instructions and tool descriptions in English and free of any
company-specific figures.

### Changes to `whatsapp.service.ts`

- Inject the agent. In `handle()`:
  - non-text message (`type !== 'text'` or no body) → log
    `Ignored non-text WhatsApp message <id> (<type>)` and return;
  - brain not ready → the warning from §2 and return;
  - otherwise `const reply = await agent.reply(admin, message.from, text)` and
    log `Prepared a reply to <id> (<n> chars)` — **never the text of either**.
- `handle()` must never throw: the webhook has already answered Meta, and an
  unhandled rejection there takes the process down. Wrap it.
- Update the comment on `handle()`: step 2 prepares the reply; step 3 sends it.

## 4. The developer script

`Backend/scripts/whatsapp-ask.ts` (the folder is new; run it with `tsx`, the
way `db:bootstrap-admin` runs `prisma/bootstrap-admin.ts` — read that file and
follow its style for env loading and exit codes), plus an npm script
`whatsapp:ask`:

```
npm run whatsapp:ask -- "What flights are going out tomorrow?"
```

- Boots a Nest **application context** (no HTTP server), resolves
  `WhatsappService.actingAdmin()` and `WhatsappAgent`, runs one `reply()`
  using `SUPER_ADMIN_WHATSAPP_PHONE` as the memory key, prints the reply, and
  closes the context.
- It must **not** bypass the gates' identity rule: if `actingAdmin()` returns
  null, print why and exit 1. It does skip the webhook gates (signature,
  switch, freshness) — say so in the file's header comment, and note it is a
  development tool that sends CRM data to OpenAI when run.
- If the brain is not ready, print which variable is missing and exit 1.
- `actingAdmin()` currently needs the full WhatsApp config (it reads
  `config.whatsapp.adminEmail`). Do not weaken the all-or-none env rule to make
  the script work without Meta credentials; instead the script may take an
  optional `--as <email>` and resolve that user with the **same** query
  (active, not deleted, SUPER_ADMIN) — factor the query so both share it,
  don't copy it.

## 5. Tests — `whatsapp.agent.spec.ts` and `whatsapp.tools.spec.ts`

Use a **fake `AiClient`** that replays scripted turns, a fake/in-memory Redis
(or a mocked `RedisService`), and mocked services. Every case below must exist
and pass:

**Loop**
- plain question, no tools → returns the model's text; memory holds user + reply.
- one tool call → dispatcher runs it → second call receives the tool result →
  final text returned.
- two tool calls in one turn → both dispatched, both results fed back.
- 5-round cap → sixth round never calls the AI; fixed "narrow it down" reply.
- AI client throws → fixed "couldn't reach" reply; memory **unchanged**.
- reply longer than 3,500 chars → clamped.
- `reset` / `NEW ` (case, whitespace) → memory cleared, AI never called.
- today's date appears in the instructions passed to the client.

**Memory**
- trims to 12 messages, oldest first; TTL set to 30 min on every write;
  tool calls/results are never stored.

**Dispatcher / tools**
- unknown tool → error result, nothing called.
- invalid args (e.g. `from` = `"tomorrow"`, window of 30 days, `query` of 1
  char) → error result naming the problem, service not called.
- user lacking the required action (build an `access` without it) → "Not
  permitted" result, **service not called** — one test per tool.
- service throws `NotFoundException` → error result with its message; throws a
  plain `Error` → generic result, and the logger was not given the arguments.
- each tool calls its service **with the acting admin object** and the expected
  query (assert the exact call).
- `find_client` result contains **exactly** the allowlisted keys (assert
  `Object.keys`), even when the service row has notes/preferences/birthday.
- `dashboard_kpis` passes values through unchanged, including a `null`.

**Service**
- non-text message → agent not called.
- brain not ready → agent not called, warning logged.
- agent throws → `handle()` resolves (does not reject).
- **no log line anywhere contains the message text or the reply text** — spy
  on the Nest `Logger` methods across a full run and assert.

Keep the existing `whatsapp.spec.ts` passing unchanged unless a step 1
assertion genuinely has to change; if one does, say which and why.

## 6. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: set step 2's state to
  `🔍 17 Nov — built by Codex, awaiting review` with the test count, and add
  the new files to "Where the code is". Do not touch other rows.
- `AGENTS.md`, section "The WhatsApp assistant is one phone, one Super Admin,
  signed by Meta": add **at most four bullets** for the durable rules this
  step introduces — the tool dispatcher re-checks the route's permission with
  `canDo` before any service call; tools return an explicit field allowlist,
  never a spread row; memory holds only user text and final replies, 30 min,
  `store: false` at OpenAI; the model answers only from tool results. Match the
  section's voice.
- Do **not** edit `HANDOFF.md`; the reviewer does.

## 7. Done means all of these, run from `Backend/`, pasted in your final message

```
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report the file and test counts
```

Then finish with a short report:

1. Files created / changed (one line each).
2. Anything in this prompt that did not match the code, and what you did.
3. Any decision you made that this prompt did not cover.
4. Exactly what the reviewer must set in `.env` to run `npm run whatsapp:ask`.
5. Confirmation that nothing was committed (`git status` output).
