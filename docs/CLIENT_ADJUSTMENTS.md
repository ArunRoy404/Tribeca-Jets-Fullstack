# Client adjustments — specification, status and handoff

**Tribeca Jets Command Center.** Thirteen requests sent by the client in two
batches (24 August and 18 September 2026), reproduced verbatim, analysed, and
ordered by dependency.

**This file is the single source of truth for this workstream.** It replaces
`docs/Client_Adjustments.txt`, which held the raw messages and nothing else.
The original is not needed and has been deleted.

*Last updated: 19 September 2026.*

---

## 0. Handoff brief — read this first if you are new to this work

You are picking up a workstream mid-flight. Everything you need to continue is
in this section and the two documents it names. Nothing important lives only in
a chat log.

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
6. **Quotes and Itinerary are deferred** at the client's own request — he has UI
   changes coming that two of these items depend on. See §3, items 3 and 6.

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

Branch **`roy`**. Five commits landed 19 September 2026 and are **committed but
not pushed** — the environment has no GitHub credentials
(`fatal: could not read Username for 'https://github.com'`). Pushing is the
repository owner's to do.

```
91f08d4  docs: record the rules this round settled, and refresh the collection
b70b5d8  feat(auth): sign out a session left untouched for ten minutes
7edd79f  feat(trip-requests): give trip requests their own page
078cc92  fix(date-picker): emit YYYY-MM-DD, not "Aug 12, 2026"
1c37c7e  feat(operators): raise the cancellation policy ceiling to 5,000 characters
```

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
| — | Upload infrastructure | ✅ | ☐ | **API done, rebuilt 23 Sep.** No screen consumes it yet. Unblocks 3, 7, 11. |
| 1 | Client stays visible after a broker deletes it | ✅ | ✅ | **Already works.** Needs a demonstration, not code. |
| 2 | Operator cancellation policies | ✅ | ✅ | **Done** 19 Sep 2026. |
| 3 | Aircraft pictures + stock image library | ◐ | ☐ | Foundation done. Gallery and picker **deferred** — needs Quotes/Itinerary UI. |
| 4 | Ten-minute idle logout | ✅ | ✅ | **Done** 19 Sep 2026. |
| 5 | Notes on a timeline | ☐ | ☐ | Not started. Needs Trips for half of it. |
| 6 | Instant quote calculator | ☐ | ☐ | **Deferred** — needs Quotes UI **and his rate data**. |
| 7 | A document folder per user (tax forms) | ◐ | ☐ | Uploading works. Needs a `UserDocument` table, the Documents tab, **and per-file access control**. |
| 8 | "Active trip request" section | ✅ | ✅ | **Done** 19 Sep 2026 — same as 10a. |
| 9 | Client credit / money on account | ☐ | ☐ | Not started. Build as a ledger, not a number. |
| 10a | Trip request page | ✅ | ✅ | **Done** 19 Sep 2026. |
| 10b | Empty-leg matching against past requests | ☐ | ☐ | **Blocked** — Empty Legs has no backend. |
| 11 | Referral Agent role and partner portal | ☐ | ☐ | **Blocked** — needs Trips, Commissions, upload. Largest item by a distance. |

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
| **6** | **#7 User document folders** | ◐ Uploading works. Needs a small `UserDocument` table, the profile tab, and the per-file access control a tax form requires — **the cheapest real work available.** |
| **7** | **#5 Notes timeline** | Clients now, Trips on its turn. Design together with #11's Agent Update field. |
| **8** | **#9 Client credit ledger** | Client-scoped now; the trip link is a second pass the day Trips lands. |
| **9** | **Trips** | Not a client request — but #5 and #9 both wait on it, and it unblocks nine modules. |
| 10 | **#10b Empty-leg matching** | After Empty Legs has a backend. |
| 11 | **#11 Referral Agent portal** | Last. Needs Trips, Commissions and upload all in place. |
| — | **#3, #6** | Deferred at the client's request until the Quotes and Itinerary UI lands. |

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

### ⏸ 3. Aircraft pictures and a stock image library — **DEFERRED**

> And are you gonna add a section for aircraft pictures? It would be cool to
> have a stock image database for when you have to add pics to quote or
> itinerary / and to be able to upload pics from operator email to use for
> quote or itinerary

He names the consumers himself — quote and itinerary.

**This one splits, and the split matters.**

- ✅ **The foundation shipped** (§4, Uploads). `POST /api/uploads/image`
  returns a URL today; the aircraft record stores it in a `photoUrl` column
  that still needs adding with the fleet UI.
- ☐ **Still deferred:** the fleet-side uploader and gallery, and the
  picture-picker on a quote or an itinerary. Those need the pending Quotes and
  Itinerary UI. **Do not start them.**

Thumbnails and image resizing are deliberately deferred until something
actually renders a gallery.

---

### ✅ 4. Automatic logout after ten idle minutes — **DONE 19 Sep 2026**

> Can we also make this CRM automatically logout within 10 minutes if it's not
> being touched? For security purposes

**"Not being touched" means user activity, not network activity** — a dashboard
polling in a forgotten tab must still log out. See §4 for the four
non-obvious requirements this implies and how each is met.

---

### ☐ 5. Notes on a timeline, for trips and clients

> Also, in the trip section and client CRM section, I want to make sure there
> is a section where I can write notes and add it to a "timeline"
> Do u know what I mean?
>
> I have it on my old CRM

**Status: not started. Order item 7.**

**What exists today:** Clients has a single `notes` string. That is a field, not
a timeline — editing it destroys what it said before.

**What to build:**

