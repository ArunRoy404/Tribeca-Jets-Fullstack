# Deploying the development/testing environment

Frontend on Vercel, API and Redis on Render, Postgres on Neon, uploads on
Backblaze B2 — all free, no card. This is a **testing**
deployment, not production — see `render.yaml` for what `NODE_ENV=development`
buys us and what it gives up.

## The shape, and why it matters

The browser never talks to Render. `Frontend/next.config.mjs` rewrites
`/api/*` to `API_PROXY_TARGET`, so every request goes to the Vercel origin and
is proxied on from there.

That is what makes this stack work at all. The session is httpOnly cookies with
`sameSite: 'lax'` (`Backend/src/modules/auth/token.service.ts`), and a browser
will not send a `lax` cookie on a cross-site request. Called directly, a
Vercel frontend and a Render API are different sites and login silently fails.
Behind the proxy the cookies are ordinary first-party cookies on the web origin
— no CORS, no SameSite negotiation, nothing to configure.

Two consequences worth stating, because both look like bugs otherwise:

- **`NEXT_PUBLIC_API_URL` must stay relative.** Set it to the absolute Render
  URL and you bypass the proxy and break login.
- **Vercel preview deployments need no CORS entry.** Every preview URL proxies
  to the same API from its own origin, so `WEB_APP_URL` naming only the
  production URL is fine.

## Deploy order

`WEB_APP_URL` and `API_PROXY_TARGET` each need a URL the other side does not
have yet, so the first pass is deliberately circular:

1. **Neon** — create the database, then copy the **direct** connection string:
   turn *Connection pooling* off in the Connect dialog, or delete `-pooler`
   from the hostname. Click *Show password* first; the displayed string is
   masked.

   Not the pooled one. `render.yaml` runs `npm run db:deploy` during the
   build, and Prisma migrations need a session-mode connection — advisory
   locks and DDL that PgBouncer's transaction mode does not carry. The usual
   answer is a pooled `url` plus a direct `directUrl`, but `prisma7.config.ts`
   reads `DATABASE_URL` and nothing else, so one string has to serve both the
   migrations and the app. At this concurrency the pooler buys nothing anyway.

   Keep `sslmode=require`. `channel_binding=require` can be dropped —
   `@prisma/adapter-pg` runs on node-postgres, which does not implement
   channel binding and ignores the parameter.

   **Put Render in the same region as Neon.** A Singapore database behind an
   Oregon web service pays a round trip on every query, and this app makes
   several per request.
2. **Render** — create the blueprint from `render.yaml`. It prompts for the
   three `sync: false` values. Give it `DATABASE_URL` now; leave `WEB_APP_URL`
   at its default. `API_PUBLIC_URL` can be left at its default — see below.
3. **Vercel** — create the project, set `API_PROXY_TARGET` to the Render URL.
4. **Back to Render** — set `WEB_APP_URL` to the Vercel URL and redeploy.
5. **Seed** — run it once, or there is no account to log in with. The free
   Render plan has no shell, so run it locally against Neon rather than on the
   server:

   ```bash
   cd Backend
   DATABASE_URL="<the Neon connection string>" npm run db:seed
   ```

   `prisma/seed.ts` loads `dotenv/config`, which does **not** overwrite a
   variable already set on the command line — so the prefix wins over your
   local `.env` and the seed lands on Neon, not on your development database.
   Check the output names Neon before trusting it.

## Vercel project settings

| Setting | Value |
|---|---|
| Root Directory | `Frontend` |
| Framework Preset | Next.js |
| Build / Install Command | leave as detected |
| Node version | picked up from `engines.node` / `.nvmrc` (22.x) |

Root Directory is a dashboard setting, not something `vercel.json` can express,
which is why there is no `vercel.json` in this repo — there would be nothing to
put in it.

## Vercel environment variables

Only one is actually required:

| Variable | Value | Notes |
|---|---|---|
| `API_PROXY_TARGET` | `https://<service>.onrender.com` | **Required, and read at _build_ time.** No `NEXT_PUBLIC_` prefix — it is server-only, and the browser never needs to know where the API lives. Without it the proxy points at `localhost:4000` and every request fails. |
| `NEXT_PUBLIC_API_URL` | `/api` | Optional; `Frontend/src/lib/axios.js` already defaults to `/api`. Set it explicitly anyway, so nobody later "fixes" it to an absolute URL without reading this file. |

### `API_PROXY_TARGET` is baked in at build time

`next build` evaluates `rewrites()` once and serializes the result into
`.next/routes-manifest.json`:

```json
{ "source": "/api/:path*", "destination": "http://localhost:4000/api/:path*" }
```

`next start` reads that file. It does **not** re-read `next.config.mjs`, so
setting `API_PROXY_TARGET` at run time changes nothing. Two consequences on
Vercel:

