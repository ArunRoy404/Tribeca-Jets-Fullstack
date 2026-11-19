# Codex prompt — time zones and the 24-hour clock (before WhatsApp step 4)

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/timezone-and-24-hour-clock.md and carry out
everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md in full (all three parts),
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Backend/.env holds
  real credentials: do not read, print or use them.
- No npm install — nothing new is needed (no date library: use Intl).
- Don't run nvm commands. If npm or npx is blocked, stop and report.
- Do not run `prisma migrate dev` or anything that touches a database.
  Write the one migration by hand (§3).
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the report described in §10 of the brief.
```

---

You are implementing two rules the developer has decided, across the backend
and the frontend of the Tribeca Jets Command Center. Another engineer will
review your work line by line against `AGENTS.md`, so precision matters more
than speed.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` (all three parts — this task touches
   both apps), `docs/WHATSAPP_AI_INTEGRATION.md`, every file in
   `Backend/src/modules/whatsapp/`. Match the surrounding style, comment
   density and naming exactly.
2. **Never run** `git commit`, `git push`, `git stash`, `git reset` or
   anything that changes git history or the index. The reviewer commits.
3. **Stop and report instead of guessing.** If something this brief assumes
   is not true in the code, say exactly what differs and propose the
   smallest fix.
4. **Do not open `Backend/.env`.** No live calls; no database.
5. Backend is **NestJS 12, TypeScript, ESM** (every relative import ends in
   `.js`), **vitest**, **oxlint**, **Zod 4**, **Prisma 7** (schema in
   `prisma/schema/*.prisma`; never edit `src/generated/`). Frontend is
   **Next.js 16, JavaScript** — never TypeScript.

   **Run the §10 commands exactly as written — no workarounds.** `npm test`
   runs `prisma generate`, and `prisma7.config.ts` loads `.env` through
   `dotenv`: that is fine. It is the tool reading its config, not you
   opening the file; generate never connects to a database, and Vitest
   exposes only `VITE_` keys (there are none). Rule 4 is about *you*
   opening, printing or copying `.env`. Likewise `npm run build` fetches
   the Google Fonts the root layout uses — ordinary build tooling, not the
   external services the launcher forbids (Meta, OpenAI, anything holding
   our credentials). If the network refuses it, report the build as
   skipped with the error and carry on; do not add font mocks or a second
   Prisma config.
6. **This task is a deliberate sweep.** `AGENTS.md` says "fix a module when
   we reach it, not before". The developer has overridden that for the
   24-hour clock: *every* place, no exception. So you will move every caller
   of the old time formatters and delete them — no second copy left behind.
   The time-zone half is **not** a sweep: only what §2–§8 name.
7. Do **not** touch the Postman collection or `HANDOFF.md`; the reviewer
   does both.

## 1. What this is

**Rule A — the 24-hour clock (client's rule).** Every time a person reads is
`14:30`, with a colon. Never `2:30 PM`, never `1430`. Every screen, picker,
calendar rail, timestamp, email, merge field, PDF and WhatsApp reply. It is
already in `AGENTS.md` part one, "Every time is shown on a 24-hour clock".
Stored and wire formats do not change (`"HH:MM"` is already 24-hour).

**Rule B — "today" follows the person, not UTC.** The WhatsApp assistant
tells the model `Today's date (UTC)` (`whatsapp.agent.ts`), so after 18:00
in Dhaka, or after ~19:00 in New York, its "tomorrow" is a day off. The
design agreed on 19 Nov 2026 (`docs/WHATSAPP_AI_INTEGRATION.md` §6, the
"Timezone fix" row):

1. a `timeZone` (an IANA name) on each user — **null means "use the
   company's"**;
2. a **company timezone** setting, default `America/New_York`;
3. the bot uses the asker's zone, and the Super Admin can change theirs by
   telling it ("I'm in London");
4. the web app **asks once, never silently**, when the browser's zone
   differs from the person's;
5. every bot answer about a relative day names the date and the zone;
6. flight times stay airport-local, as stored (`trip.prisma`, the
   `departureDate` / `departureTime` comment). Nothing about legs changes.

**Out of scope, on purpose:** the desk rules that use `todayUtc()`
(`common/money/settlement.ts` — Overdue, Dashboard "today", Schedule,
Reports, Tasks, Documents). They move to the company timezone in a later
pass, module by module. Do not change `todayUtc()` or its callers. Also out
of scope: the frontend's own "today" (date-picker defaults, calendar
highlight) and date-only formatting (`toLocaleDateString` without a time).

