# Tribeca Jets Command Center — working agreement

A private-jet charter brokerage CRM. Two apps, deployed separately:

- `Frontend/` — Next.js 16, **JavaScript** (not TypeScript).
- `Backend/` — NestJS 12, **TypeScript**, ESM.

The language split is deliberate and settled. Never migrate the frontend to TS or the backend to JS.

**This file is the whole rulebook.** It used to be three — root, `Frontend/`,
`Backend/` — and a rule could live in any of them, so the same question got two
answers depending on which directory you were in. `Frontend/AGENTS.md` and
`Backend/AGENTS.md` now point here and carry no rules of their own, and the
three `CLAUDE.md` files import this one. There is exactly one place a rule can
live, and one place to look for it.

It is in three parts: what applies **everywhere**, then **backend**, then
**frontend**. Read part one whatever you are touching.

Alongside it, in `docs/`:

- `Tribeca_Jets_Command_Center_Team_Scope.docx` — the signed scope. The
  baseline, and not always right: §13 specifies MongoDB for a database that is
  relational throughout, and §17 lists twenty-two decisions still open. Where it
  and the build disagree, say so in a sentence and keep going under a stated
  assumption. Never silently pick a side.
- `MODULES.md` — what each module is and why it sits where it does in the queue.
- `MODULE_FEATURE_STATUS.md` — per module, what is wired end to end today and
  what is deliberately blank until its dependency ships. Updated in the same
  pass as every module.

---

## Git: never commit, never push

**Do not run `git commit` or `git push` unless the user says so in that message.**

This is absolute. Not when a batch "feels done", not when tests pass, not when the user approves the *code*. Approval of work is not approval to commit. When the user does ask, commit in batches split by concern, and stop at the push if credentials are missing rather than trying to work around them.

Leaving finished work uncommitted in the tree is the correct resting state. Say what is uncommitted and why; do not fix it by committing.

## How this project is built

The schema is **not** designed up front. Modules land one at a time and earlier ones get revised as later ones reveal what they actually needed. Two consequences:

- Expect to change existing schema/DTOs when a new module needs it. That is the plan working, not scope creep.
- When you build a module, **connect it to the modules it depends on** — real foreign keys, real role middleware, real cross-module queries. Do not leave a module islanded with a TODO.

The schedule is tight. Prefer the direct implementation over the configurable one. Do not build abstraction for modules that do not exist yet.

### Build order follows the dependency graph

**If B references A, A ships first.** Always. Before starting a module, list
what its records point at; anything not yet built moves ahead of it in the
queue.

This is not a preference about tidiness. A module built ahead of its
dependencies has to store `operator: "Jet Aviation"` as a string, and every
row written that way becomes a migration, a backfill and a set of broken joins
the day the real table arrives. Connecting modules with real foreign keys is
already the rule above; building them in dependency order is what makes it
possible to follow.

Read the frontend's dummy data to find the edges — the fields that name another
entity (`client`, `operator`, `aircraft`, `tripId`, `origin`/`destination`) are
the graph.

Where two modules are mutually referential, build the one that can stand alone
without the other and add the back-reference in the second pass. Never stub a
foreign key with a string "for now".

**Before adding a table, check the record does not already exist.** The
dependency rule cuts both ways: a module whose entity is already modelled
should be a *view*, not a second table. "Leads" looked like a new module and
was not — the scope puts lead source and stage on the client, so a leads table
would have been a duplicate client directory, drifting apart from the first
edit and splitting one person's history across two rows. Read the doc's data
model and the existing schema before the frontend's folder names convince you
otherwise.

**The second pass is not optional, and it is part of shipping the new module.**
A dependency that returns `fleet: []` or `totalFleet: null` while its dependant
does not exist is telling the truth. The day that module ships, the same empty
array becomes a *wrong answer* — the operator detail page says "No Aircraft in
Fleet" about an operator whose tails are in the database. So when a module
lands, go back through every module that points at it and fill in what they
were standing in for. Grep the dependencies for the empty arrays and nulls
their services return before calling the new module done.

### Shared by default — every feature, not just pagination

Pagination is the worked example, not the exception. **Anything a second module
will need lives in the shared layer**, and modules import it rather than
carrying their own copy: filtering, sorting, search, soft delete, audit
columns, status transitions, file upload, notifications, exports, date and
money handling, permission checks, error shapes, toasts, table state — all of
it, and whatever comes next.

- **Backend:** `src/common/` (and `src/core/` for infrastructure services).
- **Frontend:** `src/lib/`, `src/hooks/common/`, `src/components/common/`,
  `src/components/table/common/`.

The test before writing anything in a module folder: *would the next module
write this same thing?* If yes, it belongs in the shared layer — put it there
first, then use it. Do not write the private copy intending to lift it later;
that is how the two sort allowlists drifted apart.

**Extract on the second copy, not the first.** This does not license building a
framework for modules that do not exist — that contradicts "prefer the direct
implementation" above, and both rules are meant. Write it directly the first
time. The moment a second module needs the same thing, lift it into the shared
layer and move the first caller over in the same pass. Never leave two copies
in the tree, and never let a third exist.

**What stays module-private,** deliberately: the `where` and `select` of a
service (the row-level security boundary has to read clearly at its call site,
not hide inside a query builder), and a screen's own table, card and dialog
markup where the design genuinely differs. Everything else is shared.

### Fix a module when we reach it, not before

When a shared component or hook improves, **only the module currently being
worked on gets rewired.** Every other screen keeps using the old call signature
until its own turn comes round. Do not sweep the codebase to make them all
consistent, and do not treat an untouched module as unfinished work.

Most screens are still dummy-backed and will be rewritten anyway when their API
lands, so a sweep now is throwaway effort that touches dozens of files nobody
asked about and buries the actual change in the diff.

This makes **backwards compatibility a requirement of every shared change.**
A new prop on a shared component is optional, with the old behaviour intact
when it is absent — never a rename or a removal that forces callers to be
updated in the same pass. If a change genuinely cannot be made additive, say so
and ask before spreading it.

Mentioning that other modules still use the old path is fine, once. Fixing them
uninvited is not.

## Before building any module, read the frontend first

The frontend was built first and is the specification. Its dummy data, dialogs, filter dropdowns, table columns and tabs define the fields, the enums and the operations the API must support.

Read `Frontend/src/dummyData/<module>.js`, the store, the table components and the dialogs **before** writing the schema or DTOs. Where the UI and your schema disagree, that is a real finding — surface it rather than quietly picking one.

## Never display a number the data did not supply

**When a module is wired to its API, its dummy data is deleted in the same
pass** — the file in `src/dummyData/`, the imports, the store's copy of it, and
every placeholder value left behind in the components. A module is not done
while a screen can still render something that did not come from the server.

**Never invent a value to stand in for missing data.** No `||` fallback to a
plausible-looking literal, no pre-filled default in a form, no derived score.
If the API returns null, render an em dash, "Not rated" or "Not on file" — an
honest blank is always better than a confident wrong number.

This is not a style rule. The operators Overview tab ran the *safety
certification* text through `parseFloat`, got `NaN`, and fell back to `4.9` —
so every operator in the system displayed a 4.9/5 safety rating, in stars, that
no one had ever given them. The Add form pre-filled reliability with `"4.8"`,
so every operator created carried a rating nobody assigned. Both looked like
real data and neither was. On a charter desk, an invented safety score is the
kind of thing that gets someone hurt.

