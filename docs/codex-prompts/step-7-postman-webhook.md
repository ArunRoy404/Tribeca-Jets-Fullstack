# Codex prompt — WhatsApp assistant, step 7: the Postman folder for the webhook

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-7-postman-webhook.md and carry out everything
below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (part one's "Postman collection" section in
full, and part two's WhatsApp section), Backend/postman/README.md,
Backend/postman/builder_common.py, and the two newest builders it names.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- Do not run the builder, Newman, the API or any database. The reviewer
  captures and runs it (§6). No live calls to Meta, OpenAI or anything
  external. Do not open, print or copy Backend/.env.
- No npm or pip install.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the §7 report.
```

---

You are writing **step 7's Postman folder** for the Super Admin's WhatsApp
assistant in the Tribeca Jets Command Center. Steps 1–6 are built, reviewed
and live. The webhook's two routes are the only endpoints with no Postman
entry. Another engineer will review your builder line by line, then run it
against the test API and Newman — you write it, they capture.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` part one, "Postman collection" —
   every bullet is a rule this folder follows (label assertion, comments to
   the right, re-runnable, passes alone, `pm.variables.get('baseUrl')`,
   `place_folder()`, forward-slash paths, no `const data`) — and part two,
   "The WhatsApp assistant is one phone…". Then `Backend/postman/README.md`,
   `builder_common.py`, `collection_order.py`, and a recent builder on
   `builder_common` (the Settings one, `build_settings_folder.py`, is a good
   pattern). Then `Backend/src/modules/whatsapp/whatsapp.controller.ts`,
   `whatsapp.signature.ts`, `whatsapp.payload.ts`, `dto/whatsapp.dto.ts`.
2. **Never run** anything that changes git history or the index, and do not
   run the builder (§0 of the launcher).
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. Python as the other builders write it; no new package.
5. **No source code change.** If a route behaves differently from what §3
   expects, stop and report — never change the API to fit the folder.

## 1. The test API's WhatsApp settings (why the folder is safe)

The capture and every Newman run use the **4100 test API** on the
`tribeca_postman` database (AGENTS.md). That database is a copy of the dev
database, where the Super Admin has the assistant **switched on** — so a
message that passed the gates would make the test API call Meta and OpenAI.
Three things make that impossible, and the README must say all three:

1. **The 4100 API is started with test-only WhatsApp values**, set in the
   process environment (which takes precedence over `.env`):
   `WHATSAPP_ACCESS_TOKEN=postman-not-a-token`,
   `WHATSAPP_PHONE_NUMBER_ID=100000000000000`,
   `WHATSAPP_APP_SECRET=postman-app-secret`,
   `WHATSAPP_VERIFY_TOKEN=postman-verify-token`,
   `WHATSAPP_GRAPH_VERSION=v25.0`,
   `SUPER_ADMIN_WHATSAPP_PHONE=15550000001`,
   `SUPER_ADMIN_WHATSAPP_EMAIL=admin@example.com` (the seed's
   SUPER_ADMIN), and `OPENAI_API_KEY=` / `OPENAI_MODEL=` empty.
   Check `src/config/` that these are the variable names and that an empty
   OpenAI pair is accepted; if not, stop and report.
2. **No request ever sends a message from `15550000001`.** Every message in
   the folder comes from `15550000999` — an unknown number, which the gates
   drop silently (no reply, no Meta call). That is itself a documented
   behaviour: "anything not from the Super Admin phone is dropped".
3. The real secret never appears anywhere: the collection carries only the
   test values above, as collection variables (`whatsappAppSecret`,
   `whatsappVerifyToken`), **blank in `Production.postman_environment.json`**
   and described as "the test API's value — never the production secret".

## 2. The folder

`31 · WhatsApp Webhook`, built by a new `build_whatsapp_webhook_folder.py`
on `builder_common`, placed with `collection_order.place_folder()`.
**No folder login** — both routes are `@Public()`; Meta has no session.
The folder description explains in four or five lines: the routes are
Meta's, authenticated by the verify token (GET) and the `X-Hub-Signature-256`
HMAC of the raw body (POST), both answer 404 while the assistant is not
configured, and the test API runs with the test values of §1.

### Signing (POST)

A **pre-request script** on each POST request computes
`sha256=` + hex `CryptoJS.HmacSHA256(rawBody, secret)` and sets the
`X-Hub-Signature-256` header, exactly as Meta does:

- `rawBody` is the body **after variable resolution**
  (`pm.variables.replaceIn(pm.request.body.raw)`) — the signature must be of
  the bytes that are sent.
- The secret is `pm.variables.get('whatsappAppSecret')`.
- The body carries **no comments** (unlike every other JSON body — the
  signature is over the exact bytes, and a comment Postman strips would
  break it). Put the field explanations in the request description instead,
  and say why. Make sure `rewrite_body_comments.py` leaves these bodies
  alone (check how it decides; if it would add comments, stop and report).
- Requests that must fail signing set the header themselves (missing,
  wrong) and say so in a comment in the script.

## 3. Requests and examples

Every example captured from a real run, every status asserted against its
label by the builder (`example()` does it), every request re-runnable and
passing alone.

| # | Request | Success example | Error examples |
|---|---|---|---|
| 01 | `GET /webhooks/whatsapp` — Verify the webhook | `200 · Challenge echoed` — `hub.mode=subscribe`, the test verify token, a challenge generated per run; the body is the challenge as **plain text** (preview `text`, and the test asserts the body equals the challenge sent) | `403 · Wrong verify token`; `403 · Mode is not subscribe`; `400 · Challenge too long` (over the DTO's 200 characters) |
| 02 | `POST /webhooks/whatsapp` — An incoming message | `200 · From an unknown number — dropped` → `{ "success": true, "data": { "received": 1 } }` (the global envelope, as every route): a text message from `15550000999` with a current timestamp. It is counted and then dropped by the gates; nothing replies | `401 · Missing signature`; `401 · Wrong signature` (signed with another secret); `401 · Body changed after signing` (signed, then one character altered — shows why the raw bytes matter) |
| 03 | `POST /webhooks/whatsapp` — A delivery receipt | `200 · Status update, no messages` → `{ "success": true, "data": { "received": 0 } }`: a `statuses` entry (`delivered`) for a made-up message id | — |

The POST responses are wrapped by the global `TransformInterceptor` like
every other JSON route; Meta reads only the 200. The GET is the exception
— a `StreamableFile`, so the challenge comes back as bare plain text, which
is what Meta compares.

- **Every query parameter is described** (`hub.mode`, `hub.verify_token`,
  `hub.challenge`) with exact accepted values and bounds.
- **Every body field is described** in the request description: the Meta
  envelope (`object`, `entry[].changes[].value`, `messages[]`, `statuses[]`)
  and which parts the API reads.
- Message ids and challenges are **generated per run**, so a second run is
  not a Meta redelivery (the API drops a message id it has seen — a
  repeated id would still answer 200, but the example would no longer show
  what it claims).
- **Not captured, described instead** in the request descriptions: the 404
  while the assistant is not configured (the test API is configured), and
  the 429 (30 / 600 per minute times the test multiplier — not reachable in
  a run). Say exactly that; do not write examples for them.

## 4. Environments and README

- `Local.postman_environment.json`: `whatsappAppSecret` =
  `postman-app-secret`, `whatsappVerifyToken` = `postman-verify-token`.
  `Production.postman_environment.json`: both blank. Collection variables
  with the same defaults as Local (`ensure_variables`).
- `Backend/postman/README.md`: a section for the folder — the exact env
  block to start the 4100 API with (§1's values, beside the existing
  `PORT=4100 MAIL_DRIVER=log RATE_LIMIT_MULTIPLIER=20 REDIS_URL=…` line),
  why it is safe (§1's three points), and how to regenerate the folder.

## 5. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6, step 7's row: `🔍 <date> — Postman
  builder written by Codex, awaiting capture and review`.
- Do **not** edit `HANDOFF.md`, `AGENTS.md` or any source file.

## 6. What the reviewer will run (so write for it)

From `Backend/`, with the 4100 API up as in §1:

```
cd postman
POSTMAN_BASE=http://localhost:4100/api python build_whatsapp_webhook_folder.py
python rewrite_body_comments.py
cd ..
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  --folder "31 · WhatsApp Webhook" -e postman/Local.postman_environment.json \
  --env-var baseUrl=http://localhost:4100/api      # twice
```

and the collection-wide label audit. The builder must raise on any
mismatch between a label and the captured status.

## 7. Report

1. Files created / changed (one line each).
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that the brief did not cover.
4. Confirmation that nothing was committed or run, and `.env` was not
   opened (`git status`).
