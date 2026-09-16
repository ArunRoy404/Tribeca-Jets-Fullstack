# `hooks/aircraft`

The data layer for the fleet. Mirrors `hooks/operators`, with three things
worth knowing before you change anything here.

## The hooks are not named `useAircraft` / `useAircrafts`

"Aircraft" is its own plural, so the `useOperators` / `useOperator` pairing
that every other module uses has no equivalent. Rather than ship two hooks
nobody can tell apart, the list and the detail say what they are:

| | |
|---|---|
| `useAircraftList(params)` | a page of the fleet |
| `useAircraftDetail(id)` | one airframe |

Same for the bulk mutations: `useRemoveManyAircraft`, not `useRemoveAircrafts`.

## Grounding a tail is an update, not its own endpoint

The Set Maintenance dialog sends `{ id, status: "MAINTENANCE" }` through
`useUpdateAircraft`. There is no `useGroundAircraft`, deliberately — a status
change is a status change, and a second endpoint meaning almost the same thing
would produce a second audit-entry shape for the same event.

## Every mutation invalidates operators too

An aircraft appears on its operator's detail page, under the Fleet tab, and in
the `totalFleet` tile above the operators table. Adding, reassigning, archiving
or restoring a tail changes that operator's fleet, so the operators prefix is
invalidated alongside the aircraft one. Reassigning moves a tail between *two*
operators, which is why the whole prefix goes rather than one detail key.

## What the API cannot answer yet

`totalTrips`, `tripsThisYear` and `avgUtilization` come back **null**, not 0 —
they are aggregates over trips, and that module has not been built. `toAircraftRow`
maps them to an em dash. Do not substitute a zero or a placeholder; see the
no-invented-data rule in the root `AGENTS.md` for what that cost us on operators.

The Maintenance tab's Completed / Scheduled / Overdue badge is **derived** from
the stored date by `maintenanceState`, never stored. A stored status goes stale
the day the date passes, and an overdue inspection that still reads "Scheduled"
is the kind of wrong answer this project exists to avoid.