Two corollaries:

- **Render a field as what it is.** `safetyRating` is a certification string
  ("ARG/US Platinum") and `responseSpeed` is free text ("< 15 min"); only
  `reliabilityRating` is a 0-5 number. A star row is for scores.
- **A placeholder attribute is fine** — it is a format hint, greyed, and never
  submitted. A `value` or a default is not.

## Never store a figure beside the parts it is computed from

A total, a tax amount, a profit, a percentage — if it can be worked out from
columns the row already has, **compute it on read and do not store it.**

The day an edit moves one of the parts and the stored total does not follow,
the record contradicts itself and nothing on screen says which half is right.
On a charter desk that is money: a quote whose base price says $82,500 and
whose total still says $85,463 will be read down the phone by whoever opens it
first.

So `Quote` stores only what a person typed — base price, whether tax applies
and at what rate, the operator's cost, the extras — and `fetAmount`,
`extrasTotal`, `totalPrice`, `grossProfit` and `marginPercentage` are worked
out on every read, in **one place** (`quotes.pricing.ts`). The frontend never
re-derives them either; a second copy of the arithmetic in JavaScript disagrees
with the server the first time a rounding rule changes.

**The exception is a snapshot, and it is an exception on purpose.** "What
exactly did the client see on the 9th?" cannot be answered by recalculating —
a snapshot that recomputes from today's tax rate is not a snapshot. So
`QuoteVersion` writes every computed figure out in full and never updates one.
Redundancy is the point there; anywhere else it is the bug.

A corollary for stats: when the total is derived, the database cannot `SUM` it.
Count in the service rather than summing the nearest column — summing
`basePrice` would report a figure that is neither the offer nor the revenue.

## Contract rules that apply to both sides

- **Enum values are the backend's `SCREAMING_SNAKE_CASE`**, on the wire and in the database. The frontend maps them to display labels at the edge; it never invents its own vocabulary (no `"Senior Broker"` on the wire when the enum says `SENIOR_BROKER`).
- **Every list endpoint is paginated** and returns `{ success, data, meta }` with a full `meta`. There are no unpaginated list endpoints.
- **Soft delete everywhere** (`deletedAt`). Historical data is never destroyed.
- **Auth is httpOnly cookies only.** No token is ever returned to, stored by, or read by the frontend.

## Postman collection

`Backend/postman/` is a deliverable, not a scratch file. Every endpoint that ships gets its entry in the same pass as the code.

- Folders and requests are **serial-numbered** (`01 Auth`, `02 Users`, `01 List users`) so the collection reads in execution order.
- Every request carries a **full, realistic success example** and **an example for every error it can return** (400 / 401 / 403 / 404 / 409 / 422 / 429), captured from a real run — not hand-written.
- **JSON bodies carry a comment to the right of the field**, never above it —
  a comment per line above doubles the height of every body and buries the JSON
  it describes. `postman/rewrite_body_comments.py` does this for the whole
  collection; run it after any builder script. A comment that introduces a
  *group* of fields stays on its own line.
- **Every query parameter is described**, including all pagination, sort and filter params, with its default and its bounds.
- **Enums and fixed-value fields are documented case-sensitively**, listing the exact accepted values.
- Verify with `newman` before calling the collection done. A collection that has not been run is not finished.
- **A folder that creates a row archives it again in a teardown.** The run is a
  demonstration, not a data entry session. `03 · Clients` had no teardown and
  ended by *restoring* the client it created, so every Newman run left one more
  live "Marcus Reyes" in the directory — 26 of the 28 live clients were Postman
  debris before anyone looked. There is no hard delete by design, so archiving
  the probe is the correct end state: the debris sits in the Archived tab
  rather than among the records a broker works. `build_aircraft_folder.py` and
  `build_trip_requests_folder.py` are the pattern.
- **A folder must pass on its own, not only inside a full run.** Requests
  reference collection variables — `{{clientId}}`, `{{operatorId}}` — that
  earlier folders happen to set, so a folder run alone sends empty strings and
  fails validation. That reports a false failure to anyone debugging one
  folder, which is how a real failure gets ignored. Fetch what a request needs
  in its own pre-request script; `10 · Quotes` is the pattern.
- **Every request must pass on the second run, not just the first.** A request
  that mutates shared state has to be re-runnable. `04 · Set new password` sent
  a fixed new password, and the API refuses one identical to the current — so
  it passed on a fresh database and failed on every run after. A collection that
  only goes green after a reseed reports a false failure every other time, which
  is how a real failure gets ignored. Generate the value per run.

## Keep these files current

When an instruction lands that will still be true next week — a product rule, a
constraint, a correction of something you did wrong — **write it into the
relevant `AGENTS.md` in the same pass as the code**, without being asked twice.
Rules that live only in a chat log are rules the next session will break.

Judge by durability, not by emphasis. "Make the button blue" is a task. "Status
is never changed by a password reset" is a rule. When it is genuinely one task,
leave these files alone — a document that records everything is not read.

**`docs/MODULE_FEATURE_STATUS.md` is updated in the same pass as every module.**
It lists, per module, what is wired end to end and what is deliberately blank
until its dependency ships. Two edits every time a module lands: fill in the new
module's own two lists, **and go back through the modules that were waiting on
it** and move those lines from "waiting" to "working". That second edit is the
same second pass the build-order rule already requires — this file is where it
becomes visible, so a stale entry here means a dependant screen is still
rendering an em dash it no longer needs to.

## Communication

- Report what is actually true: if a check was skipped, say so; if tests fail, show the output.
- When something in the request conflicts with the code, say so in a sentence and keep building under a stated assumption.
- Do not re-explain work already described. Do not pad with recaps.

---

# Part two — Backend (NestJS 12, TypeScript, ESM)

Everything in part one applies here too.

## This is not the Nest/Prisma you know

Version specifics that break habits learned from older releases:

- **ESM.** `"type": "module"`, `moduleResolution: nodenext`. **Every relative import ends in `.js`**, even though the source is `.ts`. Top-level `await` is available.
- **vitest + oxlint**, not jest + eslint. `npm test` runs `vitest run`.
- **Prisma 7.** Driver adapters are mandatory (`@prisma/adapter-pg`); config lives in `prisma7.config.ts`; the generator is `prisma-client` (emits TypeScript into `src/generated/prisma/`, which is **generated — never edit it**). The schema is a **multi-file folder**, `prisma/schema/*.prisma`, one file per domain. Enums are emitted as const objects, so import from `generated/prisma/enums.js` and use `UserRole.ADMIN`, never a string literal.
- **`@nestjs/throttler` and `nestjs-zod` do not support Nest 12.** We hand-roll `RateLimitGuard` and `createZodDto`. Do not add either package back.
- **Zod 4.** `z.email()` / `z.uuid()` are top-level. `.innerType()` does not exist — structure schemas so you never need it.

## Validation

DTOs are Zod schemas wrapped in `createZodDto` (`src/common/dto/zod-dto.ts`), enforced per-route by `ZodValidationPipe`.

**There is no global `ValidationPipe`, and you must not add one** — it strips properties off Zod-backed DTOs because they have no `class-validator` metadata. This has bitten us once already.

### Never build an update schema with `.partial()`

**`.partial()` does not remove `.default()`.** It makes a field optional on the
way in and then fills the default on the way out, so every absent defaulted
field arrives at the service carrying a value — and the service writes it.

