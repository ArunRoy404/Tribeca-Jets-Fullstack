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

## Contract rules that apply to both sides

- **Enum values are the backend's `SCREAMING_SNAKE_CASE`**, on the wire and in the database. The frontend maps them to display labels at the edge; it never invents its own vocabulary (no `"Senior Broker"` on the wire when the enum says `SENIOR_BROKER`).
- **Every list endpoint is paginated** and returns `{ success, data, meta }` with a full `meta`. There are no unpaginated list endpoints.
- **Soft delete everywhere** (`deletedAt`). Historical data is never destroyed.
- **Auth is httpOnly cookies only.** No token is ever returned to, stored by, or read by the frontend.

## Postman collection

`Backend/postman/` is a deliverable, not a scratch file. Every endpoint that ships gets its entry in the same pass as the code.

- Folders and requests are **serial-numbered** (`01 Auth`, `02 Users`, `01 List users`) so the collection reads in execution order.
- Every request carries a **full, realistic success example** and **an example for every error it can return** (400 / 401 / 403 / 404 / 409 / 422 / 429), captured from a real run — not hand-written.
- **JSON bodies carry a comment on the right of each line** explaining the field.
- **Every query parameter is described**, including all pagination, sort and filter params, with its default and its bounds.
- **Enums and fixed-value fields are documented case-sensitively**, listing the exact accepted values.
- Verify with `newman` before calling the collection done. A collection that has not been run is not finished.

## Keep these files current

When an instruction lands that will still be true next week — a product rule, a
constraint, a correction of something you did wrong — **write it into the
relevant `AGENTS.md` in the same pass as the code**, without being asked twice.
Rules that live only in a chat log are rules the next session will break.

Judge by durability, not by emphasis. "Make the button blue" is a task. "Status
is never changed by a password reset" is a rule. When it is genuinely one task,
leave these files alone — a document that records everything is not read.

## Communication

- Report what is actually true: if a check was skipped, say so; if tests fail, show the output.
- When something in the request conflicts with the code, say so in a sentence and keep building under a stated assumption.
- Do not re-explain work already described. Do not pad with recaps.
