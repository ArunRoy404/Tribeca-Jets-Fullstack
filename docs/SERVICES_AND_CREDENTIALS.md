# Tribeca Jets Command Center — Services & Credentials Needed for Production

Every outside service the Command Center needs, whether it is **Paid** or **Free**, and what we need from you for each.

- **Paid** means you pay for it in production. If the provider has a free tier with limits (a daily cap, non-commercial use only, the service sleeping when idle), it is noted in brackets. Those tiers are not suitable for a live business system.
- **Free** means it is genuinely free for production use, with no plan limits that would affect you.

We recommend opening every account in Tribeca Jets' name with your company card, so the company owns everything. We only need access to set it up.

Prices are approximate and were checked on 1 October 2026. Please confirm them on each provider's website before subscribing. First-term prices are often discounted and renew higher.

---

## 1. Required to go live

| # | Service | Cost | What we need from you | Notes |
|---|---|---|---|---|
| 1 | **Domain name** | **Paid** (~$10–20 / year) | Registrar login, or access to the DNS settings if you already own a domain | The web address your team opens. Also used to set up email authentication (SPF / DKIM / DMARC) so emails do not land in spam. |
| 2 | **Server / hosting**: one VPS running the website, the system behind it and the database (recommended: Hostinger VPS, KVM 2 plan, 2 CPU / 8 GB memory) | **Paid** (~$7–12 / month intro, higher on renewal) | VPS account access | (Vercel's free Hobby plan is for non-commercial use only. Render's free plan sleeps when idle and wipes uploaded files. Neither is usable for production.) |
| 3 | **Email sending (SMTP)** | **Paid** | SMTP host, port, username and password, plus the "from" address (e.g. `no-reply@yourdomain.com`) | The system **will not start in live mode without it**. It sends team invitations, password reset codes, two-step login codes, and every email the team sends to clients and operators from the CRM. Options: Hostinger Email or Google Workspace (Paid, per mailbox), or Amazon SES (Paid, pay per email). If you already use Google Workspace, it can do this job too (see section 4). (Brevo is free up to 300 emails / day and Resend up to 100 / day. Both are too tight for a working desk.) |

---

## 2. Free, running on the same server

Nothing is needed from you for these. They run on the server above at no extra cost.

