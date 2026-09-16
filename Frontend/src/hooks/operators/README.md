# Operators data layer

Charter operators — the companies that fly the aircraft. Shared master data,
the same rows for everyone signed in, no row-level scoping.

## Who can write

| Role | Read | Create / Edit / Remove |
|---|---|---|
| SUPER_ADMIN, ADMIN, SENIOR_BROKER, BROKER | yes | yes |
| ASSISTANT | yes | **403** |

Brokers may write here but not in `hooks/airports`: a broker who sources a new
operator adds it themselves, matching the `Operator Sourcing` permission they
already hold at full scope.

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

## Fields nothing can supply yet

`totalTrips`, `totalPaid` and `totalFleet` are aggregates over trips, operator
payments and aircraft — none of which exist. The API returns **null**, and
`toOperatorRow` renders an em dash. A confident "0 trips" against an operator
the desk has flown twice is a wrong answer; "—" is an honest one.

The detail page's Fleet, Trips and Payments tabs bind to empty arrays for the
same reason. They fill in when those modules land — see the build-order rule in
the root `AGENTS.md`.

## Things worth knowing

- **Name is not unique.** Two genuinely different operators can trade under one
  name, so there is no duplicate error to handle.
- **Array fields are replaced, not merged.** The form edits `aircraftTypes` and
  `serviceRoutes` as one comma-separated field, so what the user typed is the
  complete list — a merge would make removing a chip impossible.
- **`safetyRating` is a certification, not a number** ("ARG/US Platinum").
  The old form defaulted it to `"4.9"`, which was a bug.

## Bulk remove

The table's checkbox column feeds `useRemoveOperators(ids)`. Partial success is reported rather
than raised: ids that match nothing come back in `skipped` and surface as a
note, because two people clearing the same rows both did what they meant to.

The button and the confirmation are shared — `BulkDeleteButton` and
`BulkDeleteDialog` — so every table that grows checkboxes gets the same
behaviour rather than its own.
