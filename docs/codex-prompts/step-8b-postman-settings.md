# Codex prompt — WhatsApp assistant, step 8b: the Postman folders

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-8b-postman-settings.md and carry out
everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (part one's "Postman collection" section in
full, part two's WhatsApp section and "Configuration moves from the env into
Settings"), Backend/postman/README.md, builder_common.py,
build_whatsapp_webhook_folder.py and build_settings_folder.py.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- Do not run the builders, Newman, the API, SQL or any database. The
  reviewer prepares the test database, captures and runs (§6). No live calls
  to Meta, OpenAI or anything external. Do not open, print or copy any .env.
- No npm or pip install.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the §7 report.
```

---

You are writing **step 8b's Postman work** for the Super Admin's WhatsApp
assistant in the Tribeca Jets Command Center. Step 8a moved every WhatsApp
and OpenAI value from the env into the database (Settings › WhatsApp &
AI, five routes under `/settings/whatsapp` plus two connection tests). The
webhook folder's test setup relied on env variables that no longer exist,
and the new routes have no entries. You write; the reviewer captures.

## 0. Ground rules

1. **Read first, in full:** AGENTS.md part one's "Postman collection"
   (every bullet applies: label assertion, re-runnable, passes alone,
   teardown as its own last request, `pm.variables.get('baseUrl')`,
   `place_folder()`, no `const data`, `CryptoJS` is a sandbox global,
   create bodies omit rather than send `null`, failures on probe
   addresses), part two's WhatsApp section, and "Configuration moves from
   the env into Settings". Then the README, `builder_common.py`, the two
   builders named in the launcher, and in the backend
   `modules/whatsapp/whatsapp-settings.controller.ts`, its DTOs,
   `whatsapp-settings.service.ts`, `whatsapp-phone.service.ts`,
   `whatsapp-connections.service.ts`, and `prisma/seed.ts` for the
   accounts.
2. **Never run** anything that changes git history or the index; do not
   run builders, Newman, SQL or the API.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **No source code change** under `Backend/src` or `Frontend/`.

## 1. Why the test database needs preparing (read this before §2)

The capture runs on `tribeca_postman`, a **copy of the dev database**, on
the 4100 test API — which uses the developer's `.env`, so the **same**
`SETTINGS_ENCRYPTION_KEY`. So the copy holds the developer's **real**
sealed OpenAI key and Meta token, and their **real linked phone**, and
the test API can open them. A run must never use them. Two layers:

1. **`Backend/postman/prepare_whatsapp_test_db.sql`** (new), which the
   reviewer runs on `tribeca_postman` after every refresh, before any
   capture or Newman run. It:
   - sets every value in `whatsapp_settings` to NULL (the four sealed
     secrets, `openaiModel`, `phoneNumberId`), `graphVersion` to
     `'v25.0'`;
   - clears `whatsappPhone` and `whatsappPhoneVerifiedAt` on **every**
     user;
   - gives **`broker@example.com`** a fixture phone: `whatsappPhone =
     '15550000777'`, `whatsappPhoneVerifiedAt = now()` — so "already
     linked to another user" (409) can be shown. A broker can never pass
     the bot's gate (it needs a SUPER_ADMIN), so this number can do
     nothing;
   - deletes unconsumed `WHATSAPP_LINK` rows in `verification_codes`;
   - turns `company_settings.whatsappAssistantEnabled` **off**.
   It must refuse to run against any database but `tribeca_postman`
   (`DO $$ BEGIN IF current_database() <> 'tribeca_postman' THEN RAISE
   EXCEPTION … END IF; END $$;` as its first statement). Read the schema
   for the exact table and column names; if any differ, stop and report.
2. **Folders set only fake values**, through the API, as
   `admin@example.com` (the seed's SUPER_ADMIN, password from the seed):
   `accessToken` `postman-not-a-token`, `phoneNumberId`
   `100000000000000`, `appSecret` `postman-app-secret`, `verifyToken`
   `postman-verify-token`, `graphVersion` `v25.0`, and **no OpenAI key or
   model**. No request ever sends a message that would reach Meta.

## 2. `31 · WhatsApp Webhook` — rebuilt for settings in the database

`build_whatsapp_webhook_folder.py` changes only its setup:

- The 4100 API no longer takes WhatsApp env values (they were removed).
  Remove them from the README's start command and from the builder's
  assumptions.
- **First request: `00 · Setup — test WhatsApp settings`**: sign in as
  `admin@example.com` in its pre-request script (copy the folder login the
  way `copy_folder_login()` does, or use `sign_in_as` — follow the
  pattern), then `PATCH /settings/whatsapp` with `currentPassword` and the
  fake values of §1. The API caches settings for 15 seconds (8a-2) and
  clears the cache on its own write — check that a PATCH clears it so the
  next request sees the values at once; if not, stop and report.
- Requests 01–03 unchanged in substance (verify; a message from
  `15550000999`; a receipt). The signing secret and verify token are the
  fake ones.
- **Last request: `Teardown — clear the test WhatsApp settings`**:
  `PATCH /settings/whatsapp` setting the four secrets and `phoneNumberId`
  to `null`. That returns the copy to §1's prepared state.
- Collection variables `whatsappAppSecret` / `whatsappVerifyToken` keep
  the fake values (blank in Production), unchanged.

## 3. `32 · WhatsApp Settings` — new folder

New `build_whatsapp_settings_folder.py` on `builder_common`, placed with
`place_folder()`. Folder login as `admin@example.com`. Every example
captured from a real run, labels asserted.

| # | Request | Examples |
|---|---|---|
| 01 | `GET /settings/whatsapp` | `200 · Nothing set yet` (every secret `{ set: false, last4: null }`); `403 · Not the Super Admin` (signed in as `security@example.com`, an ADMIN — use a per-request sign-in as the notes builder does) |
| 02 | `POST /settings/whatsapp/phone` — Send a link code | `400 · Wrong password`; `409 · Number linked to another user` (`15550000777`, the broker's fixture); `400 · Finish the Meta settings first` (a fresh probe number, while nothing is set). **No 200** — a real send would message a phone through Meta. The description says so and describes the 200 and the 502 in words |
| 03 | `PATCH /settings/whatsapp` — Save | `200 · Saved` (the fake values of §1; the response shows `set: true` and the last four, never a value); `400 · Wrong password`; `400 · Invalid value` (read the DTO for a refused value — e.g. an over-long field); `403 · Not the Super Admin` |
| 04 | `POST /settings/whatsapp/phone/verify` — Verify the code | `400 · No code requested` (no link cookie) — read the code for the exact message |
| 05 | `DELETE /settings/whatsapp/phone` — Unlink | `200 · Nothing to unlink` (or whatever the service answers when no phone is linked — read it); `400 · Wrong password` |
| 06 | `POST /settings/whatsapp/openai/test` | **Not captured** — it calls OpenAI. Description only: the body, the 200 shape (`{ ok, models }`), 400 refused key, 502 unreachable |
| 07 | `POST /settings/whatsapp/meta/test` | **Not captured** — it calls Meta. Description only, same way |
| — | `Teardown — clear the test WhatsApp settings` | as §2's |

- **`security@example.com` has two-factor on** (the seed), so a password
  alone leaves no session. Keep that account — showing that even an Admin
  is refused is the point of the 403 — and sign it in the way the
  collection already does, never with a new pattern:
  - **capture (Python):** `two_factor_session()` in
    `build_users_folder.py` — login, read `data.devCode.code` (the 4100
    API runs `MAIL_DRIVER=log`), then `POST /auth/two-factor/verify`.
    Import it or copy it as that builder does; do not edit that builder.
  - **Newman needs no two-factor step.** As in `build_notes_folder.py`,
    a 403 is a captured *example* only: the request Newman sends runs as
    the folder's Super Admin and expects its success status. So "use a
    per-request sign-in as the notes builder does" in the table above
    means a second Python session at capture time, not a sign-in in the
    request's script.
- Order the requests so each example's precondition holds (02's "finish
  the Meta settings" must run **before** 03 saves them; 05's runs while no
  phone is linked to admin). A folder run alone must pass, and a second
  run must pass.
- Requests 06 and 07 **must not be in a Newman run** — keep them out of
  the folder's executable items (a description-only request still sends
  in Newman). Put their documentation in the folder description instead,
  under "Not in this folder: the connection tests", or as requests with
  `disabled` — check how Newman treats it; the rule is that a run never
  calls OpenAI or Meta.
- Every body field and query param described; secrets in bodies are the
  fake test values only; failures use probe numbers, never a real one.
- `currentPassword` comes from the seed's documented password through the
  existing collection variable the other folders use — never a literal
  that differs from the seed.

## 4. README

- Remove the WhatsApp env block from the 4100 start command.
- Add "Before any run: prepare the test database" with the exact command
  (`docker exec -i tribeca_postgres psql -U <user> -d tribeca_postman <
  postman/prepare_whatsapp_test_db.sql`) and §1's reason in three lines.
- A section for `32 · WhatsApp Settings` like 31's, and both folders in
  the regeneration table.

## 5. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6, step 8's row: `8b 🔍 <date> —
  Postman builders written by Codex, awaiting capture`.
- Do **not** edit `HANDOFF.md`, `AGENTS.md` or any source file.

## 6. What the reviewer will run

From `Backend/`: refresh `tribeca_postman`; run
`prepare_whatsapp_test_db.sql` on it; start the 4100 API (plain — no
WhatsApp env); then

```
cd postman
POSTMAN_BASE=http://localhost:4100/api python build_whatsapp_webhook_folder.py
POSTMAN_BASE=http://localhost:4100/api python build_whatsapp_settings_folder.py
python rewrite_body_comments.py
cd ..
# each folder alone, twice, then both together
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  --folder "31 · WhatsApp Webhook" -e postman/Local.postman_environment.json \
  --env-var baseUrl=http://localhost:4100/api
npx newman run … --folder "32 · WhatsApp Settings" …
```

and the collection-wide label audit, and checks the 4100 log for any call
to Meta or OpenAI (there must be none). Write so all of that passes.

## 7. Report

1. Files created / changed (one line each), and the SQL file in full.
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that the brief did not cover.
4. Confirmation that nothing was committed or run, and no `.env` was
   opened (`git status`).
