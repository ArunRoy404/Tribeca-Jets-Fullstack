# Codex prompt — Feedback B2: small fixes and polish

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this batch is

Eleven small items from Round 1 (QA), Round 2 (Ari) and the B1 Postman
run. **No migration.** Each item is independent: if one does not match the
code, report it and carry on with the rest (this batch only — B1's rule was
to stop entirely).

| ID | Item |
|---|---|
| R1-03 | Client requirements go to the quote's `internalNotes`, never `terms`; preview title "QUOTE", not "QUOTES" |
| R1-09 | Same From/To airport refused — Add Lead, trip requests, and the API |
| R1-14 | Invented sign-in figures removed |
| R1-15 | Book Trip in the quote row menu and the quote card |
| R1-16 | Timeline in plain words; client payments on the client timeline |
| R1-18 | Latitude / longitude messages name the range |
| R1-19 | One lead-stage list; aircraft year cap computed per request |
| R2-B1 | "Passenger Names" opens passenger editing and highlights it |
| R2-B2 | Ask AI trigger moves into the top navbar |
| R2-B4 | "Avanode" → Avinode, avinode.com |
| Seed | `prisma/seed.ts` cleanup clears `empty_legs` |

Read AGENTS.md in full first. Every rule applies; the ones most in play are
named per item.

## 1. R1-03 — Requirements are internal

- `AddQuoteDialog.jsx` (~186) copies a trip request's `requirements` into
  `terms`. Put them in `internalNotes` instead (append on a new line if
  internal notes already hold text; never overwrite). Terms keep the desk
  default from B1.
- The quote preview / PDF title says "QUOTE" (find "QUOTES" in the preview
  and PDF templates). The full redesign is B5 — change the word only.

## 2. R1-09 — Same airport refused

- One shared check, not three copies. Backend: a small helper in
  `common/` (e.g. `assertDifferentAirports(originId, destinationId)`) used
  by trip requests and any other create/update that takes both and does
  not already check (grep: quotes, trips legs, empty legs — report which
  already refuse). 400 on `destinationAirportId`: "Departure and arrival
  can't be the same airport". On update, compare the merged values.
- Frontend: Add Lead and the trip-request form show the same message before
  submitting, as Add Client already does — reuse its check, lifted to
  `lib/` if it is inline.

## 3. R1-14 — No invented figures

`app/(auth)/layout.js`: remove "240+", "$18M", "96%" and their labels.
Do not replace them with other numbers. Keep the layout balanced (AGENTS:
"Never display a number the data did not supply").

## 4. R1-15 — Book Trip from the quote list

The quote detail page already books a trip from an approved quote. Add the
same action to the quote table's row menu and the mobile card, through the
one `getRowActions(row)` both use (AGENTS: tables and cards share it).
Shown only when the detail page would show it (same status rule and the
same permission check); it opens the same booking flow.

## 5. R1-16 — Timeline in words; payments on the client

- Where audit events render on the timeline, an `*.updated` entry lists
  the changed fields by their screen labels ("Updated phone and email"),
  not raw keys (`phone, email, nextFollowUpAt`). One label map in `lib/`,
  shared by every timeline; unknown keys fall back to a humanised key, never
  dropped.
- Client payments: when a payment is recorded or withdrawn in Receivables,
  also write an audit row **on the Client** (`client.payment_recorded` /
  `client.payment_withdrawn`, metadata: invoice number, amount, method — no
  notes), the way `document.added` is written on its owner. It then shows on
  the client timeline with no new query. Rendered as "Payment of $5,000.00
  recorded on INV-2026-0042 (wire)". Past payments are not back-filled; say
  so in the report.

## 6. R1-18 — Coordinates

Airport latitude/longitude DTO messages: "Latitude must be between -90 and
90", "Longitude must be between -180 and 180" (use the `numbers.ts`
helpers' message argument; the form shows the API's field error).

## 7. R1-19 — Two cleanups

- Frontend has `CLIENT_LEAD_STAGES` and `LEAD_STAGES`: keep one in
  `lib/`, import it everywhere, delete the other.
- Aircraft year: the "not after this year" cap is computed when the schema
  module loads, so a server running over New Year refuses next year's
  aircraft. Compute it per request (a `.refine` reading the current year).
  Test it with a mocked date.

## 8. R2-B1 — Passenger Names

On the trip page, the checklist item "Passenger Names" scrolls to a card
that is already in view and does nothing visible. It should put the
passengers card into edit mode and highlight it briefly (a ring using a
theme token, fading out — no hardcoded colour; reuse the project's motion
primitives if one fits).

## 9. R2-B2 — Ask AI in the top navbar

The floating trigger (`fixed bottom-5 right-5`) covers page content.
Remove it and put the trigger in `TopNav`, beside the notification bell,
the same height as the other header controls (`h-9 sm:h-11`), opening the
same panel. Staff area only, and only for whoever sees it today. Check
375 / 768 / 1440 px widths by reading the layout classes; report anything
that would wrap.

## 10. R2-B4 — Avinode

`TripContractCard.jsx`: `AVANODE_URL` → `AVINODE_URL = "https://www.avinode.com"`,
label "Avinode". Grep both apps for "Avanode" / "avanode".

## 11. Seed fix

`Backend/prisma/seed.ts`: the cleanup does not clear `empty_legs`, so
re-seeding a worked database fails. Add it in foreign-key order. Do not run
the seed.

## Tests (vitest)

Same-airport helper (create and merged update); aircraft year per request
with a mocked date; the audit label map (known keys, unknown key
humanised); the client payment audit row written on record and withdraw
with exactly the allowed metadata.

## Postman (written now, captured later)

Builders for trip requests (and any other module that gained the check):
a `400 · Same airport` example on create. Airports: the latitude message.
Do not run builders or Newman.

## Docs (same pass)

- `docs/MODULE_FEATURE_STATUS.md` for the touched modules.
- `AGENTS.md` only for a new durable rule; say which.
- Do **not** edit `HANDOFF.md`, `docs/FEEDBACK_TRACKER.md`,
  `docs/DEVELOPER_TEST_CHECKLIST.md` or `docs/feedback-replies/` — the
  reviewer does those.

Then run and paste:

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
npm run build
```

## Report

Write it to `docs/codex-reports/feedback-b02-small-fixes.txt` and give a
short summary in chat:

1. Files changed, one line each.
2. Per item: done / partly / not done, and any mismatch with the code.
3. Which modules already refused the same airport before this batch.
4. Run output (counts).
5. Confirmation: nothing committed, no database or `.env` touched
   (`git status`).
