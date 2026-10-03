# Deploying production on the Hostinger VPS (Dokploy)

Everything runs on one Hostinger **KVM 2** (2 vCPU, 8 GB, IP `179.236.239.65`),
managed from the browser with **Dokploy** at
`https://panel.tribecajetscommandcenter.com`. Files go to **Cloudflare R2**, mail
goes out over **SMTP**, and DNS for `tribecajetscommandcenter.com` is at
**Netlify**, where the domain was bought.

```
browser ──https──▶ Traefik (Dokploy) ─┬─ tribecajetscommandcenter.com/api/*  ▶ api  (NestJS :4000)
                                      ├─ tribecajetscommandcenter.com/*      ▶ web  (Next.js :3000)
                                      └─ panel.tribecajetscommandcenter.com  ▶ Dokploy
api ─▶ postgres, redis (Dokploy databases, internal only) · R2 (files) · SMTP (mail)
```

One domain serves both apps, so the session cookie is first-party:
`COOKIE_DOMAIN` stays empty and no CORS is involved.

Development stays on Vercel + Render + Neon + B2 ([`DEPLOYMENT.md`](DEPLOYMENT.md)).
The two never share a database or a bucket.

---

## Done once (already completed)

1. VPS installed with the Dokploy template. The onboarding wizard was skipped.
2. Netlify DNS: three A records (`@`, `www`, `panel`), all pointing at
   `179.236.239.65`.
3. Dokploy → Settings → Web Server → **Server Domain**:
   `panel.tribecajetscommandcenter.com`, HTTPS, Let's Encrypt.
4. hPanel firewall: accepts TCP 22, 80 and 443 (and UDP 443) only. Port 3000,
   Dokploy's first-run port, is closed; the panel is reached over 443.

If your own network blocks SSH, hPanel's **Browser terminal** is the way into
the VPS. Day to day, you don't need it.

## 1. Connect GitHub

Dokploy → **Settings → Git → GitHub → Create GitHub App**. Follow the prompts,
then **Install** the app on the account that owns the repository, giving it
access to **that repository only**. This is also what makes a push to `main`
deploy automatically.

## 2. Project

**Projects → Create Project**, named `Tribeca Jets`. Everything below goes
inside it.

## 3. Postgres

**Create Service → Database → PostgreSQL**

| Field | Value |
|---|---|
| Name | `postgres` |
| Database name | `tribeca_jets` |
| User | `tribeca` |
| Password | let Dokploy generate it |
| Docker image | `postgres:17` |

Then click **Deploy**. Leave **External port** empty: the database must never
be reachable from the internet. Copy the **Internal Connection URL**; it
becomes `DATABASE_URL`.

## 4. Redis

**Create Service → Database → Redis**: name `redis`, image `redis:7`, then
**Deploy**. No external port. Copy the **Internal Connection URL**; it becomes
`REDIS_URL`.

## 5. The API

**Create Service → Application**, named `api`.

**General → Provider: GitHub**

| Field | Value |
|---|---|
| Repository | this repository |
| Branch | `main` |
| Build path | `/Backend` |
| Build type | **Dockerfile** |
| Dockerfile path | `Dockerfile` |

**Environment** tab: paste this, then fill in the blanks.

```env
NODE_ENV=production
PORT=4000
API_PREFIX=api
WEB_APP_URL=https://tribecajetscommandcenter.com
API_PUBLIC_URL=https://tribecajetscommandcenter.com

# From steps 3 and 4 (the Internal Connection URLs)
DATABASE_URL=
REDIS_URL=

# Two different values, each from: openssl rand -base64 48
# (no terminal handy: any password generator, 48+ random characters)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=10m
AUTH_IDLE_TIMEOUT_MINUTES=10
JWT_REFRESH_TTL=7d
JWT_REFRESH_TTL_REMEMBERED=30d

COOKIE_SECURE=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MULTIPLIER=1

# Cloudflare R2 (step 7)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED
AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED

# Mail (step 8) — the API refuses to start without it
MAIL_DRIVER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Tribeca Jets <no-reply@tribecajets.com>"

# Optional
AI_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Leave `COOKIE_DOMAIN` out entirely.

**Domains** tab → **Add Domain**:

| Field | Value |
|---|---|
| Host | `tribecajetscommandcenter.com` |
| Path | `/api` |
| Container port | `4000` |
| Strip path | **off**. The API expects the `/api` prefix. |
| HTTPS | on, Let's Encrypt |

Click **Deploy**, then watch **Deployments** (the build log) and **Logs**. A
good start shows the migrations applied and `SMTP transport ready`. If it
restarts in a loop, the first log lines name the setting it rejected.

## 6. The web app

**Create Service → Application**, named `web`. Use the same provider settings
as the API, except **Build path** `/Frontend`.

**Environment** tab. A Next.js app reads its settings when it is *built*, not
while it runs, so they go under **Build-time arguments**, not the runtime
variables:

```env
API_PROXY_TARGET=http://<the api app's "App Name">:4000
NEXT_PUBLIC_API_URL=/api
```

The App Name is shown on the api's General tab and looks like
`tribeca-jets-api-xxxxxx`. Every other `NEXT_PUBLIC_*` in
`Frontend/.env.example` (cache times, polling) is optional; add one here only
to change its default. A change to any build argument takes effect on the
**next deploy**, not on restart. The runtime **Environment** box stays empty.

**Domains** tab, two entries:

| Host | Path | Container port | HTTPS |
|---|---|---|---|
| `tribecajetscommandcenter.com` | `/` | `3000` | on, Let's Encrypt |
| `www.tribecajetscommandcenter.com` | `/` | `3000` | on, Let's Encrypt |

**Advanced → Redirects** → preset **"Redirect www to non-www"**, so every
visitor ends up on one address. Then **Deploy**.

## 7. Cloudflare R2

1. **R2 → Create bucket** `tribeca-jets-prod`, kept **private**. No public
   access and no CORS: the API streams every file itself.
2. **Create bucket** `tribeca-jets-backups`, also private, for the database
   dumps in step 10.
3. **R2 → Manage API tokens → Create API token**: *Object Read & Write*,
   limited to those two buckets. Copy the Access Key ID and Secret Access Key;
   the secret is shown once.
4. The S3 endpoint is `https://<account-id>.r2.cloudflarestorage.com`, without
   the bucket name.

