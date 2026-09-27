# Client adjustments — specification, status and handoff

**Tribeca Jets Command Center.** Thirteen requests sent by the client in two
batches (24 August and 18 September 2026), reproduced verbatim, analysed, and
ordered by dependency.

**This file is the single source of truth for this workstream.** It replaces
`docs/Client_Adjustments.txt`, which held the raw messages and nothing else.
The original is not needed and has been deleted.

*Last updated: 27 September 2026.*

---

## 0. Handoff brief — read this first if you are new to this work

You are picking up a workstream mid-flight. Everything you need to continue is
in this section and the two documents it names. Nothing important lives only in
a chat log.

### 0.0 The three phases — the shape of the whole remaining project

This is the repository owner's plan, in his own framing. It governs what order
everything happens in, and **it had been living only in a chat log**, which is
exactly the failure this document exists to prevent.

| | Phase | State |
|---|---|---|
| **1** | **The client's adjustments.** The thirteen messages in §3, built in the dependency order in §2. | **10 of 11 done** — #3, #6 and #10b completed 27 Sep, after Trips, Empty Legs and Commissions were pulled forward from Phase 3 to unblock them. **In progress: #11** — the role, the API and the desk's Referrals page are built; the agent's own portal is not. #1 needs only its demo. See §1. |
| **2** | **Frontend changes.** Existing screens change, and new screens that do not exist yet get built. | **Done for the two screens the client's Figma redesigns targeted** — the Build Itinerary preview (24 Sep) and the Quotes form + live preview (25 Sep). See the 25 September entry in §4. No further phase-2 item is queued; if he sends another redesign it reopens this phase for that screen only. |
| **3** | **Backend + Postman + API integration**, module by module, in dependency order. | **Partly done — and that is the complication.** |

**The complication, stated by the owner and worth understanding before you
touch anything:**

> *"before doing 1 and 2 we already did some modules, fully and partially. and
> after doing the 1 and 2, the architecture may update, so for the step 3 we
> might need to start doing and refactoring from the start."*

So thirteen modules are already wired end to end (see
`MODULE_FEATURE_STATUS.md`), and phase 2 may change the screens those modules
were built against. **Expect to revise shipped modules rather than only adding
new ones.** That is the plan working, not scope creep — the same thing
`AGENTS.md` says about the schema not being designed up front.

Two consequences that are easy to get wrong:

- **Do not start phase 3 work on a module whose screens phase 2 will redesign.**
  Read the phase-2 change list first. Building an API against a screen that is
  about to change is how the work gets done twice.
- **Phase 1 is not blocking phase 2.** The remaining adjustments are either
  #11's agent portal, deferred by the client, or a conversation rather than code
  (see §1). Nothing in phase 1 is both unblocked and independent of the phase-2
  redesign.

**Where phase 2's specification lived:** nowhere written down — it arrived as
Figma links dropped into a session, not a doc. Two redesigns came through that
way and both shipped:

- **Build Itinerary** — a full-screen form with a live document preview,
  24 September 2026.
- **Quotes** — the same full-screen-with-live-preview treatment, plus the
  fields the Figma redesign added (an aircraft exterior photo, a live pricing
  preview), 25 September 2026. See the entry in §4.

No further phase-2 item is queued as of this update. If another redesign link
arrives, treat it as reopening phase 2 for that one screen — read the change
list off the Figma file the same way these two were, and log it here in the
same pass as the code, per §0.7.

### 0.1 What the project is

A private-jet charter brokerage CRM. Two apps, deployed separately:

| | Stack | Notes |
|---|---|---|
| `Frontend/` | Next.js 16, **JavaScript** | Not TypeScript. Deliberate and settled. |
| `Backend/` | NestJS 12, **TypeScript**, **ESM** | `"type": "module"`; every relative import ends in `.js`. |
| Database | PostgreSQL + **Prisma 7** | Driver adapters; multi-file schema at `Backend/prisma/schema/*.prisma`. |

**Never migrate the frontend to TS or the backend to JS.**

### 0.2 The documents that govern this work

Read these before writing code. They are not optional background.

| File | What it is |
|---|---|
| **`AGENTS.md`** (repo root) | **The whole rulebook.** One file, three parts: everywhere / backend / frontend. Every convention below is stated there in full, with the incident that produced it. |
| **`docs/MODULE_FEATURE_STATUS.md`** | Per module: what is wired end to end today, and what is deliberately blank until its dependency ships. **Updated in the same pass as every module.** |
| **`docs/MODULES.md`** | What each module is and why it sits where it does in the queue. |
| **`docs/Tribeca_Jets_Command_Center_Team_Scope.docx`** | The signed scope. The baseline, and not always right — §13 specifies MongoDB for a database that is relational throughout, and §17 lists twenty-two decisions still open. Where it and the build disagree, say so and continue under a stated assumption. |
| **This file** | The client's adjustments: specification, status, order. |
| **`HANDOFF.md`** (repo root) | Setting the project up on a new machine, the commands that hang, and the prompt to open a new session with. |

### 0.3 Standing constraints — these are absolute

These came from the client or the repository owner directly. Breaking one is
not a style disagreement.

1. **Never run `git commit` or `git push` unless the user says so in that
   message.** Approval of the *work* is not approval to commit. Leaving
   finished work uncommitted is the correct resting state. When asked, commit
   in batches split by concern, and stop at the push if credentials are
   missing rather than working around it.
2. **There is no permanent delete anywhere in this system**, and no endpoint
   that offers one. Removing a record archives it (`deletedAt`); it can always
   be restored.
3. **Do not delete any component or modal until its whole module is finished.**
   Screens still on dummy data are not dead code — they are the specification.
4. **When a module is wired to its API, its dummy data dies in the same pass** —
   the file in `src/dummyData/`, the store's copy, and every placeholder left
   in the JSX. Never display a number the data did not supply.
5. **If B references A, A ships first.** Do not reorder the queue in §2 because
   an item looked quick. That is how a foreign key becomes a string.
6. **Build to the screens he redesigns, not ahead of them.** Quotes and
   Itinerary were held back at his request until his UI changes arrived; both
   redesigns shipped (24 and 25 Sep 2026), so neither is deferred any more.
   What remains of #6 waits on his rate data, not on a screen. See §3, items 3
   and 6.

### 0.4 Conventions you will trip over if you do not know them

The full reasoning for each is in `AGENTS.md`. This is the short list of the
ones that bite first.

**Backend**

- **ESM.** Every relative import ends in `.js`, even though the source is `.ts`.
- **vitest + oxlint**, not jest + eslint. `npm test` runs `vitest run`.
- **`@nestjs/throttler` and `nestjs-zod` do not support Nest 12.** `RateLimitGuard`
  and `createZodDto` are hand-rolled. Do not add either package back.
- **Never build an update schema with `.partial()`** — it does not remove
  `.default()`, so absent fields arrive carrying defaults and get written.
  Write update schemas out longhand, every field `.optional()`, no defaults.
- **Never `z.coerce.number()` or `z.coerce.date()`** on anything a form touches.
  `Number('')` is `0`; `z.coerce.date()` accepts `true` as 1 Jan 1970. Use
  `common/dto/numbers.ts` and `common/dto/dates.ts`.
- **DTOs document themselves.** `createZodDto` publishes OpenAPI through
  `_OPENAPI_METADATA_FACTORY`. Never hand-write schema metadata.
- **Three authorization layers, kept separate**: global `JwtAuthGuard` →
  `@RequirePermissions` + `PermissionsGuard` → **row-level scope in the service,
  never in a guard.**
- **404, never 403, for a row the caller may not see.** A 403 confirms the row
  exists and turns any id into an oracle. 403 is for "your role cannot do this
  at all".
- **`findOne` loads archived rows** (the Archived tab links to it); writes go
  through a private `findLive`.
- **Every model carries four audit columns and six archive columns**, set from
  the session and never from the request body.
- **`prisma migrate dev` is interactive and fails in this environment.** Use:
  `npx prisma migrate diff --from-config-datasource prisma7.config.ts --to-schema prisma/schema --script`,
  hand-edit the output, then `prisma migrate deploy`.

**Frontend**

- **URL is the source of truth for table state** — every tab, page, filter,
  sort and search term. Use `useTableQueryParams`
  (`src/hooks/common/useTableQueryParams.js`); never hand-roll `useSearchParams`.
- **Server data comes from React Query, never from a zustand store.** A store
  may hold client-only state (which dialog is open); nothing the server owns.
- **A control's value is the wire format; its label is for reading.** Enums
  travel as `SCREAMING_SNAKE_CASE`; dates travel as `YYYY-MM-DD`. This rule
  exists because `CommonDatePicker` emitted `"Aug 12, 2026"` and silently broke
  date saving in four modules.
- **Hide controls a role cannot use, never disable them.** `usePermissions()`
  reads the matrix the API ships with `/auth/me`.
- **Responsiveness is mandatory.** Tables get a card view below `lg`, not
  horizontal scroll. Stat tiles go 2-column on mobile, not 1.
- **Never hardcode a colour, radius or shadow** — tokens live in
  `src/app/globals.css`. Light theme only.

**Both**

- Every list endpoint is paginated and returns `{ success, data, meta }`.
- Auth is **httpOnly cookies only**. No token ever reaches JavaScript.
- `Backend/postman/` is a deliverable. Every endpoint gets its entry, with a
  real captured example for every status it can return, in the same pass as the
  code.

### 0.5 Commands

```bash
# Backend  (cwd: Backend/)
npm run start:dev          # dev server on :4000, API prefix /api
npm test                   # vitest run
npm run lint               # oxlint --type-aware
npm run build              # nest build
npm run db:deploy          # prisma migrate deploy  (NOT db:migrate — interactive)
npm run db:seed
npm run test:api           # newman — the Postman collection must pass before a module is done

# Frontend  (cwd: Frontend/)
npm run dev
npm run build              # must be clean before calling a screen done
```