- The variable must exist **before** the build runs. Vercel exposes project
  environment variables to the build, so setting it in the dashboard is
  enough — but set it before the first deploy, not after.
- **Changing it later requires a redeploy**, not just saving the new value.
  Saving alone leaves the old destination baked into the deployed build.

The failure is quiet and confusing: the app proxies to `localhost:4000`, which
on Vercel is nothing at all, and every API call fails with a network error
while the health endpoint looks fine in isolation. Locally it is worse — it
silently reaches your *own* backend and appears to work against the wrong
database.

Everything else in `Frontend/.env.example` is optional. Every
`NEXT_PUBLIC_QUERY_*` and `NEXT_PUBLIC_AUTH_*` value has a fallback in
`src/config/query.config.js`, so unset means "use the documented default", not
"undefined leaks into a `staleTime`". Set them only to tune cache behaviour.

## Render environment variables

Most are already in `render.yaml`. Three are prompted for at blueprint
creation, because each depends on a URL that does not exist until something
else is deployed:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Neon connection string. Must include `?sslmode=require`. |
| `API_PUBLIC_URL` | This service's own `https://…onrender.com`. **Currently read by nothing** — the config exposes it, but no code calls it, because stored upload URLs are deliberately relative (`/api/uploads/<id>`). Setting it is harmless; it is kept for the day something genuinely needs an absolute link (an email). |
| `WEB_APP_URL` | The Vercel URL. Feeds the CORS allowlist and the links in emails. |

Both JWT secrets are generated by Render (`generateValue: true`). If either
comes back under 32 characters the API refuses to boot with a readable message
— replace it with `openssl rand -base64 48`.

## Uploads: Backblaze B2

Render's free disk is wiped on every deploy, restart and wake from sleep, so
the API stores files in a B2 bucket through its S3 driver — no code change.

1. **backblaze.com → B2 Cloud Storage** → sign up (free: 10 GB, no card).
2. **Buckets → Create a Bucket**: unique name, **Private**, encryption and
   object lock off. Copy the **Endpoint** on the bucket card, e.g.
   `s3.us-west-004.backblazeb2.com`.
3. **Application Keys → Add a New Application Key**: that bucket only, **Read
   and Write**. Copy the keyID and applicationKey at once (shown once).
4. On the Render API service:

| Variable | Value |
|---|---|
| `STORAGE_DRIVER` | `s3` (set by `render.yaml`) — not `auto`, which falls back to the wiped disk on a typo |
| `S3_ENDPOINT` | `https://` + the endpoint |
| `S3_REGION` | the part between `s3.` and `.backblazeb2.com`, e.g. `us-west-004` |
| `S3_BUCKET` | the bucket name |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | the keyID / applicationKey |
| `AWS_REQUEST_CHECKSUM_CALCULATION`, `AWS_RESPONSE_CHECKSUM_VALIDATION` | `WHEN_REQUIRED` (set by `render.yaml`) |

Leave `S3_PUBLIC_URL` empty: the API streams every file, so nothing reads the
bucket directly. Check it: upload a photo, see it under `images/` in B2's
**Browse Files**, restart the API, reload — it is still there. If an upload
fails, the API log says why: `InvalidAccessKeyId`/`SignatureDoesNotMatch` is a
mistyped key; `NoSuchBucket` or a redirect is a wrong bucket or a region that
does not match the endpoint.

## Logging in without email

No SMTP is configured, so the mail driver prints to the Render log stream
instead of sending. This does not block sign-in: `twoFactorEnabled` defaults to
`false` (`prisma/schema/user.prisma`) and the seed only enables it on
`security@tribecajets.com`. So `admin@tribecajets.com` signs in with a password
alone.

Password reset does need the code — read it out of the Render logs.

**The seeded credentials are public knowledge.** `prisma/seed.ts` hardcodes
`ChangeMe123!` for every account, including the `SUPER_ADMIN`, and a Render URL
is reachable by anyone who finds it. Change the password in-app after the first
login, and remember that re-running the seed resets it back.

## Known limitations of the free tier

- **Render sleeps after ~15 minutes idle.** The cold start can outlast Vercel's
  proxy timeout, so the first request after a quiet period may simply fail.
  Load it once and retry. Only a paid instance actually fixes this.
- **Files uploaded before B2 was configured are gone** — they were on
  Render's wiped disk. Their rows remain and show as broken until re-uploaded.
- **B2's free download allowance is 1 GB a day** — far above what testing uses.
- **Key Value is not persisted.** It holds rate-limit counters, which are
  meant to be disposable.
- **Migrations run in the build command.** `preDeployCommand` is the right home
  for them but is not available on the free plan.

## Production

Production is the Hostinger VPS, not this stack — see
[`DEPLOYMENT-VPS.md`](DEPLOYMENT-VPS.md).
