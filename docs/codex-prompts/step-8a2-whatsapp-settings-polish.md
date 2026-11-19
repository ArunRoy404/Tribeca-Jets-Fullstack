# Codex prompt — WhatsApp assistant, step 8a-2: the settings screen, finished

Paste into the **same** Codex chat that built 8a (it has the context):

```
The developer reviewed the new Settings › WhatsApp & AI screen. Read
docs/codex-prompts/step-8a2-whatsapp-settings-polish.md and carry out
everything below the "---" line. Same non-negotiables as 8a: no git
history or index changes, no live external calls (tests stub fetch), no
.env opened, no npm install, no database. Finish with its §7 report.
```

---

Step 8a is reviewed and its migration applied locally. The developer
opened the screen and asked for four changes; the reviewer found one bug.
Everything in 8a's brief still holds — the six safeguards above all.

## 1. Import the existing `.env` values once

The developer's `.env` still holds the values the bot used to read. They
must land in the database so the screen opens showing them as set.

- New script `src/scripts/whatsapp-import-env.ts`, npm script
  `whatsapp:import-env` (built and run like `whatsapp:ask`).
- It reads the **legacy** names straight from `process.env` (dotenv):
  `OPENAI_API_KEY`, `OPENAI_MODEL`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION` — and nowhere else in
  the app (configuration.ts must not read them again).
- It fills **only fields that are empty in the database** — never
  overwrites a value set in the panel — sealing the four secrets through
  `SecretBox` and writing through `WhatsappSettingsService` (add a method;
  no raw second write path), clearing its cache. Refuses with a clear line
  if `SETTINGS_ENCRYPTION_KEY` is missing.
- **The phone is not imported**: `SUPER_ADMIN_WHATSAPP_PHONE` is ignored —
  the phone links only by the WhatsApp code (safeguard 5). The script says
  so.
- Audit `whatsapp_settings.imported` with the field names, actor null
  (a script, like the seed).
- Prints the **names** of the fields it imported and skipped — never a
  value, never a suffix.
- Tests: fills empty fields only, seals secrets, never prints a value
  (capture console), refuses without the key, ignores the phone.

## 2. OpenAI: key first, then test, then pick a model from a list

- The card's order: **API key**, then **Test connection**, then **Model**.
- `POST /settings/whatsapp/openai/test` (`@SuperAdminOnly()`,
  `@RateLimit` like the code route), body `{ apiKey?: string }` — the key
  being typed (not yet saved) or, when absent, the stored key. It calls
  `GET https://api.openai.com/v1/models` with that key (10 s timeout) and
  returns `{ ok: true, models: string[] }`: model ids that can answer a
  chat — keep ids starting `gpt-`, `chatgpt-` or `o` followed by a digit;
  drop any containing `embedding`, `tts`, `whisper`, `dall-e`, `image`,
  `audio`, `realtime`, `transcribe`, `search`, `moderation`, `instruct` —
  sorted newest-looking first (descending by id is enough). Refusal →
  `400 "OpenAI refused this key"` (401/403); no network / timeout / 5xx →
  `502 "Could not reach OpenAI"`. Never logs or returns the key; logs the
  status only. No password needed — testing changes nothing.
- The **Model** field becomes a select (`CommonSelect` / `PickerSelect` —
  a fixed list, so not `RecordPicker`), filled from the last test. Before
  a test it shows the saved model (if any) as the only option and the hint
  "Test the key to choose a model". A saved model missing from a new list
  stays selectable, labelled "(saved — not in your key's list)".
- Keep `ai()` and the agent unchanged: they read the saved model.

## 3. Meta: a test button too

`POST /settings/whatsapp/meta/test`, body `{ accessToken?, phoneNumberId?,
graphVersion? }` (typed values, falling back to stored ones) →
`GET https://graph.facebook.com/<v>/<phoneNumberId>?fields=display_phone_number,verified_name`
with the token → `{ ok: true, displayPhoneNumber, verifiedName }`. Meta
error code 190 → `400 "Meta refused the access token"`; 100 / 404 →
`400 "Meta has no phone number with that ID"`; network/5xx → `502`. Same
logging rules as the sender. The card shows "Connected: +1 555-138-2534 ·
Test Number" on success.

## 4. A secret's Replace → Save / Cancel, on its own row

- **Replace** turns the row into an empty password input with **Save**
  and **Cancel** beside it. **Cancel** restores the row unchanged. **Save**
  opens the existing password dialog and PATCHes **only that field**;
  on success the row returns to "Set · ends in …" with the new suffix.
- **Clear** (when set) asks in `ConfirmDialog`, then the password dialog,
  then PATCHes that field as `null`.
- The plain fields (model, phone number ID, Graph version) keep one
  **Save** per card (OpenAI card / Meta card), enabled only when that
  card has a change, each through the password dialog. Remove the single
  page-level "Save settings".

## 5. Bug: Graph version shows empty

The database row holds `v25.0` and the service maps it, yet the input
renders empty. Find the cause (the query hook's shape, `CommonInput`'s
value handling, or the edits map) and fix it; add a test or, if the
frontend has no test runner, say exactly what you verified. Fields must
show their saved values.

## 6. The webhook URL hint

Under the Webhook URL: "Meta needs a public HTTPS address. Locally, paste
your tunnel's address with /api/webhooks/whatsapp instead." Shown only
when the URL starts with `http://localhost` or `http://127.`.

## 7. Done

Docs: `docs/WHATSAPP_AI_INTEGRATION.md` §4 (the import script, the two
test buttons), `MODULE_FEATURE_STATUS.md`. Then run and paste:

```
cd Backend
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
```

(No frontend build — the reviewer runs it.) Report: files changed, any
mismatch and what you did, decisions the brief did not cover, and
confirmation nothing was committed or run against a database or an
external service.
