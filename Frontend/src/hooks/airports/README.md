# Airports data layer

Shared reference data: every signed-in user reads the same rows. There is no
row-level scoping — unlike a client, nobody owns an airport.

## Who can do what (since 8 Oct 2026)

**Every read needs only a session** — the list, the stats, the country
options and one airport. About eight forms pick an airport (clients,
aircraft, trip requests, trips, quotes, empty legs, leads, the instant
estimate, the referral portal), and an airport has no owner.

**Every write needs the person's own Airports permission** (Users & Roles ›
Permissions), checked by the API on each route:

| Action | Permission |
|---|---|
| Add | `AIRPORTS · CREATE` |
| Edit | `AIRPORTS · EDIT` |
| Remove, restore, bulk remove/restore | `AIRPORTS · ARCHIVE` |

Opening the Airports screen is `AIRPORTS · VIEW` (the sidebar and the page
gate). The screen hides what the person cannot do — Add, Edit, Remove,
Restore, the bulk button and the checkbox column — through
`usePermissions().canAccess`; the API refuses the same with a 403.

## Hooks

| Hook | Endpoint |
|---|---|
| `useAirports(params)` | `GET /airports` — paginated |
| `useAirport(id)` | `GET /airports/:id` — with `trips: { total, thisYear }` (null for a referral agent) |
| `useAirportStats()` | `GET /airports/stats` |
| `useAirportCountries()` | `GET /airports/countries` — the filter's options |
| `useCreateAirport()` | `POST /airports` |
| `useUpdateAirport()` | `PATCH /airports/:id` |
| `useRemoveAirport()` | `DELETE /airports/:id` — soft |
| `useRemoveAirports(ids)` | `POST /airports/bulk-delete` — soft, several at once |
| `useRestoreAirport()` | `POST /airports/:id/restore` |
| `useRestoreAirports(ids)` | `POST /airports/bulk-restore` |
| `useAirportsTableParams()` | URL state: page, limit, search, country, sort |

## Things worth knowing

- **Adding a removed ICAO is refused, pointing at the Archived tab.** The
  code stays taken while the airport is archived; restoring it brings back
  every field, which re-creating from the form would overwrite.
- **Latitude, longitude and runway can be changed but not cleared** — they
  are required when an airport is added, so an edit refuses an empty value.
- **The country filter's options come from the data.** The UI used to hardcode
  five countries, so a sixth airport was unfilterable.
- **`assignedFbo` renders as an em dash when absent.** The table used to fall
  back to "Signature Flight Support", which stated a fact that was not one.
- **`longestRunwayFt` is new.** The table has had a "Longest Runway" column all
  along with no field behind it, so it rendered blank for every airport.

## Bulk remove

The table's checkbox column feeds `useRemoveAirports(ids)`. Partial success is reported rather
than raised: ids that match nothing come back in `skipped` and surface as a
note, because two people clearing the same rows both did what they meant to.

The button and the confirmation are shared — `BulkDeleteButton` and
`BulkDeleteDialog` — so every table that grows checkboxes gets the same
behaviour rather than its own.