Put these into the api's Environment and redeploy it.

## 8. Mail: Google Workspace

The client's Workspace is on `tribecajets.com`, whose SPF already authorises
Google. In the client's Workspace:

1. Pick a mailbox to send from, e.g. `no-reply@tribecajets.com`.
2. Turn on 2-Step Verification for it.
3. Create an **App password** for it (myaccount.google.com → Security → App
   passwords). If the option is missing, a Workspace admin has to allow it.

In the api's Environment: `SMTP_USER` = that address, `SMTP_PASSWORD` = the
16-character app password, `MAIL_FROM` = that address (Gmail rewrites any
other sender). Redeploy.

Optional, for better inbox placement: Google Admin → Apps → Gmail →
**Authenticate email** → turn on DKIM, and add its record at GoDaddy, where
`tribecajets.com`'s DNS lives.

## 9. The first account

**Never run `db:seed` in production.** It creates seven accounts with the
public password `ChangeMe123!`, plus made-up clients and enquiries.

Open the api → **Docker Terminal** (or **Logs → Terminal**, depending on the
Dokploy version) and run:

```sh
ADMIN_EMAIL=you@example.com ADMIN_FIRST_NAME=First ADMIN_LAST_NAME=Last \
ADMIN_PASSWORD='Your-Strong-Password1' npm run db:bootstrap-admin
```

The password must meet the app's password policy: 10+ characters, upper case,
lower case and a digit. The script only creates an account; run it against an
email that already exists and it changes nothing. Everyone else gets invited
from **Users & Roles**.

The database starts empty: no airports, operators, aircraft or email
templates. The desk enters its own.

## 10. Backups

1. Dokploy → **Settings → S3 Destinations → Add**: provider Cloudflare (or
   "S3 compatible"), the R2 keys from step 7, bucket `tribeca-jets-backups`,
   region `auto`, the R2 endpoint. Click **Test**, then **Save**.
2. The `postgres` service → **Backups → Create backup**: that destination,
   database `tribeca_jets`, schedule `0 3 * * *` (03:00 UTC daily), prefix
   `postgres/`, keep 30. Click **Run manually** once and check the file shows
   up in the bucket.

Files are already safe in R2. Also turn on Hostinger's VPS snapshots or
backups in hPanel, so you can recover Dokploy itself.

## 11. Check it works

- `https://tribecajetscommandcenter.com` loads with a padlock, and `www.`
  redirects to it.
- `https://tribecajetscommandcenter.com/api/health` reports `ok`.
- Sign in as the bootstrap admin.
- Upload a photo. It appears under `images/` in `tribeca-jets-prod`.
- Invite a user. The email arrives and is not in spam.

## Updating

Merge into `main` and push: the GitHub App deploys both apps automatically.
Or click **Deploy** on an app. The API applies pending migrations each time it
starts, before it listens. A bad release can be rolled back from that app's
**Deployments** list.

## Day to day, all in the panel

| Task | Where |
|---|---|
| Logs | the app → **Logs** |
| Restart / stop | the app → **General** |
| Change a setting | the app → **Environment**, then Deploy (web: build arguments need a Deploy) |
| A shell in a container | the app → **Docker Terminal** |
| Database console | `postgres` → **Docker Terminal** → `psql -U tribeca tribeca_jets` |
| CPU / memory | the app → **Monitoring** |
| Restore a backup | `postgres` → **Backups** → restore |

Swagger (`/api/docs`) is not served in production, by design.
