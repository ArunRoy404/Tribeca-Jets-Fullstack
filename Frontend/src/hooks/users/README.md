# Users hooks

The data layer for the Users & Roles screen. `src/hooks/auth/` is the reference
for the conventions; this folder adds the table-state ones.

## Shape

| Hook | Returns |
|---|---|
| `useUsers(params)` | paginated directory — `{ data, meta }` under `data` |
| `useUser(id)` | one team member; idle until `id` exists |
| `useUserStats()` | headcount tiles |
| `useRoles()` | roles + permission matrix, from the server's own rules |
| `useInviteUser()` | mutation |
| `useUpdateUser()` | mutation |
| `useRemoveUser()` | mutation |
| `useUsersTableParams()` | URL-backed tab, page, filters, sort |

Query hooks return the query object; mutation hooks return the mutation. No
hook returns a hand-built `{ data, loading, error }` shape.

## Where the state lives

**In the URL.** `useUsersTableParams` is the only source of truth for the tab,
page, search, filters and sort. Nothing table-related belongs in
`useUsersRolesStore`, which now holds only genuinely client-side state: which
dialog is open and which row is selected.

`queryParams` from that hook is passed straight into `useUsers` and doubles as
the query key, so changing a filter changes the key and React Query refetches
on its own. There is no effect wiring the two together.

## Side effects

Toasts, invalidation and redirects live in the hooks. Components call
`mutate(values)` and render state — no `onSuccess` in a component.

Writes invalidate the whole `["users"]` prefix rather than just the list,
because a role change moves the headcount tiles and the per-role counts on the
roles tab at the same time.

## Two things the API does not supply yet

`activeLeads`, `activeTrips`, `conversionRate` and `revenue` are columns in the
design with no source until the trips and quotes modules exist. `toTeamMember`
in `src/lib/user.js` renders them as an em dash — a confident `0` for every
broker would be a wrong answer where `—` is an honest one.