## 2. Shared backend helpers — `Backend/src/common/dates/time-zone.ts`

Pure functions, no Nest, using `Intl` only. Tested in
`time-zone.spec.ts` beside it.

- **`timeZoneSchema`** — a Zod string, trimmed, max 64, that is a zone
  `Intl` accepts (`new Intl.DateTimeFormat('en-US', { timeZone })` must not
  throw `RangeError`), **transformed to its canonical name** via
  `resolvedOptions().timeZone`. Message: `Use a time zone name, e.g.
  America/New_York`. Refuse fixed offsets like `+06:00` or `GMT+6` even if
  the runtime accepts them — a fixed offset breaks at daylight saving.
- **`DEFAULT_TIME_ZONE = 'America/New_York'`** — the column default's twin,
  for code that needs the constant (tests, the frontend label).
- **`nowIn(zone, now = new Date())`** →
  `{ date: 'YYYY-MM-DD', weekday: 'Thu', time: 'HH:MM' }` — the wall-clock
  day and time in that zone. 24-hour (`hourCycle: 'h23'`; never `hour12:
  false`, which some engines render as `24:05`).
- **`formatMomentIn(value, zone)`** → `'Thu 20 Nov 2026, 14:30'` for a
  timestamp, read in that zone; `null` for null/invalid input.

Tests must include: Dhaka (UTC+6, no DST) rolling to the next day at 18:00
UTC; New York on both sides of a DST change (EDT −4 and EST −5); `nowIn` at
`23:59` and `00:00`; `timeZoneSchema` accepting `Europe/London` and
`asia/dhaka`-style input only if `Intl` canonicalises it (assert whatever
the runtime does — do not hard-code a guess), refusing `Mars/Olympus`,
`+06:00`, `GMT+6` and `""`.

## 3. Schema and the migration

`Backend/prisma/schema/user.prisma`, on `User`:

```prisma
  /// The person's own time zone (IANA name, e.g. "Asia/Dhaka"). Decides
  /// what "today" means to them — the WhatsApp assistant first. Null:
  /// the company's (`company_settings.companyTimeZone`).
  timeZone String? @db.VarChar(64)
```

`Backend/prisma/schema/settings.prisma`, in the **Company & branding**
group of `CompanySettings`:

```prisma
  /// The desk's time zone (IANA name) — anyone without their own reads
  /// "today" in it, and the desk rules will (19 Nov 2026).
  companyTimeZone String @default("America/New_York") @db.VarChar(64)
```

Hand-write
`Backend/prisma/migrations/20261119120000_time_zones/migration.sql`, in the
style of `20261116120000_whatsapp_assistant_switch` (a two-line comment,
then the SQL):

```sql
ALTER TABLE "users" ADD COLUMN "timeZone" VARCHAR(64);
ALTER TABLE "company_settings" ADD COLUMN "companyTimeZone" VARCHAR(64) NOT NULL DEFAULT 'America/New_York';
```

Check the table names against each model's `@@map` before writing them.
No backfill: null on a user already means "the company's".

## 4. The company setting

Wire `companyTimeZone` exactly as the last added setting was wired (commit
`210d87a` added `whatsappAssistantEnabled`; follow the same files):

- `settings/dto/settings.dto.ts` → `companySchema`:
  `companyTimeZone: timeZoneSchema.optional()`.
- `settings/settings.view.ts` → `SettingsRow`, `SECTIONS.company`,
  `settingsView`. **Not** `brandingView` — branding is public, and only the
  branding (`AGENTS.md`, "The branding is public, and only the branding").
- `settings/settings.spec.ts` — extend what the existing cases assert.
- Grep the settings module for every other list of company keys and add it
  where they all are.

## 5. The person's own zone, and `/auth/me`

