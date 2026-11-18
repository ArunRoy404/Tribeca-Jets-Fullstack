# Codex prompt — WhatsApp assistant, step 3: send the replies

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-3-connect-whatsapp.md and carry out everything
below the "---" line in it. That file is your full brief for this task.

Before starting, read AGENTS.md, docs/WHATSAPP_AI_INTEGRATION.md and every
file in Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Backend/.env holds
  real credentials: do not read, print or use them. Tests use a stubbed fetch.
- No npm install — nothing new is needed.
- Don't run nvm commands. If npm or npx is blocked, stop and report.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the report described in §7 of the brief: lint, tsc and test
output, plus git status.
```

---

You are implementing **step 3 of 7** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center repository. Another engineer will review your
work line by line against the project rulebook, so precision matters more than
speed.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` (parts one and two; part three is
   frontend and does not apply), `docs/WHATSAPP_AI_INTEGRATION.md`, and every
   file in `Backend/src/modules/whatsapp/`. Steps 1 and 2 are built there;
   match their style, comment density and naming exactly.
2. **Never run** `git commit`, `git push`, `git stash`, `git reset` or anything
   that changes git history or the index. The reviewer commits.
3. **Stop and report instead of guessing.** If something this brief assumes is
   not true in the code, say exactly what differs and propose the smallest fix.
4. **No live calls, and do not touch `Backend/.env`.** It holds a real Meta
   token and app secret. Never open, print or copy it. Every Graph API call in
   tests goes to a stubbed `fetch` (`vi.stubGlobal('fetch', …)`).
5. Backend is **NestJS 12, TypeScript, ESM**: every relative import ends in
   `.js`; tests are **vitest**; lint is **oxlint**; Zod 4. Never hand-edit
   `src/generated/`. `npm test` runs `prisma generate` first: that is fine
   (the schema is unchanged, the folder is gitignored), and so is Vitest
   reading `Backend/.env` — Vite exposes only `VITE_` keys and there are none.
   Rule 4 is about you opening the file, not the test runner. Run §7's
   commands as written, from `Backend/`.
6. Do **not** touch the frontend, the Postman collection, migrations or the
   Prisma schema.

## 1. What step 3 is

Step 2 ends in `WhatsappService.handle()`, which prepares a reply and logs only
its length. Step 3 **sends that reply to the Super Admin's phone** through
Meta's WhatsApp Cloud API, and nothing more:

- a small **Graph API sender** (`sendText`, `markRead`);
- `handle()` sends the agent's reply, and short fixed replies for the two
  cases where it has nothing to send today;
- failed **delivery receipts** are logged (by code only), so a message that
  never arrives can be diagnosed;
- the Graph version default moves to the one Meta currently documents.

No actions, no PDFs, no media, no templates — those are steps 4 and 5. The
agent, tools and memory from step 2 do not change.

## 2. The sender — `whatsapp.sender.ts`

An `@Injectable() WhatsappSender`, injecting `AppConfigService`, using Node's
global `fetch` (Node 22; no new package, no axios).

**`sendText(to: string, body: string, replyTo?: string): Promise<boolean>`**

- `POST https://graph.facebook.com/<graphVersion>/<phoneNumberId>/messages`
  with `Authorization: Bearer <accessToken>` and
  `Content-Type: application/json`, body:

  ```json
  {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "<to>",
    "type": "text",
    "text": { "preview_url": false, "body": "<body>" },
    "context": { "message_id": "<replyTo>" }
  }
  ```

  `context` only when `replyTo` is given — it shows the reply quoting the
  question, which keeps answers readable when two questions are in flight.
- A **10-second timeout** per attempt (`AbortSignal.timeout`).
- **Retry once** — after a short delay (1 s; make it a constant the tests can
  avoid waiting on) — only on a network error, a timeout, HTTP 429 or 5xx.
  Never retry another 4xx: it will fail the same way, and a send that did reach
  Meta must not be delivered twice.
- Returns `true` on a 2xx, `false` otherwise. **Never throws** — a failure is
  logged and reported, not propagated.
- **Logging on failure:** the HTTP status and, when Meta's error body parses
  (`{ error: { code, error_subcode, type, fbtrace_id } }`), those four fields.
  **Never** the request body, the reply text, `error.message` /
  `error.error_data` (Meta echoes parameters there), the access token, or the
  full phone number (last four digits only, as `gate()` already does).
- Meta's **code 190** means the access token is expired or invalid. Log that
  case with an explicit line —
  `WhatsApp access token rejected (code 190): renew WHATSAPP_ACCESS_TOKEN` —
  because the developer's token is the 24-hour temporary one and this will be
  the most common failure.
- If `config.whatsapp` is null, return `false` without calling `fetch`.

**`markRead(messageId: string): Promise<void>`** — best effort.

- `POST` to the same URL with
  `{ "messaging_product": "whatsapp", "status": "read", "message_id": "<id>",
  "typing_indicator": { "type": "text" } }`
  — blue ticks plus "typing…", while the AI works (several seconds).
- Same timeout, **no retry**, never throws, failures logged at `warn` with the
  status and Meta's error code only. A failure here must never stop the reply.

Keep the URL building and Meta error parsing as small pure helpers in the same
file so they are testable without Nest.

## 3. Changes to `whatsapp.service.ts`

`handle(admin, message)` becomes, in order:

1. `await this.sender.markRead(message.id)` first (best effort — it cannot
   throw).
