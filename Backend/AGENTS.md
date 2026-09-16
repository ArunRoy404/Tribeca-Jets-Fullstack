# Backend — NestJS 12, TypeScript, ESM

Read the root `AGENTS.md` first. It carries the git policy (**never commit or push unless told**), the module-by-module build order, and the Postman rules. This file is the backend-specific layer.

## This is not the Nest/Prisma you know

Version specifics that break habits learned from older releases:

- **ESM.** `"type": "module"`, `moduleResolution: nodenext`. **Every relative import ends in `.js`**, even though the source is `.ts`. Top-level `await` is available.
- **vitest + oxlint**, not jest + eslint. `npm test` runs `vitest run`.
- **Prisma 7.** Driver adapters are mandatory (`@prisma/adapter-pg`); config lives in `prisma7.config.ts`; the generator is `prisma-client` (emits TypeScript into `src/generated/prisma/`, which is **generated — never edit it**). The schema is a **multi-file folder**, `prisma/schema/*.prisma`, one file per domain. Enums are emitted as const objects, so import from `generated/prisma/enums.js` and use `UserRole.ADMIN`, never a string literal.
- **`@nestjs/throttler` and `nestjs-zod` do not support Nest 12.** We hand-roll `RateLimitGuard` and `createZodDto`. Do not add either package back.
- **Zod 4.** `z.email()` / `z.uuid()` are top-level. `.innerType()` does not exist — structure schemas so you never need it.

## Validation

DTOs are Zod schemas wrapped in `createZodDto` (`src/common/dto/zod-dto.ts`), enforced per-route by `ZodValidationPipe`.

**There is no global `ValidationPipe`, and you must not add one** — it strips properties off Zod-backed DTOs because they have no `class-validator` metadata. This has bitten us once already.

## Authorization: three distinct layers

Keep them separate. Collapsing them is how row-level leaks happen.

1. **Authentication** — `JwtAuthGuard` is global. Routes are private by default; `@Public()` opts out. Failing closed is deliberate.
2. **Coarse capability** — `@RequirePermissions(Permission.X)` + `PermissionsGuard`, driven by the role→permission matrix in `src/common/authorization/permissions.ts`. That matrix is the single source of truth and mirrors the Roles & Permissions tab in the UI. Add a permission there, not as an ad-hoc role list on a controller.
3. **Row-level scope** — **always in the service layer**, never in a guard. A guard cannot scope a `findMany`. Use `scopeFor(user, permission)` to decide between `ALL`, `OWN` and `ASSIGNED` and build the `where` clause from it.

**Return 404, never 403, for a record the caller may not see.** A 403 confirms the row exists and turns any ID into an oracle. 403 is only for "this action is not available to your role at all" — a capability failure, not a row failure.

## Every model carries the same four audit columns

Non-negotiable, on every model in every module:

```prisma
createdAt   DateTime @default(now())
createdById String?  @db.Uuid
createdBy   User?    @relation("<Model>CreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

updatedAt   DateTime @updatedAt
updatedById String?  @db.Uuid
updatedBy   User?    @relation("<Model>UpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
```

- **Set them from the session, never from the request body.** An audit column a
  caller can supply is not an audit column. Services write
  `createdById: user.id` on create and `updatedById: user.id` on *every* write,
  soft deletes included.
- **Nullable, with `SetNull`.** Seeded and imported rows have no creator, and
  removing whoever made a change must never destroy the record of it.
- **Distinct from business relationships.** `assignedBrokerId` says who owns a
  client; `createdById` says who typed it in. Reassignment must not rewrite
  history, so never reuse one for the other.
- Adding them to an existing table means **backfilling in the migration**, not
  dropping and recreating. See
  `20260915142333_add_created_by_updated_by_audit_columns`, which carries the
  old invitedBy values across rather than losing them.

## Account status is administrative, and `INVITED` is not a decision

`UserStatus` has three values but only two are settable by a person:

- **`INVITED`** is where an account is born, and it leaves exactly once — on its
  own, when the invitee sets a password through the reset flow. That act *is*
  accepting the invitation, and `completePasswordReset` flips the row to
  `ACTIVE` in the same transaction. Nothing else may write it: the update DTO's
  enum excludes it, and the service refuses any status change on a row that is
  still `INVITED`. Suspending a pending invitation would strand it for good —
  only an `INVITED` row can be promoted by a reset, so a suspended one could
  never move again.

  **Known gap:** with account removal withdrawn there is now no way to withdraw
  a mistaken invitation at all. The row stays `INVITED` and keeps its email
  address reserved. Withdrawing one needs its own deliberate operation; do not
  solve it by loosening the status guard.
