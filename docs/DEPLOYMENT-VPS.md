# Deploying production on a VPS with Dokploy

A runbook, written as we deployed Tribeca Jets, so the next project can follow
it start to finish. Every step says what was done, with this project's actual
values. Where one name has to match another, the field carries a
**🔗 link note** saying what it must match and how to keep the two in step.

**Status:** all 16 steps are done. Production went live on 3 Oct 2026.

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
| Mail | Resend (free: 100/day, 3,000/month) over SMTP; the client's Google Workspace later | sender `no-reply@tribecajetscommandcenter.com` |
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
| the domain verified in Resend | the domain in `MAIL_FROM` | Resend ↔ api env |

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

## 12. Mail (SMTP) ✅

**The API refuses to start in production without SMTP.** Two-factor codes,
password resets and invitations depend on it. Don't work around this by
running production as `development`.

Two providers are documented below, and **both blocks stay in this file
permanently, even after a switch**. One is live at a time. The other is the
fallback, and the walkthrough for the next project. To switch, change the
five `SMTP_*`/`MAIL_FROM` values in the api's Environment and redeploy. No
code changes. Then update the **Active now** line.

**Active now: 12a (Resend).**

### 12a. Resend: temporary, our own account ✅
> ⚠️ **Never delete this block.** It stays as the fallback and as the
> walkthrough for new projects, even after Tribeca moves to 12b.

**Why Resend.** Brevo was tried first, but its signup requires a phone code
and the SMS never arrived. Resend needs no phone and no account review. Its
free plan allows **100 emails/day, 3,000/month**, enough while the desk
starts.

1. **resend.com → Sign up** (GitHub or email). The account is personal
   (`roy.techreion`), and a future project adds its own domain to the same
   account. 🔗 The free limit is **per account, shared by every project**
   on it.
2. **Domains → Add Domain** ✅: `tribecajetscommandcenter.com`, region
   **North Virginia (us-east-1)**, the closest to the VPS. **Enable Sending**
   on, **Enable Receiving** off (we only send).
3. Resend lists DNS records. They were added in **Netlify DNS** (step 4's
   page). In the Name field, delete the pre-filled `@` and type only the part
   shown; Netlify appends the domain. Values were pasted with Resend's copy
   buttons, since its table truncates them with `[…]`. TTL empty.

   | Type | Name | Value |
   |---|---|---|
   | TXT | `resend._domainkey` | the DKIM key, `p=MIGfMA…wIDAQAB` (218 characters; a truncated paste fails verification) |
   | CNAME | `rsend` | `rsend.forge.rmta.net` |
   | CNAME | `send` | `send.forge.rmta.net` |
   | TXT | `_dmarc` | `v=DMARC1; p=none;` |

4. **I've added the records** → status **Verified** in about 5 minutes.
5. **API Keys → Create API key**: name `tribeca-vps`, permission **Sending
   access**, domain `tribecajetscommandcenter.com`. → note: the key
   (`re_…`, shown once). A key per project means one can be revoked alone.

Values for the api (step 13):

