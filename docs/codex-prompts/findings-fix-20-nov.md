# Codex prompt — the four logged findings (20 Nov 2026)

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/findings-fix-20-nov.md and carry out everything
below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md in full (it is the whole rulebook), then
HANDOFF.md's "Known findings, not yet fixed", and every file the brief's
§0 lists.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No database: do not run migrations, the seed, SQL, the API, builders or
  Newman. `npx prisma generate` and `npx prisma validate` are allowed. No
  live calls to anything external. Do not open, print or copy any .env.
- No npm or pip install.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Finish with the §8 report.
```

---

Four findings logged in `HANDOFF.md` ("Known findings, not yet fixed"),
fixed in one pass. Each is its own section; keep them separable so each
can be committed on its own.

## 0. Read first

AGENTS.md (whole) and `HANDOFF.md` → "Known findings, not yet fixed".
Then, per section:
- §1: `common/authorization/roles.ts` (`BROKER_ROLES`),
  `modules/clients/clients.service.ts` (`assertBroker`, the pattern),
  `modules/{trips,trip-requests,quotes,commissions}/*.service.ts`
  (`assertBroker`), their specs.
- §2: `modules/client-credits/client-credits.service.ts` (`client()`,
  `assertMayWrite`), `common/authorization/{access.catalogue,access.roles,access}.ts`,
  migrations `20261110100000_trips_approve_permission` and
  `20261110110000_trips_assign_permission` (the pattern for granting a new
  action), the frontend's Client Credits tab and `src/lib/access.js`.
- §3: `common/database/filters.ts` (`searchAcross`) and **every caller**
  (grep `searchAcross(`).
- §4: `modules/trips/trips.service.ts` (`remove`, `removeMany`, `restore`,
  `restoreMany`, and where it creates the "Approve Trip …", "Review
  Assigned Trip …" and "… Approval Declined" tasks), `prisma/schema/task.prisma`,
  `modules/tasks/tasks.service.ts`.

## 1. The assigned broker is checked by every module, the same way

**Finding:** Trips, Trip Requests and Quotes accept any live account as
`assignedBrokerId` — an assistant or a referral agent passes; Commissions
refuses only the referral agent. Clients does it right: the account must
be live, active and hold a role in `BROKER_ROLES`.

- One shared check, not four private copies (AGENTS.md "Extract on the
  second copy"): lift Clients' `assertBroker` logic into a shared place
  that every module can call — `UsersService` if it fits (read it), or a
  small helper beside `BROKER_ROLES` that takes the Prisma client — and
  move **Clients, Trips, Trip Requests and Quotes** onto it in this pass.
- **Commissions:** read what its `assertBroker` is for. If the person it
  checks must be a broker (a broker's share), move it onto the shared
  check; if it deliberately allows other staff, keep its rule and say so.
  Stop and report if unclear.
- **Decided after Codex's first stop:**
  - **Status:** the shared check refuses a **`SUSPENDED`** account (Clients
    selected `status` and never checked it). `ACTIVE` and `INVITED` both
    pass — a broker invited this morning can be given a client before their
    first sign-in. Live (`deletedAt` null) and a `BROKER_ROLES` role, as
    today. The shared helper sits beside `BROKER_ROLES` (Codex's finding).
  - **Commissions** moves onto it for both the BROKER recipient and the
    attributed broker (Codex's finding: both mean "a broker").
  - **The implicit default on create:** Trips, Trip Requests and Quotes
    store the caller as broker when none was picked. Keep that **only when
    the caller's own role is in `BROKER_ROLES`**; otherwise store `null`
    (unassigned). An assistant who creates a trip without picking a broker
    leaves it unassigned — still visible to them, since these three
    modules' limited reach includes unassigned rows (confirmed by Codex).
    **This default change is for Trips, Trip Requests and Quotes only.**
    Clients and Commissions exclude unassigned rows from limited reach, so
    their create behaviour stays exactly as it is; they only move onto the
    shared check for an id that is supplied. An id the caller
    **supplies** always goes through the shared check.
- Same 400 everywhere, naming the field (Clients' message is the
  pattern). Validate only when the value is changing (AGENTS.md "Validate
  a foreign key only when it is actually changing") — check each caller
  already compares against the stored value, and add it where missing.
- Tests: per module, an assistant and a referral agent refused, a broker
  and an admin accepted, an unchanged id on edit not re-checked.

## 2. Client Credits: a permission, not a role check

**Finding:** `client()` and `assertMayWrite` refuse `UserRole.ASSISTANT`
by role, which AGENTS.md "Authority is never a role check in a service"
forbids. The owner cannot give an assistant the credits ledger, or take it
from a broker.

- New action **`CLIENTS · VIEW_MONEY`** — label "See money on account"
  (read how labels are set; `VIEW_MONEY` already exists as an action
  name, so this is adding it to the Clients module's actions, with a
  Clients-specific label only if the catalogue supports per-module labels
  — otherwise keep the shared label and say so).
- **Roles:** Super Admin and Admin — default. Broker — **default** (they see
  credits today). Assistant — **optional** (off by default, grantable: the
  point of the fix). Referral agent — locked, as all of Clients is.
- **Reads** of the ledger need `CLIENTS · VIEW` **and** `CLIENTS ·
  VIEW_MONEY`; **writes** need `CLIENTS · EDIT` **and** `VIEW_MONEY`. 403 on
  a missing capability, as today; 404 for a client out of reach, as today.
  Remove both `UserRole.ASSISTANT` checks.
- **Migration** `20261120150000_clients_view_money_permission` (AGENTS.md:
  "A new action that takes over an existing power ships with a migration
  that grants it to everyone who held that power"): add `VIEW_MONEY` to
  `users.permissions -> 'CLIENTS'` for every user whose stored set has
  `CLIENTS` with `VIEW` and whose role is **not** `ASSISTANT` (and not
  `REFERRAL_AGENT`). A null `permissions` column reads as role defaults —
  leave it null. Follow the two Nov 10 migrations' SQL exactly.
- **Frontend:** the credits tab / panel shows when `canAccess(CLIENTS,
  VIEW_MONEY)`, not by role (grep for an assistant role check there too);
  Users & Roles lists the new action automatically from the catalogue —
  confirm it does.
- Tests: the action in the catalogue and role grants; an assistant without
  it 403, with it allowed; a broker without it 403; the migration's SQL is
  reviewed by the reviewer.

## 3. A full name finds the client

**Finding:** `searchAcross` matches the whole term against one column at a
time, so "Elena Rostova" matches neither `firstName` nor `lastName` — in
every list's search.

- **Additive, never narrowing** (the screens are signed off): keep the
  current match — the whole term `contains` in any field — **and** add: the
  term split on whitespace into words, every word matching some field
  (`AND` of per-word `OR`s). Final shape: `OR: [ wholePhraseAnyField,
  { AND: words.map(w => ({ OR: fields.map(f => contains w) })) } ]`. A
  single word adds nothing (skip the second branch). Cap the words (e.g.
  6) so a pasted paragraph does not build a huge query; trim and drop
  empty words.
- **Return shape:** callers spread or `AND` the result. Read every caller
  (AGENTS.md "Never spread two `OR`s"): the helper now returns an `OR`
  whose second member holds an `AND` — confirm no caller spreads it beside
  another `OR` or `AND` that it would overwrite. Fix any that do by
  joining with `AND: [...]`, as Quotes and Trip Requests already do.
- **Unit tests** for the helper (it has none): empty term, one word, two
  words across two fields ("Elena Rostova"), a phrase that only matches
  whole (an email, "TJ-11", a phone with spaces "+1 555 0100" still
  matching as before), the word cap.
- The WhatsApp `find_client` tool tells the model to send one name because
  of this bug — update that instruction so a full name is allowed.
- **Quotes and Trip Requests have their own client-name clauses** in
  `searchWhere` (Codex's finding), so `searchAcross` alone leaves them
  unable to find "Elena Rostova". Give them the same rule — whole phrase
  as today, **or** every word matching the client's first or last name —
  through **one** shared builder in `filters.ts` that both they and
  `searchAcross` use (it must accept relation paths such as
  `client.firstName`). No third private copy of the word-split. Their
  `AND: [visibilityScope, searchWhere]` join stays exactly as it is.

## 4. Archiving a trip archives its open system tasks

**Finding:** archiving a trip leaves its open system tasks on the Tasks
Board — a task about a trip nobody is working. **Developer's decision
(20 Nov): close them with the trip.**

- **A source marker, not title matching** (decided after Codex's stop: a
  person can create or rename a task to the same title, so a title cannot
  tell them apart). New nullable column **`Task.systemKind`**, an enum
  `TaskSystemKind { TRIP_APPROVAL, TRIP_ASSIGNED, TRIP_DECLINED }`; `null`
  means a person wrote it. The trips service sets it on the three tasks
  it raises. It is **not** in any task DTO — a person can never set or
  change it, and a rename leaves it as it is. (Corrected after Codex's
  stop: the task DTOs are `z.object()`, not strict, so a sent `systemKind`
  is **stripped**, not refused. That protects the stored value; keep it.
  Do **not** switch the task DTOs to strict in this pass — it would change
  what every existing caller may send. Pin it instead: a test that a
  create and an update carrying `systemKind` store nothing of it.)
- **Migration** `20261120160000_task_system_kind`: add the enum and
  column; backfill existing rows **once** by the generated title patterns
  (`Approve Trip TJ-%`, `Review Assigned Trip TJ-%`, `Trip TJ-% Approval
  Declined`) on rows with a `tripId`. The one-time overlap with a
  hand-written task of the identical title is accepted by the developer —
  say so in the migration's comment.
- **Switch the existing title matching to it:** the approval and decline
  paths that close the approvers' tasks by `title: { startsWith:
  'Approve Trip' }` (around lines 1529 and 1587) use `systemKind:
  TRIP_APPROVAL` instead. After this pass nothing finds a task by title.
- A task a person created about the trip (`systemKind` null) is **not**
  touched — it is theirs to close.
- On `remove` / `removeMany`: **archive** (soft delete — `archiveData`,
  never complete: "completed" would claim the work was done) every open
  (`status` not `COMPLETED`, `deletedAt` null, `systemKind` not null)
  task of the trip, in
  the same transaction as the trip, with the **same** `deletedAt` instant
  and `deletedById` as the trip.
- On `restore` / `restoreMany`: restore exactly the system tasks of that
  trip whose `deletedAt` equals the trip's `deletedAt` and whose
  `deletedById` equals the trip's — the ones its archive closed, nothing
  archived separately before.
- The trip's audit entry (`trip.archived` / `trip.restored`) carries
  `{ tasksArchived: n }` / `{ tasksRestored: n }`.
- Use the tasks module's service if it offers this; otherwise follow how
  `trips.service.ts` already writes those tasks, and say which.
- Tests: archive closes only open system tasks (not completed ones, not a
  person's task), restore brings back only those, bulk paths too, the
  audit counts.

## 5. Postman (written now, captured by the reviewer)

- Trips, Trip Requests and Quotes builders: a `400 · Not a broker`
  example on create (an assistant's id as `assignedBrokerId`), reading the
  assistant from the seed by email (`assistant@example.com`), never a
  named demo record.
- Clients builder (or the folder that documents client search): a
  `200 · Full name` example (`?search=` with a seeded client's first and
  last name — read the seed for a client it writes).
- Client Credits folder: confirm its examples still hold (the broker and
  admin keep access through the migration); add none unless one breaks.
- Trips folder: if a builder archives a trip, its teardown still leaves
  no live probe; nothing else changes.
- README: the new examples.

## 6. Docs and rules (same pass)

- `HANDOFF.md` → **do not edit** (the reviewer moves the findings).
- `AGENTS.md`: under "Authority is never a role check", add Client Credits
  as the third example (`CLIENTS · VIEW_MONEY`, 20 Nov 2026); under List
  endpoints, a line that `searchAcross` matches the whole phrase or every
  word; under Trips (or the archive section), that archiving a trip
  archives its open system tasks and restoring brings back the same ones.
- `docs/MODULE_FEATURE_STATUS.md`: the affected modules' lines.

## 7. Run and paste

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
```

## 8. Report

1. Files created / changed, one line each, grouped by §1–§4, and the
   migration SQL in full.
2. Anything in this brief that did not match the code, and what you did.
3. Decisions the brief left to you (where the shared broker check lives,
   Commissions' rule, the per-module label).
4. The §7 output (counts).
5. Confirmation that nothing was committed or run against a database or an
   external service, and no `.env` was opened (`git status`).
