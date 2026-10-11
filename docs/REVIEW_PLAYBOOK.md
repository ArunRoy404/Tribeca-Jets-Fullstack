# Review playbook — how a module is reviewed, and how to work with the owner

Written 8 Oct 2026, after seven modules were reviewed this way. It is for
**any** AI agent working on this repository — Claude Code, Antigravity,
Cursor or another — so the work goes the same way whichever one is open.

Read order for a new session: `HANDOFF.md` (where we are) → `AGENTS.md` (the
rules) → this file (the procedure) → `docs/MODULES.md` (the review tracker) →
`docs/MODULE_FEATURE_STATUS.md` (per-module detail).

---

## 1. How the owner works

The owner is the developer and product owner. They review the CRM **one module at
a time**, test each in the browser themselves, and sign it off. This started
on 6 Oct 2026 because earlier autonomous bulk work left modules broken,
half-integrated, or with UI features silently removed — green tests did not
mean a working screen.

**How to read the owner's messages:**

| They say | You do |
|---|---|
| "dont do anything yet, answer me" / "just answer" | Answer only. No edits, no commands that change anything. Short. |
| "what to do in X" / "what is next" | A short list: what the module does, what is wrong, what you recommend. Then wait. |
| "go with your recommendation(s)" | Implement exactly what you recommended, professionally, then report. |
| A Figma screenshot | Figma is a reference, not gospel. Keep fields that are needed, drop what is not, and say which and why before building. |
| "fix this, then tell me what to test" | Fix, verify, then numbered test steps: where to click, what to type, what they should see. |
| "it works" / "everything works as expected" | Sign-off. Mark the module ✅ (section 4, step 9). |
| "commit and push per batch" | Commit split by concern, then push. **Only then.** |

**Style of replies:** short lists, plain words, no padding, no recaps of
work already described. Say what is true — if a check was skipped or failed,
say so. When the request conflicts with the code, say so in one sentence and
carry on under a stated assumption.

**Things the owner has caught and will catch again** — check these before
saying a module is done:

- A dropdown or file upload that was hand-rolled instead of the **shared
  component** (8 Oct, Operators: "you didnt used the reusable component").
  See section 3.
- A table cell left **blank** instead of "—" (8 Oct, Operators: Aircraft
  Types). Every cell, in the table *and* the mobile card.
- A dialog that **changes height** while loading — use a skeleton of the
  final size (8 Oct, Instant Estimate).
- A **picker that cannot scale** — a plain select over a server list.
  Records go in `RecordPicker` (section 3).
- **Test/debug data leaking** into what the owner sees (8 Oct: Postman's
  "Q…" airports in the picker). Postman runs on its own database now.

---

## 2. Absolute rules (the short version; details in AGENTS.md)

1. **Never `git commit` or `git push`** unless the owner says so in that
   message. Leaving finished work uncommitted is the correct resting state.
2. **Stay inside the module under review.** Other modules are fixed on their
   own turn; mention a finding once, do not fix it.
3. **Never remove or hide a UI feature without asking.** Anything hidden is
   logged in that module's "Waiting on a dependency" table in
   `MODULE_FEATURE_STATUS.md`.
4. **Never display a number the data did not supply.** Blank is "—",
   "Not rated" or "Not on file". No defaults, no `|| "4.8"`.
5. **Never email a real person** from Postman or the seed — `example.com` only.
   Never send the owner's own email address to an outside service.
6. **No destructive database reset** without the owner's explicit consent.
   **Do not run `npm run db:seed`** on the owner's database (section 6).
7. **Keep production R2 keys out of the local `.env`.**
8. **Docs move with the code**, in the same pass (section 4, step 8).

---

## 3. Shared pieces a reviewed module must use

If a form or table in the module does any of these by hand, replacing it is
part of the review.