Swagger: `http://localhost:4000/api/docs`. Seed password: `ChangeMe123!`.
Seeded accounts include `admin@`, `broker@`, `mark@`, `barry@` and
`assistant@tribecajets.com`.

There is no `psql` in this environment. Query the database with a short `.cjs`
script placed **in `Backend/`** (not `/tmp`) using `dotenv` + `pg`.

### 0.6 Git state at handoff

Branch **`roy`**, `origin/roy` up to date through `07f608f` (the
26 September audit, in six commits) as of 27 September 2026. **The working
tree is not clean:** all of the 27 September work — #3's fleet photos and photo
library, #6's suggested price and estimate, the Postman fixes, Trips, Empty
Legs with #10b, Commissions, and #11's referral work so far (§4) — is
uncommitted, because nobody has asked for a commit yet. Five new migrations
(`20260927090000` … `20260927160000`) must be deployed before the API starts
against an existing database. Commits are pushed only when the
user asks for it in that message — a session ending with unpushed work
committed locally is the normal resting state, not a problem to fix. Check
`git status` and `git log origin/roy..HEAD` on pickup rather than trusting this
paragraph, since it goes stale the moment the next session commits.

### 0.7 Keeping this file current is part of the work

- **Tick the box in the same pass as the code.** A box ticked later is a box
  ticked from memory.
- **When an item is partly done, say which part.** Several of these split across
  a dependency that has not shipped. Write the remainder down under the item
  rather than ticking it optimistically.
- **The client's words are the specification, and they are quoted, not
  paraphrased. Do not edit a quote.** Where the analysis disagrees with him —
  items 1 and 9 both do — the disagreement is stated in the item, not resolved
  silently.
- **New requests append to §3** with the same treatment: quoted in full,
  analysed, placed in the order.

---

## 1. Status at a glance

| # | Request | Backend | Frontend | State |
|---|---|---|---|---|
| — | Upload infrastructure | ✅ | ✅ | **Done, rebuilt 23 Sep.** Consumed by #7's document folders, the quote photo (stored on the quote) and the Build Itinerary form (uploads real, itinerary itself not yet saved — no backend). Still unblocks 3's fleet half and 11. |
| 1 | Client stays visible after a broker deletes it | ✅ | ✅ | **Already works.** Needs a demonstration, not code. |
| 2 | Operator cancellation policies | ✅ | ✅ | **Done** 19 Sep 2026. |
| 3 | Aircraft pictures + stock image library | ✅ | ✅ | **Done** 27 Sep 2026. Quote and itinerary picture-picker (25 Sep), fleet photos on every aircraft, and a **photo library** on every photo field — pick any photo already on file, with the chosen aircraft's own photos offered first. |
| 4 | Ten-minute idle logout | ✅ | ✅ | **Done** 19 Sep 2026. |
| 5 | Notes on a timeline | ✅ | ✅ | **Done** — Clients 23 Sep, Trips 27 Sep 2026 (and Referrals, as the Agent Updates). |
| 6 | Instant quote calculator | ✅ | ✅ | **Done** 27 Sep 2026. Suggested-price selector, plus the **Instant Estimate**: pick two airports and a party size, get flight time and cost for every aircraft size from **the desk's own rate table** (Rates tab), then markups and "Start a quote". Rates are empty until the desk enters them — nothing is invented. |
| 7 | A document folder per user (tax forms) | ✅ | ✅ | **Done** 23 Sep 2026. |
| 8 | "Active trip request" section | ✅ | ✅ | **Done** 19 Sep 2026 — same as 10a. |
| 9 | Client credit / money on account | ✅ | ✅ | **Done** 24 Sep 2026, as a ledger; the trip link (`appliedToTripId`) landed with Trips on 27 Sep. |
| 10a | Trip request page | ✅ | ✅ | **Done** 19 Sep 2026. |
| 10b | Empty-leg matching against past requests | ✅ | ✅ | **Done** 27 Sep 2026, with the Empty Legs module. Not live-tested; no Postman folder yet. |
| 11 | Referral Agent role and partner portal | ✅ | ◐ | **In progress.** Role, permissions, referrals, commissions, resources, Agent Updates and the desk's Referrals page built 27 Sep 2026. **Left:** the agent portal (`/portal`), commission inputs on the team member sheet, Postman. Not live-tested. |

---

## 2. The build order

Dependency-first, as `AGENTS.md` requires. Cheapest unblocker at the top.
**Do not reorder this to suit a session.**

| # | Item | Why here |
|---|---|---|
| 1 | ~~**Upload endpoints**~~ ✅ 19 Sep, rebuilt 23 Sep 2026 | One piece of infrastructure, four dependants: 7, 11 Resources, 11 attachments, 3's foundation. |
| 2 | ~~**#2 Operator cancellation policy**~~ ✅ 19 Sep 2026 | Took a textarea, not a column. |
| 3 | ~~**#8 / #10a Trip requests page**~~ ✅ 19 Sep 2026 | Frontend only — the API was already finished. |
| 4 | ~~**#4 Ten-minute idle logout**~~ ✅ 19 Sep 2026 | Enforced on both sides. |
| **5** | **#1 Demonstrate the Archived tab** | **No code.** Five minutes on the next call with him. |
| 6 | ~~**#7 User document folders**~~ ✅ 23 Sep 2026 | A Documents tab on the team member sheet, over a folder query rather than a second table. |
| 7 | ~~**#5 Notes timeline**~~ ✅ 23 Sep 2026 | Polymorphic, so Trips gets it for one enum value. #11's Agent Update field is the `visibility` flag, built with it. |
| 8 | ~~**#9 Client credit ledger**~~ ✅ 24 Sep 2026 | Client-scoped, as planned. The trip link landed with Trips, 27 Sep. |
| 9 | ~~**#3 (quote/itinerary half) — picture-picker**~~ ✅ 25 Sep 2026 | Shipped with the Quotes Figma redesign (phase 2). See §4. |
| 10 | ~~**Trips**~~ ✅ 27 Sep 2026 | Not a client request — #5's trip timeline and #9's trip link waited on it. |
| 11 | ~~**#10b Empty-leg matching**~~ ✅ 27 Sep 2026 | Built with the Empty Legs module. |
| **12** | **#11 Referral Agent portal** | **In progress.** Commissions ✅ and the desk half ✅ 27 Sep; **next: the agent portal.** |
| — | ~~**#3**~~, ~~**#6**~~ ✅ 27 Sep 2026 | Both complete. #6's rate table is empty until the desk fills it in. |

---

## 3. The requests

Every message the client sent, in full. Blockquotes are his words verbatim.

---

### ✅ 1. A client stays visible to an admin even after a broker deletes it

> Hi for when a broker like mark for example adds a client in the CRM I wanna
> make sure I will always see that client - even if mark deletes the client .

**Status: already built. This needs a demonstration, not code.**

There is no hard delete anywhere in the system and no endpoint that offers one.
Removing a client stamps `deletedAt` and `deletedById`; an admin with `ALL`
scope sees it in the **Archived tab**, together with who removed it and when,
and can restore it.

His word "deletes" suggests he expects the record to be gone and is asking for
a safety net that is already under him. **Walk him through the Archived tab.**

☐ The item is ticked when he has seen it — not when someone has read this
paragraph.

---

### ✅ 2. Operator cancellation policies — **DONE 19 Sep 2026**

> For operator section, can we add a section for cancellation policies? I want
> to be able to copy and paste each operators cancellation policy to their
> profile

"Copy and paste" is the whole specification: free text, not a structured
penalty schedule. See §4 for what shipped and why the column already existing
was not the same as the feature working.

---

### ✅ 3. Aircraft pictures and a stock image library — **DONE 27 Sep 2026**

> And are you gonna add a section for aircraft pictures? It would be cool to
> have a stock image database for when you have to add pics to quote or
> itinerary / and to be able to upload pics from operator email to use for
> quote or itinerary

He names the consumers himself — quote and itinerary.

**This one splits, and the split matters.**

- ✅ **The foundation shipped** (§4, Uploads). `POST /api/uploads/image`
  returns a URL.
- ✅ **The quote consumer shipped 25 Sep 2026**, with the Quotes Figma
  redesign — a `FileUpload` field on the quote form stores the URL in
  `Quote.exteriorImageUrl`, previewed through the shared `PhotoTile` component.
  See §4.
- ◐ **The itinerary consumer uploads for real but saves nowhere.** The Build
  Itinerary form (24 Sep 2026) puts its two photos, logo and operator PDF
  through `POST /api/uploads/*` and previews them with `PhotoTile` — but
  Itineraries has no backend, so the finished itinerary lands in a zustand
  store and is gone on reload. The photos are safe on the server; the record
  pointing at them is not. Closes when Itineraries gets its API.
- ✅ **The saved quote shows its photo** (26 Sep 2026) — an Aircraft Photo
  card on the quote detail page. Before that it appeared only inside the edit
  form's preview.
- ✅ **The fleet photos shipped 27 Sep 2026.** Every aircraft carries an
  exterior and an interior photograph (`Aircraft.exteriorImageUrl` /
  `interiorImageUrl`), uploaded from the Add/Edit Aircraft form — before the
  tail exists, on a new one — and shown in a Photos card on the aircraft
  detail page. See §4.
