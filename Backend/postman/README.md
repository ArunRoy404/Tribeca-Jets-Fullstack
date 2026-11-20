# Postman collection

Import these three files into Postman:

| File | What |
|---|---|
| `Tribeca-Jets-API.postman_collection.json` | The requests |
| `Local.postman_environment.json` | `baseUrl` → `http://localhost:4000/api` |
| `Production.postman_environment.json` | `baseUrl` → the VPS |

## Before you start

The API must be running with its services up:

```bash
npm run services:up && npm run db:migrate && npm run db:seed
npm run start:dev
```

If you use **Postman on the web** rather than the desktop app, install the
Postman Desktop Agent first — otherwise the cookie jar stays empty and every
authenticated request returns 401.

## How auth works here

There is no Bearer token to paste. Sessions are httpOnly cookies, so once you
run **Login** Postman's cookie jar authenticates everything else.

Writes additionally need an `X-CSRF-Token` header. The collection captures the
readable `tj_csrf` cookie into the `csrfToken` collection variable after every
response that sets one, and the write requests reference `{{csrfToken}}` — so
run a Login request first and the rest works.

> **Variable scoping matters here.** Runtime values (`csrfToken`, `otpCode`,
> `clientId`) are *collection* variables. The environments carry `baseUrl`
> and the two WhatsApp test settings. If you add a `csrfToken` key to an environment it
> will shadow the collection value — environment scope wins — and every write
> will 403 with `{{csrfToken}}` silently resolving to empty.

## The 6-digit codes

Two-factor and password-reset codes are emailed. **While SMTP is unconfigured**
the API also returns the code in the response body, so nothing needs to be
copied by hand:

```json
"devCode": {
  "code": "481920",
  "notice": "SMTP is not configured, so no email was sent..."
}
```

The login and resend requests capture that into `{{otpCode}}` automatically, so
the whole collection — both OTP flows included — runs unattended.

Once you set `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD`, `devCode` disappears
and real email is sent; paste the code into `{{otpCode}}` yourself. Production
refuses to boot without SMTP, so this convenience can never reach a real
deployment.

## Running the whole collection

Folders execute top to bottom and are ordered so a full pass works:

```
00 · System                 health probe (public)
01 · Auth                   every /auth/* route
   01 · Sign in                login, login (2FA account)
   02 · Two-factor            resend, verify
   03 · Session               current user, refresh
   04 · Password reset        request, resend, verify, set new password
   05 · Sign out              logout
03 · Clients                CRM CRUD + the no-CSRF check
04 · Users                  team members, roles, invitations
05 · Airports               reference data
06 · Operators              reference data
07 · Aircraft               fleet
08 · Trip Requests          enquiries
09 · Operator Sourcing      operator quotes on an enquiry
10 · Quotes                 client quotes, versions, send/decide
11 · Uploads                image + document uploads, access rules
12 · Notes                  notes and the merged timeline
13 · Client Credits         money on account
```

There is no `02`: `02 · Regression checks` restated failures already captured
beside the requests they belong to, and was removed (26 Sep 2026). The gap is
kept rather than renumbering every folder after it.

30 folders, 318 requests and 784 captured examples as of 19 Nov 2026. Newman
reports more requests (451) because the pre-request fetches that let a folder
run alone are counted too.

**Every module runs standalone**, not just top to bottom — `03 · Clients` opens
with its own sign-in, so you can run that folder alone or after Sign out has
cleared the cookies.

Two ordering rules the folders encode, both learned the hard way:

- **Resend comes before Verify.** Resending replaces the challenge, so running
  it afterwards would discard the verification the next step depends on.
- **Regression checks follow Sign out**, because they assert that an
  unauthenticated caller is rejected.

`01 · Auth → 04 · Password reset` **really changes a password**. It targets the
dedicated `reset-demo@example.com` account so nothing else breaks; run
`npm run db:seed` afterwards to restore it.

