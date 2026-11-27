# Codex prompt — Feedback B2: Postman captures and Newman

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this is

B2 (`feedback-b02-small-fixes.md`) is built and reviewed. Its Postman
builders were updated but never run. B1's run (27 Nov) is the pattern —
same environment, same steps. This task captures their examples
against a live API and verifies the whole collection with Newman — the
live half the reviewer would normally do. **No product code changes.** If
a capture or Newman shows a product bug, stop and report it; do not fix
the API.

Builders changed in B2: `build_airports_folder.py` (latitude/longitude
range message), `build_quotes_folder.py` and `build_trip_requests_folder.py`
(`400 · Same airport`), all in `Backend/postman/`.

The seed's cleanup now clears `empty_legs` (B2's seed fix): if you reseed
the copy, it should no longer need clearing by hand — say whether it did.

## Rules (AGENTS.md, "Postman collection" — read it in full first)

- **Never the dev database or the 4000 API.** Everything runs against a
  second API on **port 4100**, pointed at the copy database
  **`tribeca_postman`**, with `MAIL_DRIVER=log`,
  `REDIS_URL=redis://localhost:6380/1` and `RATE_LIMIT_MULTIPLIER=20`.
  See `docs/REVIEW_PLAYBOOK.md` (local environment) for how this machine
  runs it.
- Refresh the copy first: `pg_dump tribeca_jets | pg_restore` into
  `tribeca_postman` (drop/recreate `tribeca_postman` only — never touch
  `tribeca_jets`), then `npm run db:deploy` against the copy.
- You may read `Backend/.env` only to build those overrides. **Never print,
  copy or write any value from it** into a file, a report or the terminal
  output you paste.
- Builders take `POSTMAN_BASE=http://localhost:4100/api`. After the
  builders, run `rewrite_body_comments.py` from inside `postman/`.
- Newman from `Backend/`, with `--env-var baseUrl=http://localhost:4100/api`.
  **Run the full collection twice**; both runs must be green (AGENTS:
  every request must pass on the second run).
- Then the label audit: one pass over the collection JSON matching each
  example's status in its name against its stored `code`; 0 mislabelled.
- A builder that raises on a label mismatch means **the request is wrong,
  not the label** — fix the request in the builder (AGENTS explains why).
  That is the only kind of file you may change, plus the collection JSON
  the builders write, and the two docs below.
- Stop the 4100 API when done, and kill the process on port 4100
  (`Get-NetTCPConnection -LocalPort 4100`) — stopping the task can leave
  Node running. Leave the 4000 API and the dev database exactly as found.
- Never git commit, push, stash or reset. No npm or pip install.

## Docs (same pass)

- `docs/DEVELOPER_TEST_CHECKLIST.md`, B2: replace the "Outstanding for B2"
  line with the result (date, example counts, Newman totals, 0 mislabelled).
- `HANDOFF.md`, the B2 bullet: "Postman captures + Newman (when the
  developer says)" → what was done, with the totals.

## Report

1. Builders run, examples written per folder, any builder you had to fix
   and why.
2. Newman totals for both runs (requests, assertions, failures).
3. The label audit result.
4. Any product bug found (and confirmation you did not fix it).
5. Confirmation: only `tribeca_postman` and port 4100 were used, the 4100
   process is gone, no secret was printed, nothing committed (`git status`).
