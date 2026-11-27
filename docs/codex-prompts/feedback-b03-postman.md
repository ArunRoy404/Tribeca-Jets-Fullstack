# Codex prompt — Feedback B3: Postman captures and Newman

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this is

B3 (`feedback-b03-workflow-rules.md`) is built and reviewed. Its Postman
builders were updated but never run. B2's run (27 Nov,
`feedback-b02-postman.md`) is the pattern: same environment, same steps.
This task captures B3's examples against a live API and verifies the whole
collection with Newman. **No product code changes.** If a capture or Newman
shows a product bug, stop and report it. Do not fix the API.

**B3 has a migration**, `20261127120000_feedback_b3` (three nullable
columns). It must be applied to the copy (`npm run db:deploy` against
`tribeca_postman`, below) before the 4100 API starts, or every builder fails
on the missing columns. Do not apply it to `tribeca_jets`. The developer
does that.

Builders changed in B3, all in `Backend/postman/`:
- `build_commissions_folder.py`: Mark Paid with method and reference;
  `400 · Method required`.
- `build_trips_folder.py`: `400 · Not ready to confirm`; `GET open-items`
  200 / 401 / 404.
- `recapture_clients_examples.py`: `leadSourceOther`;
  `400 · Describe the source`.
- `build_operators_folder.py`: `oaRequired` true and cleared to null. After
  review, a **create** body may not send `oaRequired: null` (the API refuses
  it). Only the PATCH clears with null.

## Rules (AGENTS.md, "Postman collection". Read it in full first)

- **Never the dev database or the 4000 API.** Everything runs against a
  second API on **port 4100**, pointed at the copy database
  **`tribeca_postman`**, with `MAIL_DRIVER=log`,
  `REDIS_URL=redis://localhost:6380/1` and `RATE_LIMIT_MULTIPLIER=20`.
  See `docs/REVIEW_PLAYBOOK.md` (local environment) for how this machine
  runs it.
- Refresh the copy first: `pg_dump tribeca_jets | pg_restore` into
  `tribeca_postman` (drop/recreate `tribeca_postman` only; never touch
  `tribeca_jets`), then `npm run db:deploy` against the copy.
- You may read `Backend/.env` only to build those overrides. **Never print,
  copy or write any value from it** into a file, a report or the terminal
  output you paste.
- Builders take `POSTMAN_BASE=http://localhost:4100/api`. After the
  builders, run `rewrite_body_comments.py` from inside `postman/`.
- Newman from `Backend/`, with `--env-var baseUrl=http://localhost:4100/api`.
  **Run the full collection twice**; both runs must be green (AGENTS:
  every request must pass on the second run). Also run each rebuilt folder
  standalone twice.
- Then the label audit: one pass over the collection JSON matching each
  example's status in its name against its stored `code`; 0 mislabelled.
- A builder that raises on a label mismatch means **the request is wrong,
  not the label**. Fix the request in the builder (AGENTS explains why).
  That is the only kind of file you may change, plus the collection JSON
  the builders write, and the two docs below.
- A folder that creates a row archives it in its own last teardown request.
  A commission marked PAID or a trip completed during capture is on a probe
  the folder created, never on a seeded record.
- Stop the 4100 API when done, and kill the process on port 4100
  (`Get-NetTCPConnection -LocalPort 4100`). Stopping the task can leave
  Node running. Leave the 4000 API and the dev database exactly as found.
- Never git commit, push, stash or reset. No npm or pip install.

## Checklist walk (API, on the same 4100 copy)

The dev database already has the migration (applied 27 Nov). Do not touch it.
After Newman, walk the B3 section of `docs/DEVELOPER_TEST_CHECKLIST.md`
**through the API** on 4100 / `tribeca_postman`, signed in as the seeded
accounts (`owner`/admin, `broker@example.com`, the referral agent). For each
item, make the calls that prove it and record pass / fail with the status
codes and the fields you checked:
- Mark Paid: refused without a method; saved with method and reference. An
  older PAID commission with no method accepts a notes-only edit. The agent's
  `GET /portal/commissions` (or the commission read) shows date, method and
  reference, and no notes.
- Earned on completion, by both paths: the status change to COMPLETED, and
  the last leg marked LANDED. A PAID or CANCELLED commission is unchanged.
- Confirm refused, naming the operator tick and the departure time.
- `GET /trips/:id/open-items` as admin (amounts) and as broker (flags,
  amounts null). Completion still succeeds with open money.
- A quote sent to a NEW lead moves them to QUOTED with a `client.stage_changed`
  timeline entry. Booking moves them to Active / Won with the trip reference.
  A WON client is not moved back.
- The client detail returns `latestTrip` (or null with no trips).
- `leadSource: OTHER` without `leadSourceOther` → 400. Switching the source
  away clears it.
- `oaRequired` true / false / null round-trips. A create with `null` → 400.

Use probes you create, and archive them in teardown. The on-screen half (the
dialogs, the strip's layout, Edit financials scrolling) stays with the
developer: list those items as "screen — not walked".

## Docs (same pass)

- `docs/DEVELOPER_TEST_CHECKLIST.md`, B3: replace the "Outstanding for B3"
  line with the result (date, example counts, Newman totals, 0 mislabelled),
  and tick each checklist item the API walk passed, adding "(API walk, 27 Nov)".
  Put anything that failed under "Issues found".
- `HANDOFF.md`, the B3 bullet: replace "Postman captures + Newman (…)" under
  Outstanding with what was done, with the totals.

## Report

Write it to `docs/codex-reports/feedback-b03-postman.txt`:

1. Builders run, examples written per folder, any builder you had to fix
   and why.
2. Newman totals for both full runs (requests, assertions, failures) and
   the standalone runs.
3. The checklist walk: each B3 item pass / fail / screen — not walked, with
   the calls and status codes behind it.
4. The label audit result.
5. Any product bug found (and confirmation you did not fix it).
6. Confirmation: only `tribeca_postman` and port 4100 were used, the
   migration was applied to the copy only, the 4100 process is gone, no
   secret was printed, nothing committed (`git status`).
