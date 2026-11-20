# Codex prompt — WhatsApp assistant, step 8c: the settings tab, reworked

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-8c-whatsapp-settings-ux.md and carry out
everything below the "---" line in it. That file is your full brief.

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

Finish with the §9 report.
```

---

You are reworking **Settings › WhatsApp & AI** in the Tribeca Jets Command
Center (steps 8a / 8a-2 built it; 8b added its Postman folder). The
developer used it to set up production and asked for three changes, and
made three decisions. Every 8a safeguard not changed below still holds.

## The developer's decisions (20 Nov 2026)

1. **The assistant switch moves to this tab** and becomes **Super Admin
   only**. Turning it **on** needs the current password; turning it **off**
   does not (it is the lost-phone switch and must be instant).
2. **Secrets become viewable** — hidden by default, shown one at a time
   after the current password, audited. **No rate limit on viewing** (the
   developer's call). The wrong-password throttle inside
   `AuthService.assertPassword` still applies — it is the account's
   password rule, not a limit on viewing; leave it alone.
3. **The verify token gets a Generate button** — the value is ours, not
   Meta's.
4. **One Save per card** for all its fields, replacing the per-row Save.
   The developer forgot a row's Save during the production setup and the
   webhook answered 404 until they found it.

## 0. Read first

AGENTS.md (whole), and:
- Backend: `modules/whatsapp/whatsapp-settings.{controller,service}.ts`,
  `dto/whatsapp-settings.dto.ts`, `whatsapp.service.ts` (the gate at
  `switched_off`), `whatsapp.spec.ts`, `whatsapp.agent.spec.ts`,
  `common/crypto/secret-box.ts`, `common/decorators/access.decorator.ts`
  (`@SuperAdminOnly`), `modules/auth/auth.service.ts` (`assertPassword`),
  `modules/settings/{dto/settings.dto.ts,settings.view.ts,settings.spec.ts}`,
  `prisma/schema/{settings,whatsapp-settings}.prisma`, migration
  `20261116120000_whatsapp_assistant_switch`.
- Frontend: `components/settings/sections/{WhatsappSettingsSection,
  WhatsappPhoneCard,WhatsappPasswordDialog,SecuritySection}.jsx`,
  `components/settings/*`, `hooks/settings/useWhatsappSettings.js`,
  `services/whatsappSettings.service.js`, `lib/settings.js`,
  `hooks/common/useUnsavedChangesGuard.js`,
  `components/common/{ConfirmDialog,CommonInput}.jsx`, `app/globals.css`.
- Postman: `postman/README.md`, `builder_common.py`, `whatsapp_postman.py`,
  `build_whatsapp_settings_folder.py`, `build_whatsapp_webhook_folder.py`,
  `build_settings_folder.py`, `prepare_whatsapp_test_db.sql`.
- Docs: `docs/MODULES.md` §26's map, `docs/MODULE_FEATURE_STATUS.md`.

## 1. The switch moves into `whatsapp_settings`

- **Schema:** `WhatsappSettings.assistantEnabled Boolean @default(false)`;
  remove `whatsappAssistantEnabled` from `CompanySettings`.
- **Migration, hand-written** (AGENTS.md "Read every generated migration"):
  add the column; copy the current value across — `INSERT … ON CONFLICT
  (id) DO UPDATE` for row 1, since the `whatsapp_settings` row may not exist
  yet — then drop the old column. The value must survive: production has it
  **on** right now. Name it `20261120130000_whatsapp_assistant_switch_moves`
  (after the newest, `20261120120000_whatsapp_settings`).
- **Remove it from Settings:** `settings.dto.ts`, `settings.view.ts`
  (security section list), `settings.spec.ts`, and the frontend
  `lib/settings.js` and `SecuritySection.jsx`. A `PATCH /settings` that
  still sends `security.whatsappAssistantEnabled` is then refused (400) by
  the security schema's `.strict()`, which is already there.
- **The gate** in `WhatsappService` reads `assistantEnabled` through
  `WhatsappSettingsService` (drop the `SettingsService` dependency if
  nothing else uses it there). A change applies on the next message:
  confirm the write clears the 15-second cache in the same process.
- **Route:** `PATCH /settings/whatsapp/assistant`, body
  `{ enabled: boolean, currentPassword?: string }` (strict).
  `enabled: true` requires `currentPassword` (400 naming it when absent,
  `assertPassword` otherwise); `enabled: false` needs nothing and ignores
  no field silently — a `currentPassword` sent with `false` is accepted and
  not checked. Returns the full view (§3). Audit
  `whatsapp_assistant.switched_on` / `switched_off`. `@SuperAdminOnly()` as
  the rest of the controller; no `@RateLimit`.
- **Turning on while not ready** (§3's readiness not all true) is allowed
  but the response's readiness shows what is missing — the screen warns;
  the server does not refuse (the developer may switch on first and
  configure after).

## 2. Viewing a secret

- `POST /settings/whatsapp/reveal`, body `{ field, currentPassword }`
  (strict), `field` one of `openaiApiKey | accessToken | appSecret |
  verifyToken`. `@HttpCode(200)`, **no `@RateLimit`**.
- `assertPassword` first, then open the sealed value. Not set → 400 "That
  secret is not set". Unreadable (`SecretOpenError`, wrong key) → 409 "That
  secret cannot be read with this server's key. Replace it." Encryption not
  ready → the existing 400.
- Returns `{ field, value }` with `Cache-Control: no-store` on the
  response. The value is never logged, never put in an error, never cached
  by the service beyond what `load()` already holds.
- Audit `whatsapp_settings.revealed`, metadata `{ field }` only.

## 3. The view

`GET /settings/whatsapp` (and every route returning the view) adds:

- per secret: keep `{ set, last4 }` and add `masked` — `null` when unset,
  otherwise twelve `•` followed by `last4` (or twelve `•` alone when the
  value has four characters or fewer, matching `lastFour`'s rule);
- `assistantEnabled: boolean`;
- `readiness: { openai: boolean, meta: boolean, metaMissing: string[],
  phoneLinked: boolean, encryptionReady: boolean }` — `openai` is
  `ai() !== null`; `meta` is `current() !== null`; `metaMissing` lists the
  missing names among `phoneNumberId`, `accessToken`, `appSecret`,
  `verifyToken`, in that order. This is exactly the condition under which
  the webhook answers 404 — reuse the same check, do not write a second
  copy.

Tests (vitest): reveal (each field, wrong password 400, not set 400,
unreadable 409, audit has the field and not the value, no-store header);
switch (on needs password, off does not, audit both, the gate reads the
new column, the cache clears); masked and readiness shapes; `PATCH
/settings` refuses the old key; the migration's SQL is reviewed by the
reviewer, not tested.

## 4. Frontend: the tab

Order, top to bottom: **Assistant** section, OpenAI card, Meta card, Your
phone card.

### 4a. Assistant section (top, highlighted)

- A card with a coloured border from existing tokens: `border-destructive`
  while the assistant is **off**, `border-success` while on and every
  readiness item is true, `border-warning` while on but something is
  missing. Never a raw colour.
- The switch, labelled "WhatsApp assistant", with one line: "Off stops the
  bot at once. It answers only your linked phone." Turning on opens the
  existing password dialog; turning off is immediate.
- A readiness checklist from `readiness`: OpenAI key and model saved ·
  Meta settings saved (when not, "Missing: App secret, Verify token" from
  `metaMissing`, labels not field names) · Your phone linked · Encryption
  key on the server (shown only when false). ✓ / ✗ with text, not colour
  alone.

### 4b. A secret field — one reusable component

New `components/common/secret-field/SecretField.jsx` (more settings will
move from the env; it is shared by design). Props: `label`, `secret`
(`{ set, masked }`), `onReveal(password) → Promise<string>`, `value` /
`onChange` for an edit, `editing` / `onEditingChange`, optional
`onGenerate`. States:

- **Hidden** (default): a read-only input showing `masked` (or "Not set"
  as a placeholder), buttons on the right: **View** (only when set) and
  **Edit**.
- **Shown**: View opens the password dialog and calls `onReveal`; the
  input shows the value with **Copy**, **Hide** and **Edit**. It hides
  itself after **30 seconds**, on Hide, on Edit and on unmount. The value
  lives only in this component's state — never React Query's cache (the
  reveal is a mutation whose result is not stored), never `localStorage`,
  never a log. Copy uses the clipboard API and toasts "Copied".
- **Editing**: an empty password-type input for the new value (with
  CommonInput's show/hide eye), **Cancel** (restores, drops the typed
  value) and, when `onGenerate` is given, **Generate**. A set secret also
  offers **Clear** here, through `ConfirmDialog`; it marks the field to be
  sent as `null` on the card's Save.
- Buttons are the existing `SettingsButton` / `ui/button` variants; mobile:
  the buttons wrap under the input below `sm`.

### 4c. Verify token: Generate

`onGenerate` fills the edit with 32 random characters from
`crypto.getRandomValues` over `A–Z a–z 0–9 -_` and shows it **unmasked**
with a Copy button, plus the line "Copy it now and paste it into Meta
after you save." It is saved by the card's Save like any edit.

### 4d. One Save per card

- The OpenAI card (key, model) and the Meta card (phone number ID, Graph
  version, access token, app secret, verify token) each have **one Save**,
  enabled only when something in that card changed, and an "Unsaved
  changes" note beside it. Save opens the password dialog **once** and
  sends one `PATCH /settings/whatsapp` with only the changed fields
  (the DTO already accepts several); a cleared secret goes as `null`. On
  success every edited row returns to Hidden with its new `masked`.
- Remove the per-row Save / Cancel / Clear from 8a-2.
- `useUnsavedChangesGuard` covers both cards: leaving the tab or page with
  unsaved changes asks first.
- **Test connection** keeps testing the typed values (falling back to the
  stored ones). When it succeeds while the card has unsaved changes it says
  "Connected — not saved yet. Click Save to keep it." in place of the plain
  success line.

### 4e. Hooks and service

`whatsappSettings.service.js`: `reveal(field, currentPassword)`,
`setAssistant(enabled, currentPassword?)`. Hooks: `useRevealWhatsappSecret`
(mutation, no cache write, no success toast — the value is the result) and
`useSetWhatsappAssistant` (invalidates the WhatsApp settings key and
toasts "Assistant on" / "Assistant off"). Side effects in hooks, per
AGENTS.md.

## 5. Postman (written now, captured by the reviewer)

- `prepare_whatsapp_test_db.sql`: switch off through
  `whatsapp_settings."assistantEnabled"`, not `company_settings`.
- `whatsapp_postman.py`: `CLEARED_VIEW` gains `assistantEnabled: false`
  and the expected `masked` / `readiness`; `SAVED_VIEW` likewise.
- `32 · WhatsApp Settings` gains, in an order whose preconditions hold:
  - `Reveal a secret`: `400 · Not set` (before the save), `200 · Shown`
    (after the save, `verifyToken` → the fake `postman-verify-token`),
    `400 · Wrong password`, `403 · Not the Super Admin` (the two-factor
    Admin session, as the 8b 403s).
  - `Switch the assistant`: `200 · Switched on` (with password),
    `400 · Password needed to switch on` (no `currentPassword`),
    `400 · Wrong password`, `200 · Switched off` (no password). The
    executable request switches **off**; the teardown also switches off.
    With fake settings and no linked Super Admin phone, being on for a
    moment reaches nobody.
- `30 · Settings`: its examples still show `whatsappAssistantEnabled` in
  the security section; the reviewer re-runs `build_settings_folder.py`.
  Change that builder only if it names the field (read it).
- README: the two new requests in 32's section.

## 6. Docs and rules (same pass)

- **AGENTS.md**, part two's WhatsApp section and part one's
  "Configuration moves from the env into Settings": "write-only (a read
  returns `{ set, last4 }`)" becomes "**hidden by default**: a read returns
  `{ set, last4, masked }`; the value is shown only by `POST …/reveal`
  after the current password, audited by field name, `no-store`". The
  switch bullet: it lives in `whatsapp_settings`, on the WhatsApp & AI tab,
  Super Admin only; on needs the password, off does not. Add: "**A secret
  field on a settings screen is `SecretField`**" to part three's design
  rules.
- `docs/WHATSAPP_AI_INTEGRATION.md`: §4 (the switch's new home, reveal,
  readiness), §6 a row/line for 8c 🔍 "built by Codex, awaiting review".
- `docs/MODULES.md` §26: the switch's row moves to Settings › WhatsApp &
  AI (reader: `WhatsappService`'s gate).
- `docs/MODULE_FEATURE_STATUS.md`: Settings' lines.
- Do **not** edit `HANDOFF.md`.

## 7. Never

- No raw colour, no `window.confirm`, no `<img>`, no AM/PM.
- No secret value in a log, an error, an audit row, React Query's cache,
  `localStorage`, a URL **this code builds** (the frontend's requests, the
  reveal route — the value travels in the body) or a test snapshot (tests
  use fake values). **Meta's own webhook verification is outside this
  rule and unchanged:** Meta sends `hub.verify_token` in the query string
  of its GET to `/api/webhooks/whatsapp` — that is Meta's contract, and
  the error filter already keeps the query string out of logs and error
  bodies. Do not touch that route.
- No `@RateLimit` on reveal or the switch.

## 8. Run and paste

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
```

(No migration, no build of the frontend — the reviewer does both.)

## 9. Report

1. Files created / changed, one line each, and the migration SQL in full.
2. Anything in this brief that did not match the code, and what you did.
3. Decisions the brief did not cover.
4. The §8 output (counts, not every line).
5. Confirmation that nothing was committed or run against a database or an
   external service, and no `.env` was opened (`git status`).