- A **polymorphic `Note` model** (subject type + subject id), so the same
  timeline serves clients now and trips later.
- It must **read alongside the `AuditLog` rows that already exist**. Status
  changes, reassignments and archives are timeline entries nobody has to type;
  a timeline showing only hand-written notes is half a timeline when the other
  half is already in the database.
- The existing `Client.notes` string is the migration question — decide whether
  it becomes the first note on the timeline or stays as a separate "internal
  notes" field. It is currently surfaced on the client detail page.

**⚠️ Trips does not exist.** Ship it for Clients; extend to Trips on its turn.

**⚠️ Design it together with #11's *Agent Update* field.** That is the same
feature with a visibility flag, and discovering that after building both is how
two note systems end up in one codebase.

---

### ⏸ 6. Instant quote calculator with a suggested-price selector — **DEFERRED**

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

**The *estimate* half is a data question before it is a build question.** He
offered to supply rates ("I can help with the data"), and scope §18 says AI
must not be the source of truth for financial calculations. **Get the rate
table from him on the call he asked for.** An AI-guessed charter price quoted
down a phone is the same class of mistake as the invented 4.9 safety rating
that `AGENTS.md` records.

---

### ◐ 7. A document folder per user, for tax forms — **API DONE, UI REMAINING**

> I want there to be a folder for each broker that I can attach tax forms to
> For example, a broker (mark) makes a commission with us, we need to give him
> a 1099 tax form. I want to be able to add that form into his own personal
> folder.
>
> So each user has a folder that we can add documents to

**Status: the upload half exists. Order item 6 — the cheapest real work
available.**

✅ **Uploading and serving a document is done** — `POST /api/uploads/document`
returns a URL, and `GET /api/uploads/:id` serves the bytes.

☐ **What is left is the feature itself:** a small `UserDocument` table (which
document belongs to which broker, with a label and a date) and a **Documents
tab on the user profile** with an uploader, the list and Remove.

**The split matters.** Uploading returns a URL and nothing else — a broker's
folder is a *list*, and a URL column holds one file. So this feature owns rows
that each carry an upload URL, rather than the upload knowing whose folder it
is in.

```
POST   /api/uploads/document      → { url: "/api/uploads/<id>" }
POST   /api/users/:id/documents   → stores that url + a label      (to build)
GET    /api/users/:id/documents   → the folder                     (to build)
DELETE /api/users/:id/documents/:docId                             (to build)
```

**Where to build it**

| | Path |
|---|---|
| Upload surface (done) | `Backend/src/modules/uploads/` |
| New table | `Backend/prisma/schema/user-document.prisma` |
| User profile page | `Frontend/src/templates/UsersRolesPage.jsx` and the user detail view |
| New hooks folder | `Frontend/src/hooks/user-documents/` (follow `src/hooks/aircraft/`) |
| Shared uploader | `Frontend/src/components/common/` — **build it here, not in the tab.** Step 2 adds upload widgets to many screens, and the second copy is the bug |

⚠️ **This is the feature that needs per-file access control, and it does not
exist yet.** Today anyone with a session who holds an upload URL can fetch it —
fine for a brochure, **not fine for a 1099**. Add `visibility` and an owner to
the upload row and check them on the fetch route as part of this work. Do not
solve it with a category enum; that was the design this replaced.

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

### ☐ 9. Client credit / money on account

> For clients - I want a section on their profile that says "credit/money on
> account". So let's say they cancel a trip and they want to keep the money
> they paid on account with us, we can enter how much that is and can always
> edit that number or select if it was used towards another trip.

**Status: not started. Order item 8.**

**Build this as a ledger, not a number — and this is a place where the build
should not do literally what was asked.**

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

**⚠️ "Used towards another trip" needs Trips to point at.** Ship the
client-scoped credit ledger now; the trip link is the second pass, the day
Trips lands. Store the trip id as a real foreign key when it exists — **never
stub it with a string**.

---

### ☐ 10b. Empty-leg matching against past trip requests

> ...just in case in future when we have empty legs that can match a previous
> trip request, we can still contact that client to let them know.

**Status: blocked. Order item 10.**

**⚠️ Blocked on Empty Legs**, which has a frontend folder
(`Frontend/src/templates/EmptyLegsPage.jsx`) and **no backend at all**.

The matching itself is a route-and-date query against archived and lost trip
requests — cheap, once there is something to match against. The trip requests
side is already correct for it: `LOST` is a status rather than a removal, and
nothing is ever destroyed, which is the whole reason the data he wants kept is
still there.

---

### ☐ 11. Referral Agent role and partner portal

> Please create a new CRM user type called Referral Agent. This role should
> have very limited access and function more like a simple partner portal than
> access to the full Tribeca Jets CRM.

**Status: blocked. Order item 11 — last.**

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
- **Resources** — file upload again, `category=RESOURCE`, already built.
- **A separate navigation shell**, since the portal shows five items and none
  of the CRM's.

**⚠️ Depends on: Trips, Commissions, and file upload.**

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

**What this does *not* include: any screen.** No frontend consumes the API yet.

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

## 5. Open questions for the client

Both are cheap to close and both are blocking something.

1. **#1 may already be closed.** He is describing a data-loss risk that cannot
   happen here. Five minutes on the Archived tab may settle it outright.
2. **#6 needs his rate data**, and he offered it — "I can help with the data".
   He also asked for a call: *"We can go over all of this on phone"*. Take it,
   and come back with the numbers rather than an AI estimate.
3. **#9 is a ledger, not a number** — worth one sentence to him, because what he
   gets is better than what he asked for and he should hear it from us rather
   than discover it.
