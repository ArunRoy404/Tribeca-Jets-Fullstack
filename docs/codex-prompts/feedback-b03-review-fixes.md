# Codex prompt — Feedback B3: two review fixes

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this is

Claude's review of B3 (`feedback-b03-workflow-rules.md`, report
`docs/codex-reports/feedback-b03-workflow-rules.txt`) found two defects.
**Claude may already have applied both fixes in the working tree.** Read the
current code first. For each fix, report one of:
- **already in place**: verify it against the spec below and fill any gap;
- **not in place**: implement it.

Do not undo or rewrite anything else from B3. No migration. Never commit,
push, stash or reset.

Read AGENTS.md in full first. The rules most in play are "Validate a foreign
key only when it is actually changing" (the same principle applies to any
check on an edit), "A create body omits an optional field; it never sends
`null`", and "Never build an update schema with `.partial()`".

## Fix 1 — a payment method is required only when a commission becomes PAID

**The defect.** B3 made `CommissionsService.update` refuse any write whose
resulting status is PAID with no method. Every commission paid before B3 has
no method on file, so editing just its notes was refused with "Choose a
payment method". The update DTO also refused `status: PAID` sent without a
method, even when the stored row already has one. And the edit form
(`AddCommissionDialog.jsx`) opened the "mark paid?" confirmation on *every*
save of an already-PAID commission.

**The rule.** A PAID commission needs a method at the moment it **becomes**
PAID, or when an edit **clears** the method of a PAID row. An unrelated edit
of an older paid row is never refused for lacking one.

Backend (`Backend/src/modules/commissions/`):
- `commissions.service.ts` `update`: refuse (400, `errors.method`) only when
  the resulting status is PAID, no method results, **and** either the status
  is changing to PAID (`dto.status === PAID && current.status !== PAID`) or
  `dto.method === null`.
- `dto/commission.dto.ts`, **update** schema: an absent `method` means "keep
  the stored one", so the DTO cannot judge it. It refuses only the
  self-contradiction `status: PAID` with `method: null`. The **create**
  schema keeps requiring a method whenever `status` is PAID (a new row has
  nothing stored).

Frontend (`Frontend/src/components/commissions/AddCommissionDialog.jsx`):
- "Becoming paid" is `form.status === "PAID" && commission?.status !== "PAID"`.
- The client-side "Choose how it was paid" check runs only when becoming paid.
- The `ConfirmCommissionPaidDialog` opens only when becoming paid; any other
  save goes straight through.
- On edit, a blank method is sent as `null` only if the commission **had** a
  method to clear. Otherwise it is omitted. Sending `null` for a row that
  never had one would trip the DTO refusal above.

Tests (`commissions.workflow.spec.ts`):
- The create DTO refuses PAID without a method (field-level 400).
- The update DTO refuses `{ status: 'PAID', method: null }`.
- The service refuses a PENDING/EARNED → PAID change with no method, before
  writing.
- An older PAID row with `method: null` accepts `{ notes: '…' }`, and the
  update is written.
- The same row refuses `{ status: 'PAID', method: null }`.

## Fix 2 — operator create never accepts `oaRequired: null`

**The defect.** B3 made `oaRequired` `z.boolean().nullable().optional()` on
**both** operator DTOs. AGENTS.md: a create schema refuses `null`. Only an
edit uses `null`, to clear. Not set on create means the field is omitted.

- `Backend/src/modules/operators/dto/operator.dto.ts`: create →
  `z.boolean().optional()` (with a one-line comment: omit for Not set).
  Update stays `z.boolean().nullable().optional()`. No default on either.
- `operators.workflow.spec.ts`:
  - true / false round-trip through both DTOs, the writes and the selects;
  - Not set is omitted on create and stored as nothing (`undefined` in the
    create data), and `null` round-trips through update;
  - the create DTO **refuses** `oaRequired: null`, and the update DTO still
    refuses the string `'false'`.
- Frontend `AddOperatorDialog.jsx` should already omit the field on create
  when Not set, and send `null` on edit. Confirm this; change it only if it
  does not.
- `Backend/postman/build_operators_folder.py`: the create body's comment
  for `oaRequired` must say "optional · true / false; omit for not set
  (never null on create)". The create payload never sends `None`; only the
  PATCH payload clears with `None`. Do **not** run the builder or Newman.

## Docs (same pass)

- `AGENTS.md`, the "Trip completion and client lifecycle consequences
  (Feedback B3…)" section. Its sentence "Marking PAID needs a payment
  method" becomes: "A payment method is required when a commission becomes
  PAID or its method is cleared — never on an unrelated edit, because
  commissions paid before B3 have none on file."
- Nothing else: Claude has already updated HANDOFF, the tracker and the
  checklist for these fixes.

## Then run and paste

```
cd Backend
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
npm run build
```

## Report

Write it to `docs/codex-reports/feedback-b03-review-fixes.txt`, with a short
summary in chat:

1. For each fix: already in place / implemented / gap filled, with the
   files changed (one line each).
2. Run output (counts).
3. Confirmation: no migration, no database or `.env` touched, nothing
   committed (`git status`).