- `auth/dto/account.dto.ts` → `updateProfileSchema`:
  `timeZone: timeZoneSchema.nullable().optional()` — null clears it back to
  the company's. Update the schema's doc comment and the `PATCH /auth/me`
  `@ApiOperation` description, which list the accepted fields.
- `auth/auth.service.ts` → `getProfile` selects `timeZone`.
  `updateProfile` already writes and audits whatever the DTO accepted
  (`user.profile_updated`, `fields`) — confirm it, change nothing else.
- `auth/auth.controller.ts` → the `/auth/me` shape built by `session()`
  carries, beside the profile's own `timeZone`, the company's as
  **`companyTimeZone`**, read from `this.settingsService.current()` as
  `sessionPolicy()` reads the idle settings. Document both in the comment
  block, in that block's voice: own zone, null = the company's; the browser
  formats nothing with them yet beyond the prompt (§8).
- `common/types/api.types.ts` → `AuthenticatedUser` gains
  `timeZone?: string | null`, with a doc comment. Load it in
  `auth/strategies/jwt.strategy.ts` (add to the `select`) and in
  `WhatsappService.adminForEmail` (same). Nothing else reads it yet.

## 6. The WhatsApp assistant

**The zone.** In `WhatsappAgent.reply`, the zone is
`user.timeZone ?? (await settings.read()).companyTimeZone` — inject the
global `SettingsService` (`AGENTS.md`: `await settings.read()` when
deciding). Replace the UTC line with one built from `nowIn(zone)`:

```
Now: Thu 19 Nov 2026, 14:30 in Asia/Dhaka — the Super Admin's time zone.
```

and replace the instructions' last line (`The UTC date below…`) with rules
saying, in the existing voice and as briefly:

- the line above is the current date and time; resolve "today",
  "tomorrow", "tonight", "this week" and weekday names in that zone;
- whenever an answer depends on a relative day, name the date and the zone
  once ("Tomorrow, Fri 20 Nov (Asia/Dhaka)");
- write every time on a 24-hour clock, `14:30`, never AM/PM;
- a flight's `departureTime` is local at its departure airport — say
  "local" ("10:00 local"), never convert it;
- if asked which time zone is in use, answer from the line above.

Change the "Write dates like…" line only as far as it needs to stay true.

**Tool results in the zone.** `find_client` returns `nextFollowUpAt` as a
raw ISO timestamp, which the model reads as UTC. Return it as
`formatMomentIn(value, zone)` plus a `timeZone` field naming the zone. The
tool needs the zone, so pass it into `run` (extend `ToolDefinition.run`'s
signature with a context argument — do not re-read settings per tool).
Leave `list_flights` dates and times exactly as they are (airport-local).

**The one own-account tool — `set_my_timezone`.**

- Arguments: `{ timeZone: string | null }`, strict; `null` means "use the
  company's". Description tells the model to send an IANA name it derives
  from what the Super Admin said ("London" → `Europe/London`), and `null`
  for "use the company time".
- It changes **only the caller's own row**, as My Account does, so it has no
  module permission. Make that explicit in `defineTool`: the `permission`
  field becomes `{ module, action } | 'own-account'`, the dispatcher skips
  `canDo` only for `'own-account'`, and a comment there says why (the same
  reason `PATCH /auth/me` carries no `@RequireAccess`). It is the **only**
  tool allowed to use it.
- It calls `AuthService.updateProfile(user.id, { timeZone }, { ipAddress:
  null, userAgent: 'WhatsApp assistant' })` — the owning service, so
  validation and the audit row are the web app's. Import `AuthModule`
  into `WhatsappModule` (it exports `AuthService`); report it if that
  creates a circular import rather than working around it.
- Validate with `timeZoneSchema` in the tool's own schema too, so a bad name
  comes back as a tool `{ error }` the model can explain.
- Returns `{ timeZone: <the zone now in effect>, usingCompanyDefault:
  boolean, now: nowIn(that zone) }` — so the model's confirmation names the
  new zone and the local time there, and a misheard city is visible at
  once.
- The instruction "You cannot change anything yet…" becomes: the only thing
  you can change is the Super Admin's own time zone (`set_my_timezone`);
  for anything else — approve, create, pay — say it is coming and the web
  app does it today.

