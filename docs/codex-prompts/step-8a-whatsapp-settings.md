# Codex prompt — WhatsApp assistant, step 8a: its settings in the admin panel

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-8a-whatsapp-settings.md and carry out
everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (all three parts),
docs/WHATSAPP_AI_INTEGRATION.md (§4 and §7 especially), and every file in
Backend/src/modules/whatsapp/ and Backend/src/modules/settings/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env or Frontend/.env*. Tests stub fetch, Redis and Prisma.
- No npm install. You may create the migration file (§3) but never apply
  it, and never touch a database.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §10 commands exactly as written and finish with the §10 report.
```

---

You are implementing **step 8a** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center. Steps 1–7 are built, reviewed and live.
Today every WhatsApp and OpenAI value the bot uses lives in `Backend/.env`.
**The developer's decision (20 Nov 2026):** they all move into the database
and are changed from the admin panel — the OpenAI key and model, the Meta
values, and the Super Admin's phone, linked by a code the bot sends to it
on WhatsApp. No email variable: the bot acts as the Super Admin whose phone
is verified. Another engineer will review your work line by line. This
step holds secrets: precision matters more than speed.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` all three parts — especially the
   WhatsApp section, "A setting is read by the module it governs", "The
   branding is public, and only the branding", "Authority is never a role
   check in a service", the audit-column rules, "Read every generated
   migration", and the frontend's data-layer and design rules. Then
   `docs/WHATSAPP_AI_INTEGRATION.md` §4 and §7 (step 8's original plan),
   every file in `Backend/src/modules/whatsapp/` and `settings/`,
   `config/configuration.ts`, `config/config.service.ts`,
   `modules/auth/verification.service.ts`, `auth.service.ts`'s
   `assertPassword`, and on the frontend `components/settings/` and the
   Settings page.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open any `.env`.** `npm test` runs `prisma generate`, which
   loads it; that is the tool, not you.
5. Backend: NestJS 12, TS, ESM (`.js` imports), vitest, oxlint, Zod 4,
   Prisma 7 (multi-file schema, generated client never edited). Frontend:
   Next.js 16, **JavaScript**, shadcn on Base UI, React Query, the shared
   components. No new package — Node's `crypto` does the encryption.
6. **Out of scope:** Postman (that is step 8b — do not touch
   `Backend/postman/`), the deploy, and the web app's "Ask Anything"
   assistant (`modules/assistant`), which reads no AI configuration at all
   and is not changed.

## 1. The six safeguards (agreed with the developer — each is required)

1. **Super Admin only.** Only a stored-role `SUPER_ADMIN` reads or changes
   these settings — not an Admin, and no permission grants it. This is
   identity, like `isAdministrator`: the assistant is the Super Admin's
   (AGENTS.md's WhatsApp section). Add `@SuperAdminOnly()` beside
   `@StaffOnly()` (same mechanism — `AccessGuard`, stored role, 403) and
   record why in AGENTS.md (§9). The frontend hides the tab from everyone
   else (a role check is right here — it mirrors an identity rule, not a
   permission).
2. **Secrets are write-only.** The four secrets — OpenAI API key, Meta
   access token, app secret, verify token — are never returned to the
   browser, logged or written to the audit log. A read returns
   `{ set: boolean, last4: string | null }` for each.
3. **Encrypted at rest.** The four secrets are stored AES-256-GCM-encrypted
   with a key from **one** new env variable, `SETTINGS_ENCRYPTION_KEY`
   (32 bytes, base64). It is the only WhatsApp-related variable left.
   Without it the API still boots; the WhatsApp settings read as not
   configured and refuse a secret with a named 400 ("Set
   SETTINGS_ENCRYPTION_KEY on the server first").
4. **The current password, again.** Saving a change to any field of these
   settings, sending a phone-link code and unlinking the phone each require
   `currentPassword`, checked by the same rule as My Account
   (`assertPassword` — make it callable from here without duplicating it;
   a wrong password is a 400 and counts towards the same re-auth limit).
5. **The phone is proven.** A number links only after the caller types back
   a 6-digit code the bot sent to it on WhatsApp. It links to **the
   caller's own** account.
6. **No email setting.** The bot acts as the active SUPER_ADMIN whose
   verified phone sent the message.

## 2. A shared secret box — `common/crypto/secret-box.ts`

- `sealSecret(plain: string): string` and `openSecret(sealed: string):
  string`, AES-256-GCM, a fresh 12-byte IV per seal, stored as
  `v1:<iv>:<tag>:<ciphertext>` (base64 parts) so the format can change
  later. Key from `SETTINGS_ENCRYPTION_KEY` through the config service
  (validated at boot: absent is allowed, present must decode to 32 bytes or
  the API refuses to start — a wrong-size key is a misconfiguration, not
  "not configured").
- `lastFour(plain)` for the read view.
- A sealed value that fails to open (wrong key, tampered) throws a named
  error; callers treat that secret as not set and log the class only.
- Tests: round trip; two seals of one value differ; a tampered tag fails;
  a wrong key fails; the version prefix; never logs the value.

## 3. Schema and migration

- **`WhatsappSettings`** (one row, `id = 1`, like `company_settings`; the
  four audit columns, no archive trail — it is never created or removed by
  a person): `openaiApiKey` (sealed, nullable), `openaiModel`
  (nullable), `accessToken`, `appSecret`, `verifyToken` (sealed,
  nullable), `phoneNumberId` (nullable), `graphVersion` (default
  `"v25.0"`). Created on first read like the settings row (read how
  `SettingsService` does it).
- **`users`**: `whatsappPhone String? @unique` (digits only, as
  `phoneDigits` stores them), `whatsappPhoneVerifiedAt DateTime?`.
- **`VerificationPurpose`**: add `WHATSAPP_LINK`.
- **`verification_codes`**: add `target String? @db.VarChar(32)` — "the
  address a code was sent to, when it is not the account's own: the phone
  being linked (WHATSAPP_LINK)". Null for every existing purpose.

### 3a. Extending `VerificationService` (additive — the existing flows must not change)

`issue()`'s context gains an optional `target`; `VerifiedChallenge` gains
`target: string | null`; and the "consumed outright vs. marked verified"
rule becomes **"marked verified for PASSWORD_RESET only, consumed for every
other purpose"** — so `WHATSAPP_LINK` is consumed on success like
`TWO_FACTOR`, and never enters the password-reset path. `ttlMinutesFor`
gives `WHATSAPP_LINK` the two-factor TTL. Every existing call keeps its
exact behaviour (its tests must pass unchanged; add one asserting
PASSWORD_RESET is still only marked verified). The link flow binds to one
browser exactly as two-factor does: the challenge token goes in its own
httpOnly cookie, set and read the way `TokenService.setChallenge` does for
`tj_2fa` (a new name, scoped to the link routes), never in a response body.
- One migration, **hand-checked** (AGENTS: read every generated migration):
  only creates and adds — no `DROP`. Name it
  `2026112012xxxx_whatsapp_settings`. Do not apply it.
- `company_settings.whatsappAssistantEnabled` (the Security switch) stays
  where it is — it is the lost-phone switch, not a secret.

## 4. Reading the configuration — `WhatsappSettingsService`

In `modules/whatsapp/` (the module that governs these settings):

- `current(): Promise<WhatsappConfig | null>` — the decrypted values,
  **null unless every Meta value is present** (access token, phone number
  id, app secret, verify token). Cached in memory and cleared on every
  write by this service (one API process; say so in a comment).
- `ai(): Promise<{ apiKey, model } | null>` — null unless both are set.
- Replace **every** reader of `config.whatsapp` and of the bot's
  `config.ai.openaiApiKey/openaiModel`: the controller (both routes still
  404 while `current()` is null), `WhatsappSender`, `WhatsappService`'s
  gates, `whatsappAiClientProvider` (the OpenAI client is now built from
  `ai()` when needed and rebuilt when the key or model changes — not once
  at boot), and `scripts/whatsapp-ask.ts`.
- **The admin gate changes:** a message passes only if its `from` equals a
  user's verified `whatsappPhone`, that user is `SUPER_ADMIN`, `ACTIVE`,
  not deleted — re-read per message, as today. That user is who the bot
  acts as (`resolveAccess`, as now). Everything else in the gates —
  switch, Meta redelivery, ten-minute age, silence on failure — is
  unchanged.
- **Remove from the env:** `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION`,
  `SUPER_ADMIN_WHATSAPP_PHONE`, `SUPER_ADMIN_WHATSAPP_EMAIL` — from
  `configuration.ts` (with `resolveWhatsapp` and its all-or-none rule),
  `config.service.ts` and `.env.example`. Add `SETTINGS_ENCRYPTION_KEY` to
  `.env.example` with how to make one
  (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
- **`config.ai` goes too.** Its only readers are the WhatsApp bot and the
  health check's `ai` line, so once the bot reads the panel, `AI_PROVIDER`,
  `OPENAI_API_KEY`, `OPENAI_MODEL` and `ANTHROPIC_API_KEY` would be env
  settings nothing reads (AGENTS: never keep one). Remove them from
  `env.validation.ts`, `configuration.ts`, `config.service.ts` and
  `.env.example`. The health check keeps its `ai` field with the same
  values (`configured` / `not_configured`), now meaning "the WhatsApp
  assistant's OpenAI key and model are set" — read through
  `WhatsappSettingsService.ai()` without returning the key. If the health
  module cannot reach that service without an import cycle, stop and
  report.

## 5. The routes — `/settings/whatsapp`

All `@SuperAdminOnly()`, all on the settings controller or a new one in the
whatsapp module (your call — say which and why). Every write is audited on
`WhatsappSettings` (or the user, for the phone) with **field names only**,
never values.

| Route | Body | Does |
|---|---|---|
| `GET /settings/whatsapp` | — | `{ openaiModel, phoneNumberId, graphVersion, openaiApiKey: {set,last4}, accessToken: {set,last4}, appSecret: {set,last4}, verifyToken: {set,last4}, encryptionReady: boolean, linkedPhone: { phone, verifiedAt } \| null, webhookUrl }` — `webhookUrl` is `API_PUBLIC_URL` + `/api/webhooks/whatsapp`, so the panel can show what to paste into Meta |
| `PATCH /settings/whatsapp` | `currentPassword` + any of the fields; a secret as a string sets it, `null` clears it, absent leaves it; written out per AGENTS (no `.partial()`) | saves, clears the cache, audits `whatsapp_settings.updated` with the changed field names |
| `POST /settings/whatsapp/phone` | `{ phone, currentPassword }` | normalises with `phoneDigits`; refuses a number already linked to another user (409); needs `current()` non-null (400 "Finish the Meta settings first"); issues a `WHATSAPP_LINK` code through `VerificationService` (its expiry, attempt limit and hashing) for the caller; sends it with `WhatsappSender.sendText` to that number: "Your Tribeca Jets code is 123456. It expires in <the TTL> minutes." (the real TTL, never a literal). Send failure (`sendText` returns `false` — keep its boolean contract; the sender already logs Meta's status and codes) → 502 "WhatsApp did not accept the message — check the Meta settings and that this number can receive messages from the business number", and the issued code is consumed so it cannot be used. Rate-limited like the other code routes (`@RateLimit`, and the same per-address code counting as two-factor). The pending phone is the code's `target` (§3a); the challenge goes in the link cookie |
| `POST /settings/whatsapp/phone/verify` | `{ code }` (challenge from the link cookie) | verifies and consumes the code; the code's `userId` must be the caller; sets the caller's `whatsappPhone` to the code's `target` and `whatsappPhoneVerifiedAt`; re-checks the number is not linked to anyone else (409 — never moves it off another user); clears the cookie; audits `user.whatsapp_linked` with the last four digits only |
| `DELETE /settings/whatsapp/phone` | `{ currentPassword }` | clears the caller's phone; audits `user.whatsapp_unlinked` |

Responses use the usual envelope. Swagger documents itself from the DTOs.

## 6. The frontend — Settings › "WhatsApp & AI"

- A new section in the Settings nav, **rendered only for a SUPER_ADMIN**
  (`proxy.js` / the page read the role as they do elsewhere — follow the
  existing pattern; never a permission check).
- One service file, one hook per operation, React Query keys from
  `queryKeys.js`, toasts and invalidation in the hooks (AGENTS part three).
- **Cards** (`SettingsCard`, `SettingRow`, `CommonInput`):
  1. *OpenAI* — model (text), API key.
  2. *Meta (WhatsApp Cloud API)* — phone number id, Graph version, access
     token, app secret, verify token, and the **webhook URL** read-only with
     a copy button.
  3. *Your phone* — linked number and when, or the link flow.
- **A secret field** shows "Set · ends in a3f9" or "Not set", with
  **Replace** (opens an empty password input) and **Clear**; it is never
  prefilled and never shows the value.
- **Saving** opens one dialog asking for the current password
  (`CommonInput type="password"`), then sends the PATCH with only changed
  fields. A wrong password shows inside the dialog.
- **Linking the phone:** number → password → "Send code" → a 6-digit
  `CommonOTPInput` → "Verify" → linked ✓. "Unlink" asks for the password.
  The screen says the code arrives **on WhatsApp from the business number**
  and, while Meta's test number is used, only to numbers on its recipient
  list.
- If `encryptionReady` is false, the whole section shows one notice
  ("Set SETTINGS_ENCRYPTION_KEY on the server to use the WhatsApp
  assistant") and no inputs.
- Responsive (AGENTS part three), 24-hour times (`formatTimestamp`), no
  hardcoded colors, no `window.confirm`.

## 6a. Errors never echo the query string (found 20 Nov, by Codex)

`AllExceptionsFilter` logs `request.url` and returns it as `path`, query
string included. Meta sends the verify token in `hub.verify_token`, so a
verification refused for its mode returned **and logged** the right token —
and every 4xx on a list writes its `?search=` (a client's name) to the log.
Fix it in the filter, for every route: log and return the path **without
the query string** (`request.path`, or `request.url` cut at `?` — check
which holds the `/api` prefix and keep the prefix exactly as today). Test:
a 403 on `/api/webhooks/whatsapp?hub.verify_token=secret-marker&…` has
`path` `/api/webhooks/whatsapp`, and neither the body nor any logger call
contains `secret-marker`; a 400 on `/api/clients?search=Marcus` logs no
`Marcus`. Add a line under AGENTS.md part two's "Errors" section: an error
never echoes or logs the query string.

## 7. What must not change

- The gates' behaviour (only *where* the phone comes from), CONFIRM, the
  pending rules, the tools, PDFs, memory, logging rules.
- The Security switch and its place.
- Ask Anything's config.
- No secret ever in a response, log, audit row, error message or test
  snapshot.

## 8. Tests

Every case must exist and pass:

- **secret box** — §2's cases.
- **settings service / routes** — GET never contains a secret (feed
  distinctive values, assert absent; `last4` correct); PATCH with a wrong
  password → 400 and nothing saved; set, replace, clear (`null`) and leave
  (absent) each behave; the audit row has field names and no values; a
  non-SUPER_ADMIN (an ADMIN with every permission) → 403 on every route;
  no encryption key → GET `encryptionReady: false`, PATCH with a secret →
  400.
- **verification service** — `target` round-trips through issue and
  verify; WHATSAPP_LINK is consumed on success; PASSWORD_RESET is still
  only marked verified; every existing verification test unchanged.
- **phone linking** — send: number already linked elsewhere → 409; Meta
  settings incomplete → 400; wrong password → 400; the sender is called
  with the normalised number and the code text, and the code is stored
  hashed; verify: right code links the caller and audits last four;
  wrong code counts an attempt; expired → refused; unlink clears.
- **gates** — a message from a verified SUPER_ADMIN's phone passes and acts
  as that user; the same number on an ADMIN, a SUSPENDED super admin, or an
  unverified number → silently dropped; no settings → the webhook 404s.
- **AI client** — built from the stored key and model; rebuilt after a
  change; null when either is missing.
- **config** — the eleven variables are gone (`configuration.ts` and
  `env.validation.ts` no longer read them); health's `ai` field reports
  the panel's key and model; a wrong-size `SETTINGS_ENCRYPTION_KEY` refuses to boot;
  absent boots.
- Every existing WhatsApp test updated to the new config source — none
  deleted to make the suite pass.
- **Frontend:** `npm run lint` and `npm run build` clean.

## 9. Docs (same pass)

- `AGENTS.md`, WhatsApp section: **rewrite** the bullet "The phone and the
  account it acts as live in the env…" to the new rule (Super Admin only,
  write-only sealed secrets, password re-check, the phone proven by a
  WhatsApp code, the bot acts as the verified SUPER_ADMIN, one env key);
  add `@SuperAdminOnly()` beside `@StaffOnly()` where the access layers
  are described, with why.
- `docs/WHATSAPP_AI_INTEGRATION.md`: §4's env table becomes "Settings ›
  WhatsApp & AI" plus the one env key; §7 updated to what was built; §6
  step 8 → `🔍 <date> — 8a built by Codex, awaiting review`; the
  "Going to production" checklist uses the panel instead of Dokploy env
  (keep the encryption key in Dokploy).
- `docs/MODULES.md` §26 map: rows for the new settings and their reader.
- `docs/MODULE_FEATURE_STATUS.md`: WhatsApp and Settings entries.
- Do **not** edit `HANDOFF.md`.

## 10. Done

Run and paste the output:

```
cd Backend
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report file and test counts
cd ../Frontend
npm run lint          # 0 errors
```

**Do not run the frontend build** — it fetches Google Fonts and the API's
branding, both outside this step's limits. The reviewer runs
`npm run build` after your report.

Then a short report:

1. Files created / changed (one line each), and the migration's SQL in full.
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that the brief did not cover.
4. Confirmation that nothing was committed, no migration was applied, and
   no `.env` was opened (`git status`).