This was live in Clients. `PATCH { phone }` parsed to `{ phone, type: DIRECT,
status: LEAD, leadSource: DIRECT, leadStage: NEW, priority: MEDIUM, labels: [],
preferences: {} }`. Scheduling a follow-up demoted a VIP travel agent to a
brand-new direct lead and erased their labels and travel preferences. Nothing
in the UI showed it, because the big edit form happens to post every one of
those fields; only the small single-purpose dialogs — follow-up, convert,
assign broker — triggered it, which is exactly the set nobody tests.

**Write the update schema out as its own `z.object({ ... })`, every field
`.optional()`, no defaults.** Aircraft, Operators, Airports, Users and Trip
Requests all do; Clients was the one that did not. Duplicating the field list
is the cost, and it is worth it — `.partial()` looks like it means "everything
optional" and does not.

A default belongs on **create** only. If a value must exist, the column's
database default is the backstop, not the update DTO.

### A field the DTO accepts must be in the select

If `create`/`update` will store it, the response must return it. A field that
is written but never read is invisible to the UI and, worse, invisible to the
**edit form**, which prefills from that response: it reopens the field blank
and posts the blank back.

Clients accepted `notes`, `preferences` and `birthday` and returned none of
them, so the detail page said "No internal notes on file" about a client whose
notes were in the database.

**Grep the DTO against the select whenever either changes.**

### One select per model, and the detail view extends the list's

`findOne` uses `select: <MODEL>_DETAIL_SELECT`, which spreads
`<MODEL>_LIST_SELECT` and adds what only the detail page needs.

**Never use `include` for a detail read.** `include` returns every scalar plus
only the relations it names, so it silently drops the ones it does not —
Clients' `findOne` returned a bare `homeAirportId` while the list returned the
airport row, and the detail page rendered "—" for the home airport of every
client that had one, then cleared it on the next save.

### The detail endpoint loads archived rows; writes do not

`findOne` must not filter `deletedAt: null` — the Archived tab links to these
pages, and filtering here lists a row and then 404s it when someone clicks
through. Writes keep the filter through a separate private `findLive`, so an
archived record still cannot be edited or re-archived.

Users is the exception, because it has no archive/restore at all.

## Authorization: three distinct layers

Keep them separate. Collapsing them is how row-level leaks happen.

1. **Authentication** — `JwtAuthGuard` is global. Routes are private by default; `@Public()` opts out. Failing closed is deliberate.
2. **Coarse capability** — `@RequirePermissions(Permission.X)` + `PermissionsGuard`, driven by the role→permission matrix in `src/common/authorization/permissions.ts`. That matrix is the single source of truth and mirrors the Roles & Permissions tab in the UI. Add a permission there, not as an ad-hoc role list on a controller.
3. **Row-level scope** — **always in the service layer**, never in a guard. A guard cannot scope a `findMany`. Use `scopeFor(user, permission)` to decide between `ALL`, `OWN` and `ASSIGNED` and build the `where` clause from it.

**Return 404, never 403, for a record the caller may not see.** A 403 confirms the row exists and turns any ID into an oracle. 403 is only for "this action is not available to your role at all" — a capability failure, not a row failure.

## Every model carries the same four audit columns

Non-negotiable, on every model in every module:

```prisma
createdAt   DateTime @default(now())
createdById String?  @db.Uuid
createdBy   User?    @relation("<Model>CreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

updatedAt   DateTime @updatedAt
updatedById String?  @db.Uuid
updatedBy   User?    @relation("<Model>UpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
```

- **Set them from the session, never from the request body.** An audit column a
  caller can supply is not an audit column. Services write
  `createdById: user.id` on create and `updatedById: user.id` on *every* write,
  soft deletes included.
- **Nullable, with `SetNull`.** Seeded and imported rows have no creator, and
  removing whoever made a change must never destroy the record of it.
- **Distinct from business relationships.** `assignedBrokerId` says who owns a
  client; `createdById` says who typed it in. Reassignment must not rewrite
  history, so never reuse one for the other.
- Adding them to an existing table means **backfilling in the migration**, not
  dropping and recreating. See
  `20260915142333_add_created_by_updated_by_audit_columns`, which carries the
  old invitedBy values across rather than losing them.

## Account status is administrative, and `INVITED` is not a decision

`UserStatus` has three values but only two are settable by a person:

- **`INVITED`** is where an account is born, and it leaves exactly once — on its
  own, when the invitee sets a password through the reset flow. That act *is*
  accepting the invitation, and `completePasswordReset` flips the row to
  `ACTIVE` in the same transaction. Nothing else may write it: the update DTO's
  enum excludes it, and the service refuses any status change on a row that is
  still `INVITED`. Suspending a pending invitation would strand it for good —
  only an `INVITED` row can be promoted by a reset, so a suspended one could
  never move again.

  **Known gap:** with account removal withdrawn there is now no way to withdraw
  a mistaken invitation at all. The row stays `INVITED` and keeps its email
  address reserved. Withdrawing one needs its own deliberate operation; do not
  solve it by loosening the status guard.
- **`ACTIVE` / `SUSPENDED`** are an administrator's call, made through
  `PATCH /users/:id` by a `MANAGE_USERS` holder, and nothing else.

**A password reset must never be a route around a suspension.** The promotion
above is narrow by design — it fires only when the current status is `INVITED`.
A suspended user who completes a reset stays suspended, including when the code
was issued before the suspension landed. Any future flow that sets a password
inherits this rule.

The frontend mirrors it rather than re-deciding it: the status control is absent
for a pending invitation and offers only Active/Suspended otherwise.

## Nothing is ever permanently deleted

There is **no hard delete anywhere in this system, and no endpoint that offers
one.** Removing a record archives it; it can always be brought back. Every
soft-deletable model therefore carries six columns, not one:

```prisma
deletedAt    DateTime?
deletedById  String?   @db.Uuid   // who archived it
restoredAt   DateTime?
restoredById String?   @db.Uuid   // who brought it back
```

`createdBy`/`updatedBy` never capture removal — an archived row's `updatedBy`
is whoever last *edited* it — which is why `deletedBy` is its own column.

Use the shared pieces in `common/database/archive.ts` rather than rebuilding
any of this: `archiveQuerySchema`, `archiveFilter`, `ARCHIVE_SELECT`,
`ARCHIVE_ACTOR_SELECT`, `archiveData`, `restoreData`.

- **One list endpoint serves both halves.** `?archived=true` returns only
  archived rows; the default returns only live ones. A separate `/archived`
  route would duplicate every filter, sort and pagination param, and the two
  would drift the first time one gained a column.
- **`archived` uses `z.stringbool()`, never `z.coerce.boolean()`.**
  `Boolean("false")` is `true`, so the old `includeDeleted` param did the exact
  opposite of what it was asked on every `?includeDeleted=false`.
- **Restore clears the deletion stamp and touches nothing else.** A create that
  quietly revives an archived row is not a restore — it overwrites every stored
  field with whatever the form sent. Creating and restoring are separate
  intents and get separate endpoints.
- **Select the archive actors on the list, not just the detail.** The Archived
  tab has a "Removed By" column and the live list shows a "Restored" badge.
- **`findOne` must not filter `deletedAt: null`.** The Archived tab links
  straight to the detail view, so excluding archived rows there lists a record
  and then 404s it. Return it with its archive trail and let the UI decide what
  to offer. (The list is the opposite: it filters by `?archived=`.)
