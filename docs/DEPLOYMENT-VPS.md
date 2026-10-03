# Deploying production on the Hostinger VPS

Everything runs on one Hostinger **KVM 2** (2 vCPU, 8 GB) as a Docker Compose
stack defined in [`deploy/`](../deploy). Files go to **Cloudflare R2**, mail goes
out over **SMTP**, and DNS for `tribecajetscommandcenter.com` stays at
**Netlify**, where the domain was bought.

```
browser ──https──▶ Caddy :443 ─┬─ /api/*  ▶ api  (NestJS)  ─┬─ postgres
                               └─ else    ▶ web  (Next.js)  ├─ redis
                                                            ├─ Cloudflare R2 (files)
                                                            └─ SMTP (mail)
```

One domain serves both apps, so the session cookie is first-party:
`COOKIE_DOMAIN` stays empty and no CORS is involved. Postgres and Redis are
never published on a port; only Caddy listens on the internet.

Development stays on Vercel + Render + Neon + B2 ([`DEPLOYMENT.md`](DEPLOYMENT.md)).
The two never share a database or a bucket.

---

## 1. The VPS

In hPanel → **VPS** → the KVM 2:

1. **OS**: Ubuntu 24.04 (the "Ubuntu 24.04 with Docker" template saves step 4).
2. Set a root password, and add your SSH public key if you have one.
3. Note the **IPv4 address**.
4. **Firewall** (hPanel → VPS → Firewall): allow inbound TCP 22, 80, 443 and
   UDP 443; drop the rest.

## 2. DNS at Netlify

Netlify → **Domains** → `tribecajetscommandcenter.com` → **DNS settings**:

| Type | Name | Value |
|---|---|---|
| A | `tribecajetscommandcenter.com` (apex) | the VPS IPv4 |
| A | `www` | the VPS IPv4 |

Delete any `NETLIFY` / `NETLIFY6` records on the apex or `www`. They point the
domain at Netlify's own hosting and would win over yours. Leave the MX and TXT
records alone; those are email.

Wait until `nslookup tribecajetscommandcenter.com` answers with the VPS IP
before step 7. Caddy requests the HTTPS certificate on first start, and it
fails while DNS still points elsewhere.

## 3. Cloudflare R2

1. **R2** → **Create bucket**, e.g. `tribeca-jets-prod`. Leave it **private**.
   No public access and no CORS: the API streams every file itself.
2. **R2** → **Manage API tokens** → **Create API token**: *Object Read &
   Write*, restricted to that bucket. Copy the **Access Key ID** and **Secret
   Access Key**; the secret is shown once.
3. Copy the S3 endpoint, `https://<account-id>.r2.cloudflarestorage.com`.
   Leave the bucket name off the end.

## 4. Mail (SMTP)

The API **refuses to start in production without SMTP**. Two-factor codes,
password resets and invitations depend on it. Pick one:

- **Google Workspace** (if the client has it). Use one Workspace mailbox, e.g.
  `ops@…`:
  1. Turn on 2-Step Verification for that account.
  2. Create an **App password** at myaccount.google.com → Security → App
     passwords. If the option is missing, the Workspace admin has to allow it.
  3. Settings: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`= that
     address, `SMTP_PASSWORD`= the 16-character app password.
  4. `MAIL_FROM` must be that address or one of its aliases. Gmail rewrites
     anything else.

  SPF and DKIM already exist if Workspace was set up on that domain.
- **Brevo** (free, 300 emails a day). Create an account, verify the sending
  domain, and add the SPF and DKIM records it gives you in Netlify DNS. Then
  use `smtp-relay.brevo.com`, port 587, and the SMTP login and key from
  *SMTP & API*.

Without SPF and DKIM, mail lands in spam.

## 5. Server setup

```bash
ssh root@<VPS-IP>

# Skip if you picked the Docker template
curl -fsSL https://get.docker.com | sh

apt-get update && apt-get install -y git
```

## 6. Get the code

The repository is private, so give the VPS a read-only **deploy key**:

```bash
ssh-keygen -t ed25519 -C "tribeca-vps" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

GitHub → the repository → **Settings → Deploy keys → Add deploy key**. Paste
the key and leave *write access* off. Then:

```bash
git clone git@github.com:<owner>/<repo>.git /opt/tribeca
cd /opt/tribeca && git checkout main
```

## 7. Configure and start

```bash
cd /opt/tribeca/deploy
cp .env.example .env

openssl rand -hex 24      # → POSTGRES_PASSWORD
openssl rand -base64 48   # → JWT_ACCESS_SECRET
openssl rand -base64 48   # → JWT_REFRESH_SECRET (a different value)

nano .env                 # fill in everything from steps 3–4 and the three values above
chmod 600 .env

docker compose up -d --build
```

The first build takes several minutes. Then check it:

```bash
docker compose ps                 # every service "running"; api "healthy"
docker compose logs -f api        # "SMTP transport ready", migrations applied, listening
curl https://tribecajetscommandcenter.com/api/health
```

If the API restarts in a loop, the first lines of its log name the setting
it rejected.

## 8. The first account

**Never run `db:seed` here.** It creates seven accounts with the public
password `ChangeMe123!`, plus made-up clients and enquiries. Create one real
administrator instead:

```bash
cd /opt/tribeca/deploy
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD   # typed, not echoed, not in history
docker compose exec -e ADMIN_PASSWORD \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_FIRST_NAME=First -e ADMIN_LAST_NAME=Last \
  api npm run db:bootstrap-admin
unset ADMIN_PASSWORD
```

The password must meet the app's password policy (10+ characters, upper,
lower, a digit). The script only creates an account: run it against an email
that already exists and it changes nothing. Everyone else gets invited from
**Users & Roles**.

The database starts empty: no airports, operators, aircraft or email
templates. The desk enters its own.

## 9. Check it works

- `https://tribecajetscommandcenter.com` loads with a padlock, and `www.`
  redirects to it.
- Sign in as the bootstrap admin.
- Upload a photo. It appears under `images/` in the R2 bucket.
- Invite a user. The email arrives and is not in spam.

## Updating

```bash
cd /opt/tribeca && git pull
cd deploy && docker compose up -d --build
```

The API applies pending migrations each time it starts, before it listens.

## Backups

The `backup` service writes a `pg_dump` into `deploy/backups/` once a day and
keeps 14 days (`BACKUP_KEEP_DAYS`). Those dumps sit on the same disk as the
database. They cover a bad migration or a mistaken edit, but **not losing the
VPS**, so also:

- turn on Hostinger's VPS backups or snapshots in hPanel, and
- now and then, copy `deploy/backups/` off the machine (`scp`, or `rclone` to
  a separate R2 bucket).

Files are already off the machine, in R2.

Restore a dump:

```bash
cd /opt/tribeca/deploy
docker compose stop api
docker compose exec -T postgres pg_restore -U tribeca -d tribeca_jets --clean --if-exists < backups/<file>.dump
docker compose start api
```

## Day to day

| Task | Command (in `/opt/tribeca/deploy`) |
|---|---|
| Logs | `docker compose logs -f api` (or `web`, `caddy`) |
| Restart | `docker compose restart api` |
| Database shell | `docker compose exec postgres psql -U tribeca tribeca_jets` |
| Disk use | `docker system df`, `du -sh backups` |
| Clear old images after updates | `docker image prune -f` |

Swagger (`/api/docs`) is not served in production, by design.
