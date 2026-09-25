# Handoff — starting a session on a new machine

Two parts: **get it running**, then **the prompt to paste**.

Written 24 September 2026, after client adjustments #5, #7 and #9 shipped.
Refreshed 25 September 2026 — see "Where we are right now" in Part 2, which is
the part that goes stale fastest. **Update that paragraph (and this line) in
the same pass as any session that ships something**, rather than leaving the
next device to discover it from git log.

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

**Seeded accounts** all use the password `ChangeMe123!`:
`admin@`, `broker@`, `mark@`, `barry@`, `assistant@tribecajets.com`.

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
  -e postman/Local.postman_environment.json      # run it TWICE
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
>   reproduced verbatim in `CLIENT_ADJUSTMENTS.md` §3. Seven of eleven items are
>   done; #3's fleet-photo half is the only unblocked, undone piece left in it.
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
> **Where we are right now (25 September 2026):** the Quotes screen just got
> its client-requested Figma redesign — a full-screen create/edit form with a
> live document preview, a live pricing preview endpoint
> (`POST /quotes/price-preview`), and an aircraft photo field
> (`Quote.exteriorImageUrl`). That closes the quote/itinerary half of
> adjustment #3 and the UI half of #6. Full account in
> `CLIENT_ADJUSTMENTS.md` §4's 25 September entry.
>
> Two things are unblocked and small, if you want a quick win before Trips:
> **#3's fleet half** (add `Aircraft.photoUrl`, a `FileUpload` field on the
> Add/Edit Aircraft form — the pattern is already in `AddQuoteDialog.jsx`) and
> **demonstrating the Archived tab to the client for #1** (no code).
>
> The next real thing in the queue is **Trips (#11)** — not a client request,
> but the single largest unblocker: nine modules wait on it, plus the last
> piece of two adjustments already shipped (a notes timeline on a trip, and
> "used towards another trip" as a real foreign key instead of a sentence).
>
> Start by reading the four documents above, then tell me what you understand
> the current state to be and what you think we should do next. Don't write any
> code until I confirm.

---

## Part 3 — What a new session must not get wrong

Short list of the things that have actually bitten, so they are not re-learned.

- **Two second passes are owed the day Trips lands**, and both are written down
  rather than remembered: `Note` gains a `TRIP` subject type (one enum value,
  three lines in `notes.subjects.ts`, then render `NotesTimeline`), and
  `ClientCredit` gains a real `appliedToTripId`, deliberately absent today
  rather than stubbed as a string.
- **Five captured examples in `10 · Quotes` are mislabelled** — the status in
  the name disagrees with the response stored beside it. Left alone on purpose
  ("fix a module when we reach it"). The newer builders refuse to write one.
- **A captured Postman example is not an assertion.** Newman runs a request's
  test script and never compares an example's label to its stored response, so
  a request that fails to provoke the error it is named for writes a lie that
  goes green for ever. `build_notes_folder.py` and
  `build_client_credits_folder.py` raise on a mismatch; copy that `example()`
  into any new builder.
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