No confirmation step for this tool: it changes a display preference on the
asker's own account and the reply states the result. Step 4 introduces
CONFIRM for business writes; this is not one.

## 7. The 24-hour clock, everywhere

**Backend.**
- `email-templates/email.merge.ts` → `formatTime` returns the time as
  `14:30` (validate `HH:MM`, return it unchanged; null otherwise). Fix its
  doc comment and tests.
- Grep `Backend/src` (excluding `generated/` and specs) for `AM`, `PM`,
  `hour12`, `hourCycle`, `toLocaleTimeString`, `toLocaleString(` and
  `Intl.DateTimeFormat` with an `hour` option. Fix every time a person
  reads; list each hit in the report with what you did. PDFs already print
  `HH:MM` — confirm, do not change.

**Frontend — one formatter per kind, every caller moved.**
- `src/lib/time.js` → **`formatTime(value)`**: any value `parseTime`
  accepts → `"14:30"`; unparseable → `"—"`. Delete `formatTime24` (which
  returns 12-hour text despite its name). `parseTime` keeps accepting typed
  `6:30 pm` — accepting input is not displaying it — but its doc comment
  and the module comment must stop describing 12-hour display.
- `src/lib/date.js` → delete `formatTime12`; its callers use
  `formatTime` from `lib/time.js`.
- `src/lib/archive.js` → `formatTimestamp`: `'en-US'` with
  `hourCycle: 'h23'` → `Nov 19, 2026, 14:30`. Today it passes `undefined`
  as the locale, so a US browser shows `02:30 PM`.
- `src/lib/timeline.js` → `timelineExactTime`: the same 24-hour format
  (reuse `formatTimestamp` rather than writing a third).