- **A module that references another stores its id, never its name.** When
  Clients was built, Airports did not exist, so `homeAirport` held an ICAO
  string; the moment Airports shipped that became a column pointing at nothing
  the database could check. It is now `homeAirportId`, a real foreign key,
  backfilled in the migration by matching each stored code to its airport row.
  Expect to do this whenever a dependency lands after its dependant — and check
  the row exists in the service, so the form gets a named 400 rather than a
  bare P2003.
- **Never an ad-hoc `@Roles(...)` list on a controller.** The permission matrix
  is the source of truth. Where a rule is finer than a permission — clients may
  be created by a broker but removed only by an administrator — enforce it in
  the service with `scopeFor(...) !== Scope.ALL`, which keeps the bulk routes
  and the single route on one rule instead of two.
- **Validate a foreign key only when it is actually changing.** Edit forms
  resend every field, so re-checking unconditionally means a record whose
  dependency was archived later can no longer be edited at all — changing an
  aircraft's notes returned "That operator does not exist" about the operator
  it already had. Compare against the stored value first. And say *archived*
  when it is archived: that is a different problem from a mistyped id, and the
  fix is different too.
- **A restore returns 200, not 201.** `@Post(':id/restore')` needs an explicit
  `@HttpCode(HttpStatus.OK)`, because Nest gives every POST a 201 and a restore
  creates nothing — it clears a deletion stamp on a row that existed all along.
  All four modules drifted into 201 while the Postman collection documented
  200; the collection was right.
- **Bulk delete gets a matching bulk restore.** Same `bulkIdsSchema`, same
  `bulkResult`, same partial-success rule — `POST /<resource>/bulk-restore`.
  Read `affected` rather than `deleted`, which is kept only as an alias for the
  existing delete callers.
- **Users are not soft-deletable at all.** The Users module has no `DELETE`
  and no `restore`, its query DTO has no `archived` param, and the `users` table
  carries no archive trail — suspending an account is the way out, which is a
  status change through `PATCH /users/:id`. `users.deletedAt` survives as a
  database-level kill switch (auth refuses a stamped row a session) and hides
  the handful of rows archived before the feature was withdrawn; nothing writes
  it. Every *other* soft-deletable model follows the six-column rule above.

## A seed lookup filters `deletedAt: null`, like every other query

`prisma/seed.ts` finds its anchor rows by natural key — an email, a summary
line — and **testing archives rows**. An archived row still matches on summary,
so a seed that forgets the filter hangs its new records off a removed parent.

