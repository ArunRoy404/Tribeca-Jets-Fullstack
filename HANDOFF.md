# Handoff — starting a session on a new machine

Two parts: **get it running**, then **the prompt to paste**.

Written 24 September 2026, after client adjustments #5, #7 and #9 shipped.
Refreshed 28 September 2026 (Receivables, Operator Payments, Transactions and
Itineraries built; everything through Itineraries is committed and pushed to
`origin/roy`) — see "Where we are right now" in Part 2, which
is the part that goes stale fastest. **Update that paragraph (and this line) in
the same pass as any session that ships something**, rather than leaving the
next device to discover it from git log. (The previous refresh of this
paragraph said the agent portal was still uncommitted; by the time this pass
started, the whole tree through `4a7ffc9` was clean — that note had gone stale
without anyone updating it, which is exactly the failure this instruction
exists to prevent.)

---

## Part 1 — Get the project running

Nothing here is guessable, so do it in order.

```bash
git clone <your remote> Tribeca-Jets && cd Tribeca-Jets
git checkout roy          # the working branch, NOT main

# ---- Backend ----
cd Backend
cp .env.example .env      # then fill it in — see the table below
npm install
npm run db:generate       # the Prisma client is generated and gitignored — nothing compiles without it
npm run services:up       # Postgres + Redis via docker compose
npm run db:deploy         # applies every migration. NOT db:migrate — see below
npm run db:seed
npm run start:dev         # http://localhost:4000/api, docs at /api/docs

# ---- Frontend (second terminal) ----
cd ../Frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

### Filling in `Backend/.env`

Copied from `.env.example`, almost everything is already correct for local
development — the ports match `docker-compose.yml` (Postgres `5432`, Redis
**`6380`**, which is deliberate so it does not collide with a Redis you already
run). **Only two values must actually be changed:**

| Variable | What to put |
|---|---|
| `JWT_ACCESS_SECRET` | 32+ random characters. `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | 32+ random characters, **different from the access one** |

Everything else — `DATABASE_URL`, `REDIS_URL`, `STORAGE_DRIVER=auto`,
`AUTH_IDLE_TIMEOUT_MINUTES=10` — works unchanged. `Frontend/.env.local` needs
no edits at all.

**One more if you will run Newman:** set `RATE_LIMIT_MULTIPLIER=20`. A full
run signs in more times than the login limit (five per fifteen minutes per
IP) allows, so at `1` it fails from the first folder that logs in with a wall
of 429s that look like real failures. Leave it at `1` anywhere but your own
machine — production refuses to boot otherwise.

**Seeded accounts** all use the password `ChangeMe123!`:
`admin@`, `broker@`, `mark@`, `barry@`, `assistant@tribecajets.com`, and the
referral agent `agent@tribecajets.com`, who signs in to the portal at `/portal`.

### Things that will waste an hour if nobody tells you

| | |
|---|---|
| **`npm run db:migrate` hangs.** | `prisma migrate dev` is interactive and cannot run in an agent shell. Use `npm run db:deploy`. To *create* a migration: `npx prisma migrate diff --from-config-datasource prisma7.config.ts --to-schema prisma/schema --script`, write the output into `prisma/migrations/<timestamp>_<name>/migration.sql` with a header comment, then `db:deploy`. |
| **`npm run build` kills a running `start:dev`.** | `nest build` and the watcher fight over `dist/`. Start the dev server with `setsid nohup npm run start:dev > /tmp/api.log 2>&1 & disown` if you need both. |
| **`newman` is not installed globally.** | `npx newman run postman/… -e postman/Local.postman_environment.json`. `npm run test:api` assumes a global install. |
| **There is no `psql`.** | Query the database with a throwaway `.cjs` script **placed inside `Backend/`** (so it resolves `dotenv` and `pg`), never from `/tmp`. |
| **`pkill` returns 144** and breaks `&&` chains. Use `;`. |

### Verifying a change, end to end

```bash
cd Backend
npx tsc --noEmit                 # must be clean
npm run lint                     # oxlint --type-aware; must be 0
npm test                         # vitest
npx newman run postman/Tribeca-Jets-API.postman_collection.json \
  -e postman/Local.postman_environment.json      # run it TWICE; needs RATE_LIMIT_MULTIPLIER=20
# 27 Sep 2026 baseline: 157 requests / 85 assertions / 0 failures (before Trips).
# Since then: vitest 150/150 in 15 files; Newman NOT re-run after Empty Legs /
# Commissions / Referrals, and those three have no Postman folder yet.
# After any builder: cd postman && python rewrite_body_comments.py   (must run from postman/)
cd ../Frontend && npx eslint src/<what you touched> && npm run build
```

