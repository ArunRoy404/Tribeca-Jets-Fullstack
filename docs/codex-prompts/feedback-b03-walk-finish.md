# Codex prompt — Feedback B3: finish the API checklist walk

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this is

The B3 Postman run (`feedback-b03-postman.md`, report
`docs/codex-reports/feedback-b03-postman.txt`) passed every builder, both
full Newman runs and the label audit. Its API checklist walk stopped on a
product bug: landing the first of two legs completed the trip and earned its
commission, because `TripsService.updateFlight`'s count of unlanded legs
skipped legs with no flight status (SQL `NULL <> 'LANDED'` is not true).

**Claude has fixed it.** The count now includes `flightStatus: null` legs.
This task finishes what the walk did not reach. **No product code changes.**
If anything fails, stop and report it. Do not fix it.

Same environment and rules as `feedback-b03-postman.md`, "Rules". Read
AGENTS.md and that brief first:
- Port **4100** on `tribeca_postman` only, with `MAIL_DRIVER=log`,
  `REDIS_URL=redis://localhost:6380/1` and `RATE_LIMIT_MULTIPLIER=20`.
  Never the dev database or the 4000 API.
- Refresh the copy first (dropdb / createdb / `pg_dump | pg_restore` from
  `tribeca_jets`), then `npm run db:deploy` against the copy. Rebuild the API
  into your temporary folder **from the current tree**, so it includes the
  fix.
- Reapply the copy preparation the last run needed: clear the inherited
  WhatsApp settings to match the fixture, and restore the broker's exact
  permissions afterwards. No limits or counters changed.
- Probes you create are archived in teardown. Never print `.env` values.
  Never commit, push, stash or reset. Kill the 4100 process when done.

## 1. Re-verify the fix

- On a fresh two-leg probe trip with a PENDING commission: land leg 1. The
  trip stays IN_FLIGHT and the commission stays PENDING. Then land leg 2:
  the trip is COMPLETED (`reason: all_flights_landed`) and the commission is
  EARNED, with one `commission.earned` audit row.
- On the same path, a PAID and a CANCELLED commission on that trip keep
  their status, payment fields and `updatedAt`.

## 2. Finish the walk items left unreached

- **Complete warns, fully settled case:** a trip whose operator bill is fully
  paid and whose total is fully invoiced → `open-items` gives
  `operatorUnpaid: false`, `uninvoicedOpen: false`, and completion succeeds.
- **Latest trip:** after booking a trip with an operator, an aircraft and a
  leg ETA, `GET /clients/:id` returns `latestTrip` with route airports,
  status, operator name, aircraft tail/model, leg departure date/time and
  `estimatedArrival`, and no money fields (`basePrice`, `operatorCost`,
  `grossProfit`). As the broker, a client whose latest trip is outside their
  reach returns the newest trip they can see, or null.

## 3. Newman

The fix touches flight landing, so run the **Flight Tracking** folder and the
**Trips** folder standalone, twice each, against 4100. Then run the full
collection once. All green. Run the label audit if any builder ran.

## Docs (same pass)

- `docs/DEVELOPER_TEST_CHECKLIST.md`, B3: tick "Earned on completion",
  "Complete warns" and "Latest trip strip" if their API portions pass,
  adding "(API walk, 27 Nov)". Keep the screen parts marked
  **screen — not walked**. Replace the "Remaining for B3" paragraph with the
  result.
- `HANDOFF.md`, the B3 bullet: replace the outstanding walk items with the
  result. If everything passed: "API walk complete; only the developer's
  screen checks remain."

## Report

Append a section "Walk finish (27 Nov)" to
`docs/codex-reports/feedback-b03-postman.txt` covering:
1. Fix re-verification: the calls, status codes and states seen.
2. The remaining walk items: pass / fail, with the calls behind each.
3. Newman: standalone and full totals.
4. Any product bug found (and confirmation you did not fix it).
5. Confirmation: only `tribeca_postman` and port 4100 were used, probes
   archived, the 4100 process is gone, no secret printed, nothing committed.