| Service | Cost | Notes |
|---|---|---|
| **Database** (PostgreSQL) | **Free** (on the server) | (A managed database such as Neon is free only up to 0.5 GB and pauses when idle. Paid if you prefer it managed separately.) |
| **Cache / rate limiting** (Redis) | **Free** (on the server) | Protects logins against repeated guessing. (Hosted versions such as Upstash have free tiers with request and memory limits.) |
| **SSL certificate** (the padlock / https) | **Free** (Let's Encrypt) | Renews automatically. |
| **Security keys** for logins | **Free** | We generate these ourselves. |
| **Code repository** (GitHub) | **Free** | Private repositories are free. |

---

## 3. Recommended for production

### 3.1 File storage in the cloud (photos, documents, tax forms, referral attachments)

Uploaded files can live on the server's own disk at no extra cost. **We recommend a separate cloud bucket instead**, so your files survive even if the server is lost or replaced. Switching between them is a settings change: no code changes, and no existing file links break.

| Option | Cost | Notes |
|---|---|---|
| **Cloudflare R2** *(recommended)* | **Paid** (~$0.015 per GB per month) (free up to 10 GB storage, 1M uploads and 10M reads per month) | No charge when files are opened or downloaded, which suits this system: every file is fetched through the Command Center rather than served publicly. **A card or PayPal must be on file to switch R2 on, even within the free allowance.** Usage beyond the allowance is charged automatically, as there is no hard cap. |
| Backblaze B2 | **Paid** (~$6 per TB per month) (free up to 10 GB, no card needed) | Cheapest storage per GB. Downloads are free up to 3× the amount stored. |
| AWS S3 | **Paid** (storage plus ~$0.09 per GB downloaded) | Only worth it if you are already on AWS. |
| Server disk | **Free** | Works, but files are lost with the server if it fails. |

For a brokerage's photos and PDFs this will be a few GB, which costs cents a month or nothing.

**What we need from you:** a Cloudflare account in Tribeca Jets' name with a payment method on file, and access for us to create the bucket and its access keys.

### 3.2 Other recommended services

| Service | Cost | What it does |
|---|---|---|
| **Off-server backups** | **Paid** (a few dollars / month) | Hostinger's VPS includes server backups, and we set up a daily database backup. A second copy stored elsewhere protects you if the server itself is lost. The scope names Google Drive or an equivalent for this, and the R2 account above can hold backups too. (Google Drive is free up to 15 GB, shared with Gmail.) |
| **Error monitoring** (e.g. Sentry) | **Paid** | Alerts us when something breaks, often before your team notices. (Free tier caps errors per month and allows 1 user.) |
| **Uptime monitoring** (e.g. UptimeRobot, Better Stack) | **Paid** | Alerts us if the site goes down. (UptimeRobot's free plan is for non-commercial use only.) |

---

## 4. Integrations named in the signed scope (later phases)

These are listed in the project scope (§12, Integrations & Dependencies). None is needed to go live, and each is only needed once its feature is built. They are listed now so there are no surprises later.

### 4.1 AI (OpenAI API)

| Cost | What we need from you | Notes |
|---|---|---|
| **Paid** (pay per use) | An OpenAI API account with billing set up, and an API key | Used for AI extraction, matching, assistance and summaries. The scope names OpenAI. The system can also use Anthropic (Claude) instead if preferred. Cost depends on how much the team uses it, typically tens of dollars a month for a small desk. |

### 4.2 Gmail (Google Workspace)

| Cost | What we need from you | Notes |
|---|---|---|
| **Paid** (Google Workspace, ~$7–14 per user per month). The Gmail API itself is **Free**. | A Google Workspace admin to approve the connection | A core requirement in the scope: operator requests, empty-leg imports and client emails from Gmail. The exact send workflow is still an open decision (§17). If you already use Google Workspace, there is no new cost. |

### 4.3 Live flight tracking (FlightAware AeroAPI)

Flight tracking is **manual today** (decided 27 Sep 2026): a broker sets each flight's status, estimated arrival and tracking link by hand. AeroAPI would fill those in automatically and send departure, arrival, delay, diversion and cancellation alerts, worldwide.

| Tier | Cost | Suitable? |
|---|---|---|
| Personal | $5 / month free credit | **No:** personal and academic use only |
| **Standard** | **Paid: $100 / month minimum** (usage is billed against it) | **Yes.** Your usage would very likely stay under $100, so expect about $100 / month. |
| Premium | **Paid: $1,000 / month minimum** | Only adds partial coverage of privacy-blocked aircraft (see below) |

**Important limitation:** many private aircraft are on the FAA's privacy-blocked lists (LADD / PIA) at their owner's request. FlightAware does not show those flights on the Standard tier, and Premium covers them only partly. Some of your flights will therefore never appear in any tracking feed, and the manual form stays available for those.

**Before you commit:** send us 10–20 real tail numbers you charter regularly, and ask FlightAware sales for an evaluation key. Checking those tails tells us how many are visible, and whether $100 / month is worth it for your fleet.

**What we need from you:** a FlightAware AeroAPI account on the Standard tier, and its API key.

### 4.4 Weather

| Service | Cost | Notes |
|---|---|---|
| **aviationweather.gov** (US National Weather Service) | **Free** (no account, no key) | Current conditions (METAR) and forecasts (TAF) for airports worldwide, the standard data brokers and pilots use. **This covers the scope's weather needs:** trip weather, departure / arrival briefings and dashboard weather alerts. Limits (100 requests / minute, 30 days of history) are well above what the desk needs. Some small airfields publish current conditions but no forecast. |
| **api.weather.gov** (consumer forecast, US only) | **Free** (no key) | Only needed for client-friendly wording in day-of-trip emails ("Sunny, 72°F in Aspen") rather than pilot shorthand. |
| Consumer forecast for **international** airports | **Paid** | Only if client-facing weather is wanted for flights outside the US. (Open-Meteo's free plan is for non-commercial use only.) |

**Nothing is needed from you for weather** unless you want client-friendly forecasts for international trips.

### 4.5 WhatsApp (WhatsApp Business API)

| Cost | What we need from you | Notes |
|---|---|---|
| **Paid** (Meta charges per message; replies within 24 hours of a customer's message are free) | A Meta Business account, business verification, and a phone number **not** already in use on the regular WhatsApp app | For the CRM chatbot. The scope schedules this after the core phase; the provider and account are still an open decision (§17). |

### 4.6 Quick-access links (no account needed)

| Service | Cost | Notes |
|---|---|---|
| **Avinode** | **Free** (on our side) | A button that opens your own Avinode account. No credentials needed. |
| **DocuSign** | **Free** (on our side) | A button that opens your own DocuSign account. No credentials needed. |

---

## Not needed

- **Maps** (Google Maps, Mapbox): no screen in the system shows a map. The Instant Estimate works out distances from airport coordinates without one.

---

## Summary

| | Cost |
|---|---|
| **Minimum to go live** (domain + server + email) | **~$10–20 / month**, plus the domain once a year |
| Cloud file storage (Cloudflare R2) | Free up to 10 GB, then cents per GB (card on file) |
| Other recommended services | A few dollars / month each |
| AI (OpenAI) | Pay per use, when built |
| Gmail integration | No new cost if you already use Google Workspace |
| Live flight tracking (FlightAware) | ~$100 / month, only if you choose it |
| Weather | Free |
| WhatsApp | Per message, when built |

### Checklist: what we need from you

**To go live**
- [ ] Domain: registrar login, or DNS access
- [ ] Server: Hostinger VPS account access
- [ ] Email: SMTP host, port, username, password, and the "from" address

**Recommended**
- [ ] Cloudflare account with a payment method on file (for R2 file storage and backups)
- [ ] *(Optional)* Error / uptime monitoring accounts

**When each feature is built**
- [ ] OpenAI API key (with billing set up)
- [ ] Google Workspace admin approval for the Gmail connection
- [ ] 10–20 regular tail numbers, then a FlightAware AeroAPI key (Standard tier) if the check is worth it
- [ ] Meta Business account and a dedicated phone number for WhatsApp