| Setting | Value |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` (literally that word) |
| `SMTP_PASSWORD` | the `re_…` key |
| `MAIL_FROM` | `Tribeca Jets <no-reply@tribecajetscommandcenter.com>` (🔗 its domain must be the one verified in Resend, or Resend refuses the send) |

### 12b. The client's Google Workspace: planned
> ⚠️ **Never delete this block.** It is the target setup for Tribeca. Keep
> 12a beside it after the switch.

The client's mail is Google Workspace on `tribecajets.com` (GoDaddy DNS). It
allows about **2,000 emails/day**, and emails to clients come from a familiar
`@tribecajets.com` address.

**Never ask for the client's Google password.** The CRM needs only an **app
password** for one mailbox, which the client creates and can revoke:

1. The client picks the sending mailbox, e.g. `no-reply@tribecajets.com`. A
   dedicated user costs a Workspace seat; an existing mailbox also works.
2. Signed in as that mailbox: myaccount.google.com → Security → turn on
   **2-Step Verification**.
3. myaccount.google.com/apppasswords → name `Tribeca CRM` → **Create** →
   copy the 16-character password (shown once).
4. They send us the **address** and the **app password** over a secure
   channel (a password-manager share or a one-time link), not plain email.
5. If step 3 says the setting isn't available: a Workspace admin enables it
   in admin.google.com → Security → Authentication → 2-step verification →
   **Allow users to turn on 2-Step Verification**.
6. To revoke the CRM's access later: delete `Tribeca CRM` on that same
   page. The mailbox and its password are unaffected.

Values for the api:

| Setting | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | the mailbox address |
| `SMTP_PASSWORD` | the app password (spaces are fine either way) |
| `MAIL_FROM` | `Tribeca Jets <that same address>` (🔗 Gmail rewrites any sender that isn't `SMTP_USER` or one of its aliases) |

`tribecajets.com`'s SPF already includes Google (`include:_spf.google.com`),
so mail sends without DNS changes. For better inbox placement: Google Admin
→ Apps → Google Workspace → Gmail → **Authenticate email** → turn on DKIM,
and add its TXT record at **GoDaddy** (that domain's DNS), not Netlify.

## 13. The API app ✅

Project → **Create Service → Application**:

| Field | Value |
|---|---|
| Name | `api` |
| App Name | `tribeca-jets-api` (🔗 the internal host the web app's `API_PROXY_TARGET` uses; Dokploy appended a suffix, so ours is **`tribeca-jets-api-nbxnuq`**, shown under the app's title) |

**General → Provider: GitHub** ✅

| Field | Value |
|---|---|
| Github Account | the GitHub App from step 7 |
| Repository | `Tribeca-Jets` |
| Branch | `main` |
| Build Path | `/Backend` (🔗 the folder holding the API's `Dockerfile`) |
| Trigger Type | On Push, with **Autodeploy** on, so a push to `main` redeploys |
| Watch Paths | empty, so every push rebuilds (simple and safe) |

**Build Type** ✅: **Dockerfile**, Docker File `Dockerfile`, Docker Context
Path **empty** (it means `.`, i.e. the Build Path), Build Stage empty (the
Dockerfile has one stage). Each section has its own **Save**.

Don't press **Deploy** until the Environment and Domain below are filled in.

**Environment** tab ✅: paste into the **top box, "Environment Settings"**
(the runtime variables). The greyed `NODE_ENV=production` / `PORT=3000` /
`NPM_TOKEN=xyz` lines in empty boxes are placeholders, not saved values.
**Build-time Arguments** and **Build-time Secrets** stay empty for the api.
**Create Environment File: off**: the api gets these variables at run time,
and with it on Dokploy also writes every secret into a `.env` on disk that
nothing reads.

Generate each JWT secret on Windows with PowerShell (run twice, one value
per secret):

```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Paste and fill in:

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

# Step 12 (Resend)
MAIL_DRIVER=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=
MAIL_FROM="Tribeca Jets <no-reply@tribecajetscommandcenter.com>"

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
| Internal Path | the default `/` (changes nothing) |
| Strip path | **off**, since the API expects the `/api` prefix |
| Custom Entrypoint | off |
| HTTPS | on, Let's Encrypt |

Middlewares: empty. **Create**.

**Deploy** ✅ (General tab) once every value above is filled in. The first
build took about 3–4 minutes: clone, `npm ci`, `prisma generate`,
`nest build`, image export. Harmless noise in the build log: `debconf: unable
to initialize frontend`, `3 moderate severity vulnerabilities`, `New major
version of npm`, `deprecated tsconfck`.

**Check:** `https://tribecajetscommandcenter.com/api/health` answered

```json
{"status":"ok","environment":"production","services":{"database":"up","redis":"up","storage":"s3","ai":"not_configured"}}
```

`production` plus `ok` means every production guard passed, SMTP included,
since the API refuses to boot without it. `database: up` means the migrations
ran. `storage: s3` means R2 is live. `ai: not_configured` is expected, as no
AI key is set. Watch *Deployments* (build) and
*Logs*: migrations applied, then `SMTP transport ready`. In a restart loop,
the first log lines name the setting it rejected.

## 14. The web app ✅

Project → **Create Service → Application**, name `web`, App Name
`tribeca-jets-web` (Dokploy's suffix makes ours **`tribeca-jets-web-yh7bhp`**).
Same provider, trigger and build type as the api, but **Build path
`/Frontend`** ✅.

**Environment → Build-time Arguments** (the middle box) ✅, not the runtime
box. Next.js reads them when it *builds*:

```env
API_PROXY_TARGET=http://tribeca-jets-api-nbxnuq:4000
NEXT_PUBLIC_API_URL=/api
```

Environment Settings (top) and Build-time Secrets stay **empty**; Create
Environment File **off**.

🔗 `API_PROXY_TARGET`'s host is the api's App Name *with* its suffix, and
`4000` is the api's `PORT`. Other `NEXT_PUBLIC_*` (cache times, polling, see
`Frontend/.env.example`) are optional. A build argument changes only on the
**next Deploy**, not on restart. The runtime Environment box stays empty.

**Domains** ✅: **Add Domain** twice, identical except the host:

| Field | Domain 1 | Domain 2 |
|---|---|---|
| Host | `tribecajetscommandcenter.com` (🔗 the `@` DNS record) | `www.tribecajetscommandcenter.com` (🔗 the `www` DNS record) |
| Path | `/` | `/` |
| Internal Path | `/` | `/` |
| Strip Path | off | off |
| Container Port | `3000` (🔗 = `-p 3000` in `Frontend/Dockerfile`) | `3000` |
| Custom Entrypoint | off | off |
| HTTPS | on, Let's Encrypt | on, Let's Encrypt |