2. Non-text message (`type !== 'text'` or empty body) → send the fixed reply
   `NON_TEXT_REPLY` = "I can only read text messages for now." and return.
   Keep the existing log line.
3. Brain not ready → keep the existing warning, send the fixed reply
   `NOT_READY_REPLY` = "The assistant isn't set up on the server yet." and
   return. (Only the gated Super Admin can reach this line, so saying so leaks
   nothing; silence would look like a broken phone.)
4. Otherwise `reply = await this.agent.reply(admin, message.from, text)`, then
   `sendText(message.from, reply, message.id)`.
5. Log `Sent a reply to <id> (<n> chars)` on success or
   `Reply to <id> was not delivered` on failure — **never the text** of the
   message or the reply. Replace step 2's "Prepared a reply…" line.

**The recipient is always `message.from`** — the number that passed the gate,
which is the env's admin phone. The model never chooses a recipient, no tool
can send, and no other code path calls `sendText` in this step.

`handle()` must still never throw (it is already wrapped); keep that.
Update its doc comment: step 3 sends the reply.

Wire `WhatsappSender` into `WhatsappModule`'s providers and inject it into
`WhatsappService`.

## 4. Failed delivery receipts — `whatsapp.payload.ts`

Meta posts delivery receipts to the same webhook as
`entry[].changes[].value.statuses[]`: `{ id, status, recipient_id, errors?:
[{ code, title }] }`. Today they are ignored.

- Add `readFailedStatuses(body): { id: string; codes: number[] }[]`, read as
  leniently as `readIncomingMessages` (anything not understood is skipped,
  never refused), returning only entries whose `status` is `failed`.
- In the controller's `receive`, after the signature check, log each one at
  `warn`: `WhatsApp message <id> failed at Meta (codes: 131047)`. Codes only —
  never `recipient_id` or `title`. No other handling. The response stays
  `{ received: messages.length }`.

Why: the usual live failures (the 24-hour window, a number not on the test
recipient list, an expired token) surface only here, after `sendText` already
got a 200.

## 5. Config

- `src/config/env.validation.ts`: `WHATSAPP_GRAPH_VERSION` default
  `'v21.0'` → **`'v25.0'`**, and validate the shape with
  `.regex(/^v\d+\.\d+$/, 'Use a Graph API version, e.g. v25.0')`. v25.0 is the
  version Meta's own API Setup page uses for this app (18 Nov 2026); v21.0
  is past Meta's two-year support window.
- `Backend/.env.example`: the same default.
- `docs/WHATSAPP_AI_INTEGRATION.md`: the two `v21.0` mentions (§4's env block
  and §5) → `v25.0`.
- Do not change anything else about the all-or-none rule.

## 6. Tests — `whatsapp.sender.spec.ts`, plus additions to `whatsapp.spec.ts`

Stub `fetch` with `vi.stubGlobal`; restore it after each test. Every case below
must exist and pass.

**Sender**
- `sendText` posts to exactly
  `https://graph.facebook.com/v25.0/<phoneNumberId>/messages` with the bearer
  header and the JSON body above; `context` present only with `replyTo`.
- 2xx → `true`, one call.
- 400 with a Meta error body → `false`, **one** call (no retry), logged status
  and code.
- 500, then 200 → `true`, two calls. 500 twice → `false`, two calls.
- 429 then 200 → two calls. Network error (fetch rejects) then 200 → two calls.
- Code 190 → the explicit renew-token line is logged.
- `config.whatsapp` null → `false`, fetch never called.
- **No log line contains** the access token, the reply body, the full phone
  number, or Meta's `error.message` (put a distinctive string in each and
  assert across all logger methods).
- `markRead` posts the read + typing body; a failure resolves and is logged at
  `warn`; it never retries.

**Service** (extend the existing describe blocks; keep step 1/2 assertions)
- accepted text → `markRead(id)` then `sendText(message.from, reply, id)`.
- `markRead` resolving after a failure still lets the reply be sent.
- non-text → `NON_TEXT_REPLY` sent, agent not called.
- brain not ready → `NOT_READY_REPLY` sent, agent not called.
- `sendText` returning `false` → `handle()` resolves, "not delivered" logged.
- a message that fails any gate (unknown sender, switched off, stale,
  duplicate) → **neither `markRead` nor `sendText` is called**. One assertion
  per gate.
- the existing "no log line contains the message or reply text" test still
  holds with sending wired in.

**Payload / controller**
- `readFailedStatuses` returns the failed ones with their codes, skips
  `sent`/`delivered`/`read`, and returns `[]` for garbage.
- a signed post with only statuses → 200, `{ received: 0 }`, the agent not
  called, the warn line contains the codes and not the `recipient_id`.

## 7. Docs (same pass) and done

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: step 3's state →
  `🔍 <date> — built by Codex, awaiting review` with the test counts; add
  `whatsapp.sender.ts` to "Where the code is". Do not touch other rows.
- `AGENTS.md`, section "The WhatsApp assistant is one phone, one Super Admin,
  signed by Meta": add **at most two bullets** — a reply goes only to the
  number the message came from (the gated admin phone), never a recipient the
  model or a tool chose; and the sender logs Meta's status and error codes,
  never the text, the token or Meta's error message. Match the section's voice.
- Do **not** edit `HANDOFF.md`; the reviewer does.

Run from `Backend/` and paste the output in your final message:

```
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report file and test counts
```

Then a short report:

1. Files created / changed (one line each).
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that this brief did not cover.
4. Confirmation that nothing was committed and `.env` was not opened
   (`git status` output).
