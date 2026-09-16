# Clients hooks

The data layer for the Clients screens. `src/hooks/auth/` is the reference for
the conventions; this folder adds the ones specific to clients.

## Shape

| Hook | Returns |
|---|---|
| `useClients(params)` | paginated directory — `{ data, meta }` under `data` |
| `useClient(id)` | one client; idle until `id` exists |
| `useClientStats()` | the four tiles |
| `useCreateClient()` / `useUpdateClient()` | mutations |
| `useRemoveClient()` / `useRestoreClient()` | mutations, administrators only |
| `useRemoveClients()` / `useRestoreClients()` | bulk, administrators only |
| `useClientsTableParams()` | URL-backed tab, page, filters, sort |

## Two axes, not one

`status` (LEAD / ACTIVE / VIP / INACTIVE) is where the **relationship** stands
and a person sets it. `leadStage` (NEW → BOOKED / LOST) is where the **deal**
stands and it moves with the deal. They are independent: a VIP can be
mid-pipeline, and a booked client can go dormant. The table's one Status column
renders from `status`; the detail sidebar shows both.

## Removing a client is an administrator's call

A broker holds `MANAGE_CLIENTS` at *assigned* scope — enough to create and edit
their own book, not to remove from it. A broker losing a client reassigns it.
The service enforces this, not the controller, so the bulk routes inherit it.

## Follow-ups

`nextFollowUpAt` and `followUpNote` live on the client, and the Overdue / Due
Today / Upcoming windows are resolved **server-side against the current clock**
so the filter and the tile always agree. `toClientRow` computes the same
windows for the badge; both use the local day boundary.

## What the API does not supply yet

Trip counts, lifetime spend, active quotes and the activity timeline are
aggregates over modules that do not exist. The screens render an em dash or an
empty state — never a placeholder figure. See the no-invented-data rule in the
root `AGENTS.md`.