Use the 4100 test API and Newman command in the startup section below.

Saved examples are captured from the test API. The WhatsApp Settings folder
documents the responses that require contacting Meta or OpenAI in words.

## Frontend route → API call

| Screen | Endpoint |
|---|---|
| `/sign-in` | `POST /auth/login` |
| `/sign-in/two-factor` | `POST /auth/two-factor/verify` · `/resend` |
| `/sign-in/complete` | none — the session already exists |
| `/forgot-password` | `POST /auth/forgot-password` |
| `/forgot-password/verify` | `POST /auth/forgot-password/verify` · `/resend` |
| `/reset-password` | `POST /auth/reset-password` |
| `/reset-password/success` | none |
| every authenticated page | `GET /auth/me`, `POST /auth/refresh` |
| sign-out control | `POST /auth/logout` |

All ten `/auth/*` routes the backend exposes are in the collection.

**One screen element has no API:** the two-factor page offers *"Trouble signing
in? Use a backup code instead"*, but no backup-code endpoint exists. Either drop
that line or scope the feature.

## Seeded accounts

| Email | Password | Role | 2FA |
|---|---|---|---|
| admin@example.com | ChangeMe123! | SUPER_ADMIN | off |
| broker@example.com | ChangeMe123! | BROKER | off |
| security@example.com | ChangeMe123! | ADMIN | **on** |
| reset-demo@example.com | ChangeMe123! | BROKER | off |
| agent@example.com | ChangeMe123! | REFERRAL_AGENT (10% of profit) | off |