- **`ACTIVE` / `SUSPENDED`** are an administrator's call, made through
  `PATCH /users/:id` by a `MANAGE_USERS` holder, and nothing else.

**A password reset must never be a route around a suspension.** The promotion
above is narrow by design — it fires only when the current status is `INVITED`.
A suspended user who completes a reset stays suspended, including when the code
was issued before the suspension landed. Any future flow that sets a password
inherits this rule.

The frontend mirrors it rather than re-deciding it: the status control is absent
for a pending invitation and offers only Active/Suspended otherwise.

## Nothing is ever permanently deleted

There is **no hard delete anywhere in this system, and no endpoint that offers
one.** Removing a record archives it; it can always be brought back. Every
soft-deletable model therefore carries six columns, not one:

```prisma
deletedAt    DateTime?
deletedById  String?   @db.Uuid   // who archived it
restoredAt   DateTime?
restoredById String?   @db.Uuid   // who brought it back
```

`createdBy`/`updatedBy` never capture removal — an archived row's `updatedBy`
is whoever last *edited* it — which is why `deletedBy` is its own column.

Use the shared pieces in `common/database/archive.ts` rather than rebuilding
any of this: `archiveQuerySchema`, `archiveFilter`, `ARCHIVE_SELECT`,
`ARCHIVE_ACTOR_SELECT`, `archiveData`, `restoreData`.

- **One list endpoint serves both halves.** `?archived=true` returns only
  archived rows; the default returns only live ones. A separate `/archived`
  route would duplicate every filter, sort and pagination param, and the two
  would drift the first time one gained a column.
- **`archived` uses `z.stringbool()`, never `z.coerce.boolean()`.**
  `Boolean("false")` is `true`, so the old `includeDeleted` param did the exact
  opposite of what it was asked on every `?includeDeleted=false`.
- **Restore clears the deletion stamp and touches nothing else.** A create that
  quietly revives an archived row is not a restore — it overwrites every stored
  field with whatever the form sent. Creating and restoring are separate
  intents and get separate endpoints.
- **Select the archive actors on the list, not just the detail.** The Archived
  tab has a "Removed By" column and the live list shows a "Restored" badge.
- **`findOne` must not filter `deletedAt: null`.** The Archived tab links
  straight to the detail view, so excluding archived rows there lists a record
  and then 404s it. Return it with its archive trail and let the UI decide what
  to offer. (The list is the opposite: it filters by `?archived=`.)
- **A module that references another stores its id, never its name.** When
  Clients was built, Airports did not exist, so `homeAirport` held an ICAO
  string; the moment Airports shipped that became a column pointing at nothing
  the database could check. It is now `homeAirportId`, a real foreign key,
  backfilled in the migration by matching each stored code to its airport row.
  Expect to do this whenever a dependency lands after its dependant — and check
  the row exists in the service, so the form gets a named 400 rather than a
  bare P2003.
- **Never an ad-hoc `@Roles(...)` list on a controller.** The permission matrix
  is the source of truth. Where a rule is finer than a permission — clients may
  be created by a broker but removed only by an administrator — enforce it in
  the service with `scopeFor(...) !== Scope.ALL`, which keeps the bulk routes
  and the single route on one rule instead of two.
- **Validate a foreign key only when it is actually changing.** Edit forms
  resend every field, so re-checking unconditionally means a record whose
  dependency was archived later can no longer be edited at all — changing an
  aircraft's notes returned "That operator does not exist" about the operator
  it already had. Compare against the stored value first. And say *archived*
  when it is archived: that is a different problem from a mistyped id, and the
  fix is different too.
- **A restore returns 200, not 201.** `@Post(':id/restore')` needs an explicit
  `@HttpCode(HttpStatus.OK)`, because Nest gives every POST a 201 and a restore
  creates nothing — it clears a deletion stamp on a row that existed all along.
  All four modules drifted into 201 while the Postman collection documented
  200; the collection was right.
- **Bulk delete gets a matching bulk restore.** Same `bulkIdsSchema`, same
  `bulkResult`, same partial-success rule — `POST /<resource>/bulk-restore`.
  Read `affected` rather than `deleted`, which is kept only as an alias for the
  existing delete callers.
- **Users are not soft-deletable at all.** The Users module has no `DELETE`
  and no `restore`, its query DTO has no `archived` param, and the `users` table
  carries no archive trail — suspending an account is the way out, which is a
  status change through `PATCH /users/:id`. `users.deletedAt` survives as a
  database-level kill switch (auth refuses a stamped row a session) and hides
  the handful of rows archived before the feature was withdrawn; nothing writes
  it. Every *other* soft-deletable model follows the six-column rule above.