The api's `/api` domain and the web's `/` domain share a host. Traefik
matches the longer path first, so `/api/*` reaches the api and everything
else reaches the web app.

**Advanced → Redirects → Add Redirect** ✅: Preset **Redirect to non-www**.
It fills Regex `^https?://www\.tribecajetscommandcenter\.com/(.*)` and
Replacement `https://tribecajetscommandcenter.com/${1}`. **Permanent** on.

**Deploy** ✅. The build took about 3 minutes (`next build` compiles and
prerenders 41 routes). Checked: `https://tribecajetscommandcenter.com`
shows the sign-in page, and `www.` redirects to it.

Follow-up noted at deploy time: `npm audit` reported 15 vulnerabilities in the
frontend's production dependencies (11 high, 1 critical), and 3 moderate in the
backend. Review them separately; never mid-deploy.

## 15. The first account ✅

**Never run `db:seed` in production.** It creates seven accounts with the
public password `ChangeMe123!` and invented clients. The first account comes
from a one-off script instead, run inside the api container:

1. Dokploy → **api** → General → **Open Terminal** → pick **Bash**. The
   container picker at the top already shows the running api container.
2. **`cd /app` first.** The terminal opens at `/`, not in the app; without
   this, npm fails with `ENOENT … open '/package.json'`. The prompt then
   reads `root@…:/app#`.
3. Run it as **one line**, replacing the four values:

```sh
cd /app
ADMIN_EMAIL=you@example.com ADMIN_FIRST_NAME=First ADMIN_LAST_NAME=Last ADMIN_PASSWORD='Your-Strong-Password1' npm run db:bootstrap-admin
```

| Value | Notes |
|---|---|
| `ADMIN_EMAIL` | a real inbox: sign-in codes and resets go there |
| `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` | quote a name with a space: `ADMIN_LAST_NAME='Van Dyke'` |
| `ADMIN_PASSWORD` | in **single quotes**, with no `'` inside it. Policy: 10+ characters, upper case, lower case, a digit. Never a password from a chat, a ticket, this document or the seed. |

Success prints `Created SUPER_ADMIN <email>.` A password that breaks the
policy prints the rule it broke and creates nothing. Running it for an email
that already exists changes nothing: it only creates, and never resets.

Done for Tribeca, two SUPER_ADMINs:

| Account | Password |
|---|---|
| the developer (`techreion@gmail.com`) | set by the developer and replaced through Forgot password |
| the client, `ari@tribecajets.com` | **temporary**. At handover the client uses **Forgot password** (the code goes to their own inbox) and sets one only they know. Until then the temporary one stays in our password manager, never sent by email or chat. |

**Starting over before go-live.** The first attempt created one account with
a publicly known password, so every user was removed and both were created
again. The app has **no way to delete a user** by design (accounts are
suspended, never removed), so this was a one-time SQL cleanup, safe only
because the database was brand new. **After go-live, suspend instead**
(Users & Roles → Edit → Suspended).

```sh
# postgres service → Open Terminal → Bash. There is no /app here; that's the api container.
psql -U tribeca tribeca_jets        # the prompt becomes tribeca_jets=#. SQL works only after this.
```
```sql
SELECT email, role, status, "createdAt" FROM users;  -- look first; camelCase columns need "double quotes"
DELETE FROM users;                                   -- irreversible
SELECT count(*) FROM users;                          -- 0
\q
```

Everyone else is invited from **Users & Roles**. The database starts empty:
the desk enters its own airports, operators, aircraft and templates.

## 16. Check it works ✅

- [x] `https://tribecajetscommandcenter.com` loads with a padlock; `www.`
  redirects to it.
- [x] `https://tribecajetscommandcenter.com/api/health` reports `ok`.
- [x] **Forgot password** on the developer's account: the code arrived from
  `no-reply@tribecajetscommandcenter.com` in the **Inbox**, not spam. This
  proves Resend and the DNS records.
- [x] Sign in with the new password.
- [x] **Upload:** Aircraft → Add Aircraft → pick a photo. It uploads the
  moment it's picked (the thumbnail appears), so **Cancel** is fine. A file
  appeared under `images/` in `tribeca-jets-prod`. If an upload fails, the
  api's Logs name the cause: `InvalidAccessKeyId` / `SignatureDoesNotMatch`
  means a wrong key, `NoSuchBucket` a wrong bucket or endpoint.

**Still open after go-live:**

- Handover: the client resets `ari@tribecajets.com`'s password through Forgot
  password.
- Switch mail to the client's Workspace (step 12b) once they send the app
  password.
- Review the frontend's `npm audit` findings (11 high, 1 critical) in a normal
  change, deployed like any other.

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