- ✅ **The "stock image database" shipped 27 Sep 2026, as a photo library.**
  Every photo field — quote, itinerary exterior/interior, aircraft
  exterior/interior — offers "or choose from the photo library": every
  `PUBLIC` image already uploaded, searchable, previewable, newest first. On a
  quote the chosen aircraft's own fleet photos are offered first. It is a
  *view* over the uploads already stored, not a second table — the photos were
  on the server all along; what was missing was a way to pick one again
  instead of re-uploading it from the operator's email. See §4.

Thumbnails and image resizing are deliberately deferred until a screen renders
enough images at once to need them.

---

### ✅ 4. Automatic logout after ten idle minutes — **DONE 19 Sep 2026**

> Can we also make this CRM automatically logout within 10 minutes if it's not
> being touched? For security purposes

**"Not being touched" means user activity, not network activity** — a dashboard
polling in a forgotten tab must still log out. See §4 for the four
non-obvious requirements this implies and how each is met.

---

### ✅ 5. Notes on a timeline, for trips and clients — **DONE 23 Sep 2026 (Clients)**

> Also, in the trip section and client CRM section, I want to make sure there
> is a section where I can write notes and add it to a "timeline"
> Do u know what I mean?
>
> I have it on my old CRM

**Status: shipped for Clients on 23 September 2026. Order item 7.**

The Activity tab on the client detail page is the timeline. See §4 for what was
built and the three decisions behind it.

**The trip half shipped 27 September 2026** with Trips — `NoteSubjectType.TRIP`
and the same `NotesTimeline` on the trip detail page, as planned.

---

### ✅ 6. Instant quote calculator with a suggested-price selector — **DONE 27 Sep 2026**

> Also, I want to add an instant quote calculator . I want to be able to put in
> size of plane, airports and such and it give is an estimate of what it could
> cost. I can help with the data or we can use AI, but I want it added- and
> then on this it can have a "suggested price" option where I can select
> different percentages that can make me determine price to client.
>
> We can go over all of this on phone

Pure Quotes. The percentage selector is a markup control over the pricing
engine that already exists in
[quotes.pricing.ts](../Backend/src/modules/quotes/quotes.pricing.ts).

**The Quotes UI this was waiting on shipped 25 September 2026** — the
full-screen form now has a live pricing preview
(`POST /quotes/price-preview`), computed by that same `priceQuote()` engine
against draft inputs before anything is saved. That closes the UI half of this
request.

**The suggested-price selector shipped 27 September 2026.** It did not need
his data after all — a markup is a percentage over the operator's cost, which
the desk already types. Enter the operator cost on the quote form and it shows
the base price at +10 / 15 / 20 / 25% plus any custom percentage, and what
each totals to the client with FET and extras. One click fills the base
price. Every figure comes from `POST /quotes/suggested-price`, which runs the
same `priceQuote()` as a saved quote; the percentage itself is not stored. See
§4.

**The *estimate* half shipped 27 September 2026 — without inventing a
number.** It was a data question before it was a build question: he offered
to supply rates, and scope §18 says AI must not be the source of truth for
financial calculations. So the estimate is built on a **rate table the desk
fills in** — per aircraft size: dollars per flight hour, average speed, typical
seats and an optional minimum billed hours. The only computed input is the
great-circle distance between the two airports' coordinates. A size with no
rate says **"No rate on file"**, never $0 and never a guess. When his numbers
arrive, they go into the Rates tab — no code change. See §4.

**Assumption, stated because he could not be asked:** an estimate is
flight time × hourly rate per leg, with a minimum billed time. Positioning
legs, overnight fees and winds are not modelled, and the screen says so. If
his formula differs, it changes `charter-rates.estimate.ts` and nothing
else.

---

### ✅ 7. A document folder per user, for tax forms — **DONE 23 Sep 2026**

> I want there to be a folder for each broker that I can attach tax forms to
> For example, a broker (mark) makes a commission with us, we need to give him
> a 1099 tax form. I want to be able to add that form into his own personal
> folder.
>
> So each user has a folder that we can add documents to

**Status: ✅ done 23 September 2026.** See §4.

The folder is a **query, not a second table** — every live document filed about
that person. So removing the document and removing the file are one act, with
no join row to keep in step.

Barry cannot read Mark's 1099, and cannot learn it exists: the API answers
**404, not 403**. Verified live with three real accounts.

---

### ✅ 8. "Active trip request" — a page for trip requests — **DONE 19 Sep 2026**

> If you can pls add a section to CRM called "active trip request"

> Just a section where we can mark down anytime someone gives us a trip request

and again on 18 September, as **10a**:

> Trip request page:
> I want there to be a whole page for just trip requests. We get a lot of trip
> requests. But most never get booked. We still want to have access to those
> trip request data just in case in future when we have empty legs that can
> match a previous trip request, we can still contact that client to let them
> know.

He sent the same request twice, five weeks apart, which is why it was pulled
forward. The page exists at `/dashboard/trip-requests` — see §4.

**"Most never get booked, but we still want the data"** is precisely why the
module archives rather than deletes, and why `LOST` is a status rather than a
removal. That part was already right before he asked.

**The empty-leg half of this message is a separate item — see #10b.**

---

### ✅ 9. Client credit / money on account — **DONE 24 Sep 2026**

> For clients - I want a section on their profile that says "credit/money on
> account". So let's say they cancel a trip and they want to keep the money
> they paid on account with us, we can enter how much that is and can always
> edit that number or select if it was used towards another trip.

**Status: shipped 24 September 2026, as a ledger. Order item 8.**

The Credit tab on the client detail page. See §4 for what was built. The
reasoning below is kept because it is the argument to make to him, and because
it is the decision a later session would otherwise quietly undo.

**Built as a ledger, not a number — a place where the build deliberately does
not do literally what was asked.**

He says "edit that number", but he also says "select if it was used towards
another trip", and those two together are **credits and applications**: rows,
with a balance derived from them.

A single editable balance field loses *why* it changed. On a charter desk, a
client's credit dropping from $18,000 to $6,000 with nothing saying which trip
consumed it is an argument waiting to happen. It is also the exact shape
`AGENTS.md` already forbids: **a stored figure beside the parts it is computed
from.** The balance is a `SUM` over the ledger, computed on read.

**Raise the difference with him in a sentence** — he gets the edit he asked
for, on a row, and an audit trail he did not know to ask for.

**✅ "Used towards another trip" is a real link since 27 September 2026.**
Shipped client-scoped first, with deliberately no reference string; the
`appliedToTripId` foreign key landed with Trips, and the credit form picks from
the client's own trips.

**Still to raise with him:** (a) the ledger itself, which is more than he asked
for and needs one sentence of explanation; (b) whether a **refund** — money
actually paid back out — is a movement the desk needs. It is deliberately not
built: recording one today means an APPLICATION whose reason says so.

---

### ✅ 10b. Empty-leg matching against past trip requests — **DONE 27 Sep 2026**

> ...just in case in future when we have empty legs that can match a previous
> trip request, we can still contact that client to let them know.

**Status: shipped 27 September 2026, with the Empty Legs module. Order item 11.**

Every empty leg lists every trip request on the same route — **including lost,
converted and archived ones**, which is the point of the request — with the client's
phone and email; requests within ±3 days of the leg come first. See §4.

The matching itself is a route-and-date query against archived and lost trip
requests — cheap, once there is something to match against. The trip requests
side is already correct for it: `LOST` is a status rather than a removal, and
nothing is ever destroyed, which is the whole reason the data he wants kept is
still there.

---

### ◐ 11. Referral Agent role and partner portal — **IN PROGRESS**

> Please create a new CRM user type called Referral Agent. This role should
> have very limited access and function more like a simple partner portal than
> access to the full Tribeca Jets CRM.

**Status: in progress. Order item 12 — last.** The role, the permissions, the
referral / commission / resource API, the Agent Updates and the desk's
Referrals page shipped 27 September 2026 (§4). **Not built: the portal
itself** — the five screens below and their navigation. Until it exists, do
not invite a referral agent.

**The largest item on this list by a distance — effectively a second product.**
It should be built last of these, not first.

His full specification, verbatim:

#### Dashboard

> Referral agents should only see information related to their own referrals:
>
> * Total referrals submitted
> * Active referrals
> * Trips booked
> * Completed trips
> * Pending commission
> * Total commission earned
> * Total commission paid

#### Submit Referral

> Create a simple referral submission form with:
>
> * Client name
> * Phone
> * Email
> * Departure airport
> * Arrival airport
> * Departure/return dates
> * Departure time
> * Passenger count
> * Aircraft preference
> * Approximate budget
> * Notes
> * Attachment/upload option
>
> Every referral should automatically be tagged internally with:
>
> Referral Source: [Referral Agent Name]

#### My Referrals

> Referral agents should only be able to view clients/referrals that they
> personally submitted.
>
> Show a simple trip/referral status:
>
> Submitted → Contacted → Quoting → Booked → Completed
>
> Additional statuses:
>
> Lost / Cancelled
>
> Referral agents should NOT see internal CRM notes.
>
> Add a separate Agent Update field that Tribeca brokers/admins can
> intentionally share with the referral agent, for example:
>
> "Client has been contacted and we are currently sourcing aircraft."

#### Commission Center

> Referral agents should be able to view commissions associated only with their
> referrals.
>
> Display:
>
> * Client/trip
> * Trip date
> * Commission structure
> * Estimated commission
> * Final commission
> * Status: Pending / Earned / Paid
> * Payment date
>
> Admin should be able to assign a different commission structure to each
> referral agent, including:
>
> * Percentage of Tribeca profit
> * Flat fee
> * Custom commission amount
>
> Ad admin should be able to go in an set a commission on this as well.

#### Resources

> Create a simple Resources section containing documents/materials uploaded by
> Tribeca Jets, such as:
>
> * Tribeca Jets brochure
> * Aircraft category guide
> * Referral program terms
> * Marketing materials
> * Contact information