## The permission matrix ships with the session

`GET /auth/me` returns `permissions` — the caller's row of the matrix, as
`{ PERMISSION: Scope }` — so the frontend can stop offering actions the guard
will refuse. A role seeing Edit and Remove on every row and collecting a 403
toast reads as a broken app rather than a permission boundary.

**This is not an enforcement point and never can be.** It travels to a browser,
where anyone can edit it. Every route still checks the same matrix server-side.
Shipping it from here rather than letting the frontend re-derive it from `role`
is the whole point: a second copy of the matrix in JavaScript drifts the first
time a scope changes, and it drifts silently.

## Numbers that a form can leave blank

`z.coerce.number()` is a trap on anything a form touches: `Number('')` is **0**,
so an empty Latitude box arrives as a valid coordinate and an empty rating
stores 0 out of 5 — both indistinguishable from a deliberate zero.

Use `requiredNumber` / `optionalNumber` / `nullableNumber` from
`common/dto/numbers.ts`. And keep required-ness honest: the API's required
fields and the form's `required` attributes and its "(Optional)" labels must
say the same thing, or the form promises one contract while the server enforces
another.

## Service layer rules

- Soft delete (`deletedAt`), never a hard `delete`. Every query filters `deletedAt: null`.
- Write an `AuditLog` row for anything that mutates state a person would ask about later — role changes, status changes, deletions, invitations.
- Never return `passwordHash`, `twoFactorSecret`, or raw tokens. Select explicitly; do not spread a Prisma row into a response.
- Cross-module reads go through the owning module's service, not a raw Prisma call into another module's tables.

## List endpoints

Every list endpoint is assembled from the shared pieces below. If you are about
to write paging, sorting or searching by hand, one of these already exists —
and the second hand-written copy is how the two modules silently drifted apart
the first time.

| Need | Use | Lives in |
|---|---|---|
| page / limit / search / sortOrder | `paginationSchema.extend({ ...filters })` | `common/dto/pagination.dto.ts` |
| sortable-column allowlist | `sortableBy(FIELDS)` in the **DTO** | same |
| skip / take | `toPrismaPagination(query)` | same |
| `{ success, data, meta }` | `paginate(items, total, page, limit)` | `common/types/api.types.ts` |
| `?search=` across columns | `searchAcross(query.search, [...])` | `common/database/filters.ts` |
| optional equality filters | `equalsAny(query, [...])` | same |
| `orderBy` | `orderByField(query.sortBy, query.sortOrder)` | same |

- **`DEFAULT_PAGE_SIZE` is 10 and `MAX_PAGE_SIZE` is 100**, both in
  `pagination.dto.ts`. The default is paired with the frontend's
  `DEFAULT_PAGE_SIZE`, and the ceiling with its `PAGE_SIZE_OPTIONS` — change
  one and you must change the other, or a link built in the UI stops matching
  what the API serves.
- **Lists open newest-first.** `sortableBy()` defaults to `createdAt` and
  `paginationSchema` to `sortOrder: 'desc'`, and that pairing is the default for
  every table. A row someone just created must be the first thing they see —
  an alphabetical or by-code default buries it wherever the alphabet puts it,
  which reads as "my save did not work". Override only with a stated reason.
- **Bulk actions reuse `bulkIdsSchema` and `bulkResult`**
  (`common/dto/bulk.dto.ts`). Every table has a checkbox column, so every module
  gets a `POST /<resource>/bulk-delete`. Three rules hold across all of them:
  **POST, not DELETE** (request bodies on DELETE are dropped by proxies, and a
  dropped body removes nothing while answering 200); **partial success is
  success** (ids that match nothing come back in `skipped`, because two people
  clearing the same rows both deserve to succeed); and **read the rows before
  updating them**, so the audit entry can name what was removed.
- **Sortable columns are allowlisted in the DTO, not the service.** Rejecting
  an unknown column at the edge with a 400 beats silently falling back to
  `createdAt`: the fallback hides a broken client, and it leaves the service
  re-checking something validation should already guarantee.
- Filters are explicit enum-typed query params, never a free-form `filter`
  object.
- The `where` clause is the security boundary, so it stays readable at the call
  site. Use the helpers for the repetitive parts; do not hide row-level scoping
  behind a query builder.

## Errors

`AllExceptionsFilter` already translates Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400. Throw Nest's HTTP exceptions; do not hand-format error bodies in a controller.
