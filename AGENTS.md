# Tribeca Jets Command Center — working agreement

A private-jet charter brokerage CRM. Two apps, deployed separately:

- `Frontend/` — Next.js 16, **JavaScript** (not TypeScript). Has its own `AGENTS.md`; read it before touching anything in there.
- `Backend/` — NestJS 12, **TypeScript**, ESM. Has its own `AGENTS.md`.

The language split is deliberate and settled. Never migrate the frontend to TS or the backend to JS.

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