#### What a referral agent must never see

> Referral agents should have no access to:
>
> * Other Tribeca clients
> * Other referral agents
> * Operator database
> * Operator contact information
> * Wholesale/operator pricing
> * Tribeca markup
> * Tribeca profit
> * Broker commissions
> * Accounting
> * FET reporting
> * Quote inbox
> * Internal CRM notes
> * Operator sourcing information
> * Operator reliability information
> * Full trip calendar
> * Company revenue/reporting
> * Any trips or clients not associated with their referrals

#### Navigation

> The referral agent portal should only display:
>
> Dashboard | Submit Referral | My Referrals | Commissions | Resources
>
> This user role should be completely separated through permissions from the
> existing Admin and Broker CRM roles.

#### What this actually costs

- **A new `REFERRAL_AGENT` role** in `UserRole`, and a full row in the matrix at
  `Backend/src/common/authorization/permissions.ts`. The seventeen-item deny
  list maps cleanly onto the three authorization layers already built —
  `VIEW_FINANCIALS` already gates markup, operator cost and margin, and the
  `OWN` scope already means "rows I created". This part is cheap *because* the
  groundwork exists.
- **A new `Referral` model** with its own status ladder. `Submitted → Contacted
  → Quoting → Booked → Completed` is **not** the Trip Request ladder and must
  not be forced into it — a referral's "Contacted" has no equivalent in
  `OPEN / SOURCING / QUOTED`, and merging them would make one screen lie about
  the other.
- **The Agent Update field** — a deliberately shareable note, sitting beside
  internal notes the agent must never see. **Design it with #5.**
- **Commission Center** — the Commissions module has a frontend folder and no
  backend. Per-agent structures (percentage of profit / flat fee / custom).
  Note that "percentage of Tribeca profit" reads `grossProfit`, which is the
  figure `VIEW_FINANCIALS` hides from this very role: the agent sees their
  commission, never the profit it was derived from.
- **Resources** — file upload again, already built: `PUBLIC` documents, listed
  by whatever record the portal keeps for them. (This line used to say
  `category=RESOURCE`; categories were removed in the 23 Sep rebuild — see §4.)
- **A separate navigation shell**, since the portal shows five items and none
  of the CRM's.

**Dependencies: Trips ✅, Commissions ✅ and file upload ✅ — all shipped.**

---

## 4. Completed work log

Kept in full. A later session needs to know *why* a thing was built the way it
was, not only that it exists.

### ✅ File upload — 19 September 2026, **rebuilt 23 September 2026** · order item 1

Not a request of the client's in its own right; the single piece of
infrastructure four of his requests were queued behind.

**Built twice, and the second version is the one to read.** The first keyed
every file to a `FileCategory` that decided who could read it. Two things were
wrong with it, and both were found by looking at what step 2 is about to add:

- **A category was required at upload time**, so a photograph could not be
  attached to an aircraft that did not exist yet. That is the ordinary shape of
  a create form — pick the picture, then save.
- **Every new upload button needed a new enum value and a migration**, and the
  frontend work ahead adds a lot of upload buttons.

It was replaced before any screen consumed it, so nothing was migrated and no
real data existed.

**What exists now**

```
POST /api/uploads/image      jpg · png · webp · gif        15 MB  →  images/
POST /api/uploads/document   pdf · docx · xlsx · csv · txt 25 MB  →  documents/
GET  /api/uploads/:id        streams the bytes
GET  /api/uploads/:id/meta   describes it without downloading
DELETE /api/uploads/:id      archives the record, keeps the bytes
POST /api/uploads/:id/restore
```

**A screen uploads, gets a URL, and stores that URL on whatever record it was
editing.** Nothing in the upload path knows what a file is *for* — that is the
business of the record holding the URL — so a new upload spot anywhere in the
product needs no backend change.

- **The content type is read from the bytes, never the upload header.** A PNG
  announced as `application/pdf` is stored as a PNG; HTML named `.pdf` is
  stored as `text/plain` and served as an attachment with `nosniff`, so a
  browser downloads it instead of running it on the API's own origin. SVG,
  archives and legacy `.doc`/`.xls` are refused outright — the first executes
  script, the second hides its contents from any check, and the last two are
  byte-identical at the header.
- **Files go into the folders the client asked for**, content-addressed as
  `images/<sha256>.png`. No date folder: a date would put the same bytes in two
  places on two days and defeat deduplication.
- **Re-uploading a file returns the one already on file** — `deduplicated:
  true`, the original id, nothing written. Scoped per uploader, so one person's
  delete is never a side effect on another's record. Self-healing: if the
  object has gone missing the bytes are rewritten rather than a dead URL
  returned.
- **The stored URL is relative** (`/api/uploads/<id>`). An absolute URL
  captured at upload time embeds whatever host was running then, so every row
  written in development would point at localhost for ever.
- **Archiving leaves the bytes alone**, because a restore that could not hand
  back the same file would not be a restore — and the object may be shared with
  another user's row.

**Verified:** 42 live assertions on a clean database · 42 unit tests · Newman
122 requests / 56 assertions / 0 failures, passing alone and twice in a row,
leaving **0 live rows** behind.

**One serious bug found and fixed on the way.** `TransformInterceptor` wraps
every response in `{ success, data }` — including a `StreamableFile`. So every
download served `{"success":true,"data":{"options":{},"stream":{}}}` where the
file should have been. **The old download route shipped with this**, and it was
"verified" by checking the status code and the headers, which were all correct;
only the bytes were wrong. Any test of a streaming route now has to compare the
returned bytes against the file that was uploaded.

⚠️ **Known gap, deliberately open: per-file access control.** A file is
reachable by anyone with a session. Correct for photographs and brochures,
**wrong for a 1099** — which is request #7, and where it must be fixed. The
columns were left out rather than added unenforced, because a schema that
advertises a protection nothing checks is worse than one that admits the gap.
**Closed by #7 the same day:** `visibility` (default `PRIVATE`) and
`ownerUserId` — see the Broker document folders entry below.

**What this did *not* include: any screen.** None consumed it on 23 Sep. Since
then: #7's Documents tab, the quote photo (25 Sep) and the Build Itinerary
form's uploads (24 Sep) — see §1.

### ✅ Operator cancellation policies — 19 September 2026 · order item 2

**Most of it was already built** — the `cancellationPolicy` column, the DTO on
create and update, both selects, the mapper, the form field and a CANCELLATION
POLICY card on the operator profile. What was missing was the two words he
emphasised: *copy and paste*.

The field was a **single-line `<input>`** placeholdered "48 hours Notice". A
real policy is pasted out of an operator's email as a tier per line:

```
More than 30 days prior to departure: 10% of the charter price.
14-30 days prior: 25%.
72 hours to 14 days: 50%.
Less than 72 hours: 100%, non-refundable.
```

Pasting that into a one-line input loses the line breaks on the way in, and the
profile card rendered whatever survived as one run-on paragraph. **A 50% band
read as a 25% one over the phone is what this prevents.**

**What changed**

- The form field is a full-width, resizable textarea with a realistic
  multi-line placeholder, so pasting is the obvious thing to do with it
- The profile card renders `whitespace-pre-line`, so tiers stay tiers — and the
  Notes card beside it, which had the same bug, with it
- The cap went from 2,000 to 5,000 characters. A tiered policy plus a
  force-majeure clause exceeds 2,000; it is now sized like a quote's `terms`
  rather than like `paymentTerms`, which really is "Net 30"
- The dialog's two hand-styled `<textarea>` blocks became one `DialogTextarea`,
  extracted on the second copy rather than pasted a third time

**Verified:** 9 live assertions — a pasted policy survives create, detail read,
list read (which is what the edit form prefills from) and clearing; 3,000
characters is accepted where it used to be refused; 5,001 is still refused.
Newman 127 / 56 / 0, and the Operators folder passes alone.

---

### ✅ Trip requests page — 19 September 2026 · order item 3