---

## Part 2 — The prompt

Paste everything between the lines into the first message of a new session.

---

> I'm continuing work on **Tribeca Jets Command Center**, a private-jet charter
> brokerage CRM. Next.js 16 **JavaScript** frontend, NestJS 12 **TypeScript
> ESM** backend, PostgreSQL + Prisma 7. Branch `roy`.
>
> **Read these before doing anything, in this order:**
>
> 1. `AGENTS.md` at the repo root — **in full**. It is the entire rulebook and
>    almost none of it is guessable from the code: ESM `.js` imports on a TS
>    source tree, no `.partial()` on update schemas, no `z.coerce.*` on
>    anything a form touches, 404-never-403 for rows outside scope, soft delete
>    everywhere with six archive columns, URL-as-source-of-truth for table
>    state, and a rule against storing any figure beside the parts it is
>    computed from. Every rule in it was written after something broke; treat
>    it as a list of mistakes already paid for.
> 2. `docs/CLIENT_ADJUSTMENTS.md` **§0** — the handoff brief. §0.0 is the
>    three-phase plan that governs the whole remaining project. §1 is what is
>    done and what is next.
> 3. `docs/MODULE_FEATURE_STATUS.md` — per module, what actually works today
>    and what is deliberately blank until its dependency ships. Read "The short
>    version" at the bottom first.
> 4. `docs/MODULES.md` — what each module is and why it sits where it does in
>    the build queue.
>
> **The three phases**, in my own framing, and the reason the order matters:
>
> - **Phase 1 — the client's adjustments.** Thirteen messages from the client,
>   reproduced verbatim in `CLIENT_ADJUSTMENTS.md` §3. All eleven are built;
>   #1 needs only a demo of the Archived tab. Everything from Empty Legs on
>   still needs its testing pass.
> - **Phase 2 — frontend changes.** Existing screens change and new screens get
>   built. Arrives as Figma links dropped mid-session, not a written spec. Two
>   redesigns have shipped this way — Build Itinerary (24 Sep) and Quotes
>   (25 Sep) — and nothing further is queued. Treat the next Figma link as
>   reopening phase 2 for that one screen.
> - **Phase 3 — backend, Postman and API integration**, module by module in
>   dependency order.
>
> The complication: **we already built thirteen modules end to end before
> phases 1 and 2.** Phase 2 may change the screens those modules were built
> against, so expect phase 3 to mean *revising shipped modules*, not only
> adding new ones. Do not start phase-3 work on a module whose screens phase 2
> is about to redesign.
>
> **Standing rules I care about most — these are absolute:**
>
> - **Never run `git commit` or `git push` unless I say so in that message.**
>   Approval of the work is not approval to commit. Leaving finished work
>   uncommitted is the correct resting state. When I do ask, commit in batches
>   split by concern, and stop at the push if credentials are missing rather
>   than working around it.
> - **Nothing is ever permanently deleted.** No hard delete, no endpoint that
>   offers one, anywhere.
> - **Never display a number the data did not supply.** No `||` fallback to a
>   plausible literal, no pre-filled default, no derived score. An honest em
>   dash beats a confident wrong figure — on a charter desk an invented safety
>   rating is the kind of thing that gets someone hurt.
> - **Don't delete components or modals until their whole module is finished.**
>   Screens still on dummy data are the specification, not dead code.
> - **If B references A, A ships first.** Never stub a foreign key with a
>   string "for now".
> - **When we touch a module, its dummy data dies in the same pass** — the
>   file, the store's copy, and every placeholder left in the JSX.
> - `Backend/postman/` is a deliverable. Every endpoint gets its entry, with a
>   captured example for every status it can return, in the same pass as the
>   code. Verify with newman, twice.
> - Keep `AGENTS.md`, `docs/MODULE_FEATURE_STATUS.md`, `docs/MODULES.md` and
>   `docs/CLIENT_ADJUSTMENTS.md` current **in the same pass as the code**. A
>   rule that lives only in a chat log is a rule the next session breaks.
>
> **How I want you to work:** like a senior engineer. Read the frontend before
> writing schema — the screens were built first and they are the
> specification. Tell me plainly when something I asked for is wrong, then
> build it the better way and say why in a sentence. Verify with real requests
> against real accounts, not by reading the code. Report what is actually true:
> if a check was skipped, say so; if something fails, show the output.
>
> **Where we are right now (28 September 2026):** everything through
> Tasks Board (#20) is committed and pushed to `origin/roy`; **Email
> Templates (#21) is built and uncommitted** — check `git status`. Run
> `npm run db:deploy` (nine new migrations since the last deploy, the last
> being `20260928200000_add_email_templates`), then `npm run db:seed` for the
> starter templates.
>
> Built on 28 Sep: **Receivables (#16)**, **Operator Payments (#17)**,
> **Transactions (#19)** — completing the financial modules — and
> **Itineraries (#12)**: `Itinerary`, one per trip, storing only what nothing
> else tracks (an FBO override on top of `Airport.assignedFbo`, arrival time,
> flight time, miles, catering, ground transport, a document photo, notes,
> confirm/send state) and reading aircraft, operator, route and the passenger
> manifest from the trip on every render rather than duplicating them — plus
> the second pass it owed Trips: `TripFlightInfoCard`, `TripFlightRouteCard`
> and `TripConfirmationCard` now read real data instead of the placeholder
> each had been carrying since before #12 existed.
>
> **How far it was verified:** Trips was tested live, in the browser and with
> Postman `15 · Trips`. From Empty Legs on, **no live testing by instruction**
> — only backend `tsc` / oxlint / vitest (185 tests, clean) and frontend
> eslint on the changed files (clean; nine older errors elsewhere, none in
> this pass's files), and frontend `npm run build`, which passes. Newman has
> **not** been run since 27 Sep, and Itineraries' Postman builder could not be
> run at all in this pass — no live server in the environment it was built in.
>
> **The queue, in order:**
>
> 1. My own testing pass over Empty Legs, Commissions, Referrals, the
>    portal and the commission terms on the team member form — sign in as
>    the seeded `agent@tribecajets.com` (re-run `npm run db:seed` first).
> 2. Run the six written-but-unrun Postman builders, oldest first:
>    `build_empty_legs_folder.py`, `build_commissions_folder.py`,
>    `build_referrals_folder.py`, `build_receivables_folder.py`,
>    `build_operator_payments_folder.py`, `build_transactions_folder.py`,
>    recapture `/auth/me`, the Users invite and `03 · Operators`' detail
>    example (`payments: []` is gone, `totalPaid` is real), then
>    `rewrite_body_comments.py` and Newman twice.
> 3. Itineraries (#12) needs the same: sign in, build a document from a saved
>    trip, confirm it, send it, edit it, archive and restore it, and check the
>    three second-pass cards on the trip detail page render real times once a
>    document exists. Then run `build_itineraries_folder.py` and fold
>    `22 · Itineraries` into the Newman pass above.
> 4. Schedule (#13) is built too (28 Sep, untested) — no migration. Check the
>    day, week, month and year views against real trips (a round trip shows
>    two legs), the filters in the URL, the tiles, and the flight panel's
>    links to the trip and itinerary. Then run `build_schedule_folder.py` and
>    fold `23 · Schedule` into the Newman pass above.
> 5. Flight Tracking (#14) is built too (28 Sep, untested) — **manual** by
>    decision, no provider. Check a report (status, estimate, link, note) on a
>    flight, that it lands on the flight's timeline, that a cancelled trip
>    refuses one, and the tiles. Then run `build_flight_tracking_folder.py` and
>    fold `24 · Flight Tracking` into the Newman pass above.
> 6. Tasks Board (#20) is built too (28 Sep, untested). Add a task with a
>    client, trip and checklist; move it across columns; tick items; check
>    the notification bell lists your due and overdue tasks; sign in as a
>    broker to check they see only tasks assigned to them or written by
>    them, and cannot archive someone else's. Then run `build_tasks_folder.py`
>    and fold `25 · Tasks` into the Newman pass above.
> 7. Email Templates (#21) is built too (28 Sep, untested). With no SMTP in
>    `Backend/.env` every send is recorded as **LOGGED** and printed to the API
>    log — check the toast and the Sent tab say "Not delivered". Add a
>    template with merge fields (a typo like `{client_nme}` must be refused);
>    email a client from the client page, a trip from its action bar, a quote
>    ("Email to Client", which marks it sent only on a real delivery), an
>    itinerary ("Email It") and an invoice ("Send Reminder"); check the email
>    appears on the client's and the trip's timelines and on the lead page.
>    Sign in as a broker: the library is read-only, and only their clients
>    can be emailed. Then run `build_email_templates_folder.py` and fold
>    `26 · Email Templates` into the Newman pass above.
> 8. Then Phase 3's queue: Document Vault (#22).
>
> **For the client:** the Archived-tab demo (#1), the rate data for #6, the
> FET-in-profit question, and each referral agent's commission figures
> (`CLIENT_ADJUSTMENTS.md` §5). A client update (`update-26-sep.txt`) and the
> production hosting list (`subscriptions.txt` — one Hostinger VPS; the
> Vercel / Render / Neon setup, with uploads on Backblaze B2, is temporary
> development hosting) are in the repo root.
>
> Start by reading the four documents above, then tell me what you understand
> the current state to be and what you think we should do next. Don't write any
> code until I confirm.

---

## Part 3 — What a new session must not get wrong

Short list of the things that have actually bitten, so they are not re-learned.

- **A referral agent is a partner, not staff.** Every staff permission is
  NONE for the role; the staff directory is behind `VIEW_TEAM`; its uploads are
  forced private; it reads SHARED notes only. Referral attachments reach the
  desk through `UploadsService.openVouched()`, the one sanctioned bypass of
  `mayRead` — never call it without resolving the owning record first. See
  `AGENTS.md`, "The referral agent is a partner".
- **Times are `"HH:MM"` on the wire and `@db.Date` values render in UTC**
  (`lib/time.js`, `formatCalendarDate` in `lib/date.js`). The time picker once
  sent `"08:00 AM"` and a follow-up with a time silently never saved.
- **A captured Postman example is not an assertion.** Newman runs a request's
  test script and never compares an example's label to its stored response, so
  a request that fails to provoke the error it is named for writes a lie that
  goes green for ever. Every builder's `example()` now raises on a mismatch
  (the last three mislabelled examples, in `10 · Quotes`, were fixed at the
  request on 26 Sep); copy it into any new builder, and place the folder with
  `collection_order.place_folder()` so the collection stays in serial order.
- **Validate a foreign key only when it changes.** Edit forms resend every
  field; a re-check on each save makes a record uneditable the day its airport
  or client is archived. Four modules had this until 26 Sep.
- **A seed must not depend on Postman debris.** The seed named an operator
  that only a Postman run had ever created, so on a fresh database it silently
  wrote nothing — anchor seed rows on rows the seed itself creates.
- **An endpoint must not accept a parameter it ignores**, and omitting the
  field from the schema is not enough — Zod strips unknown keys silently. See
  the `.strict()` note in `AGENTS.md`.
- **`z.date()` in a response DTO takes `/api/docs` down** with a bogus circular
  dependency error, nowhere near the DTO that caused it. Use `z.iso.datetime()`.
- **A `StreamableFile` must never be wrapped by `TransformInterceptor`.** The
  failure is invisible to a header-only test: status 200, right content type,
  wrong bytes. Compare bytes.
- **Money is integer cents, converted by parsing the decimal string, not by
  multiplying.** `1.005 * 100` is `100.49999999999999`.
- **Base UI's `Select.Root` needs an `items` prop to show a label after a value
  is picked**, or `Select.Value` falls back to printing the raw stored value.
  Bit every `<Select>` in the app at once. Fixed in the only two places
  `<Select>` is rendered directly (`PickerSelect.jsx`, `CommonSelect.jsx`) — a
  third direct render needs the same `items` prop.
- **A shared `PhotoTile` component** (`src/components/common/photo-tile/`) is
  now the one way to show a labelled, hover-to-zoom photo with a dashed empty
  state — Itineraries and Quotes both use it. Reach for it before hand-rolling
  a gallery tile again. `shrink-0` on its sizing class is load-bearing: an
  `aspect-ratio` tile with `overflow-hidden` collapses to near-zero height
  without it, inside a scrolling `flex-col` pane taller than the viewport.