`agent@` is the referral partner (#11). `17 · Commissions` and `18 · Referrals`
sign in as it for the requests marked "(as the agent)" — see below.

## Before any run: prepare the test database

The `tribeca_postman` copy can contain the developer's sealed credentials and
linked phone. The 4100 API can decrypt those credentials with the same key.
This script clears the credentials, switches the assistant off, archives
live phones, and links a fixture phone to the seeded broker. It prints the
broker fixture's UUID for the Settings capture.

After each refresh, run this from `Backend/` before starting the 4100 API or
running either WhatsApp builder or folder. Replace `<user>` with the test
database user.

```bash
docker exec -i tribeca_postgres psql -U <user> -d tribeca_postman < postman/prepare_whatsapp_test_db.sql
```

## Start the 4100 test API

Start the isolated test API on port 4100 with the `tribeca_postman` database
copy and its own Redis database. The log mail driver exposes the codes the
two-factor and password-reset requests need. The WhatsApp folders write fake
settings through the API, which needs a valid `SETTINGS_ENCRYPTION_KEY` to
seal them. Run these commands from `Backend/`, replacing `<password>` with
the test database password. Seed the test database before a full collection run.

```bash
postman_database_url='postgresql://tribeca:<password>@localhost:5432/tribeca_postman?schema=public'
DATABASE_URL="$postman_database_url" npx prisma db seed  # full collection only
npm run build && PORT=4100 MAIL_DRIVER=log RATE_LIMIT_MULTIPLIER=20 \
  REDIS_URL=redis://localhost:6380/1 DATABASE_URL="$postman_database_url" \
  node dist/main.js &
```

After the test API is listening, run the collection against port 4100.

```bash
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  -e postman/Local.postman_environment.json --env-var baseUrl=http://localhost:4100/api
```

`REDIS_URL=…/1` gives the test API its own Redis database. The email queue
lives in Redis, so on the shared one your everyday API's mail worker picks up
the run's emails and tries to send them — Resend then refuses every
example.com address with a 550.

Run it from `Backend/`: the upload fixtures are addressed as
`postman/fixtures/…`. Rebuilding a folder takes the same API:
`POSTMAN_BASE=http://localhost:4100/api python3 postman/build_users_folder.py`.

**Re-seed before each full run.** The password-reset folder actually changes
`reset-demo@example.com`'s password, so a second consecutive run without a
re-seed fails on "new password must differ from the current one" — the API
behaving correctly, not a broken collection. That account exists precisely so
the reset flow never disturbs the accounts the other folders depend on.

**Set `RATE_LIMIT_MULTIPLIER=20` in `.env` for local runs.** It relaxes the
fixed limits on refresh, the activity ping and the branding, which a full pass
can exceed. Sign-ins no longer count (15 Oct 2026): only *failed* sign-ins
and emailed codes are limited, by Settings › Rate Limiting — so a failure in
a builder is always made on a fresh `probe-…@example.com` address, never on a
seeded account. The multiplier is pinned to 1 in production — the app
refuses to boot otherwise — so this relaxes nothing that ships.

## 31 · WhatsApp Webhook

Both webhook routes are public. GET verifies the token and echoes the
challenge as plain text. POST verifies the HMAC of the raw body and returns
the count in the API's JSON success envelope. Use the 4100 test API above for
both capture and Newman, even when running just this folder.

- The first request signs in as the seeded Super Admin and saves fake Meta
  settings. The final request clears them.
- Every message uses `15550000999`. The prepared copy has the assistant
  switched off, no linked Super Admin phone, and no OpenAI credentials. The
  API acknowledges the probe without calling Meta or OpenAI.
- `whatsappAppSecret` and `whatsappVerifyToken` carry only test API values
  in Local and in the collection defaults. Leave both fields blank in the
  Production environment. Use the test API's values only and keep production
  secrets out of the collection and environments.

With the test API up, regenerate the folder and run it twice from `Backend/`.

```bash
(cd postman && POSTMAN_BASE=http://localhost:4100/api python build_whatsapp_webhook_folder.py && \
  python rewrite_body_comments.py)
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  --folder "31 · WhatsApp Webhook" -e postman/Local.postman_environment.json \
  --env-var baseUrl=http://localhost:4100/api
```

The webhook bodies contain no comments, so the rewriter leaves the signed
bytes alone. The request descriptions explain the fields. The builder
asserts each captured status against its example label. Run the collection-wide
label audit after capture.

## 32 · WhatsApp Settings

Run on the prepared 4100 API. The folder signs in as the seeded Super Admin,
reads the cleared settings, then probes the link-code route while the Meta
settings are incomplete. It saves fake settings, reveals the fake verify
token, verifies that a code without a link cookie is refused, checks that
another user's phone cannot be renamed or unlinked, and exercises switching
the assistant off without a password.
Teardown switches it off again and clears the fake settings.

- **Send and verify a code** require a phone name. Verify resubmits the name
  while the cookie binds the code to the original phone number. The folder
  captures a missing name and a five-phone cap. The executable request runs
  after preparation and expects `400 · Finish the Meta settings first`.
- **List phones** uses `GET /settings/whatsapp/phones`. Use
  `includeArchived=true` to include unlinked phones. The list is paginated.
- **Rename and unlink** use `PATCH` and `DELETE /settings/whatsapp/phone/:id`.
  The executable requests use the broker's fixture UUID and expect 404.
- **History** uses `GET /settings/whatsapp/history` with pagination and optional
  phone, event type, and UTC date filters. Capture verifies a filtered rename
  entry and the 400 for an unknown query parameter.
- **Reveal a secret** (`POST /settings/whatsapp/reveal`) re-checks the current
  password and returns one value with `Cache-Control: no-store`. Capture checks
  the unset and saved states, a wrong password, and a two-factor Admin session.
- **Switch the assistant** (`PATCH /settings/whatsapp/assistant`) requires the
  current password only to turn it on. Capture briefly switches it on with
  fake settings and no linked Super Admin phone. The executable request switches
  it off. Rebuild `30 · Settings` after the migration to refresh the security view.

The builder signs `security@example.com` in using the log driver's two-factor
code to capture the Admin's 403 responses. Newman runs as the Super Admin.
The folder description documents both live connection tests. The executable
link-code probe stops at the incomplete-settings check.

From `Backend/`, run the preparation script and keep the broker UUID it
prints. With the test API up, load the five-phone fixture below. The fixture
refuses any database other than `tribeca_postman`. When the builder pauses,
run the preparation script again in a second terminal and press Enter.
Preparation archives the five synthetic phones and restores the broker
fixture. Run Newman twice after the capture.

```bash
docker exec -i tribeca_postgres psql -U <user> -d tribeca_postman < postman/whatsapp_five_phones.sql
(cd postman && POSTMAN_BASE=http://localhost:4100/api python build_whatsapp_settings_folder.py --broker-phone-id <fixture-uuid> && \
  python rewrite_body_comments.py)
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  --folder "32 · WhatsApp Settings" -e postman/Local.postman_environment.json \
  --env-var baseUrl=http://localhost:4100/api
```

After both folders pass on their own twice, run them together by passing both
`--folder` flags. Audit the collection's example labels and check the 4100 log
for any calls to Meta or OpenAI.

## Structure

```
00 · System            health check
01 · Auth              every auth endpoint, and nothing else has one
02 · Clients
03 · Users
```

**Auth endpoints appear in exactly one folder.** `01 · Auth / 01 · Sign in`
carries one request per role — Owner, Senior Broker, Broker, Assistant, and the
two-factor Admin last — so every account the collection uses is documented
together.

Module folders contain no login request. Each gets its session from a
**folder-level pre-request script** that signs in once per run and switches
accounts when a nested folder needs a different one. A side effect is that
every folder now runs standalone; previously `Users` only worked because it
carried its own copy of the login endpoint.

`02 · Two-factor` depends on the sign-in folder's last request having started a
challenge, which is why the two-factor account is listed last. Any sign-in
after it replaces the challenge cookie and the verify step fails.

## Variables

A value gets a variable when it is **reused**; a value used in one place stays a
literal, because an indirection that resolves in exactly one spot is harder to
read, not easier.

**Pinned — edit these to point at another environment or dataset:**

| Variable | Why it is shared |
|---|---|
| `baseUrl` | every request |
| `ownerEmail` | its own sign-in request, plus the Clients and Users session scripts |
| `password` | all five sign-ins, and every folder session script |
| `newPassword` | sent twice in one body (`newPassword` + `confirmPassword` must match exactly) |

**Captured at runtime — leave empty:**

| Variable | Set by | Used by |
|---|---|---|
| `csrfToken` | any sign-in (parsed from `Set-Cookie`) | every write's `X-CSRF-Token` |
| `otpCode` | sign-in / forgot-password `devCode` | the matching verify request |
| `clientId` | first id from the clients list, then replaced by any client this run creates | get / update / delete |
| `userId` | first `BROKER` id from the team list | get team member |
| `invitedUserId` | the invite response | update / remove |
| `inviteEmail` | generated per run | the invite body |

Two of these deserve a note. **`clientId` and `invitedUserId` are deliberately
repointed at records the run creates**, so update and delete never mutate seeded
data — which is what made the collection safe to re-run. And **the session
scripts read `ownerEmail` and `password` from these variables** rather than
carrying their own copies, so a credential can never disagree with the request
that documents it.

## Bodies

Every raw body is marked `language: json`, so Postman renders it with
highlighting. For the signed webhook bodies, the field documentation is in
the request descriptions so Postman sends the exact JSON that was signed.

## What is deliberately not here

**No refusal-only requests.** There is no "call this without a CSRF token and
watch it 403" entry, because that failure is already saved as an example on
`Create client` and `Invite team member` — the requests that actually produce
it. A separate entry would restate one response as a second endpoint.

Every 400 / 401 / 403 / 404 / 409 the API returns is captured, on the request
that returns it. 75 examples across 25 requests.

## Regenerating

The Clients recapture script verifies that `?search=` with the full name of
the seeded client at `marcus.chen@example.com` returns that client. The
Trips, Trip Requests, and Quotes builders capture `400 · Not a broker`
on create using the seeded `assistant@example.com` account as the selected
broker. Client Credits still uses the seeded broker and administrator. The
permission migration preserves their access.

Examples are captured from a live API rather than hand-written, because
hand-written examples drift silently and keep claiming a shape the API stopped
returning. **Every folder has a way to regenerate it, and nothing else in this
directory is needed** (one-off patch scripts were folded into their builders
or deleted on 10 Nov 2026; git history keeps them).

| Folder | Regenerated by |
|---|---|
| `00 · System`, `01 · Auth` (except sessions) | nothing — hand-maintained in the collection |
| `01 · Auth` session payloads | `recapture_auth_permissions.py` — re-reads each account's `/auth/me` into the sign-in, refresh and My Account examples (run after any permission change) |
| `01 · Auth / 05 · My Account` | `build_account_folder.py` |
| `03 · Clients` examples | `recapture_clients_examples.py` |
| `04 · Users` … `30 · Settings` | `build_<module>_folder.py`, one per folder (`build_users_folder.py` for 04, `build_airports_folder.py` for 05, … `build_settings_folder.py` for 30) |
| `31 · WhatsApp Webhook` | `build_whatsapp_webhook_folder.py` |
| `32 · WhatsApp Settings` | `build_whatsapp_settings_folder.py` |

Shared by the builders: `builder_common.py` (session, `example()` with its
label check, `url()`, `script()`, `BASE` from `POSTMAN_BASE`),
`collection_order.py` (`place_folder()`), `session_setup.py` (the folder-level
login) and `rewrite_body_comments.py` (run last). Five older builders (08,
09, 10, 12, 13) still keep private copies of `Session` / `example()`; move
each onto `builder_common` when its folder is next rebuilt.

**Run against the test API, never :4000** — a second API with
`MAIL_DRIVER=log`, its own Redis database and its own database copy,
`tribeca_postman` (commands in `docs/REVIEW_PLAYBOOK.md` §6):

```bash
POSTMAN_BASE=http://localhost:4100/api python3 postman/build_trips_folder.py
(cd postman && python3 rewrite_body_comments.py)
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  -e postman/Local.postman_environment.json --env-var baseUrl=http://localhost:4100/api
```

Run Newman twice — a folder must pass on the second run too. The reset flow
in `01 · Auth` uses two of the three codes an address may get in 15 minutes,
so a third run inside that window 429s; clear the test Redis
(`docker exec tribeca_redis redis-cli -n 1 FLUSHDB`) to run again at once.

The builders anchor on what the seed and the dev data hold —
`admin@` / `security@` / `broker@` / `assistant@` / `agent@example.com`, any
live operator, two distinct live airports — and create probes of their own
for anything else, archiving them at the end.

**A request made as a second account** uses `sign_in_as()` from
`builder_common.py`: a request-level pre-request that signs in as that account
and sets `_sessionAs`, so the folder's own login signs the owner back in on
the next request. A correct sign-in is never limited, so switching accounts
costs nothing.

Conventions for live builders:

- **`example()` raises when a captured status disagrees with its label.** A
  captured example is not an assertion; this is the only place the lie can be
  caught. Fix the request, never the label.
- **`collection_order.place_folder()` puts the folder back by its serial
  number.** Appending it moved each rebuilt folder to the end of the
  collection.
- **An authenticated folder writes its own login**, copied from an existing folder. A login
  patched in by hand is lost on the next rebuild, and the folder then 401s
  when run alone.
- **Fixture paths use forward slashes**, whatever machine runs it.

Then, **from inside `postman/`** (it opens the collection by a relative path):

```bash
python3 rewrite_body_comments.py     # moves JSON body comments to the right
```

Always last — the rewriter operates on the whole collection, so a builder run
after it would leave its folder in the old top-comment style.

Then verify with the Newman command above, including the 4100 `baseUrl` override.