The request he sent twice (#8 and #10a).

**The API was already finished** — ten endpoints, the
`OPEN → SOURCING → QUOTED → CONVERTED / LOST` ladder, archive and restore, bulk
actions, broker scoping — and so was the frontend's data layer. What did not
exist was the screen. Trip requests were only reachable *inside* Leads & Agents,
which is why he kept asking for them to have a place of their own.

**Three tabs, which is his sentence turned into a control**

| Tab | Sends | Why |
|---|---|---|
| **Active** (default) | `openOnly=true` | "active trip request" — the enquiries still in play |
| **All Requests** | `openOnly=false` | "most never get booked... we still want the data" |
| **Archived** | `archived=true` | rows that should not have been filed at all |

One URL field drives all three, because a request cannot be both the live
working list and the archive — two fields would let a link express a state the
tab strip cannot show.

**The action the page leads with is Mark as Lost, not Remove.** A lost enquiry
leaves the Active tab and stays in the log, which is exactly what makes it
findable when an empty leg matches it later (#10b). Archiving is offered too,
and both the row menu and the bulk dialog say to prefer Lost.

Also: stats tiles (total, open, sourcing, quoted, converted, pipeline value),
search, five filters, a mobile card view below `lg`, bulk archive and restore,
and a sidebar entry between Leads & Agents and Quotes — the order of the
pipeline.

**Permissions:** an enquiry is a stage of a trip, so it borrows the trips
permissions as the API does. A broker files and edits their own; only an
administrator archives. The checkbox column follows `DELETE_TRIPS`, so a role
that cannot act on a selection does not get one.

**Key files:** `Frontend/src/app/dashboard/trip-requests/` ·
`src/templates/TripRequestsPage.jsx` · `src/components/table/trip-requests/` ·
`src/components/trip-requests/TripRequestForm.jsx` ·
`src/hooks/trip-requests/useTripRequestTableParams.js`.

**Two pre-existing bugs found and fixed on the way**

1. **`CommonDatePicker` emitted `"Aug 12, 2026"`** — a string every date field
   on the API rejects with "Use a YYYY-MM-DD date". Quotes, leads, aircraft
   maintenance and sourcing requests all pass that value straight to the
   server, so **none of their dates could be saved at all**. It now speaks
   `YYYY-MM-DD` in and out and formats the label for reading only, the same
   split as enums. It also opened on a hardcoded August 2026, offered a
   hardcoded "Today (Aug 12)", and highlighted the 1st, 10th and every teens
   date together because it matched by substring. All four fixed in one place.
   **This silently repaired date entry in four other modules.**
2. **The sourcing dialog and this page were about to be two copies of the same
   twelve-field form.** Extracted `TripRequestForm` and moved sourcing onto it
   in the same pass.

**Verified:** 18 live assertions — every tab, every filter, dates round-tripping
through create/edit/clear, and Mark as Lost leaving Active while staying in the
log. `next build` clean, oxlint clean, Newman 127 / 56 / 0.

**Still open:** #10b, matching those kept requests against empty legs.

---

### ✅ Broker document folders — 23 September 2026 · order item 6

> "I want there to be a folder for each broker that I can attach tax forms to.
> For example, a broker (mark) makes a commission with us, we need to give him
> a 1099 tax form."

**A folder is a query, not a second table.** Mark's folder is every live upload
whose `ownerUserId` is Mark. A join table would have earned its place if one
file needed filing in several folders under different labels; nothing asks for
that, and the table would then be a second row to keep in step every time a
document was removed.

**Two columns carry the whole access rule**, added to the upload row:

| | |
|---|---|
| `visibility` | `PUBLIC` (any signed-in user) or `PRIVATE`. **Defaults to PRIVATE.** |
| `ownerUserId` | One extra person who may read a private file. |

The default direction is the point. Failing closed means the mistake is "the
brochure needs a flag", which somebody notices in a minute; failing open means
a 1099 was readable by everyone and nobody noticed at all.

**Barry cannot read Mark's 1099, and cannot learn that it exists.** Failed
reads answer **404, not 403** — including on remove. A 403 would confirm the
document is there, which turns a staff list into a register of who has been
paid. Verified with three real accounts: Mark downloads his own, Barry gets 404
on the file, 404 on the metadata, 404 on the remove, and it is absent from both
his list and his filtered list.

**Filing into somebody else's folder needs `MANAGE_USERS`**, or any broker
could drop a document into any other broker's folder.

**What shipped**

- `GET /api/uploads` — paginated, searchable, scoped on the way out;
  `?ownerUserId=` opens one person's folder
- `visibility`, `ownerUserId` and `label` on the upload routes
- The access rule as **pure functions** in `uploads.access.ts`, with a test
  that walks every combination of owner and uploader asserting the SQL filter
  admits exactly what the row check admits — a list that shows what a fetch
  refuses is the same leak, one page earlier
- **A shared `<FileUpload />`** in `components/common/`, which is the component
  every later upload screen uses. Built here rather than inside the tab, because
  the second copy is the bug
- A **Documents tab** on the team member sheet — upload, download, remove,
  restore, and a Current / Removed toggle

**One bug the dedup change fixed before it shipped.** The key was
`(uploader, checksum, kind)`, so filing the same PDF for Mark and then for
Barry would have returned *Mark's row* — one document in two people's folders.
It is now keyed on the owner and the visibility too.

**Verified:** 26 live assertions across three accounts · 52 unit tests · Newman
123 requests / 60 assertions / 0 failures, twice in a row and passing alone ·
upload, download and the folder query all exercised **through the Next proxy**,
the path the browser actually takes · `next build` clean · 0 live rows left.

---

### ✅ Notes timeline — 23 September 2026 · order item 7

> *"in the trip section and client CRM section, I want to make sure there is a
> section where I can write notes and add it to a 'timeline'"*

**Shipped for Clients.** The Activity tab on the client detail page — which was
a props-fed list of hand-built objects with a TODO on top — now reads the API.

**Three decisions, and each one is the thing a later session would otherwise
redo wrongly.**

**1. `Client.notes` stays, and the timeline is a separate table.** The obvious
move is to migrate that string in as the first note and drop the field. It was
not done, and the reason is that the two answer different questions: the
sidebar's "Internal Notes" is the standing summary — *what do I need to know
about this person* — and the timeline is *what happened, and when*. Merging
them would either lose the summary or turn every edit of it into a new entry.
The field is already labelled "Internal Notes" in the sidebar, so nothing on
screen had to change.

**2. Polymorphic, not a `clientId` column.** `subjectType` + `subjectId`. Trips
do not exist yet and neither do the four other records that will want a
timeline; a `clientId` here means a second table the day Trips ships, and then
two note systems with different columns, different permissions and two screens
drifting apart. Adding TRIP is one enum value and three lines in
`notes.subjects.ts`.

The price is a column no foreign key can check, so **the service checks it by
asking the module that owns the subject** — `ClientsService.subjectRef`, which
applies the same broker scope clients apply everywhere else. That is what makes
*"you may read this note if you may read its client"* true rather than merely
intended, and it is why a note on another broker's client answers **404**
rather than 403 on every route including remove.

**3. It reads alongside the audit log, which already had half of it.** Status
changes, reassignments and archives are the timeline entries nobody has to
remember to type. `GET /notes/timeline` merges both, newest-first, and each row
carries `kind: NOTE | EVENT` so the two are drawn differently — a note is a
statement by a person and carries their name and their controls; an event is a
fact the system logged and carries neither.

Paged across two tables **without a UNION**: `skip + take` from each, merged,
sliced. That is exact rather than approximate — the nth newest row overall
cannot be older than the nth newest of either source — and it keeps the
row-level rule readable at its call site. The merge is a pure function with
tests that walk the page boundaries, because the failure mode there is one
entry appearing twice while another disappears, and a merge exercised only by a
screen with four rows on it is a merge nobody has tested. Both queries and the
merge break ties on `id`, or two rows written in the same millisecond swap
places between pages.

**#11's *Agent Update* field was built here, not later.** *"A separate Agent
Update field that Tribeca brokers/admins can intentionally share with the
referral agent"* is a note with a flag on it. `visibility` is INTERNAL by
default — the same direction upload visibility defaults to PRIVATE, and for the
same reason: failing closed costs a minute, failing open puts desk commentary
in front of the person who referred the client. **It filters nobody today**,
deliberately, because REFERRAL_AGENT does not exist; the day it does, its read
scope is `visibility: SHARED` and nothing else changes.

**Editing is the author only, administrators included** — narrower than every
other update in this system. The timeline renders a note under the name of
whoever wrote it, so an edit anyone else can make is a statement they did not
write attributed to them. An administrator who disagrees withdraws it and
writes their own, which leaves both visible. Withdrawing is wider (author *or*
administrator) for exactly that reason: moderation does not put words in
anybody's mouth, and the note stays readable under Withdrawn with the trail of
who removed it.

**Backend:** `prisma/schema/note.prisma` + migration
`20260923160000_add_notes_timeline` · `modules/notes/` — controller, service,
`notes.subjects.ts` (the subject registry, one `case` per type),
`notes.timeline.ts` (the merge, pure) · no `@RequirePermissions` on the
controller, deliberately and explained there: which permission applies depends
on `subjectType`, a query-string value a decorator cannot see.

**Frontend:** `services/notes.service.js` · `hooks/notes/` (6 hooks) ·
`lib/timeline.js` (event wording, relative time — an unmapped action is
*humanised*, never guessed at) · `components/notes/` — `NoteComposer`,
`TimelineEntry`, `NotesTimeline` · `ClientActivityTab` rewritten to render it.
`NotesTimeline` takes `subjectType`/`subjectId`, so the trip detail page
renders the same component unchanged.

**Postman:** `12 · Notes` — 9 requests, 24 captured examples, a teardown that
withdraws both probes *and* archives the client it wrote them on, and a folder
login so it passes run alone.

**Six defects found on a second audit and fixed** — worth listing, because five
of them passed the first round of checks:

1. **`PATCH /notes/:id` accepted an empty body**, answering 200 with the note
   unchanged and stamping `updatedById` — a write that reported success, did
   nothing, and claimed an edit nobody made. Every other module carries the
   `.refine(Object.keys(value).length > 0)` this one was missing.
2. **The timeline accepted `?search=`, `?sortBy=` and `?sortOrder=` and honoured
   none of them**, inherited from `paginationSchema`. Omitting the fields only
   made Zod *strip* them, so a caller still got 200 and the whole timeline back
   believing they had filtered. The schema is now `.strict()`.
3. **Notes could be written on an archived client.** Reads must work there — the
   Archived tab links to the page — but authoring must not, which is the split
   `findOne`/`findLive` make everywhere else.
4. **Postman's `400 · Empty body` example held a 200**, captured before fix 1.
5. **Postman's `403 · Not the author` example held a 404**, because the probe
   client had no assigned broker, so the broker attempting the edit could not
   see the client at all and 404'd before the author check was ever reached.
   The example documented behaviour the API does not have.
6. **Newman could not catch 4 or 5**: a captured example is not an assertion.
   The builder now refuses to write an example whose label disagrees with the
   status it just received. Auditing the whole collection this way found **five
   more in `10 · Quotes`** — left alone, per "fix a module when we reach it".

**Verified:** 48 live assertions across four real accounts (a broker writes on
their own client and gets 404 on another's — list, timeline, write, read-by-id
and withdraw; an assistant reads the timeline and gets 403 writing; an
administrator cannot edit somebody else's note but can withdraw it; a closed
record refuses new notes and edits while still opening and still allowing
moderation; the timeline refuses all three parameters it does not honour;
walking the merged timeline two at a time reproduces it exactly, no row twice
and none lost) · run twice, clean both times · 75 unit tests · `tsc` clean ·
oxlint 0 · Newman **133 requests / 70 assertions / 0 failures**, twice, and the
folder alone at 12/10/0 · every example's label checked against its captured
status · write and read exercised **through the Next proxy** · `next build`
clean · rendered at **375 / 768 / 1440** with zero horizontal overflow, and the
assistant's read-only view confirmed to render no composer and no row actions ·
0 live probes left.

---

### ✅ Client credit ledger — 24 September 2026 · order item 8

> *"For clients - I want a section on their profile that says 'credit/money on
> account'. So let's say they cancel a trip and they want to keep the money
> they paid on account with us, we can enter how much that is and can always
> edit that number or select if it was used towards another trip."*

**Built as a ledger rather than the single editable number he described**, and
his own sentence is the argument: "edit that number" and "select if it was used
towards another trip" are two different kinds of movement. A single field loses
*why* the figure changed, and a balance dropping from $18,000 to $6,000 with
nothing saying which trip consumed it is an argument waiting to happen. He
still gets the edit he asked for — it lands on a row, which is what gives it a
trail.

It is also the shape the schema forbids everywhere else: a stored figure beside
the parts it is computed from. **There is no `balance` column.** It is summed
on every read, in one place, exactly as a quote's total is.

**Four decisions, each one a thing a later session would otherwise redo
wrongly:**

1. **The direction is a column, never a minus sign.** `amount` is always
   positive; `type` is CREDIT or APPLICATION. A signed column invites `-5000`
   typed into a credit, which reads as a credit and behaves as an application,
   and nothing on screen tells them apart.
2. **The arithmetic is integer cents**, in `client-credits.balance.ts`, as pure
   functions with tests. `0.1 + 0.2` is `0.30000000000000004`, and a ledger is
   nothing but repeated addition. The conversion **parses the decimal string
   rather than multiplying** — `1.005 * 100` is `100.49999999999999`, so
   multiplying loses the cent before `Math.round` ever runs. That was found by
   a test, not by reading the code.
3. **An application cannot overdraw the account**, checked on create, on edit
   and **on restore**. The last one matters: a $12,000 application withdrawn in
   March and restored in June lands on whatever the account holds now, so
   without it a withdraw-and-restore walks straight around the rule. On edit it
   is measured against the ledger *excluding the row being edited*.
4. **`occurredAt` is not `createdAt`.** A trip cancelled on the 3rd and entered
   on the 9th is dated the 3rd. The audit column still records the typing, and
   the ledger sorts by the movement.

**Access is two questions, kept apart.** `VIEW_FINANCIALS` decides whether a
role sees money at all — an assistant holds NONE and never learns what a client
is holding, even for a client they can otherwise read (403). *Which* clients is
the clients module's own scope, reached through `ClientsService.subjectRef`, so
another broker's ledger answers **404**. The Credit tab is hidden rather than
shown and refused.

`money()` was added to `common/dto/numbers.ts` and `formatMoney` was lifted out
of `lib/lead.js` into a new `lib/money.js` — three modules were already
importing a money formatter from the leads file — with a re-export so no
existing caller changed. `formatMoneyExact` is new beside it: a balance is an
amount somebody is owed, and rounding $6,000.40 to "$6,000" makes the profile
and the bank statement disagree with nothing explaining why.

**Still outstanding, deliberately:** the trip link. "Used towards another trip"
has nothing to point at until Trips ships, and a reference string would be a
column the database cannot check — what `Client.homeAirport` cost when it held
an ICAO string. `reason` carries it as text for now.

**Verified:** 35 live assertions across four real accounts (the client's own
$18,000/$12,000 example balancing to $6,000; one cent too much refused and the
available figure named; spending exactly to zero allowed; an edit raised to the
whole credit but not past it; an assistant 403 on both read and write; another
broker 404 on the ledger, the summary, an entry by id and a withdrawal; a
restore refused when the account has moved on beneath it; an archived client
readable and not writable) · 109 unit tests · `tsc` clean · oxlint 0 · Newman
**143 requests / 81 assertions / 0 failures**, twice, and the folder alone at
12/11/0 · every example label checked against its captured status · rendered at
**375 / 768 / 1440** with zero horizontal overflow · the tab confirmed absent
for an assistant · 0 live probes left.

---

### ✅ Ten-minute idle logout — 19 September 2026 · order item 4

**Both halves, because either alone is a half-measure.**

**The browser keeps the precise timer** (`Frontend/src/hooks/common/useIdleLogout.js`),
and four things about it are deliberate:

- **"Touched" means a person, not the network.** Only real input counts, so a
  dashboard polling in a forgotten tab still signs out. `mousemove` is
  excluded — a trackpad nudged by a sleeve is not someone working.
- **A sleeping laptop fires no timers.** Nothing is scheduled for the deadline;
  a one-second tick compares the clock against a stored stamp, so waking after
  three hours signs out immediately rather than eventually.
- **Tabs share a session.** The stamp lives in `localStorage`, so working in one
  tab keeps the others alive instead of an idle one signing everybody out.
- **A minute's warning**, with a countdown and "I'm still here". Signing out
  silently loses a half-written quote.

**The server refuses to refresh a session that has been idle past the limit**
(`Backend/src/modules/auth/token.service.ts`, `hasBeenIdle`), so switching the
timer off in the browser does not buy an endless session. The signal is the age
of the refresh-token row: a rotation only happens once the access token has
expired, so a session in continuous use presents a row at most one
access-token lifetime old, while an abandoned one keeps ageing. Deliberately
approximate and always in the user's favour — it never signs out someone who
was active.

`JWT_ACCESS_TTL` dropped from 15m to 10m to match, and
`AUTH_IDLE_TIMEOUT_MINUTES` (default 10) is configurable.

**The limit is shipped from `/auth/me`** as `session.idleTimeoutMinutes`, not
from the frontend's own env — the same reasoning as the permission matrix. A
second copy of the number would drift from the server's, silently.

The sign-in screen says *why*, from a closed set of reasons
(`?reason=idle`). Without it, being signed out for inactivity is
indistinguishable from being signed out by a bug, and the second reading is the
one people reach for.

**Key files:** `Frontend/src/hooks/common/useIdleLogout.js` ·
`src/components/common/IdleLogoutWatcher.jsx` (mounted once in
`app/dashboard/layout.js`) · `src/app/(auth)/sign-in/page.js` ·
`Backend/src/modules/auth/token.service.ts` · `auth.controller.ts`.

**Verified:** a 19-minute-old session still refreshes; a 25-minute-old one is
refused with "Signed out after a period of inactivity", and the refusal kills
the session rather than declining one request. 34 tests, Newman 127 / 56 / 0.

---

### ✅ Quotes redesign + live preview, and the quote/itinerary picture-picker — 25 September 2026 · phase 2, order item 9 (#3 quote/itinerary half)

**The Figma link he dropped mid-session** (node `1057-47064`) redesigned the
Quotes form as a full-screen create/edit modal with a live document preview —
the same shape the Build Itinerary form got the day before — and added two
fields the old form didn't have: an aircraft exterior photo, and a running
price preview as the numbers are typed.

**Backend, because the preview had to be real, not re-derived in JS:**

- **`Quote.exteriorImageUrl`** — a nullable relative `/api/uploads/<id>` URL,
  same rule as every other stored upload URL in this system: never absolute,
  or every row written in development points at localhost forever.
- **`POST /quotes/price-preview`** — takes the same four inputs a quote
  actually stores (`basePrice`, `fetEnabled`, `fetRate`, `operatorCost`,
  `lineItems`) and runs them through the *same* `priceQuote()` function
  `quotes.pricing.ts` uses for a real save. `AGENTS.md`'s rule that a computed
  figure is worked out in exactly one place applies to a preview too — porting
  the arithmetic to frontend JavaScript "just for the preview" is exactly the
  kind of second copy that drifts the first time a rounding rule changes.
  Gated behind `VIEW_FINANCIALS` the same way the saved quote is: an assistant
  previewing a draft still doesn't see margin.
  (Caught by the Postman capture step: it returned 201 by default: fixed with
  an explicit `@HttpCode(HttpStatus.OK)`, since a preview creates nothing.)

**Frontend — and a correction mid-build worth recording, because it's the
kind of mistake this file exists to stop repeating:**

- The first pass built a custom preview pane — its own oversized photo box,
  a hand-rolled `AttributeChip` for the stat row. **Wrong**, per the project's
  own reuse rule: `QuoteDetailStats` already renders exactly those fields
  (client, route, aircraft, total price, expiry) and was dropped in as-is; the
  itinerary form already had a hover-to-zoom photo tile, so that markup was
  pulled out into a new shared **`PhotoTile`** component
  (`src/components/common/photo-tile/`) rather than growing a second,
  slightly different copy — and `ItineraryPreview` was migrated onto it in the
  same pass, per "extract on the second copy, not the first."
- The rest of the preview pane reuses the quote detail page's own cards
  verbatim (`QuoteBreakdownCard`, `FlightDetailsCard`,
  `QuoteProfitabilityCard`, `QuoteNotesCard`, and — only when editing a real
  quote — `QuoteVersionsCard`/`QuoteStatusActionsCard`), fed a
  `previewQuote` object shaped exactly like `toQuoteRow()`'s output.
  Debounced against `useQuotePricePreview`.
- **Mobile regression fixed the same round:** the itinerary gallery's photo
  labels were overflowing and hiding the images on an iPhone 14 Pro / Pixel 7
  Pro comparison the client-side testing turned up. Root cause was `aspect-ratio`
  + `overflow-hidden` losing its automatic-minimum-size floor inside a
  `flex-col` pane taller than the viewport, collapsing the tile toward zero
  height; fixed with `shrink-0` on `PhotoTile`'s shared sizing class, plus a
  smaller mobile label (`aspect-4/3 sm:aspect-384.5/182`, `text-[10px]
  sm:text-[16px]`).
- **A real app-wide bug found along the way:** every `<Select>` in the app
  (via `PickerSelect`/`CommonSelect`) displayed the raw stored id instead of
  its label the moment something was picked — traced into `@base-ui/react`'s
  source to find `Select.Root` needs an `items` prop to resolve labels from.
  One line in each of the two wrapper components fixed it everywhere, not just
  on the Quotes form that surfaced it.

**Key files:** `Backend/prisma/schema/quote.prisma` ·
`Backend/src/modules/quotes/{dto/quote.dto.ts,quotes.service.ts,quotes.controller.ts}`
· `Frontend/src/components/quotes/AddQuoteDialog.jsx` ·
`Frontend/src/components/common/photo-tile/PhotoTile.jsx` ·
`Frontend/src/hooks/quotes/useQuotePricePreview.js` ·
`Frontend/src/components/{trips/PickerSelect.jsx,common/CommonSelect.jsx}`.

**Not verified with `newman`** — no network access in this environment to
install it. Verified instead with a manual pass over the captured Postman
JSON, matching every example's leading status code against its stored `code`.
Run `npm run test:api` for real before calling this module's Postman folder
done. **Done 26 Sep 2026** — see the next entry.

### ✅ Whole-project audit — 26 September 2026 · not a client request

A full pass over both apps and these documents, run against a live stack
(fresh database, seeded, every bug reproduced on the original code before it
was fixed and re-checked after). **Uncommitted at the time of writing.**

**Backend — every one reproduced with a real request first:**

- **A broker could not save any edit to their own client** (403). The edit
  form resends `assignedBrokerId`, and the reassign guard fired on its
  presence rather than on a change. It now fires only when the value differs,
  and the frontend hides the broker picker from anyone without `ALL` scope.
- **Client edits could not clear anything.** `companyName`, `email`, `phone`,
  `birthday`, `notes` and `assignedBrokerId` were `.optional()` without
  `.nullable()`, so a `null` was a 400 and an emptied box stayed filled.
- **Four modules re-validated every foreign key on every save**, against the
  rule `AGENTS.md` already stated — Clients (home airport), Trip Requests
  (client), Operator Quotes (aircraft) and Quotes (all eight links). Archiving
  a dependency made its dependants uneditable. Each now checks only a link
  whose value changes.
- **`DELETE /quotes/:id` answered 200 with the row**; every other module
  answers 204 with no body. Now 204.
- **`Quote.exteriorImageUrl` accepted any string**, including absolute URLs
  and external links, breaking the relative-upload-URL rule. Now validated by a
  shared `uploadUrl` (`common/dto/uploads.ts`, 7 tests). *This reverses a code
  comment that called external links deliberate — flagged to the owner.*
- **The seed never wrote its third operator quote.** It named an operator
  ("Solairus Aviation") that existed only as Postman debris, and its summary
  line printed a hardcoded "3". Now uses a seeded operator and counts.

**Postman:**

- **The three mislabelled examples in `10 · Quotes` are fixed at the request,
  not the label.** The assistant read now uses an unassigned probe quote, so it
  really returns 200. Every builder now asserts label against status.
- **Folders stay in serial order** — new `collection_order.py`, used by all
  seven builders. Previously the last builder to run moved its folder to the
  end.
- **Aircraft and Trip Requests now pass run alone** (pre-request fetches), and
  the aircraft probe tail no longer collides across runs.
- A `400 · Photo is not an upload URL` example.

**Frontend:**

- **One `lib/form.js`** (`optionalText`, `optionalNumber`) replaces seven
  private copies — sends `null` on edit so a cleared box clears, and never
  sends `NaN`.
- **One `BROKER_ROLES`** in `lib/roles.js` replaces eight copies, which
  disagreed about whether an admin counts.
- **Hidden, not refused:** the broker picker (clients, leads, follow-up),
  Assign Broker / Remove / Restore on the leads table, and every write on the
  lead detail page for roles without write access or on an archived lead.
- **Editing a travel-agent lead no longer makes it a direct client** — type and
  status are sent on create only.
- **Invented values removed:** the airport notes "Primary departure airport
  for NYC clients." and FBO "Signature Flight Support" fallbacks; `USA`
  pre-filled on new airports; the itinerary builder's pre-filled route (incl.
  the non-airport `KTTB`), catering, car, FBO, client, times, "Passenger N"
  names and random passport numbers; the itinerary store's default tail,
  aircraft, operator, date and times; the stock jet photo on new itineraries.
- **The notification bell's fake alerts** moved out of the component into
  `dummyData/notifications.js` + `useNotificationsStore`.

**Verified:** backend `tsc` 0 · oxlint 0 · vitest 116/116. Frontend eslint 0 on
every touched file · `next build` passes. Newman on a freshly created database:
**149 requests / 81 assertions / 0 failures, twice**, every folder also passing
alone, no live debris left behind. (149, not the 143 some older counts show:
the new pre-request fetches are counted as requests.)

**Found and deliberately not changed — owner's call:**

- Twelve components nothing imports (`aircraft/AircraftDetailHeader`,
  `airports/AirportCardsContainer` — which imports a file that does not exist
  — `clients/ClientDetailHeader`, `empty-legs/EmptyLegCardsContainer`,
  `flight-tracking/FlightTrackingStats`,
  `leads-agents/AgentAssignedLeadCardsContainer`, `LeadOverviewCards`,
  `LeadSidebarCards`, `operators/OperatorDetailHeader`,
  `quotes/header/QuoteStatCard`, `quotes/QuoteDetailHeader`,
  `transactions/TransactionsStats`). Not deleted, per §0.3 #3.
- Render's `STORAGE_DRIVER=local` loses every upload — 1099s and quote photos
  now, not just avatars — on each deploy. See `DEPLOYMENT.md`.
- **Not yet done:** the 375 / 768 / 1440 browser check of the changed screens.


### ✅ Fleet photos — 27 September 2026 · #3's fleet half

The last buildable piece of #3. He asked for "a section for aircraft pictures"
and to "upload pics from operator email to use for quote or itinerary".

- **Two columns, not one `photoUrl`**: `Aircraft.exteriorImageUrl` and
  `interiorImageUrl`. The earlier plan said a single `photoUrl`; two is what
  the consumers show — the quote carries an exterior shot, the itinerary an
  exterior and an interior — and naming them like `Quote.exteriorImageUrl`
  means a photo moves between records without a mapping. Migration
  `20260927090000_add_aircraft_photos`, nullable, no backfill.
- **Validated by the shared `uploadUrl`**: only a relative
  `/api/uploads/<id>` is accepted; an absolute or external link is a 400.
  `null` on update removes a photo and leaves the uploaded file alone.
- **Frontend:** a Photos section on the Add/Edit Aircraft form (two upload
  dropzones, `PUBLIC` because fleet photos go on documents every broker
  sends), and a **Photos** card at the top of the aircraft detail page's right
  column — `PhotoTile` with hover-to-zoom and a lightbox over the photos that
  exist, and a dashed "No exterior photo on file" for an empty slot, never a
  stock picture of another airframe. The card switches between one and two
  columns on its own width (a container query), because a viewport breakpoint
  put two 176 × 82 px tiles side by side at tablet width.
- **Postman:** both fields in the `07 · Aircraft` create/update bodies, and a
  captured `400 · Photo is not an upload URL`.

**Verified:** real requests — created with both photos (201), external link
and absolute URL refused (400), interior cleared with `null` (200), both
returned by list and detail. Browser at 375 / 768 / 1440: photos load in the
card and in the edit form, no horizontal scroll; an aircraft without photos
shows two empty slots and no image. Backend `tsc` 0, oxlint 0, vitest
116/116; frontend eslint 0, `next build` passes. Newman 149 / 81 / 0 twice,
`07 · Aircraft` alone 14 / 4 / 0; 306 examples, 0 mislabelled.

**Not done in this entry:** picking one of the fleet's photos *onto* a quote
or itinerary — that shipped the same day as the photo library, next entry.


### ✅ Photo library and suggested price — 27 September 2026 · #3 complete, #6's selector

**#3 — the photo library** ("a stock image database for when you have to add
pics to quote or itinerary").

- **A view, not a table.** Every `PUBLIC` image already uploaded is the
  library: `GET /uploads?kind=IMAGE&visibility=PUBLIC`. One new query filter,
  `visibility`, that only ever narrows — the caller's own read rule still
  applies on top, so a private upload never appears in anyone else's picker.
- **One shared picker** (`components/common/photo-library/`), wired into the
  shared uploader as an optional `library` prop — every existing caller
  unchanged. On: the quote photo, both itinerary photos, both aircraft photos.
  Search by file name, paged, each photo previewable (`ImagePreview`) and
  chosen with its own button, so looking and choosing are separate clicks.
  A picked photo comes back as the same relative URL an upload returns.
- **The chosen aircraft's own photos come first** on the quote form ("From
  this aircraft"), so the fleet photos from earlier the same day are one click
  from any quote on that tail.
- A new public image refreshes the library straight away.

**#6 — the suggested-price selector** ("a 'suggested price' option where I can
select different percentages").

- **`POST /quotes/suggested-price`** — given `operatorCost` and 1–8
  `markupRates` (0.15 = 15%), returns each suggested base price and its FET,
  extras and total through `priceQuote()`. `suggestBasePrice()` in
  `quotes.pricing.ts`, 4 new tests. Needs `MANAGE_TRIPS` **and**
  `VIEW_FINANCIALS` — a markup over cost is the margin, and an assistant gets
  403. A rate of `15` (meaning 15%) is refused as the typo it is.
- **On the quote form**, under the operator cost (financial roles only):
  +10 / 15 / 20 / 25% cards and a custom-% box, each showing the base price and
  the total to the client; one click fills the base price, which stays
  editable. The component does no arithmetic of its own. The presets are
  control options, not data — change the list in `SuggestedPricePicker.jsx`
  if the desk works in other steps.
- **Not built: the estimate** from aircraft size and airports — see §5.
- **Found, not changed:** gross profit counts the FET as the desk's money —
  §5 question 5.

**Postman, three real defects found by the new label check on its first run:**

- **`11 · Uploads` had no label check and hard-coded its statuses.** Its
  `Error (403 · another user's folder)` example held a **200** — it was
  captured as the administrator, who may open any folder. Fixed at the
  request (a broker now asks). The builder now asserts every label against the
  captured status, and the collection audit matches the code anywhere in the
  name, not only at the start (the Uploads names begin "Success (").
- **The Uploads builder dropped its own folder login.** It had been patched in
  by hand, so any rebuild left a folder that 401'd when run alone. The builder
  now copies it, like the Notes and Credits builders.
- **A Windows run wrote fixture paths with backslashes**, which Newman cannot
  open on macOS or Linux. Now always forward slashes. The file document request
  also fetches its own broker instead of trusting `{{userId}}` from `04 ·
  Users`.
- New: `18 · Suggest a price` (200, two 400s, 403) and the photo-library
  example on `01 · List files`.

**Verified:** real requests for both endpoints, including the 403 and 400s.
Browser at 375 / 768 / 1440: typing a $65,000 cost shows +10% $71,500 … +25%
$81,250 and a custom 18% card; clicking +15% puts 74750 in the base price; the
library opens from the quote photo field with the aircraft's photos first, and
choosing one fills the field. No horizontal scroll. Backend `tsc` 0, oxlint 0,
vitest 120/120; frontend eslint 0, `next build` passes. Newman **151 / 81 / 0
twice**, and **all 13 folders pass run alone**; 127 requests, 311 examples,
0 mislabelled.


### ✅ Instant estimate and the rate table — 27 September 2026 · #6 complete

The client could not be asked for his rates, so the estimate is built on a
table **the desk fills in**, and is honest about every category nobody has
priced.

- **`CharterRate`**, one row per aircraft category (`@unique`), created the
  first time a rate is set: `hourlyRate`, `averageSpeedKnots`, `typicalSeats`,
  `minimumHours`, `notes`. Migration `20260927120000_add_charter_rates`,
  **empty** — no seeded rates. Rows are never removed: clearing a figure sets
  it to null, and every change is audited with its before and after, which is
  the history "what rate did we estimate that on?" needs.
- **`GET /charter-rates`** — all seven categories, priced or not (unpriced ones
  all-null, so the table shows the gap). **`PUT /charter-rates/:category`** —
  VIEW_FINANCIALS at **ALL** scope only (a broker gets 403: a company-wide
  rate is not one broker's to set), enforced in the service with
  `scopeFor(...) !== Scope.ALL`. **`POST /charter-rates/estimate`** —
  great-circle distance, then per category: flight hours, billed hours (never
  below the minimum) and estimated cost, doubled for a round trip;
  `estimate: null` where no rate exists; `fitsParty` against typical seats.
  Reading and estimating need VIEW_FINANCIALS; an assistant gets 403.
- **The arithmetic** is `charter-rates.estimate.ts`, pure functions, 6 tests —
  including that no rate returns null rather than zero.
- **Frontend:** an **Instant Estimate** button on the Quotes toolbar (financial
  roles only). *Estimate* tab: two airports, passengers, round trip → a card
  per aircraft size with cost, hours and "Seats 8 / too small", or "No rate on
  file"; choosing one shows the suggested-price markups over that estimate,
  and **Start a quote** opens a new quote with the route, party and chosen
  price filled in. The estimate is deliberately *not* written into the quote's
  operator cost — that field is what the operator actually charges. *Rates*
  tab: editable for administrators and senior brokers, read-only otherwise.
- **Postman `14 · Charter Rates`** — set, list, estimate, and a teardown that
  **puts the real rate back exactly**: the folder saves the Midsize Jet rate
  before changing it. Verified with a real rate on file: it survived a run
  unchanged. First folder built on the new shared `postman/builder_common.py`.

**Verified:** live requests for every endpoint and role; browser at 375 / 768 /
1440 — KTEB→KPBI 901.8 nm, Midsize at $4,500/h and 420 kt → 2.1 h → $9,450,
+15% → $10,867.50 carried into a new quote's base price; six unpriced sizes
read "No rate on file"; broker sees rates read-only; assistant sees no button.
Backend 126/126 tests, `tsc` and oxlint 0; frontend eslint 0, build passes.
Newman **157 / 85 / 0 twice**, every folder alone; 131 requests, 324 examples,
0 mislabelled.

### ✅ Trips, Empty Legs + #10b, Commissions, and #11's desk half — 27 September 2026 · order items 10–12

Pulled forward from Phase 3 so the last two adjustments could be built without
waiting on the client. Module-by-module detail is in
[MODULE_FEATURE_STATUS.md](MODULE_FEATURE_STATUS.md) (#11, #15, #18, #32); this
entry records the decisions.

**Trips (#11).** Legs and named passengers as their own tables; pricing inputs
copied from the quote and every total computed on read by the quote pricing
engine. One-click booking from an approved quote marks the enquiry CONVERTED.
The status machine is pure and tested. Second passes made in the same pass:
activeTrips, trip counts and trip tabs on Users, Agents, Operators, Aircraft
and Clients; the `TRIP` notes subject (#5's trip half); `appliedToTripId` (#9's
trip link). Verified with live requests, in the browser at 375 / 768 / 1440,
and with Postman `15 · Trips`. Two bugs found by that browser check and fixed:
`TimePicker` sent `"08:00 AM"` (so a follow-up with a time never saved), and a
nested button broke the trip form.

**Empty Legs (#15) and #10b.** Exact-airport route match, ±3 days sorts first,
lost / converted / archived requests included. "Expired" is computed from the
offer's expiry on every read, not written by a job. The dashboard's Empty Leg
Opportunities reads the API; the module's dummy data is gone.

**Commissions (#18).** Recipient is a referral agent, a client (the client's travel-agent
case) or a named person; basis percent-of-profit / flat / custom. Percent of
profit is computed in cents on read — the agent sees the commission, never the
profit behind it. An agent's standard structure lives on their user row and is
copied at creation.

**#11, the desk half.** `REFERRAL_AGENT` is a partner, not staff: NONE on every
staff permission, a new `VIEW_TEAM` permission to keep the staff directory from
them, uploads forced private, notes SHARED-only and read-only. A referral is its
own table with its own ladder; converting it writes a real Client and
TripRequest through their services; linking its booked trip raises the
commission. Attachments stay private and reach the desk through the referral
(`openVouched`). The Agent Update field is the SHARED note flag built with #5 —
no second note system.

**Verification — stated plainly.** From Empty Legs onward the owner asked for no
live testing (no browser, no API probes); testing comes later. Checked: backend
`tsc`, oxlint and vitest (150 tests in 15 files) clean; frontend eslint clean
in every changed file (nine pre-existing errors elsewhere, listed in
MODULE_FEATURE_STATUS's short version); frontend `npm run build` passes.
**Not run:** Newman, and any browser check of Empty Legs, Commissions or
Referrals.

**Left of #11:** the `/portal` route group (Dashboard, Submit Referral, My
Referrals, Commission Center, Resources) with its own navigation, sending agents
there after sign-in (`homeFor` in `lib/roles.js` exists and is not yet called)
and adding `/portal` to `proxy.js`; the commission-structure inputs on the team
member sheet; Postman folders for Empty Legs, Commissions and Referrals.

---

## 5. Open questions for the client

Each is cheap to close and each is blocking something.

1. **#1 may already be closed.** He is describing a data-loss risk that cannot
   happen here. Five minutes on the Archived tab may settle it outright.
2. **#6's rate table is empty until the desk fills it.** The estimate is
   built and works, but only for the aircraft sizes someone has entered a rate
   for. Ask him for his numbers ("I can help with the data") and whether the
   formula — flight time × hourly rate, with a minimum — matches how he prices;
   positioning and overnight fees are not modelled.
3. **#9 is a ledger, not a number** — worth one sentence to him, because what he
   gets is better than what he asked for and he should hear it from us rather
   than discover it.
4. **#3's photo library shipped 27 Sep 2026** as a library of every photo
   already uploaded. Worth one sentence to him: if he meant a set of generic
   stock photos by aircraft type (not tails we have on file), that is a
   different thing, and those images would have to come from somewhere.
5. **Is FET profit?** Found while building #6: `grossProfit` is total price
   minus operator cost, and the total **includes the FET**, so every quote's
   gross profit and margin count the excise tax as the desk's money. At a 10%
   markup on $65,000 the margin reads 15.4% where the desk keeps 9.1%. If the
   operator's cost already includes the FET they remit, the current figure is
   right; if the desk remits it, every margin on screen is overstated. **A
   question about how the money flows — not changed until he answers.** Since
   27 Sep it also moves every percent-of-profit commission.
6. **Referral agents' standard commission.** Each agent's structure (percent of
   profit, flat fee or custom) is entered per agent; we need the client's figures, and
   whether "profit" for a commission is before or after the FET (question 5).
