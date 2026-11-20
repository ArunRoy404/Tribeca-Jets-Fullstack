# Codex prompt — WhatsApp assistant, step 8d: up to five phones, and a history

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-8d-whatsapp-phones-and-history.md and carry
out everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md in full (it is the whole rulebook), then
docs/WHATSAPP_AI_INTEGRATION.md §4 and §6–7, and every file the brief's §0
lists.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No database: do not run migrations, the seed, SQL, the API, builders or
  Newman. `npx prisma generate` (code generation only) is allowed. No live
  calls to Meta, OpenAI or anything external (tests stub fetch). Do not open,
  print or copy any .env.
- No npm or pip install.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the §10 report.
```

---

The Super Admin wants to use the WhatsApp assistant from **several of their
own phones** (a personal phone, a work phone, a second SIM) and to see
**which phone did what**. Steps 8a–8c built the settings tab around one
linked number (`users.whatsappPhone` / `whatsappPhoneVerifiedAt`). Every
8a–8c safeguard not changed below still holds.

## The developer's decisions (20 Nov 2026)

1. **Up to five phones per Super Admin**, each proved by its own WhatsApp
   code. Five matches Meta's test number, which reaches at most five
   recipients.
2. **Every phone has a name** — required, so the list and the history can
   tell them apart ("Work phone", "Personal").
3. **A History tab** on Settings › WhatsApp & AI: which phone did what, and
   when.
4. They are **all the Super Admin's own phones**. The bot acts as that
   Super Admin from any of them. Other people using the bot is **not** this
   step (it changes the owner's rule that only the Super Admin uses it).

## 0. Read first

AGENTS.md (whole), and:
- Backend: `modules/whatsapp/` — `whatsapp.service.ts` (the gate,
  `actingAdmin`, `ADMIN_SELECT`), `whatsapp-phone.service.ts`,
  `whatsapp-settings.{controller,service}.ts`, `dto/whatsapp-settings.dto.ts`,
  `whatsapp.agent.ts`, `whatsapp.actions.ts`, `whatsapp.pending.ts`,
  `whatsapp.memory.ts`, `whatsapp.document.ts`, every `*.spec.ts` there;
  `scripts/whatsapp-ask.ts`; `modules/auth/verification.service.ts`;
  `core/audit/audit.service.ts`; `prisma/schema/{user,audit,whatsapp-settings}.prisma`
  (read for the exact names); `common/database/archive.ts`;
  `common/dto/pagination.dto.ts`; `common/types/api.types.ts`.
- Frontend: `components/settings/sections/{WhatsappSettingsSection,WhatsappPhoneCard}.jsx`,
  `components/common/secret-field/*`, `components/common/IconActionButton.jsx`,
  `hooks/settings/useWhatsappSettings.js`, `services/whatsappSettings.service.js`,
  `hooks/common/useTableQueryParams.js`, `components/table/common/*`,
  `lib/time.js`, `lib/archive.js`, `templates/SettingsPage.jsx`.
- Postman: `README.md`, `builder_common.py`, `whatsapp_postman.py`,
  `build_whatsapp_settings_folder.py`, `prepare_whatsapp_test_db.sql`.

## 1. A phone list replaces the one number

- **Model `WhatsappPhone`** (own file `prisma/schema/whatsapp-phone.prisma`
  or beside the settings model — follow the folder's pattern): `id` uuid,
  `userId` (FK to User, `onDelete: Cascade` is wrong for history — use
  `Restrict`; a Super Admin is never hard-deleted), `phone` (digits, as
  `phoneDigits` stores them), `label` (1–40 characters, trimmed),
  `verifiedAt`, the **four audit columns** and the **archive columns**
  (`deletedAt`, `deletedById`, `restoredAt`, `restoredById`) — unlinking
  archives, never deletes (AGENTS.md "Nothing is ever permanently deleted").
- **One live row per number across all users:** a partial unique index on
  `phone WHERE "deletedAt" IS NULL`, **declared in the schema** with
  Prisma 7.10's `partialIndexes` preview feature — `@@unique([phone],
  where: raw("\"deletedAt\" IS NULL"))` and `previewFeatures =
  ["partialIndexes"]` on the generator (corrected after Codex's stop: the
  brief wrongly said Prisma cannot express it). An index that lives only in
  hand-written SQL is unknown to the schema, so the next generated
  migration would drop it. The migration's SQL for it must match what
  Prisma would generate. Record in AGENTS.md part two, beside "Read every
  generated migration": a partial index is declared in the schema with
  this preview feature, never SQL-only. The service checks first so the
  caller gets the named 409, not a bare P2002. A label is unique per user among live rows
  (service check, 409 "You already have a phone called …").
- **Migration, hand-written**, `20261120140000_whatsapp_phones`: create the
  table and index; copy every user's verified `whatsappPhone` across as one
  row labelled `'Phone 1'`, `verifiedAt` = the old timestamp; **then** drop
  `users.whatsappPhone` and `whatsappPhoneVerifiedAt` (and their unique
  index). The developer's and production's linked phones must survive —
  production's bot is live on that number.
- **Cap: five live phones per user.** A sixth is refused **before** a code
  is sent: 409 "You can link up to five phones. Unlink one first."

## 2. Linking, unlinking, renaming

- `POST /settings/whatsapp/phone` (send a code) takes `{ phone, label,
  currentPassword }`. `label` required. Checks, in order: password; label
  rules; the cap; the number not live on any user (409 as today); the
  number not already one of **this** user's live phones (409 "This phone is
  already linked"); Meta settings complete (400 as today). The code's
  verification row carries the number in `target` as today; carry the
  label in whatever the verification service already offers (read it — if
  it has no place for it, keep the label in the link cookie's signed
  challenge or re-send it on verify; **stop and report** before adding a
  column to `verification_codes`).
- `POST /settings/whatsapp/phone/verify` creates the row (or, when this
  user has an **archived** row for the same number, restores it with the new
  label and `verifiedAt` — never a second row). Audit `user.whatsapp_linked`
  on entity `WhatsappPhone` (`entityId` = the phone's id) with `{ last4,
  label }` — never the full number. Unlink and rename below are written on
  the same entity.
- `DELETE /settings/whatsapp/phone/:id` with `{ currentPassword }` archives
  that phone (404 when it is not this user's live phone). Clears its pending
  CONFIRM and its memory (`whatsapp.pending.ts` / `whatsapp.memory.ts` are
  keyed by number). Audit `user.whatsapp_unlinked` `{ phoneId, last4, label }`.
  The old `DELETE /settings/whatsapp/phone` (no id) is removed.
- `PATCH /settings/whatsapp/phone/:id` with `{ label }` renames (no
  password — it grants nothing). Audit `user.whatsapp_phone_renamed`.
- Unlinking the last phone is allowed; readiness then shows "No phone
  linked", as today.

## 3. The gate and the bot

- `WhatsappService.gate` finds the live `WhatsappPhone` by `message.from`,
  then its user, and keeps every existing check (active, SUPER_ADMIN,
  re-read per message, unknown number → no reply, last four only in the
  log). The resolved phone (`id`, `label`, `last4`) travels with the user
  into the agent and actions, for §4.
- Memory and pending actions are already keyed by number — confirm that a
  CONFIRM sent from phone B never takes phone A's pending action, and pin it
  with a test.
- `actingAdmin()` and `whatsapp:ask` use the Super Admin's earliest-linked
  live phone.
- Every reply still goes to the number the message came from.

## 4. History — what each phone did

**Where it is written:** the audit log (`AuditService.record`), no new
table — entity `WhatsappPhone`, `entityId` = the phone's id, actor = the
Super Admin. Metadata always carries `{ last4, label }` **as they were at the
time** (a rename later must not rewrite history). **Never the message text,
a reply, a secret, or a full number** (AGENTS.md: message text is never
logged).

| Action | When | Extra metadata |
|---|---|---|
| `whatsapp.question_answered` | the bot replied to a question | `tools`: the tool names it called (no arguments, no results) |
| `whatsapp.action_proposed` | a desk action was proposed | `proposalId`, `kind`, `ref` (the record's human ref — `TJ-11`; the id when it has none; `null` for a creation — see below) |
| `whatsapp.action_confirmed` | CONFIRM took it | `proposalId`, `kind`, `ref`, `outcome: 'done' \| 'refused'` |
| `whatsapp.action_cancelled` | another message dropped a pending action that was still there | `proposalId`, `kind`, `ref` |

**A proposal id ties the three together** (decided after Codex's fourth
stop): every proposal gets a `proposalId` (uuid) when it is proposed,
stored with the pending action, and written on its `action_proposed`,
`action_confirmed` and `action_cancelled` entries. `ref` is **`null`**
while no record exists — a proposed, cancelled or refused **creation**
(`TASK_CREATE`, `LEAD_CREATE`, or any other create). A confirmed creation
writes the **created** record's ref (or id when it has no ref). Never
substitute user-typed text (a task title, a lead's name) for a ref. The
History tab shows a null ref as "new task" / "new lead" from `kind`.

**An expiry is not recorded** (decided after Codex's stop): Redis deletes
the whole proposal after five minutes, so nothing is left to name. A
proposed action with no confirmed or cancelled entry after it reads as not
taken; the History tab's Event column says so for a proposal older than
five minutes with nothing after it ("Proposed — not confirmed"). Do not
keep a shadow copy in Redis to record it.
| `whatsapp.document_sent` | a PDF went to the phone | `kind` (`itinerary` / `quote` / `invoice`), `ref` |
| `whatsapp.reply_failed` | the reply did not reach the phone | — |

Plus the settings events already audited, now shown in the same history:
`user.whatsapp_linked` / `unlinked` / `phone_renamed`,
`whatsapp_assistant.switched_on` / `off`, `whatsapp_settings.updated` /
`revealed`. A message from an **unknown** number writes nothing (no
register of strangers).

**Events from before this step** (decided after Codex's stop): the old
`user.whatsapp_linked` / `user.whatsapp_unlinked` rows hang on the `User`
and hold only the last four (link) or field names (unlink). Show them in
the history **without a phone** — `phone: null`, `details` from what the
row actually holds (the last four when present, nothing otherwise), and
the Event label "Phone linked (before phone names)" / "Phone unlinked
(before phone names)". Never guess which phone row they belong to; a phone
filter therefore leaves them out. Scope them to this Super Admin
(`entityType: 'User'`, `entityId` = their id). New link / unlink events
are written on the `WhatsappPhone` as §2 says.

Write each entry **after** the thing happened. A failed audit write must
never stop the reply — and `AuditService.record` already swallows its own
failures, so calling it is enough. **Do not change the shared
`AuditService`** or wrap it in a second catch. Its failure log carries the
stack, which may echo the metadata — acceptable because the metadata never
holds message text, a reply, a secret or a full number (this section's
rule), so keep it that way.

**The route:** `GET /settings/whatsapp/history` (`@SuperAdminOnly()`),
paginated with the shared pieces (`paginationSchema.extend`, `paginate`,
`{ success, data, meta }`, newest first). Filters: `phoneId` (uuid,
optional — includes archived phones), `type` (`messages` | `actions` |
`documents` | `settings`, optional, mapped to action lists in the service),
`from` / `to` (`calendarDate`, optional). No `search` — make the query DTO
`.strict()` like the notes timeline and say why. Scope: entries whose
`entityType` is `WhatsappPhone` or `WhatsappSettings`, or whose action is
one of the `user.whatsapp_*` actions, **for this Super Admin's phones and
the settings row** — read every action name from one exported list, never
two copies. Each row: `{ id, at, action, phone: { id, label, last4 } |
null, details }` — `details` built from the metadata by an explicit
allowlist per action (never spread the metadata).

Also `GET /settings/whatsapp/phones?includeArchived=true` (or fold the
archived phones into the view — choose one, say which) so the History
filter can offer unlinked phones too.

## 5. Frontend

### 5a. Two tabs in WhatsApp & AI

**Setup** (everything that exists today) and **History**, the tab in the
URL (`?tab=history`) through `useTableQueryParams`, as `local: true`.

### 5b. My phones (replaces Your phone)

- A list: each phone's **label**, `+…` and last digits as today, "Verified
  20 Nov 2026, 01:29" (24-hour, `formatTimestamp`), a **rename** icon
  (inline input, Enter saves, Escape cancels) and an **unlink** icon
  (`IconActionButton`, destructive, `ConfirmDialog` then the password
  dialog).
- **Add a phone**: label (required) and number, then the existing send-code
  and verify steps. Hidden at five, with "5 of 5 phones linked"; the count
  shows from the first phone ("2 of 5").
- The Meta note stays: "Meta's test number can only reach numbers on its
  recipient list" — now with "Add each number there first."
- Readiness: "Phones linked: 2" or "No phone linked".

### 5c. History tab

- A table, server-paged (`TablePagination`, `PageSizeSelect`), newest first:
  **When** (24-hour), **Phone** (label · …last4, "(unlinked)" when
  archived, "—" for a settings event with no phone), **Event** (a readable
  label per action), **Details** (tools used as plain names, the action and
  its ref, the document and its ref).
- Filters in the toolbar: phone (a fixed short list from §4's phones
  route — `PickerSelect`, the set is at most a handful, not a server list),
  type, date range. All in the URL.
- Below `lg`, a card per entry, not a scrolling table (AGENTS.md
  responsiveness rules).
- An empty state: "Nothing yet. Messages, actions and settings changes
  appear here."

### 5d. Hooks and service

`whatsappSettings.service.js`: `phones`, `renamePhone`, `unlinkPhone(id,
currentPassword)`, `history(params)`. Query keys in `lib/queryKeys.js`
under the WhatsApp settings key. Side effects in hooks.

## 6. Tests (vitest)

Migration-independent: the cap (sixth refused before a code), label
required and unique per user, a number live on another user (409), linking
again after unlink restores the archived row, unlink by id (404 for another
user's), rename audited and not rewriting old entries, the gate accepting
any live phone and refusing an archived one, CONFIRM from B never taking
A's action, every history action written with `{ last4, label }` and no
text, a failed audit write not stopping the reply, the history route's
filters and `.strict()` query, `details` allowlisted.

## 7. Postman (written now, captured by the reviewer)

- `prepare_whatsapp_test_db.sql`: archive or clear every live
  `WhatsappPhone` and give `broker@example.com` one live fixture phone
  (`15550000777`, label `Fixture`) — still a broker, so it can do nothing.
- `32 · WhatsApp Settings`: send-code examples gain `400 · Name required`
  and `409 · Five phones linked`; unlink by id `404 · Not your phone`;
  rename `200`; `History` `200` with filters and `400 · Unknown parameter`
  (`?search=`). No request sends a real code.
- The five-phones 409 needs admin to hold five live phones, and linking
  through the API sends a real code through Meta — so the API cannot
  create that state. Give the builder a way the reviewer can run: e.g. a
  second SQL file, `postman/whatsapp_five_phones.sql` (refuses any database
  but `tribeca_postman`, adds five fake `1555000080x` phones to admin), run
  only around that capture and undone by the prep script. Propose the
  cleanest way and say which you chose. Newman runs the executable request
  in the prepared state (no phones), so it expects a different status —
  name it.
- README: the new requests and the prep step.

## 8. Docs and rules (same pass)

- **AGENTS.md**, part two's WhatsApp section: "from that phone" → "from one
  of the Super Admin's verified phones (up to five, each named)"; add "the
  history is the audit log, one entry per answered question, proposed /
  confirmed / cancelled action and document, with the phone's label and
  last four as they were; never the text".
- `docs/WHATSAPP_AI_INTEGRATION.md` §4 and §6 (8d 🔍 built by Codex,
  awaiting review); `docs/MODULE_FEATURE_STATUS.md`.
- Do **not** edit `HANDOFF.md`.

## 9. Run and paste

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
```

## 10. Report

1. Files created / changed, one line each, and the migration SQL in full.
2. Anything in this brief that did not match the code, and what you did.
3. Decisions the brief left to you (the label's carrier from code to
   verify, the archived-phones route, the five-phones Postman state).
4. The §9 output (counts).
5. Confirmation that nothing was committed or run against a database or an
   external service, and no `.env` was opened (`git status`).