| Need | Use | Where |
|---|---|---|
| A dropdown over a **server list** (airport, operator, aircraft, client, broker) | `RecordPicker` via a thin wrapper: `AirportPicker`, `OperatorPicker` exist; add `AircraftPicker`, `ClientPicker`… as modules are reviewed | `components/common/record-picker/`, `components/airports/`, `components/operators/` |
| A dropdown over a **fixed set** (an enum) | `CommonSelect` (an optional one gets a "Not rated"/"Not on file" choice — see `OptionalSelect` in `AddOperatorDialog.jsx`) | `components/common/CommonSelect.jsx` |
| Text, email, password, textarea | `CommonInput` | `components/common/` |
| File or photo upload | `FileUpload` (`variant="dropzone"`, `multiple`, `library` for photos) | `components/common/FileUpload` |
| Filing several uploads into the Document Vault on save | `useFileDocuments` | `hooks/documents/` |
| A date / a time | `DatePicker` / `TimePicker` (emit `YYYY-MM-DD` / `HH:MM`) | `components/common/` |
| Status pill | `StatusBadge` | `components/common/` |
| Confirmation | `ConfirmDialog` — never `window.confirm` | `components/common/` |
| Payload building | `optionalText` / `optionalNumber` | `lib/form.js` |
| Table state | `useTableQueryParams`, `PageSizeSelect`, `TablePagination`, `BulkDeleteButton/Dialog`, `RestoredBadge` | `hooks/common/`, `components/table/common/` |
| Permission checks (frontend) | `usePermissions().canAccess(Module.X, Action.Y)` | `hooks/common/usePermissions.js`, `lib/access.js` |
| Who is an administrator (frontend) | `isAdministratorRole(role)` | `lib/roles.js` |
| Backend: route permission | `@RequireAccess(Module.X, Action.Y)`; `@StaffOnly()` on the controller for desk data | `common/decorators/access.decorator.ts` |
| Backend: a picked airport | `AirportsService.usable(id, label)` | `modules/airports/` |
| Backend: numbers / dates / uploads in DTOs | `requiredNumber`/`optionalNumber`/`nullableNumber`, `calendarDate`/`timestamp`, `uploadUrl` | `common/dto/` |

---

## 4. The review procedure, step by step

**Step 1 — Read before proposing.** The module's frontend (dialogs, table,
detail tabs), its backend (controller, DTO, service, schema), its row in
`MODULES.md`, its section in `MODULE_FEATURE_STATUS.md`, and the Figma frame
if the owner shared one (`.mcp.json` has the Figma MCP server).

**Step 2 — Tell the owner, in a short list:** what the module does, what is
broken / missing / inconsistent with Figma, which fields to keep or drop, and
your recommendation. **Wait** for their decision.

**Step 3 — Backend.**
- Every `GET` needs only a session (no decorator) — pickers in other modules
  rely on it. Ask the owner first if a read carries money, passports, or desk
  data a referral agent must not see; desk data gets `@StaffOnly()` on the
  controller (Operators is the pattern).
- Every write: `@RequireAccess(Module.X, Action.CREATE/EDIT/ARCHIVE/…)`,
  replacing the old `@RequirePermissions` / `@RequireWritePermissions`.
  Services: `canDo(user.access, …)` / `reachOf(user.access, …)` replacing
  `scopeFor`.
- Every picked id is re-checked on the server: exists, live, in reach — a
  named 400 otherwise, and only when the value is changing.
- Update DTO is its own `z.object`, never `.partial()`. A field the DTO
  accepts is in the select.
- Schema change → hand-written migration, tested on a copy of the database
  (section 6), drift checked.
- An `*.access.spec.ts` pinning which routes carry which access
  (`operators.access.spec.ts`, `airports.controller.spec.ts` are the pattern).

**Step 4 — Frontend.**
- Write controls gated with `canAccess` — **hide, never disable**; no
  checkbox column without a bulk action the person may use.
- Shared components everywhere (section 3). Pickers over records →
  `RecordPicker` wrapper.
- Every empty cell "—" in table *and* card; stars only for a real rating.
- Edit form prefills every field the API returned; required marks match the API.
- Dummy data and placeholders gone.

