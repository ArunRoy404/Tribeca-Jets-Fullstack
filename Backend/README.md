# Tribeca Jets Command Center — API

NestJS 12 (ESM) · PostgreSQL 17 + Prisma 7 · Redis · TypeScript

Backend for the Tribeca Jets Command Center CRM. The Next.js frontend lives in
`../Frondtend` and is deployed separately; the two communicate over HTTP/JSON
with session cookies.

---

## Quick start

```bash
cp .env.example .env         # then set the two JWT secrets
npm install
npm run services:up          # Postgres :5432, Redis :6380 via Docker
npm run db:migrate           # apply migrations
npm run db:seed              # demo admin + broker + clients
npm run start:dev
```

| URL | What |
|---|---|
| http://localhost:4000/api | API root |
| http://localhost:4000/api/docs | Swagger (development only) |
| http://localhost:4000/api/health | Health + active drivers |

Seeded logins (development only — change before any real deployment):

| Email | Password | Role |
|---|---|---|
| admin@tribecajets.com | ChangeMe123! | SUPER_ADMIN |
| broker@tribecajets.com | ChangeMe123! | BROKER |
| security@tribecajets.com | ChangeMe123! | ADMIN, two-factor **on** |
| reset-demo@tribecajets.com | ChangeMe123! | BROKER, password-reset target |

> Redis is mapped to **6380**, not 6379, because another project on this
> machine already holds 6379.

---

## Architecture

Modular, not MVC: one module per business domain, mirroring the frontend's
Zustand stores so each store has a matching API module.

```
src/
├── common/     Reusable and domain-agnostic — guards, pipes, filters, DTO base
├── config/     Zod-validated env → typed AppConfigService
├── core/       Infrastructure singletons — prisma, redis, storage, audit
├── modules/    One folder per domain (auth, clients, trips, quotes, ...)
└── generated/  Prisma Client (generated; not committed)
```

Two rules keep this from rotting:

1. **Nothing in `common/` knows what a trip or a client is.** The moment it
   does, it belongs to a module.
2. **Cross-module access goes service → service**, never repository →
   repository. `TripsService` injects `ClientsService`; it never queries the
   clients table directly.