This happened: the sourcing seed found an archived `TripRequest` and attached
three operator quotes to it, then the quotes seed did the same. Nothing looked
wrong — the rows existed, the API returned them — until a board showed two
quotes whose enquiry was in no list at all, and Postman's `04 · Ask an
operator` started failing with "that request does not exist".

Add `deletedAt: null` and an `orderBy` to every seed lookup, so re-running the
seed on a database that has been worked in picks the same row every time.

## The permission matrix ships with the session

`GET /auth/me` returns `permissions` — the caller's row of the matrix, as
`{ PERMISSION: Scope }` — so the frontend can stop offering actions the guard
will refuse. A role seeing Edit and Remove on every row and collecting a 403
toast reads as a broken app rather than a permission boundary.

**This is not an enforcement point and never can be.** It travels to a browser,
where anyone can edit it. Every route still checks the same matrix server-side.
Shipping it from here rather than letting the frontend re-derive it from `role`
is the whole point: a second copy of the matrix in JavaScript drifts the first
time a scope changes, and it drifts silently.

## Numbers that a form can leave blank

`z.coerce.number()` is a trap on anything a form touches: `Number('')` is **0**,
so an empty Latitude box arrives as a valid coordinate and an empty rating
stores 0 out of 5 — both indistinguishable from a deliberate zero.

Use `requiredNumber` / `optionalNumber` / `nullableNumber` from
`common/dto/numbers.ts`. And keep required-ness honest: the API's required
fields and the form's `required` attributes and its "(Optional)" labels must
say the same thing, or the form promises one contract while the server enforces
another.

## `z.coerce.date()` is the same trap as `z.coerce.number()`

Its input type is `unknown`, so it accepts `true` and `0` as 1 January 1970 and
`""` as an Invalid Date, exactly as happily as a real timestamp. Clients used it
for `birthday` and `nextFollowUpAt`, so a stray boolean stored a 1970 birthday
that nobody typed.

Use the helpers in `common/dto/dates.ts`:

- **`calendarDate`** for a day the user names — a birthday, a departure date, a
  quote deadline. It stores midnight UTC against a `@db.Date` column, so the
  14th does not render as the 13th west of Greenwich.
- **`timestamp`** for a moment — a follow-up time, anything with a clock on it.

There is a second reason beyond validation: **`unknown` cannot be expressed in
JSON Schema**, so a `z.coerce.date()` field documented itself as `{}`, Swagger
read a typeless property as a reference to a class that does not exist, and the
entire `/api/docs` page 500'd with a bogus "circular dependency". A DTO that
cannot describe itself takes the documentation down with it.

## DTOs document themselves — never hand-write OpenAPI metadata

`createZodDto` derives the OpenAPI schema from the Zod schema with
`z.toJSONSchema`, and publishes it through `_OPENAPI_METADATA_FACTORY` — the
same hook the Swagger CLI plugin generates, which is why no plugin is
configured. Add a DTO and it is documented: types, bounds, defaults, enums and
required-ness, all from the one schema that also validates.

`io: 'input'` is deliberate. Several DTOs transform on the way in, and the
*output* is what the service sees, not what a caller sends — documenting the
output would tell everyone to post a JavaScript `Date`.

Responses are derived too, in `common/openapi/describe-responses.ts`, which
reads the **same `@Public()` and `@RequirePermissions()` metadata the guards
read**. So the documented 401s and 403s cannot drift from what is enforced, and
95 routes cost no `@ApiResponse` decorators at all. Add a route and its error
catalogue appears with it.

Two things still belong on the controller by hand: `@ApiOperation` — the
summary and the *why*, which no schema can infer — and any response a route
returns that the rules above cannot see.

**A hand-written `@ApiResponse` silences Nest's default success response.** Nest
injects the implicit 200/201 only when a controller declares *none* of its own,
so the moment a route documents its 403 by hand it arrives at
`describeResponses` with no success entry at all — and would be published as an
operation that can only fail. That is why the success code is reconstructed
there from `HTTP_CODE_METADATA` the same way Nest picks it, rather than read
off the document. Five Files routes were briefly published that way; the fix is
in the derivation, so nothing has to be remembered at the call site.

## Uploads: never trust the content type a caller sends

A multipart part's `Content-Type` is chosen by whoever sent it. Store it and the
download route will one day hand a browser exactly what an attacker picked —
`text/html` on a file the desk believes is a PDF is a script running on the
API's own origin, with the session cookie attached.

**Read the type from the bytes** (`modules/files/file-signature.ts`) and store
*that*. The sender's header settles exactly one question: whether text is
`text/plain` or `text/csv`, which are the same bytes and differ only in intent.

Three formats stay off every allowlist, for reasons that are not about
convenience:

- **SVG** is a document that executes script. Serving one from the API's origin
  is stored XSS wearing an image's clothes.
- **Archives** carry their contents past whatever checked the outer file.
- **Legacy `.doc`/`.xls`** are both OLE2 and byte-identical at the header, so
  nothing can tell them apart without trusting the sender — which is the thing
  sniffing exists to avoid. They are also the macro-bearing formats, and Word
  and Excel have written the modern equivalents by default since 2007.

Then serve defensively too: `X-Content-Type-Options: nosniff` on every
response, and `Content-Disposition: inline` **only** for images. Everything else
downloads.

## When the permission depends on the row, the guard cannot make the decision

`@RequirePermissions` runs before anything is read, so it can only express a
rule that is true of the caller alone. A file's rule is not: a 1099 and a
marketing brochure are rows in one table, in one bucket, and are not remotely
the same secret.

So `FileObject` carries a required `category`, and `files.access.ts` maps each
value to a read permission, a write permission, an owner kind, a format
allowlist and a size ceiling. The controller carries **no** permission
decorator and says so in a comment; the service enforces the table.

Two things make this safe rather than a hole:

- **It is a data structure, not four `if` branches.** A rule spread across
  `findAll`, `findOne`, `update` and `remove` is a rule that gets forgotten in
  the fifth place — and the fifth place is the download.
- **A category with no rule does not compile.** `Record<FileCategory, …>` is
  total, so adding an enum value without deciding who may open it is a type
  error. For the same reason there is no `OTHER`: a catch-all is a category
  whose access rule cannot be stated.

The usual split still holds — reads that fail answer **404**, writes that fail
answer **403**. A 403 on reading a personal document confirms it exists, which
turns a list of user ids into a register of who has been paid.

## Archiving a file never touches the bytes

`deletedAt` on the row, and the object stays in storage exactly where it was.

There is no permanent delete in this system, and a restore that cannot hand
back the same bytes is not a restore — it is an empty row wearing a filename.
Deleting the object on archive would quietly turn the Archived tab into a list
of documents nobody can ever open again, and nothing on screen would say so.
Storage is the price of the promise the rest of the system already makes.

The same reasoning runs the other way on upload: **write the bytes first, then
the row.** A failed insert leaves an unreferenced object in the bucket, which is
invisible, harmless and findable by `driver` plus key prefix. The opposite order
leaves a row pointing at nothing. Given a choice between an orphaned blob and an
orphaned row, the blob is the one that cannot lie to anybody.

## Service layer rules

- Soft delete (`deletedAt`), never a hard `delete`. Every query filters `deletedAt: null`.
- Write an `AuditLog` row for anything that mutates state a person would ask about later — role changes, status changes, deletions, invitations.
- Never return `passwordHash`, `twoFactorSecret`, or raw tokens. Select explicitly; do not spread a Prisma row into a response.
- Cross-module reads go through the owning module's service, not a raw Prisma call into another module's tables.

## List endpoints

Every list endpoint is assembled from the shared pieces below. If you are about
to write paging, sorting or searching by hand, one of these already exists —
and the second hand-written copy is how the two modules silently drifted apart
the first time.

| Need | Use | Lives in |
|---|---|---|
| page / limit / search / sortOrder | `paginationSchema.extend({ ...filters })` | `common/dto/pagination.dto.ts` |
| sortable-column allowlist | `sortableBy(FIELDS)` in the **DTO** | same |
| skip / take | `toPrismaPagination(query)` | same |
| `{ success, data, meta }` | `paginate(items, total, page, limit)` | `common/types/api.types.ts` |
| `?search=` across columns | `searchAcross(query.search, [...])` | `common/database/filters.ts` |
| optional equality filters | `equalsAny(query, [...])` | same |
| `orderBy` | `orderByField(query.sortBy, query.sortOrder)` | same |

- **`DEFAULT_PAGE_SIZE` is 10 and `MAX_PAGE_SIZE` is 100**, both in
  `pagination.dto.ts`. The default is paired with the frontend's
  `DEFAULT_PAGE_SIZE`, and the ceiling with its `PAGE_SIZE_OPTIONS` — change
  one and you must change the other, or a link built in the UI stops matching
  what the API serves.
- **Lists open newest-first.** `sortableBy()` defaults to `createdAt` and
  `paginationSchema` to `sortOrder: 'desc'`, and that pairing is the default for
  every table. A row someone just created must be the first thing they see —
  an alphabetical or by-code default buries it wherever the alphabet puts it,
  which reads as "my save did not work". Override only with a stated reason.
- **Bulk actions reuse `bulkIdsSchema` and `bulkResult`**
  (`common/dto/bulk.dto.ts`). Every table has a checkbox column, so every module
  gets a `POST /<resource>/bulk-delete`. Three rules hold across all of them:
  **POST, not DELETE** (request bodies on DELETE are dropped by proxies, and a
  dropped body removes nothing while answering 200); **partial success is
  success** (ids that match nothing come back in `skipped`, because two people
  clearing the same rows both deserve to succeed); and **read the rows before
  updating them**, so the audit entry can name what was removed.
- **Sortable columns are allowlisted in the DTO, not the service.** Rejecting
  an unknown column at the edge with a 400 beats silently falling back to
  `createdAt`: the fallback hides a broken client, and it leaves the service
  re-checking something validation should already guarantee.
- Filters are explicit enum-typed query params, never a free-form `filter`
  object.
- The `where` clause is the security boundary, so it stays readable at the call
  site. Use the helpers for the repetitive parts; do not hide row-level scoping
  behind a query builder.

## Errors

`AllExceptionsFilter` already translates Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400. Throw Nest's HTTP exceptions; do not hand-format error bodies in a controller.

---

# Part three — Frontend (Next.js 16, JavaScript)

Everything in part one applies here too.

## Design system & component rules

This project uses shadcn/ui (the `base-nova` style, built on Base UI — `@base-ui/react`, not Radix) as its component layer, with every color/radius/shadow centralized as CSS variables in `src/app/globals.css`. Light theme only — there is no dark mode, no `.dark` class is ever applied.

- **Never hardcode a color, radius, or shadow.** Check `src/app/globals.css` (`:root` + `@theme inline`) first. If the value you need isn't there, add it as a token in `globals.css` and consume it via a Tailwind utility (`bg-success`, `text-purple`, `shadow-card`, `rounded-sm`, etc.) — never a raw hex/`rgba()`/`px` arbitrary value in a component. Tinted/translucent variants should use Tailwind's opacity modifier on an existing token (`bg-success/10`) rather than a new hardcoded rgba.
- **Check `src/components/ui/` (shadcn primitives) and `src/components/common/` (our reusable wrappers) before writing new markup.** If shadcn has the component (button, input, checkbox, avatar, badge, table, sidebar, dropdown-menu, tooltip, sheet, collapsible, etc.), use it — don't hand-roll a `<button>`/`<input>`/status pill from scratch.
- **Never import a `ui/*` primitive directly into a page or feature component.** Customize the primitive itself (its `cva` variants in `ui/button.jsx`, `ui/input.jsx`, etc.) so its *default* look already matches Figma, and/or wrap it in a `common/` component for anything with app-specific behavior (`CommonInput`, `CommonOTPInput`, `UserAvatar`, `StatusBadge`). Feature code imports from `common/` or the customized `ui/*`, never a raw unstyled primitive.
- **Forms**: use `CommonInput` (`src/components/common/CommonInput.jsx`) for every text/email/password/textarea field — pass `type`. Password show/hide state lives inside `CommonInput`, not in the parent. Use `CommonOTPInput` for any digit-code input.
- **Icons**: prefer the Figma-exported SVGs under `public/dashboard/icons/` and `public/auth/icons/`. Only reach for `lucide-react` when Figma didn't export the icon you need (e.g. the password-hidden `EyeOff` state, or icons shadcn primitives require internally like sidebar/dropdown chevrons) — and when mixing is unavoidable for a matched pair (e.g. show/hide eye), use the same icon family for both states rather than mixing Figma + lucide within one control.
- **Images**: always `next/image`, never `<img>`, never the `unoptimized` prop. Local assets under `public/` need no remote-pattern config. Use `fill` + a sized `relative` parent for background/cover photos, explicit `width`/`height` for everything else.
- **Layouts, not wrappers**: if a visual shell wraps every page in a route group (the auth hero-split panel, the dashboard sidebar), it belongs in that group's `layout.js` — never re-imported and wrapped around each page's JSX by hand. `src/app/(auth)/layout.js` and `src/app/dashboard/layout.js` are the examples to follow.
- **Reuse, don't duplicate.** Before adding a new status-color map, badge variant, or avatar treatment, check `src/components/common/StatusBadge.jsx` / `UserAvatar.jsx` first — these exist specifically because 4+ components used to hand-roll their own copies.

## Never duplicate code — extract a reusable component

If you are about to paste, retype, or closely re-derive a block of JSX/markup that already exists elsewhere in the codebase (even with different text/props), stop and extract it into a reusable component instead. This applies at any scale — a whole page section, a form-field group, a title+description header block, a status badge, a card shell. `AuthCardHeader`, `StatusBadge`, `SearchInput`, `UserMenu`, and `FilterTabs` all exist because the same markup was found copy-pasted across 2+ files; that duplication should have been caught before it landed. Before writing new markup:

1. Grep for a similar-looking block elsewhere in `src/`.
2. If found (even once, if you're about to add a second usage), extract a component to `src/components/common/` (generic) or the relevant feature folder (`src/components/auth/`, `src/components/dashboard/`) before proceeding.
3. Never let the same visual/structural pattern exist in 3+ places as separate hand-rolled copies — that's a signal a reusable component is overdue.

## Responsiveness is mandatory, not optional

Every screen and every new component must work across mobile, tablet, and desktop widths — this is a hard requirement, not a nice-to-have. Concretely:

- Default to mobile-first Tailwind classes (unprefixed = smallest screens) and add `sm:`/`md:`/`lg:`/`xl:` overrides for larger viewports — never ship a fixed-width layout that only works at one breakpoint.
- Multi-column layouts (dashboard grids, the Financial Attention two-column panel) must stack to a single column below `lg` (`grid-cols-1 lg:grid-cols-2`), not overflow or squeeze.
- Fixed pixel widths (`w-[Npx]`) on anything that isn't a small fixed-size icon/badge are a red flag — check whether it should be `flex-1`/`w-full`/`min-w-0` with a `sm:`-gated fixed size instead (see `CommonOTPInput`'s `fixedWidth` variant for the pattern: fluid by default, fixed-width only from `sm:` up).
- Test/verify at minimum three widths before considering a screen done: ~375px (mobile), ~768px (tablet), ~1440px (desktop).
- The dashboard sidebar's built-in mobile behavior (shadcn `Sidebar` collapses to an off-canvas `Sheet` below `md`) is the reference pattern for "component that adapts by breakpoint automatically" — prefer primitives that already do this over hand-rolled `hidden md:block` toggles where possible.
- **Mobile-only sizing must reproduce the existing value verbatim at `sm:` and up.** When shrinking padding/gap/font/icon size for small screens, gate the smaller value unprefixed and repeat the *original* value at `sm:` (e.g. `gap-3 sm:gap-6` where `gap-6` was the prior constant) — never introduce an intermediate step (`gap-3 sm:gap-4 lg:gap-6`) or shift alignment/breakpoints that change how the design already looks at tablet/desktop. Verify by screenshotting ~768px and ~1440px, not just mobile, before calling a responsive change done.
- **Stat/metric tiles go 2-column on mobile, not 1-column.** `StatsGrid`/`StatCard` (dashboard), `SimpleStatsRow` (trips, operator sourcing, schedule), and `TripDetailsView`'s financial `StatBox` grid all use `grid-cols-2` as the base (unprefixed) class with tighter padding/icon/font sizes below `sm`, then match the original desktop values at `sm:`+. Follow this pattern for any new stat/KPI tile group instead of stacking to a single column.
- **Tables get a card view below `lg`, not horizontal scroll.** A data table wider than it is usable on mobile (search/filters + `overflow-x-auto` table) gets a companion per-row `*Card.jsx` component and a `*CardsContainer.jsx` that lists them, rendered `lg:hidden` beside the original `<Table>` wrapped in `hidden lg:block` — see `TripCard`/`TripsCardsContainer`/`UpcomingTripsContainer` and `SourcingRequestCard`/`OperatorSourcingCardsContainer`. The search/filter toolbar and `TablePagination` footer stay shared (rendered once, not duplicated per breakpoint); only the row-rendering body swaps. Row-action-menu items and navigation handlers are extracted into one function (e.g. `getRowActions(row)`) so the table rows and the cards call identical logic.
- **Dense grid views (calendar week/month) get a genuine mobile layout, not a scroll wrapper.** `ScheduleView`'s `WeekGrid`/`MonthGrid` render a compact mobile view `lg:hidden` (day-chip picker + single-day agenda for week; small tap-to-select day grid + agenda for month, both using `FlightEventCard`) beside the original dense grid wrapped `hidden lg:block`/`hidden lg:flex`. Reuse existing store state (e.g. `useScheduleStore`'s `currentDate`/`goToDate`) for the "selected day" instead of adding new local state.
- **TopNav is sticky** (`sticky top-0 z-30`) so it stays visible while the page scrolls; keep new overlay z-indexes below the shadcn popover/dialog/sheet default of `z-50`. Header controls (notification bell, profile menu) share the same explicit height per breakpoint (`h-9 sm:h-11` / `size-9 sm:size-11`) rather than relying on intrinsic content height, so they stay visually aligned.

## Animation convention

This project uses **Framer Motion** (`framer-motion`) for entrance/reveal animations — smooth, relaxing, premium-feeling, never abrupt or bouncy-by-default. Reusable primitives live in `src/components/common/`:

- `Reveal` — scroll-triggered fade+slide-up (`whileInView`, animates once). Use for dashboard sections/cards that appear as the user scrolls down a long page.
- `StaggerContainer` + `StaggerItem` — mount-triggered cascade (`initial`/`animate`), used for auth screens where the whole card is above the fold. Wrap the group in `StaggerContainer`, wrap each direct visual chunk (header, form, button) in `StaggerItem`. Pass `as={motion.form}` (imported from `framer-motion`, not a bare string) when the item needs to render as a real `<form>`.

Don't hand-roll a new `motion.div` with bespoke `initial`/`animate`/`variants` for a standard reveal — reuse `Reveal`/`StaggerContainer`/`StaggerItem` first. Only reach for a bespoke `motion.*` block (as `AuthCard`'s card-level scale-in and `SuccessCard`'s checkmark pop do) for a genuinely one-off entrance effect that the shared primitives don't cover.

Overlays (Popover/Dialog/Sheet content) get the same treatment: don't ship shadcn's default 100ms overlay transition — customize the primitive's own open/close animation classes (see `ui/popover.jsx`) to the project's slower, smoother duration/easing instead of overriding it per-callsite.

## Dummy data and state: never inline, always store-backed

This project has no backend yet, but components must be written as if the data source could be swapped for a real API tomorrow. Two rules, always applied together:

- **All placeholder content lives in `src/dummyData/`, one file per page/section/component it feeds** (`src/dummyData/trips.js`, `src/dummyData/schedule.js`, `src/dummyData/operatorSourcing.js`, etc.). A dummy-data file exports plain data (arrays/objects) and nothing else — no components, no JSX.
- **All state and the functions that mutate it live in `src/store/`, as Zustand stores, one store per page/section/component domain** (`src/store/useTripsStore.js`, `src/store/useScheduleStore.js`, ...), built with `zustand`'s `create()`. A store seeds its initial state from the matching `dummyData` file and exposes both the state and the actions that operate on it (filters, selection, pagination, sorting, etc.) as one hook.
- **Components never define dummy content inline and never hold this kind of state in local `useState`.** A page/section imports the store hook (`const { trips, statusFilter, setStatusFilter } = useTripsStore()`) and calls its actions — it does not construct arrays of fake rows, hardcode option lists, or manage filter/selection state itself. Local `useState` is still fine for things that are genuinely local and disposable (an input's uncontrolled draft value, a popover's open/closed flag) — the line is: if another component might need to read or react to it, or if it represents "the data," it belongs in a store, not `useState`.

Before adding a new table, list, or filterable view: create its `dummyData/*.js` file, create its `store/use*Store.js` file, then build the component against the store hook. Never take a shortcut and inline the array "just for now."

- **Always use optional chaining (`?.`) when referencing object properties, arrays, store states, and function callbacks** (e.g. `items?.map()`, `priorities?.length`, `stat?.label`, `onActionClick?.()`, `agent?.name`), ensuring runtime safety against undefined/null states when data is loading or empty.


---

## Data layer: once a module has an API, it is API-backed

The "Dummy data and state" section above describes how a screen is built **before** its backend exists. As each module's API lands, that module graduates and the rules below take over. Both states coexist — `trips` may still be dummy-backed while `users` is live.

When a module graduates:

- **Server data comes from React Query, never from a zustand store.** Delete the store's data array, its filter/pagination getters and its mutating actions. A store may keep genuinely client-only state (which dialog is open, which row is selected) — nothing that the server owns.
- **Its `dummyData/*.js` file goes away** with the store's dependency on it. Do not leave a stale copy "for reference".
- **Every leftover placeholder in its components goes with it.** The dummy file
  is the obvious half; the dangerous half is what stayed behind in the JSX —
  `value={x || "4.8"}`, a form defaulting a rating, a score derived from a
  string with `parseFloat`. Grep the module for `|| "` and for literal numbers
  after wiring it up, and delete what you find.
- **Missing data renders as missing.** Em dash, "Not rated", "Not on file" —
  never a plausible-looking stand-in. The mapper is the single place that turns
  null into "—", so components read the mapped value directly and add no
  fallback of their own. See the rule in the root `AGENTS.md` for what this
  cost us on operators.
- **A default parameter is a fallback.** `function Banner({ date = "Aug 12,
  2026" })` is the same bug as `value || "4.8"`, and it hides better: it looks
  like an ordinary signature rather than a placeholder. `ClientFollowUpBanner`
  defaulted its date, note and status that way; only the Overview tab passed
  real values, so the other four tabs showed an invented follow-up — about a
  Miami → New York round trip — for every client in the system, and switching
  tabs changed the client's follow-up date.
  **Pass the record, not pre-formatted pieces of it.** A component that takes
  `client` and reads what it needs cannot be called without the data; one that
  takes six strings can, and eventually is.
- Read the module's `src/hooks/<module>/README.md` if there is one; `src/hooks/auth/` is the reference implementation for everything below.

## Services and hooks

- One service per module: `src/services/<module>.service.js`, exporting plain functions that call the shared `request()` from `src/lib/axios.js`. A service does nothing but shape the request and return `data` — no toasts, no navigation, no cache access.
- One hook per operation, one file per hook, under `src/hooks/<module>/`, re-exported from that folder's `index.js`.
- **Query hooks return the query object itself. Mutation hooks return the mutation itself.** Never a hand-built `{ data, loading, error }` shape — the component destructures what it needs.
- **Timing never appears in a hook.** `staleTime`, `gcTime`, retry and refetch behaviour come from the presets in `src/config/query.config.js`, which read `NEXT_PUBLIC_QUERY_*` env vars. A raw number in a hook is a bug.
- Query keys come from `src/lib/queryKeys.js`. Never inline an array literal as a key.

## Hooks own the side effects; components stay clean

**All of it lives in the hook** — success and error toasts, cache invalidation, redirects, session teardown. A component calls `mutate(values)` and renders state. If you find yourself writing `onSuccess` inside a component, the logic belongs in the hook instead.

Invalidation goes through the module-level query client (`src/lib/queryClient.js`) so any hook file can invalidate any other module's keys without prop-drilling a client.

## URL is the source of truth for table state

**Every tab, page, filter, sort and search term lives in the URL query string.** Not in a store, not in `useState`.

This is not cosmetic. A pasted or reloaded URL must reproduce exactly what the user was looking at — same tab, same page, same filters — and back/forward must step through those states.

Use the shared `useTableQueryParams` hook (`src/hooks/common/useTableQueryParams.js`); do not hand-roll `useSearchParams` juggling per table.

- **Defaults are omitted from the URL.** Page 1 with no filters is a bare `/dashboard/users`, not `?page=1&role=ALL`. Reading a missing param yields the default.
- **Changing any filter, search term or tab resets `page` to 1.** Landing on page 4 of a 1-page result set is a bug.
- **Filter/tab changes use `replace`, not `push`**, so back does not walk through every keystroke. Only a genuine navigation pushes.
- **Search input is debounced before it reaches the URL** (the field itself stays controlled and instant).
- URL values are **untrusted input**: validate and clamp every one before it reaches a request. A hand-edited `?page=-5&limit=99999` must degrade to the default, not 500 the API.
- The wire vocabulary is the backend's enum casing (`SENIOR_BROKER`), and that is what goes in the URL. Display labels are mapped at render time.

## Table state is assembled from shared builders, never hand-written

`useTableQueryParams` is the whole engine; a module's hook declares only what
is actually specific to it. Everything below already exists — writing a second
copy is the bug this section exists to prevent.

| Need | Use |
|---|---|
| page / limit / sortBy / sortOrder fields | `paginationFields(SORTABLE_COLUMNS)` |
| a debounced text search field | `searchField()` |
| a dropdown filter over a fixed set | `filterField(ALLOWED_VALUES)` |
| the object to send to the API | the hook's `queryParams` |
| `setPage`, `setRole`, `setStatus`, … | the hook's `setters` (generated from the schema) |
| moving pages, clamped | the hook's `goToPage(page, pageCount)` |
| the rows-per-page dropdown | `<PageSizeSelect value onChange />`, in the toolbar beside the filters |
| the bulk-remove button | `<BulkDeleteButton count itemLabel onClick />`, beside the table's primary action |
| the bulk-remove confirmation | `<BulkDeleteDialog items itemLabel onConfirm />` |
| the archived view | an `archived` field in the schema, surfaced as a tab |
| the restored marker | `<RestoredBadge at by />` |
| archive field labels | `toArchiveFields(record)` from `@/lib/archive` |
| page numbers with collapsed gaps | `<TablePagination onPageChange />`, windowed by `buildPageItems` |

- **Mark view-only fields `local: true`.** A tab id belongs in the URL but must
  never reach the API — it is not part of the query key, and including it
  refetches the table every time someone switches tabs.
- **`SORTABLE_COLUMNS` mirrors the API's allowlist exactly.** A value the API
  would reject with a 400 must not survive the URL either.
- **`DEFAULT_PAGE_SIZE` is 10 and `PAGE_SIZE_OPTIONS` ends at 100**, the API's
  hard cap. Both live in `hooks/common/useTableQueryParams.js` and are paired
  with `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` on the backend.
- **Rows-per-page is a URL param like any other**, and changing it resets the
  page — page 4 of 10-per-page is not page 4 of 100-per-page. It belongs in the
  toolbar with the filters, not in the footer.
- **Tables open newest-first.** `paginationFields()` defaults to `createdAt`
  descending, matching the API. Do not override it per table without a reason.
- **A table with checkboxes gets bulk remove.** The button appears only when
  something is selected — never sitting there disabled — and the dialog
  **lists the rows by name**: "Delete 12 items?" asks someone to trust a count
  they cannot check, and a mis-click on select-all looks identical to a
  deliberate selection. Clear the selection after a successful removal, or the
  button keeps offering to remove rows that no longer exist.
- **Every module with soft delete gets an Archived tab.** It is the same list
  endpoint with `archived: true`, so it reuses the same table, filters and
  pager. The tab is derived from that one field rather than being separate
  state — two sources for "which half am I looking at" will disagree.
- **Users & Roles is the exception: no remove, no Archived tab.** A staff
  account is never deleted — suspending it is the way out, and that is a status
  change inside Edit. The module has no remove or restore hook, its service has
  no `remove`/`restore`, and `toTeamMember` carries no archive fields. Do not
  "restore consistency" by adding them back.
- **The Archived tab swaps columns and verbs.** It shows "Removed On" and
  "Removed By" in place of columns that mean nothing for a removed record, and
  its only row action is Restore — no Edit, no Remove, no Add button.
- **Whatever the checkbox column offers, both tabs offer.** If a table has
  selection it needs a bulk action on Archived too — Restore there, Remove on
  the live list. Checkboxes with no button is a selection that does nothing.
  Pass `action="restore"` to `BulkDeleteButton`/`BulkDeleteDialog` rather than
  writing a second button and a second dialog.
- **A detail view must open for an archived record.** The Archived tab links to
  it, so a detail endpoint that filters `deletedAt: null` lists a row and then
  404s it. Load it, say it is archived, and offer Restore instead of Edit and
  Remove.
- **A restored record keeps its badge for good.** It is a fact about the
  record, not a transient state; a table that stops saying it after thirty days
  quietly changed what it tells you.
- **There is no permanent delete.** Never add one, and never offer it in a
  menu.
- **A pager shows page numbers, not just the current page.** Pass
  `onPageChange` so they are jumps; `buildPageItems` (`src/lib/pagination.js`)
  decides which to render and where the ellipses fall. Never re-derive that
  windowing in a component.
- **`onPageChange` and the page-size control are opt-in, per module.** Tables
  that are still dummy-backed omit both and keep Prev/Next — that is correct,
  not an oversight. They get wired up when their own module is built. See
  "Fix a module when we reach it, not before" in the root `AGENTS.md`.
- A new filter should be one schema line and nothing else. If it needs a
  hand-written setter or a bespoke memo, extend the shared hook instead.

## Do not offer an action the caller's role cannot perform

`usePermissions()` (`src/hooks/common/usePermissions.js`) reads the matrix row
the API ships with `/auth/me`. Use `canWrite(Permission.X)` to decide whether
to render a write control — Add, Edit, Remove, Restore, bulk actions and the
checkbox column that feeds them.

- **Hide, do not disable.** A greyed-out button invites a click and explains
  nothing. An assistant should see the record and the View action, not four
  controls that answer 403.
- **A checkbox column goes with its bulk action.** If the role cannot act on a
  selection, the column is not rendered at all — selection with no button is a
  control that does nothing, the same bug the Archived tab had.
- **Never re-derive the matrix from `role`.** The server owns it and sends it;
  a second copy in JavaScript drifts silently the first time a scope changes.
  `src/lib/permissions.js` holds the permission *names* and nothing else.
- **This is never the security boundary.** It renders buttons. Every route
  re-checks the same matrix server-side, because anything sent to a browser can
  be edited in one.
- While the session is loading every answer is `false`, so a control appears a
  moment late rather than appearing and being taken away.

Per "fix a module when we reach it", only the module being worked on gets
wired up. Aircraft is done; the others follow on their own turn.

## A control's value is the wire format; its label is for reading

`CommonDatePicker` emitted `"Aug 12, 2026"` — the string the Figma mock showed
— and every date field on the API rejects that with "Use a YYYY-MM-DD date".
Quotes, leads, aircraft maintenance and sourcing requests all pass the picker's
value straight to the server, so **none of their dates could be saved at all**,
in four modules, silently, until someone tried one.

This is the same rule the project already applies to enums, and it applies to
every control: **the value a component emits is what the API accepts**, and the
friendly version is produced at render time, for reading only. A control that
emits a display string has made every one of its call sites responsible for
translating it back, and they will not all remember.

The same component also opened on a hardcoded month, offered a hardcoded
"Today", and matched the selected day by substring so the 1st highlighted the
10th. Shared controls get used everywhere; a mock value left in one is a wrong
answer on twenty screens.

## Signing out an idle session takes both sides

The browser owns the precise timer, because only it can tell whether a person
is there. Four things make that harder than a `setTimeout`, and all four are
requirements:

- **"Touched" means a person, not the network.** Only real input counts, or a
  dashboard polling in a forgotten tab keeps the session alive for ever.
  `mousemove` is not input — a trackpad nudged by a sleeve fires it.
- **A sleeping machine fires no timers.** Compare the clock against a stored
  timestamp on a short tick; never schedule one shot at the deadline, or a
  laptop closed for three hours wakes with minutes still "remaining".
- **Tabs share a session**, so the last-activity stamp goes in `localStorage`.
  Otherwise the idle tab signs out the tab someone is working in.
- **Warn before acting.** Signing out silently loses whatever was on screen.

**And the server has to refuse the refresh**, or the whole thing is a UI
convention that anyone can switch off in a browser. The signal is the age of
the refresh-token row: a rotation only happens once the access token has
expired, so a session in continuous use presents a row at most one access-token
lifetime old, while an abandoned one keeps ageing. Approximate, and always in
the user's favour.

**The limit ships from `/auth/me`, never from the frontend's own env** — the
same reason the permission matrix does. Two copies of one number drift, and
they drift silently.

## Required fields must agree with the API

A form that marks only one field "(Optional)" while six more are optional is
lying, and so is a `required` attribute the server does not enforce. Three
things have to say the same thing: the Zod schema, the input's `required`, and
the label.

Blank numeric inputs are the sharp edge — an empty box sends `""`, which
`Number('')` turns into **0**. The API rejects that for required fields and
treats it as absent for optional ones, but the form should not send it in the
first place.

## Pagination is server-side

The API owns paging. Read `meta` from the response (`page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrevious`) and drive the pager from it. Never fetch a full list and slice it in the browser, and never compute `totalPages` on the client.

Use `placeholderData: keepPreviousData` so the table does not blank out between pages.
