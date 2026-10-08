# Operators data layer

Charter operators — the companies that fly the aircraft. Shared master data,
the same rows for everyone signed in, no row-level scoping.

## Who can do what (since 8 Oct 2026)

**Every read needs only a staff session** — the list, stats and one operator.
Aircraft, sourcing, quotes, trips, empty legs and payments all pick an
operator. A **referral agent is refused** (`@StaffOnly`): an operator's
contacts and terms are desk data the portal never needs.

**Every write needs the person's own Operators permission** (Users & Roles ›
Permissions):

| Action | Permission |
|---|---|
| Add | `OPERATORS · CREATE` |
| Edit | `OPERATORS · EDIT` |
| Remove, restore, bulk | `OPERATORS · ARCHIVE` |

The screens hide what the person cannot do. "Request Quote" follows Operator
Sourcing's own check and is never offered for a SUSPENDED operator.

To pick an operator in a form, use **`OperatorPicker`**
(`components/operators/`), the shared `RecordPicker` over this list.

## Hooks

| Hook | Endpoint |
|---|---|
| `useOperators(params)` | `GET /operators` — paginated |
| `useOperator(id)` | `GET /operators/:id` |
| `useOperatorStats()` | `GET /operators/stats` |
| `useCreateOperator()` | `POST /operators` |
| `useUpdateOperator()` | `PATCH /operators/:id` |
| `useRemoveOperator()` | `DELETE /operators/:id` — soft |
| `useRemoveOperators(ids)` | `POST /operators/bulk-delete` — soft, several at once |
| `useOperatorsTableParams()` | URL state: page, limit, search, status, sort |

## Fixed choices (since 8 Oct 2026)

| Field | Values |
|---|---|
| `status` | ACTIVE · PREFERRED · INACTIVE · **SUSPENDED** ("do not book until further notice") |
| `safetyRating` | a number 0–5, optional — the desk's own rating, like `reliabilityRating` |
| `responseSpeed` | FAST · AVERAGE · SLOW (the desk's judgment) |
| `paymentTerms` | PREPAID · DUE_ON_RECEIPT · NET_7 · NET_15 · NET_30 |

Labels come from `lib/operator.js`. The form's documents are filed into the
operator's vault folder after it saves (`useFileDocuments`).

## Things worth knowing

- **Name is not unique.** Two genuinely different operators can trade under one
  name, so there is no duplicate error to handle.
- **Array fields are replaced, not merged.** The form edits `aircraftTypes` and
  `serviceRoutes` as one comma-separated field, so what the user typed is the
  complete list — a merge would make removing a chip impossible.
- **Safety is a 0–5 rating the desk enters, never a default.** The old form
  pre-filled `"4.9"`, so every operator carried a rating nobody gave; blank
  now means "Not rated".
- **Home base, contact name and contact email can be changed, never cleared**
  — they are required when an operator is added.

## Bulk remove

The table's checkbox column feeds `useRemoveOperators(ids)`. Partial success is reported rather
than raised: ids that match nothing come back in `skipped` and surface as a
note, because two people clearing the same rows both did what they meant to.

The button and the confirmation are shared — `BulkDeleteButton` and
`BulkDeleteDialog` — so every table that grows checkboxes gets the same
behaviour rather than its own.