Each module has the same internal shape: `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `dto/`, and `*.spec.ts`.

---

## Authentication

Tokens live **only** in httpOnly cookies. They are never in a response body,
never in `localStorage`, never in an `Authorization` header — so frontend
JavaScript cannot read them, and XSS cannot steal a session.

| Cookie | httpOnly | Path | Purpose |
|---|---|---|---|
| `tj_access` | yes | `/` | 15-minute access token |
| `tj_refresh` | yes | `/api/auth` | 7-day refresh token, rotated on use |
| `tj_csrf` | **no** | `/` | Read by JS, echoed in `X-CSRF-Token` |

- Refresh tokens are opaque random strings stored as SHA-256 hashes, so a
  database leak yields no usable sessions and revocation is real.
- **Reuse detection**: presenting an already-revoked refresh token revokes
  every session for that user, because reuse means the token leaked.
- Because cookies are attached automatically by the browser, every
  state-changing request requires the `X-CSRF-Token` header. `GET`/`HEAD`/
  `OPTIONS` and `@Public()` routes are exempt.

### Endpoints, mapped to the frontend screens

| Screen | Endpoint | Notes |
|---|---|---|
| `/sign-in` | `POST /auth/login` | Returns `requiresTwoFactor`. When false the session is live; when true only a `tj_2fa` challenge cookie is set |
| `/sign-in/two-factor` | `POST /auth/two-factor/verify` | Body is `{ code }` only — the challenge lives in the cookie |
| | `POST /auth/two-factor/resend` | Invalidates the previous code |
| `/forgot-password` | `POST /auth/forgot-password` | Always 200, always sets a cookie |
| `/forgot-password/verify` | `POST /auth/forgot-password/verify` | Unlocks the reset step |
| | `POST /auth/forgot-password/resend` | |
| `/reset-password` | `POST /auth/reset-password` | `{ newPassword, confirmPassword }`; revokes all sessions |
| everywhere | `GET /auth/me` | Who is signed in |
| | `POST /auth/refresh` · `POST /auth/logout` | |

**Two-factor is per-account** (`user.twoFactorEnabled`, default `false`), toggled
from the Settings screen rather than configured globally. `GET /auth/me` returns
the current value for that toggle to bind to; the endpoint that flips it belongs
to the settings module, alongside change-password, and is not built yet.

The current frontend routes to `/sign-in/two-factor` unconditionally — branch on
`requiresTwoFactor` instead, or accounts with 2FA off will hit a dead screen.

**The codes are emailed, not TOTP.** The two-factor screen's copy says
"authenticator app" but also offers "Resend code", which only makes sense for
email — and `/forgot-password/verify` already establishes email-OTP delivery.
Switching to TOTP later changes `VerificationService`, not the endpoints.

Flow state (`tj_2fa`, `tj_pwreset`) rides in short-lived httpOnly cookies scoped
to `/api/auth`, because each OTP screen submits only six digits and has no
hidden challenge field. A side effect worth keeping: a code phished onto another
device is useless without that browser's cookie.

Codes are stored hashed, single-use, and die after 5 wrong guesses. Completing a
password reset revokes every existing session.

### Consuming this from the Next.js app

```js
// Every request: send cookies, and echo the CSRF cookie on writes.
async function api(path, { method = 'GET', body } = {}) {
  const csrf = document.cookie.match(/tj_csrf=([^;]+)/)?.[1];

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    credentials: 'include',             // required, or no cookie is sent
    headers: {
      'Content-Type': 'application/json',
      ...(csrf && method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) throw await res.json();
  return res.json();
}
```

Two things to know:

- The frontend cannot decode a token to learn who is signed in. Call
  `GET /api/auth/me` on load and keep the result in a store.
- **Server components and route handlers must forward cookies manually.** A
  fetch originating from your Node server has no browser attaching them:

```js
import { cookies } from 'next/headers';

const res = await fetch(`${process.env.API_URL}/api/clients`, {
  headers: { Cookie: (await cookies()).toString() },
});
```

### Response envelope

Every success is `{ success: true, data, meta? }`; list endpoints add `meta`
with pagination. Every error is:

```json
{ "success": false, "statusCode": 400, "message": "Validation failed",
  "errors": { "email": "Invalid email address" },
  "path": "/api/clients", "timestamp": "..." }
```

---

## Authorization

- **Role checks** (`@Roles(...)`) are coarse and live in `RolesGuard`.
- **Row-level rules live in the service**, where the query is built — a guard
  cannot scope a `findMany`. `ClientsService.visibilityScope()` is the
  reference implementation: brokers see only their assigned clients, applied
  inside the `where` clause so pagination totals stay correct.
- Out-of-scope records return **404, not 403**, so a broker cannot confirm
  another broker's client exists by probing IDs.

---

## Storage

One `StorageService` interface, two drivers, chosen at boot from env:

- `STORAGE_DRIVER=auto` (default) — uses S3/R2 when `S3_BUCKET`,
  `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are all present, otherwise
  writes to local disk on the VPS.
- `STORAGE_DRIVER=s3` — forces S3 and **fails at boot** if credentials are
  incomplete, rather than silently writing client passports to local disk.
- `STORAGE_DRIVER=local` — forces disk.

Call sites never branch on the driver. Persist the returned `key`, never a URL:
URLs are driver-specific and time-limited. `GET /api/health` reports which
driver resolved.

> If running on local disk, the `storage/` directory is part of your backup
> surface — a Postgres dump alone will not restore the document vault.

---

## Database

Multi-file schema under `prisma/schema/`, one file per domain. Prisma 7
connects through the `@prisma/adapter-pg` driver adapter.

```bash
npm run db:migrate   # create + apply a migration in development
npm run db:deploy    # apply existing migrations (production)
npm run db:studio    # browse data
npm run db:reset     # drop, re-migrate, re-seed (destructive)
```

Deletes are **soft** (`deletedAt`). Historical business data is never
destroyed, per scope §6.19 — so every list query filters on `deletedAt: null`.

---

## Mail

Same driver pattern as storage. `MAIL_DRIVER=auto` uses SMTP when
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` are all present, and otherwise prints
emails to the server log so the OTP flows are testable without a mail account.

**When SMTP is absent, the code comes back in the response** rather than only in
the log, so the OTP screens are usable from Postman or a browser with no mailbox:

```json
"devCode": {
  "code": "481920",
  "notice": "SMTP is not configured, so no email was sent..."
}
```

This is gated on two independent conditions — not production **and** the log mail
driver. Set `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` and the field disappears,
with real email sent instead.

**Production refuses to boot on the log driver** — two-factor codes and password
resets would silently never arrive, which is an account-recovery black hole
rather than a degraded feature. That guard is also why `devCode` cannot reach a
real deployment.

## Testing

```bash
npm test           # unit
npm run test:e2e   # requires Docker services + a seeded database
npm run test:api   # Postman collection via newman (needs the server running)
```

A Postman collection lives in [`postman/`](postman/) — see its
[README](postman/README.md) for the cookie/CSRF setup and where to find the
6-digit codes in development.

The e2e suite asserts the security posture directly: routes private by
default, httpOnly cookies issued on login, no token in the response body,
CSRF enforced on writes, and broker row-level scoping.

---

## Deployment (Hostinger KVM VPS)

```bash
npm ci
npm run build
npm run db:deploy
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
```

nginx config in [`deploy/nginx.conf.example`](deploy/nginx.conf.example) —
`api.` subdomain to :4000, apex to the Next.js app on :3000, TLS via certbot.

Both apps must share a parent domain so the session cookie
(`COOKIE_DOMAIN=.tribecajetscommandcenter.com`) is valid for both. Splitting
them across unrelated domains would force `SameSite=None` and weaken CSRF
protection.

Production requires `COOKIE_SECURE=true`; the app refuses to boot otherwise.

---

## Pinned versions — deliberate, do not bump casually

| Package | Pin | Why |
|---|---|---|
| `prisma` / `@prisma/client` | `7.10.0` exact | The `latest` tag is an `8.0.0-rc`; its dependency chain also breaks npm's resolver |
| `vitest` | `^5.0.0` | v4's peer graph is circular and crashes `npm install` |
| `mysql2`, `deepmerge-ts` | `overrides` | Patch high-severity advisories in Prisma CLI's transitive deps |

Not installed, despite being the obvious choices: `@nestjs/throttler` and
`nestjs-zod` — neither declares Nest 12 support. Their jobs are done by
`RateLimitGuard` (Redis-backed) and `common/dto/zod-dto.ts`.

---

## Adding a module

1. `prisma/schema/<domain>.prisma` → `npm run db:migrate`
2. `src/modules/<domain>/` with `dto/`, service, controller, module
3. Register it in `app.module.ts`
4. Scope reads by role in the service if brokers must not see everything
5. `audit.record(...)` on every mutation — the timeline is a hard requirement
