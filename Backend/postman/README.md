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
> `clientId`) are *collection* variables, and the environments deliberately
> contain only `baseUrl`. If you add a `csrfToken` key to an environment it
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
02 · Regression checks      requests that SHOULD fail
03 · Clients                CRM CRUD + the no-CSRF check
```

**Every module runs standalone**, not just top to bottom — `03 · Clients` opens
with its own sign-in, so you can run that folder alone or after Sign out has
cleared the cookies.

Two ordering rules the folders encode, both learned the hard way:

- **Resend comes before Verify.** Resending replaces the challenge, so running
  it afterwards would discard the verification the next step depends on.
- **Regression checks follow Sign out**, because they assert that an
  unauthenticated caller is rejected.

`01 · Auth → 04 · Password reset` **really changes a password**. It targets the
dedicated `reset-demo@tribecajets.com` account so nothing else breaks; run
`npm run db:seed` afterwards to restore it.

```bash
npm run test:api        # requires newman: npm i -g newman
```

Every request carries saved examples for its success case and each error case,
all captured from the live API rather than hand-written.

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
| admin@tribecajets.com | ChangeMe123! | SUPER_ADMIN | off |
| broker@tribecajets.com | ChangeMe123! | BROKER | off |
| security@tribecajets.com | ChangeMe123! | ADMIN | **on** |
| reset-demo@tribecajets.com | ChangeMe123! | BROKER | off |
