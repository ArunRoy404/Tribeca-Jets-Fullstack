# Deploying production on a VPS with Dokploy

A runbook, written as we deployed Tribeca Jets, so the next project can follow
it start to finish. Every step says what was done, with this project's actual
values. Where one name has to match another, the field carries a
**🔗 link note** saying what it must match and how to keep the two in step.

**Status:** steps 1–11 are done. Steps 12–16 are still to do.

```
browser ──https──▶ Traefik (Dokploy) ─┬─ tribecajetscommandcenter.com/api/*  ▶ api  (NestJS :4000)
                                      ├─ tribecajetscommandcenter.com/*      ▶ web  (Next.js :3000)
                                      └─ panel.tribecajetscommandcenter.com  ▶ Dokploy dashboard
api ─▶ postgres, redis (Dokploy databases, internal only) · Cloudflare R2 (files) · SMTP (mail)
postgres ─▶ daily backup ─▶ Cloudflare R2 (backups bucket)
```

| Piece | Where | This project |
|---|---|---|
| Server | Hostinger VPS KVM 2 (2 vCPU, 8 GB, 100 GB), Boston | IP `179.236.239.65`, host `srv2026468.hstgr.cloud` |
| Control panel | Dokploy (installed by Hostinger's template) | `https://panel.tribecajetscommandcenter.com` |
| Domain + DNS | Netlify (bought there) | `tribecajetscommandcenter.com` |
| Files + DB backups | Cloudflare R2 | buckets `tribeca-jets-prod`, `tribeca-jets-backups` |
| Mail | SMTP (Google Workspace on `tribecajets.com`, or Brevo) | not set yet |
| Code | GitHub, connected through a Dokploy GitHub App | branch `main` |

One domain serves both apps, so the session cookie is first-party:
`COOKIE_DOMAIN` stays empty and no CORS is needed.

Development stays on Vercel + Render + Neon + B2 ([`DEPLOYMENT.md`](DEPLOYMENT.md)).
The two never share a database or a bucket.

Keep a **private note** (a password manager entry) open from the start. Steps
below say "→ note" for every value you will paste again later.

---

## The naming chain, at a glance

Most deployment failures are one name typed two different ways. These are the
links in this setup:

| This value… | …must equal | Where both live |
|---|---|---|
| DNS record names (`@`, `www`, `panel`) | the hosts in Dokploy domains and Server Domain | Netlify DNS ↔ Dokploy |
| Postgres **Database Name** `tribeca_jets` | the backup's **Database** field, and the name at the end of `DATABASE_URL` | postgres service ↔ backup ↔ api env |
| Postgres **Database User** `tribeca` | the user in `DATABASE_URL` | postgres service ↔ api env |
| Postgres / Redis **Internal Host** (App Name **plus** Dokploy's random suffix) | the host inside `DATABASE_URL` / `REDIS_URL` | database service ↔ api env |
| api **App Name** (with its suffix) | the host in the web app's `API_PROXY_TARGET` | api ↔ web build args |
| Bucket names | the R2 token's bucket list, the S3 destination, `S3_BUCKET` | Cloudflare ↔ Dokploy ↔ api env |
| R2 **account id** | the endpoint in the S3 destination and in `S3_ENDPOINT` | Cloudflare ↔ Dokploy ↔ api env |
| api container port `4000` | `PORT=4000` in the api env | api domain ↔ api env |
| web container port `3000` | `-p 3000` in `Frontend/Dockerfile` | web domain ↔ Dockerfile |
| api domain path `/api` | `API_PREFIX=api` | api domain ↔ api env |
| the site domain | `WEB_APP_URL` / `API_PUBLIC_URL` | DNS ↔ api env |

**The rule that prevents almost all of it:** never retype a connection
detail. Use the copy buttons in Dokploy and Cloudflare. For a new project, pick
one short slug (`tribeca-jets`) and build every name from it:
`<slug>-postgres`, `<slug>-redis`, `<slug>-prod`, `<slug>-backups`.

---

## 1. Buy and set up the VPS (Hostinger) ✅

hPanel → **VPS** → the new KVM 2 → setup wizard:

1. **Operating system:** the **Dokploy** template, i.e. "Ubuntu 24.04 with
   Dokploy". It is Ubuntu with Dokploy already installed. Dokploy is an app,
   not an OS. Without the template, install plain Ubuntu 24.04 and run
   `curl -sSL https://dokploy.com/install.sh | sh` as root.
2. **Root password:** strong, → note. It is the emergency key; day to day,
   nothing needs it.
3. **Monarx malware scanner:** left **off**. It scans PHP/WordPress files and
   protects nothing in Docker containers, while using CPU and memory.
4. The finished screen shows the IP (`179.236.239.65`) → note.

Hostinger's **weekly VPS backup** is on by default (VPS overview → *Current
backup schedule: Weekly*). Leave it on: it is how Dokploy itself can be
recovered.

## 2. If your own network blocks ports 22 / 3000

Our office network blocked outbound SSH (22) and port 3000: `ssh` timed out,
and `http://IP:3000` would not load. Check with
`Test-NetConnection portquiz.net -Port 22`; `False` means your network blocks
it. The workarounds, with nothing to unblock:

- **Commands on the VPS:** hPanel → VPS → **Web console / Browser terminal**.
  It runs inside the Hostinger website, i.e. over normal HTTPS.
- **Dokploy's first-run page (port 3000):** open it **once over a phone
  hotspot**. After step 5 the panel lives on 443 and works from any network.

## 3. First login to Dokploy ✅

Over the hotspot: `http://179.236.239.65:3000` → create the admin account
(→ note). The onboarding wizard ("Let's get your first app live") was
**skipped** with *SKIP ALL*: it creates a sample project, and we want only
deliberate ones.

## 4. DNS records (Netlify) ✅

The domain was bought on Netlify, so its DNS is there. Netlify → **DNS** →
`tribecajetscommandcenter.com` → **Add new record**, three times:

| Type | Name | Value |
|---|---|---|
| A | `@` (the bare domain; keep the `@` Netlify pre-fills) | `179.236.239.65` |
| A | `www` (delete the pre-filled `@`, type only `www`) | `179.236.239.65` |
| A | `panel` (same) | `179.236.239.65` |

TTL left empty (default 3600).

- 🔗 Each name here must exist as a domain in Dokploy (step 5 for `panel`,
  steps 13–14 for `@` and `www`). A Dokploy domain with no DNS record cannot
  get an HTTPS certificate.
- If the domain was attached to an old Netlify project (ours had an Aug 3
  "Netlify Drop" page), remove it there first: project → **Domain management
  → Remove domain**. Delete any `NETLIFY`/`NETLIFY6` records. Never touch
  `MX`/`TXT`: those are email.
- To check, run `nslookup panel.tribecajetscommandcenter.com`. It must answer
  `179.236.239.65` before step 5.

**The client's company domain is a different thing.** `tribecajets.com`
(GoDaddy DNS, Google Workspace email, its own website) is **not touched**.
The CRM can still send mail *from* `@tribecajets.com`, because the app's
domain and the email's domain are independent.

## 5. Put Dokploy on its own HTTPS address ✅

Dokploy → **Settings → Web Server → Server Domain**:

| Field | Value |
|---|---|
| Domain | `panel.tribecajetscommandcenter.com` (🔗 = the `panel` DNS record; no `https://`, no trailing `/`) |
| Let's Encrypt Email | an address that should receive certificate-expiry notices |
| HTTPS | on |
| Certificate Provider | Let's Encrypt |

Save, wait a minute, and open `https://panel.tribecajetscommandcenter.com`.
From here on, use only this address, from any network.

## 6. Firewall (Hostinger) ✅

hPanel → VPS → **Firewall rules → Add firewall**, named `tribeca`. Accept
rules:

| Action | Protocol | Port | Source |
|---|---|---|---|
| Accept | TCP | 22 | Any |
| Accept | TCP | 80 | Any |
| Accept | TCP | 443 | Any |
| Accept | UDP | 443 | Any |

Hostinger adds the final *Drop / Any* itself: everything not accepted is
blocked, including 3000, 5432 (Postgres) and 6379 (Redis). **Then switch the
firewall's toggle on.** A new configuration starts *inactive*. To check, the
panel still loads, while `http://IP:3000` (tested over the hotspot) no longer
does.

## 7. Connect GitHub ✅

Dokploy → **Settings → Git → GitHub**:

1. App name: `tribeca-dokploy`. **Organization unticked**, since the repository is
   on a personal account. Tick it and type the org name only if the repo
   belongs to an organization.
2. **Create GitHub App**, then confirm on GitHub.
3. Back in Dokploy, **Install**, then on GitHub **Only select repositories** → this
   repository only → Install.

Dokploy can read that one repository and nothing else. To revoke, use
GitHub → Settings → Applications.

(Alternatives considered: a read-only **deploy key**, i.e. Settings → SSH
Keys in Dokploy plus the repo's Deploy keys, which has no account link at all
but no deploy-on-push; and **zip upload**, which works but means hand-making two
zips per release with every chance of shipping a local `.env`. The GitHub App
won.)

## 8. Project ✅

Dokploy → **Projects → Create Project**: `Tribeca Jets`. Dokploy gives it an
environment named **production**. Every service below lives inside it.
Services in one project can reach each other by internal host name.

## 9. Postgres ✅

Project → **Create Service → Database → PostgreSQL**:

| Field | Value |
|---|---|
| Name | `postgres` (display only) |
| App Name | `tribeca-jets-postgres` (🔗 becomes the **internal host**, but Dokploy appends a random suffix: ours is **`tribeca-jets-postgres-3asn4q`**. Always copy the host from *Internal Credentials*, never rebuild it from the App Name.) |
| Database Name | `tribeca_jets` (🔗 must equal the backup's *Database* field (step 11) and the last part of `DATABASE_URL`) |
| Database User | `tribeca` (🔗 appears in `DATABASE_URL`) |
| Database Password | generated by Dokploy (🔗 appears in `DATABASE_URL`; if you ever change it here, update `DATABASE_URL` in the api) |
| Docker image | `postgres:17` (the same major version as development's `Backend/docker-compose.yml`) |

**Create → Deploy**. The logs end with `database system is ready to accept
connections`.

- **External Port: left empty.** The greyed `5432` is a placeholder; don't
  click Save there. The database is reachable only inside Dokploy.
- **Internal Connection URL** (copy button) → note as `DATABASE_URL`.

## 10. Redis ✅

Project → **Create Service → Database → Redis**: name `redis`, App Name
`tribeca-jets-redis` (🔗 same suffix rule: ours is
**`tribeca-jets-redis-ckfqve`**), password generated, image `redis:7`.
**Create → Deploy**. The logs end with `Ready to accept connections`.

- External Port: left empty, as with Postgres.
- **Internal Connection URL** → note as `REDIS_URL`. It contains the password
  (`redis://default:<password>@<host>:6379`). The API passes the whole URL
  to its Redis client, so the password works without extra settings.

## 11. Cloudflare R2: buckets, token, daily database backup ✅

**Buckets.** Cloudflare → **R2 Object Storage → Create bucket**, twice:

| Bucket | Purpose |
|---|---|
| `tribeca-jets-prod` (🔗 = the api's `S3_BUCKET`) | every uploaded file |
| `tribeca-jets-backups` (🔗 = the S3 destination's bucket) | database dumps |

Location *Automatic* (hint: Eastern North America, near the VPS), class
*Standard*. **Public access stays disabled** on both: the API streams every
file itself, so nothing reads a bucket directly, and no CORS is needed.

**Token.** R2 → **Manage API tokens → Create Account API token**. Account,
not User: an account token survives the person leaving the organization.

| Field | Value |
|---|---|
| Name | `tribeca-vps` |
| Permission | Object Read & Write |
| Buckets | only the two above (🔗 a bucket added later must be added to the token too, or writes to it are refused) |
| TTL | Forever |

→ note: **Access Key ID**, **Secret Access Key** (shown once), and the
**endpoint** `https://<account-id>.r2.cloudflarestorage.com` (🔗 the same
account id goes in the S3 destination and in `S3_ENDPOINT`; never include the
bucket name in it).

**Backup destination.** Dokploy → **Settings → S3 Destinations → Add
Destination**: name `r2-backups`, provider Cloudflare, the keys, bucket
`tribeca-jets-backups`, region `auto`, the endpoint. **Test connection →
Create**.

**Backup schedule.** Project → `postgres` → **Backups → Create Backup**:

| Field | Value |
|---|---|
| Destination | `r2-backups` |
| Database | `tribeca_jets` (🔗 = Postgres *Database Name*, step 9) |
| Schedule | Custom: `0 3 * * *` |
| Prefix Destination | `postgres/` |
| Keep the latest | `30` |
| Enabled | on |

`0 3 * * *` is cron for *minute 0, hour 3, every day, every month, every
weekday*: daily at **03:00 UTC**, which is 09:00 at GMT+6 and
around 23:00 in New York, a quiet hour for the desk.

**Create**, then **Run manually** once. Checked: R2 → `tribeca-jets-backups`
→ `tribeca-jets-postgres-3asn4q/postgres/<timestamp>.sql.gz` appeared (414 B
while the database was still empty).

---

## 12. Mail (SMTP): ⏳ to do

**The API refuses to start in production without SMTP.** Two-factor codes,
password resets and invitations depend on it. Don't work around this by
running production as `development`.

**Google Workspace** (preferred). The client's Workspace is on
`tribecajets.com`, whose SPF already authorises Google:

1. Pick the sending mailbox, e.g. `no-reply@tribecajets.com`.
2. Turn on 2-Step Verification for it.
3. Create an **App password**: myaccount.google.com → Security → App
   passwords. If it's missing, a Workspace admin must allow app passwords.
4. → note: the address and the 16-character app password.

Values: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`=the address,
`SMTP_PASSWORD`=the app password, `MAIL_FROM`=the same address (🔗 Gmail
rewrites any sender that isn't `SMTP_USER` or one of its aliases).

Optional, for inbox placement: Google Admin → Apps → Gmail → **Authenticate
email** → turn on DKIM, and add its TXT record at **GoDaddy**, where
`tribecajets.com`'s DNS lives (not Netlify).

**Brevo** (a temporary stand-in): free, 300 emails a day. Verify the sender, then
`smtp-relay.brevo.com`, 587, and the SMTP login and key from *SMTP & API*.
Switching to Workspace later is four env values and a redeploy.

## 13. The API app: ⏳ to do

Project → **Create Service → Application**:

| Field | Value |
|---|---|
| Name | `api` |
| App Name | `tribeca-jets-api` (🔗 the internal host the web app's `API_PROXY_TARGET` uses; read the final value, suffix included, from the api's General tab) |

**General → Provider: GitHub**: repository = this one, branch `main`,
**Build path `/Backend`**, build type **Dockerfile**, Dockerfile path
`Dockerfile`.

**Environment** tab: paste and fill in.

```env
NODE_ENV=production
PORT=4000
API_PREFIX=api
WEB_APP_URL=https://tribecajetscommandcenter.com
API_PUBLIC_URL=https://tribecajetscommandcenter.com

# Step 9 / step 10 — the Internal Connection URLs, pasted, never retyped
DATABASE_URL=
REDIS_URL=

# Two different values, each: openssl rand -base64 48 (or 48+ random chars)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=10m
AUTH_IDLE_TIMEOUT_MINUTES=10
JWT_REFRESH_TTL=7d
JWT_REFRESH_TTL_REMEMBERED=30d

COOKIE_SECURE=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MULTIPLIER=1

# Step 11
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=tribeca-jets-prod
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED
AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED

# Step 12
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

**Domains → Add Domain**:

| Field | Value |
|---|---|
| Host | `tribecajetscommandcenter.com` (🔗 the `@` DNS record) |
| Path | `/api` (🔗 = `API_PREFIX`) |
| Container port | `4000` (🔗 = `PORT`) |
| Strip path | **off**, since the API expects the `/api` prefix |
| HTTPS | on, Let's Encrypt |

**Deploy** only once SMTP is filled in. Watch *Deployments* (build) and
*Logs*: migrations applied, then `SMTP transport ready`. In a restart loop,
the first log lines name the setting it rejected.

## 14. The web app: ⏳ to do

Project → **Create Service → Application**, name `web`, App Name
`tribeca-jets-web`. Same provider as the api, but **Build path `/Frontend`**.

**Environment → Build-time arguments**, not the runtime box. Next.js
reads them when it *builds*:

```env
API_PROXY_TARGET=http://<api internal host, from the api's General tab>:4000
NEXT_PUBLIC_API_URL=/api
```

🔗 `API_PROXY_TARGET`'s host is the api's App Name *with* its suffix, and
`4000` is the api's `PORT`. Other `NEXT_PUBLIC_*` (cache times, polling, see
`Frontend/.env.example`) are optional. A build argument changes only on the
**next Deploy**, not on restart. The runtime Environment box stays empty.

**Domains**, two entries, both container port `3000`, path `/`, HTTPS on:
`tribecajetscommandcenter.com` and `www.tribecajetscommandcenter.com`
(🔗 the `@` and `www` DNS records). Then **Advanced → Redirects** → preset
**www → non-www**. **Deploy**.

## 15. The first account: ⏳ to do

**Never run `db:seed` in production.** It creates seven accounts with the
public password `ChangeMe123!` and invented clients. Instead: api → **Open
Terminal** →

```sh
ADMIN_EMAIL=you@example.com ADMIN_FIRST_NAME=First ADMIN_LAST_NAME=Last \
ADMIN_PASSWORD='Your-Strong-Password1' npm run db:bootstrap-admin
```

Password policy: 10+ characters, upper case, lower case and a digit. The
script only creates. An email that already exists is refused, not reset. Everyone else
is invited from **Users & Roles**. The database starts empty: the desk enters
its own airports, operators, aircraft and templates.

## 16. Check it works: ⏳ to do

- `https://tribecajetscommandcenter.com` loads with a padlock; `www.`
  redirects to it.
- `https://tribecajetscommandcenter.com/api/health` reports `ok`.
- Sign in as the bootstrap admin.
- Upload a photo. It appears under `images/` in `tribeca-jets-prod`.
- Invite a user. The email arrives and is not in spam.

---

## Updating

Merge into `main` and push. The GitHub App deploys automatically, or click
**Deploy** on an app. The API applies pending migrations on every start,
before it listens. Roll back from the app's **Deployments** list.

## Day to day, all in the panel

| Task | Where |
|---|---|
| Logs | the app → **Logs** |
| Restart / stop | the app → **General** |
| Change a setting | the app → **Environment** → Deploy (web build arguments need a Deploy) |
| A shell in a container | the app → **Open Terminal** |
| Database console | `postgres` → Open Terminal → `psql -U tribeca tribeca_jets` |
| CPU / memory | the app → **Monitoring** |
| Restore a backup | `postgres` → **Backups** → restore |

Swagger (`/api/docs`) is not served in production, by design.

## Reusing this for a new project

1. Pick a slug (`acme-crm`) and derive every name from it (see the naming
   chain above).
2. Same VPS? Skip steps 1–6. Add the new domain's DNS records (step 4)
   and continue at step 8 with a **new project**. Every project gets its own
   databases, buckets and token. Never share them.
3. New VPS? Follow from step 1.
4. Keep the private note per project: IP, panel login, `DATABASE_URL`,
   `REDIS_URL`, R2 keys, SMTP app password, JWT secrets.