**Step 5 — Verify.**
```bash
cd Backend && npx tsc --noEmit && npm run lint && npm test
cd ../Frontend && npx eslint src/<touched> && npm run build
```
Baselines (8 Oct 2026): backend **343 tests pass**; frontend lint has **one
pre-existing error** (`TripRequestDialog.jsx`, fixed on Trip Requests' turn).

**Step 6 — Postman.** Rebuild the module's folder with its builder
(`Backend/postman/build_<module>_folder.py`, on `builder_common.py`) against
the 4100 test API on the `tribeca_postman` database (section 6). Every example
captured live; the teardown is its **own last request**; the folder must pass
on its own, **twice**.

**Step 7 — Tell the owner what to test.** Numbered steps, including each
role: `broker@`, `assistant@`, `agent@` (all `example.com`, password
`ChangeMe123!`).

**Step 8 — Docs, same pass.** `MODULE_FEATURE_STATUS.md` (the module's
"Reviewed" block, its waiting table), `MODULES.md` Review column,
`HANDOFF.md` ("Where we are" + "What is next"), and `AGENTS.md` for any rule
that will still be true next week.

**Step 9 — On sign-off.** Mark ✅ with the date in `MODULES.md`, `HANDOFF.md`
and `MODULE_FEATURE_STATUS.md`. Commit **only when asked**, in batches by
concern (e.g. shared backend piece → module backend → frontend → postman →
docs), each message ending with the tool's co-author line if it uses one.

---

## 5. Using two AI tools on the same project

The owner may switch between Claude Code and Antigravity (or others) across
machines. Neither tool remembers the other's conversation, so **the repo is
the only shared memory**:

- **Start of a session:** `git pull` on branch `roy`, then read the files in
  the order at the top of this document. Tell the owner the current state and
  next step in a short list before writing code.
- **End of a session** (or before the owner's usage runs out): update
  `HANDOFF.md` — the module tracker, "What is next", and a dated entry in its
  session log with the decisions the owner made. A decision that is only in a
  chat is lost.
- **One module at a time, one tool at a time.** Do not let two tools work
  the same module in parallel on different machines.
- **Machine-local state does not travel:** the database, `Backend/storage/`
  (uploads), and both `.env` files. Section 6 says how to move them.
- Entry files: Claude Code reads `CLAUDE.md` (imports `AGENTS.md`);
  Antigravity / Gemini read `GEMINI.md` and `.agent/rules/`; Codex, Cursor and
  most others read `AGENTS.md`. All of them point here. **Rules live only in
  `AGENTS.md`** — the entry files carry no rules of their own.
- A `review-module` command exists for both tools:
  `.claude/commands/review-module.md` (`/review-module Aircraft`) and
  `.agent/workflows/review-module.md` (Antigravity workflow). Both just run
  section 4 of this file.

---

## 6. Local environment specifics

**Databases (Docker Postgres `tribeca_postgres`, user `tribeca`):**
- `tribeca_jets` — the owner's dev database. **Wiped 8 Oct 2026** for clean
  testing; the owner re-enters real data module by module. Never seed it.
- `tribeca_postman` — a copy for Postman runs. Refresh after a migration:
  ```bash
  docker exec tribeca_postgres dropdb -U tribeca --if-exists tribeca_postman
  docker exec tribeca_postgres createdb -U tribeca tribeca_postman
  docker exec tribeca_postgres sh -c 'pg_dump -U tribeca -Fc tribeca_jets | pg_restore -U tribeca -d tribeca_postman --no-owner'
  ```
- No `psql` on the host; use `docker exec tribeca_postgres psql -U tribeca -d tribeca_jets`
  or a throwaway `.cjs` script in `Backend/`.

**Testing a migration:** restore a backup into a throwaway database
(`tribeca_migtest`), `npm run db:deploy` against it, then check drift:
```bash
DATABASE_URL=…/tribeca_migtest npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script --config prisma7.config.ts
```
(empty output = no drift). `--from-migrations` needs a shadow DB; don't use it.

**The Postman test API on port 4100** — never Newman against 4000 (it sends
real mail). `npm run build` would kill a running `start:dev`, so compile to a
separate folder:
```bash
cd Backend
T=/tmp/tribeca-api && mkdir -p $T && ln -sfn "$PWD/node_modules" $T/node_modules
echo '{"type":"module"}' > $T/package.json
npx tsc -p tsconfig.build.json --outDir $T/dist --incremental false --tsBuildInfoFile null
PORT=4100 MAIL_DRIVER=log REDIS_URL=redis://localhost:6380/1 \
  DATABASE_URL="postgresql://tribeca:<password>@localhost:5432/tribeca_postman?schema=public" \
  node $T/dist/main.js
# then, from Backend/:
POSTMAN_BASE=http://localhost:4100/api python3 postman/build_<module>_folder.py && (cd postman && python3 rewrite_body_comments.py)
npx newman run postman/Tribeca-Jets-API.postman_collection.json -e postman/Local.postman_environment.json \
  --env-var baseUrl=http://localhost:4100/api --folder "<NN · Module>"
```
(If `dist/main.js` is missing, tsc skipped emitting — keep the two
`--incremental false --tsBuildInfoFile null` flags.)
