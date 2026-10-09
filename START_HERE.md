# Start here — continuing Tribeca Jets on another machine or another AI tool

For the owner. Follow it top to bottom the first time; after that only
sections 4–6 matter. (For the AI: the project state is in `HANDOFF.md`, the
rules in `AGENTS.md`, the procedure in `docs/REVIEW_PLAYBOOK.md`.)

Checked on 8 Oct 2026: the database backup restores cleanly into a fresh
database (7 users, 5 airports, 1 operator, 5 charter rates, 3 uploads, 1
document, 36 migrations), backend 343 tests pass, frontend builds.

---

## 1. Carry these across (USB stick or private drive — never git, never chat)

| What | From (this Mac) | To (new machine) |
|---|---|---|
| Backend env | `Backend/.env` | `Backend/.env` |
| Frontend env | `Frontend/.env.local` | `Frontend/.env.local` |
| Handoff folder | `~/Desktop/works/Tribeca-Jets-Handoff/` | anywhere, e.g. the same path |

The handoff folder holds `db/tribeca_jets_2026-10-08_after_operators.dump`
(your database now), `storage_now/` (your uploaded files) and
`backup_before_wipe/` (the old data, just in case). They contain password
hashes and your settings — **never commit or upload them**.

Note: `Backend/.env` has your SMTP mail server set, so the dev API on the new
machine **sends real email** (invitations, 2FA codes), as it does here.

## 2. Install on the new machine

- **Node 22** (`Backend/.nvmrc`), **Docker Desktop** (running), **git**,
  **Python 3** (only for rebuilding Postman folders).
- Claude Code and/or Antigravity.

## 3. Set it up (once)

```bash
git clone https://github.com/ArunRoy404/Tribeca-Jets-Fullstack.git
cd Tribeca-Jets-Fullstack
git checkout roy
# put Backend/.env and Frontend/.env.local in place now

cd Backend
npm install
npm run db:generate          # Prisma client (generated, not in git)
npm run services:up          # Postgres + Redis in Docker; wait ~10 seconds

# Restore YOUR database — do NOT run db:seed (it brings demo data back)
docker exec -i tribeca_postgres pg_restore -U tribeca -d tribeca_jets --clean --if-exists --no-owner \
  < ~/Desktop/works/Tribeca-Jets-Handoff/db/tribeca_jets_2026-10-08_after_operators.dump
npm run db:deploy            # "No pending migrations" is the expected answer

# Your uploaded files (profile photo, operator document)
mkdir -p storage && cp -R ~/Desktop/works/Tribeca-Jets-Handoff/storage_now/. storage/

# Postman's own copy of the database (the AI uses it for Postman runs)
docker exec tribeca_postgres createdb -U tribeca tribeca_postman
docker exec tribeca_postgres sh -c 'pg_dump -U tribeca -Fc tribeca_jets | pg_restore -U tribeca -d tribeca_postman --no-owner'

npm run start:dev            # API on http://localhost:4000/api

# second terminal
cd ../Frontend
npm install
npm run dev                  # http://localhost:3000
```

(Adjust `~/Desktop/works/Tribeca-Jets-Handoff` if you put the folder elsewhere.)

**Check it worked:** sign in at http://localhost:3000 as `roy.techreion@gmail.com`
/ `ChangeMe123!` (Super Admin). You should see your live staff dashboard.

## 4. Start a session

**Claude Code:** open the project folder, then either
- type `/review-module Trip Requests` (the command is in the repo), or
- paste the prompt from **`HANDOFF.md` → Part 3**.

`CLAUDE.md` loads the rules automatically.

**Antigravity:** open the project folder (the root, not `Backend/` or
`Frontend/`). It should pick up `.agent/rules/tribeca.md` and `GEMINI.md`;
whether or not it does, **paste the prompt from `HANDOFF.md` → Part 3** as the
first message — that prompt makes it read everything. A `review-module`
workflow is in `.agent/workflows/`. Use the strongest model it offers for
this work.

Either tool should answer with the current state and "next: Trip Requests (#13)"
(with modules #8–#12 reviewed and ready for owner manual testing)
before writing any code. If it starts coding straight away, stop it and tell
it to read the files first.

## 5. While working — talk to it the way you talk to me

- "dont do anything yet, answer me" → it only answers.
- "go with your recommendation" → it builds what it recommended.
- "fix this, then tell me what to test" → fix + numbered test steps.
- "it works" → it marks the module ✅ in the docs.
- "commit and push per batch" → only then does it commit.

Things to watch for (you caught these on 8 Oct): a dropdown that is not the
shared `CommonSelect` / picker, an upload that is not the shared
`FileUpload`, a blank table cell instead of "—", a dialog that jumps in
height while loading.

## 6. End every session with this (before your usage runs out)

Paste:

> Before we stop: update HANDOFF.md — the module tracker, "What is next"
> (with what you found in the module we are on, if it is unfinished), and a
> new dated entry at the top of the Part 4 session log with every decision I
> made today. Update MODULES.md and MODULE_FEATURE_STATUS.md if anything
> changed. Then commit and push per batch.

Then on the next machine or tool: `git pull` before anything else.

## 7. Coming back to this Mac

Code comes back through `git pull`. **The database does not** — what you
enter on the other machine stays there. To bring it back, on the other
machine:

```bash
docker exec tribeca_postgres pg_dump -U tribeca -Fc tribeca_jets > tribeca_jets_<date>.dump
```

and carry that file plus `Backend/storage/` back, restoring as in section 3.
Or simply keep testing on whichever machine has the data you need.

Do not run two AI tools on the same module at the same time.

## 8. If something goes wrong

| Symptom | Fix |
|---|---|
| `Cannot find module …/generated/prisma` | `cd Backend && npm run db:generate` |
| API won't start: database or Redis refused | Docker Desktop not running → start it, `npm run services:up` |
| Port 5432 already in use | another Postgres runs on the machine — stop it |
| Sign-in fails after the restore | right password? `admin@example.com` / `ChangeMe123!`; clear the site's cookies |
| Pictures/documents show broken | `storage_now/` was not copied into `Backend/storage/` |
| `pg_restore` printed "errors ignored" warnings | usually harmless with `--clean` on an empty DB; check section 3's sign-in test |
| Migration pending / schema errors | `cd Backend && npm run db:deploy` |
| The AI wants to run `db:seed` or reset the database | say no — it would replace your data |