- `components/common/TimePicker.jsx` → labels from `formatTime`; the error
  text `Use a time like 18:30.`; fix its doc comment ("the 12-hour text is
  only the label" is no longer true).
- `components/schedule/WeekGrid.jsx` → the rail reads `07:00 … 17:00`, and
  its comments that say `7 AM` / `5 PM`.
- Every caller of the deleted `formatTime12` / `formatTime24` moves to
  `formatTime` — grep for both names; `BuildItineraryDialog`,
  `FlightDetailSheet`, `TripFlightInfoCard`, `TripFlightRouteCard`,
  `lib/flight.js` (and its comments with `PM`) and `lib/itinerary.js` are
  among them. The `formatTimestamp` callers (`PortalResourcesList`,
  `PortalReferralSheet`, `ReferralResourcesCard`, `lib/{document,email,
  emptyLeg,payment,quote,referral}.js`) need no change: fixing the shared
  formatter fixes them.
- Then grep `Frontend/src` (excluding `dummyData/`) for `AM`, `PM`,
  `hour12`, `toLocaleString(`, `toLocaleTimeString(` and a time-bearing
  `Intl.DateTimeFormat`. **Every remaining hit goes in the report** with why
  it is not a displayed time (a comment explaining history, an input
  parser). Date-only `toLocaleDateString` calls are out of scope (§1).

## 8. The web app's time-zone controls

- **`components/common/TimeZonePicker.jsx`** — one shared picker, used
  twice below. A popover with a search box over
  `Intl.supportedValuesOf('timeZone')`, each option labelled with its
  current UTC offset (`Asia/Dhaka · GMT+6`), value the IANA name. Optional
  `allowDefault` + `defaultLabel` add a first option whose value is `null`.
  It is a fixed local list, so it is not a `RecordPicker` (that is for
  server lists); match `RecordPicker`'s look. If you render Base UI's
  `<Select>` directly anywhere, pass `items` (`AGENTS.md`, part three).
  Mobile-first; `common/` components only; tokens from `globals.css`.
- **Settings › Company & Branding** (`CompanyBrandingSection.jsx`): a
  "Company time zone" field with that picker, wired through
  `SETTINGS_FIELDS.company` in `src/lib/settings.js` like the other company
  fields. Helper text: "What 'today' means for anyone who hasn't set their
  own — and, later, for the desk's due dates and daily lists."
- **My Account** (`components/account/ProfileCard.jsx`): "Your time zone",
  `allowDefault` with `defaultLabel` = `Company default (<companyTimeZone>)`,
  saved through the existing `useUpdateProfile` (`PATCH /auth/me`), null for
  the default. Payload rules from `src/lib/form.js` apply.
- **The browser check — `components/common/TimeZonePrompt.jsx`**, mounted
  once in `src/app/dashboard/layout.js` and once in
  `src/app/portal/layout.js`, beside `IdleLogoutWatcher` where it sits.
  After `/auth/me` answers: `browser =
  Intl.DateTimeFormat().resolvedOptions().timeZone`; `effective =
  me.timeZone ?? me.companyTimeZone`. If they differ and this browser has
  not already declined that same browser zone, show `ConfirmDialog`:
  "You seem to be in Europe/London. Use Europe/London time for your
  account? It is set to Asia/Dhaka." Yes → `useUpdateProfile` with
  `timeZone: browser`. No → remember the decline for that browser zone in
  `localStorage` (key `tj_tz_declined`, value the zone; every read and
  write in try/catch — it can throw). **Never change the zone without the
  person's yes.** Show nothing while `/auth/me` is loading.
- Side effects (toasts, invalidation) live in the hook, never the
  component (`AGENTS.md`, "Hooks own the side effects").

## 9. Tests

Backend, every case below must exist and pass:

- `time-zone.spec.ts` — §2's list.
- settings — `companyTimeZone` accepted, canonicalised, refused when
  invalid; absent from `brandingView`.
- auth — `updateProfileSchema` accepts a zone, `null`, and refuses an
  invalid name and a fixed offset; `getProfile`'s select includes
  `timeZone`.
- WhatsApp agent (fake timers) — the instructions carry `nowIn` of the
  user's zone when set, and of the company's when the user's is null;
  they no longer contain `UTC`.
- `set_my_timezone` — valid name → `updateProfile` called with the
  canonical name and the WhatsApp context, result carries `now`; `null` →
  company default; invalid → `{ error }` and `updateProfile` not called;
  dispatched **without** `canDo` (an account with an empty access map can
  still set its own zone), and no other tool can do that (assert every
  other definition has a module permission).
- `find_client` — `nextFollowUpAt` formatted in the zone, `timeZone`
  present.
- `email.merge` — `formatTime('14:30') === '14:30'`, `'09:05'` stays
  `'09:05'`, garbage → `null`.
- The existing "no log line contains the message or reply text" test still
  holds.

The frontend has no test runner; `npm run lint` and `npm run build` must
pass.

## 10. Docs (same pass) and done

- `AGENTS.md`:
  - "Every time is shown on a 24-hour clock": name the two formatters
    (`formatTime` in `lib/time.js`, `formatTimestamp` in `lib/archive.js`)
    and the backend's `email.merge.ts` `formatTime`, in one sentence.
  - "The WhatsApp assistant is one phone…": **one** bullet — the bot reads
    "today" in the asker's zone (own, else the company's), and
    `set_my_timezone` is the only `'own-account'` tool, changing nothing
    but the caller's own row through `AuthService.updateProfile`.
- `docs/MODULES.md` §26 map: the "Company timezone" row → reader
  "WhatsApp assistant ✅; desk rules (`todayUtc()`) ⬜", status 🟡.
- `docs/WHATSAPP_AI_INTEGRATION.md` §6: the "Timezone fix" row's state →
  `🔍 <date> — built by Codex, awaiting review`, with the test counts.
- `docs/MODULE_FEATURE_STATUS.md`: in "WhatsApp assistant (Super Admin)",
  move the timezone line from Waiting to Working as built (the desk rules
  stay waiting); under Settings, add the Company time zone line; under My
  Account / Auth wherever profile fields are listed, add "Your time zone".
- Do **not** edit `HANDOFF.md`.

Run and paste the output in your final message:

```
cd Backend
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report file and test counts
cd ../Frontend
npm run lint          # 0 errors
npm run build         # succeeds
```

Then a short report:

1. Files created / changed (one line each).
2. Every grep hit from §7 still showing `AM`/`PM`/`hour12`/a locale-free
   time, with why it stays.
3. Anything in this brief that did not match the code, and what you did.
4. Any decision you made that the brief did not cover.
5. Confirmation that nothing was committed, no database was touched and
   `.env` was not opened (`git status` output).
