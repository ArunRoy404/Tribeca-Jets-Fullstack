# Airports data layer

Shared reference data: every signed-in user reads the same rows. There is no
row-level scoping — unlike a client, nobody owns an airport.

## Who can write

| Role | Read | Create / Edit / Remove |
|---|---|---|
| SUPER_ADMIN, ADMIN, SENIOR_BROKER | yes | yes |
| BROKER, ASSISTANT | yes | **403** |

Brokers and assistants hold `MANAGE_AIRPORTS` at `READ` scope. They must read
the table — a broker cannot build a trip without picking an airport — but an
airport is an objective fact, and a wrong runway length silently makes a trip
unbookable.

The UI does not hide the Add button by role yet; the API refuses and
`toastApiError` surfaces the message. Gating the button belongs with the
permission-aware UI work, not here.

## Hooks

| Hook | Endpoint |
|---|---|
| `useAirports(params)` | `GET /airports` — paginated |
| `useAirport(id)` | `GET /airports/:id` |
| `useAirportStats()` | `GET /airports/stats` |
| `useAirportCountries()` | `GET /airports/countries` — the filter's options |
| `useCreateAirport()` | `POST /airports` |
| `useUpdateAirport()` | `PATCH /airports/:id` |
| `useRemoveAirport()` | `DELETE /airports/:id` — soft |
| `useRemoveAirports(ids)` | `POST /airports/bulk-delete` — soft, several at once |
| `useAirportsTableParams()` | URL state: page, limit, search, country, sort |

## Things worth knowing

- **Adding a removed ICAO restores that airport.** Soft delete keeps the code
  occupied, so a plain 409 would strand the caller — they see no KBED in the
  list and cannot create one either. The revived row keeps its audit history.
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
