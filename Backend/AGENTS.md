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
  still `INVITED`. Withdraw an invitation by removing the user, never by
  suspending it — a suspended invitation is a row nobody can move again.
- **`ACTIVE` / `SUSPENDED`** are an administrator's call, made through
  `PATCH /users/:id` by a `MANAGE_USERS` holder, and nothing else.

**A password reset must never be a route around a suspension.** The promotion
above is narrow by design — it fires only when the current status is `INVITED`.
A suspended user who completes a reset stays suspended, including when the code
was issued before the suspension landed. Any future flow that sets a password
inherits this rule.

The frontend mirrors it rather than re-deciding it: the status control is absent
for a pending invitation and offers only Active/Suspended otherwise.

## Service layer rules

- Soft delete (`deletedAt`), never a hard `delete`. Every query filters `deletedAt: null`.
- Write an `AuditLog` row for anything that mutates state a person would ask about later — role changes, status changes, deletions, invitations.
- Never return `passwordHash`, `twoFactorSecret`, or raw tokens. Select explicitly; do not spread a Prisma row into a response.
- Cross-module reads go through the owning module's service, not a raw Prisma call into another module's tables.

## List endpoints

Extend `paginationSchema` (`src/common/dto/pagination.dto.ts`) rather than redefining page/limit/search/sortBy/sortOrder. `limit` is capped at 100 so nobody can pull an entire table in one request.

- Return via `paginate(items, total, page, limit)` so `meta` is always complete.
- **Whitelist sortable columns.** Never pass a caller-supplied string into Prisma's `orderBy` — it is an injection surface and an accidental-full-scan surface.
- Filters are explicit enum-typed query params, never a free-form `filter` object.

## Errors

`AllExceptionsFilter` already translates Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400. Throw Nest's HTTP exceptions; do not hand-format error bodies in a controller.
