import { ForbiddenException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Soft delete, shared by every module.
 *
 * There is no hard delete anywhere in this system, so "delete" always means
 * "archive": the row leaves the list, keeps its history, and can be brought
 * back. The pieces below are what makes that identical across modules rather
 * than re-decided in each one.
 */

/**
 * Which half of the table to read.
 *
 * One list endpoint serves both the normal table and the Archived tab, driven
 * by this flag — a separate `/archived` endpoint would duplicate every filter,
 * sort and pagination param, and the two would drift the first time one of
 * them gained a column.
 */
export const archiveQuerySchema = z.object({
  /** `true` returns only archived rows. Default `false`: only live ones. */
  archived: z.stringbool().default(false),
});

/** The `where` fragment for whichever half was asked for. */
export function archiveFilter(archived: boolean) {
  return archived ? { deletedAt: { not: null } } : { deletedAt: null };
}

/**
 * The columns every archived row is read with.
 *
 * `restoredAt` is selected for live rows too: a restored record carries the
 * badge in the normal list, which is the whole point of recording it.
 */
export const ARCHIVE_SELECT = {
  deletedAt: true,
  deletedById: true,
  restoredAt: true,
  restoredById: true,
} as const;

/** Who archived it and who brought it back, for the Archived tab's columns. */
export const ARCHIVE_ACTOR_SELECT = {
  deletedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  restoredBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

/** What a service writes when archiving a row. */
export function archiveData(actorId: string) {
  return { deletedAt: new Date(), deletedById: actorId };
}

/**
 * What a service writes when restoring one.
 *
 * `deletedAt` and `deletedById` are cleared because the row is live again and
 * a live row with a deletion stamp is a contradiction; `restoredAt` and
 * `restoredById` record who undid it. The previous archive is not lost — the
 * audit log holds the whole sequence.
 */
export function restoreData(actorId: string) {
  return {
    deletedAt: null,
    deletedById: null,
    restoredAt: new Date(),
    restoredById: actorId,
  };
}

/**
 * Refuses a restore that would resurrect a duplicate.
 *
 * Only matters for models with a natural unique key that stays reserved while
 * archived — an airport's ICAO. Nothing can normally take the code while the
 * archived row holds it, but this is the guard that makes that a checked
 * invariant rather than an assumption.
 */
export function assertRestorable(
  conflict: { id: string } | null,
  message: string,
): void {
  if (conflict) throw new ForbiddenException(message);
}
