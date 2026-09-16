import { z } from 'zod';
import { createZodDto } from './zod-dto.js';
import { MAX_PAGE_SIZE } from './pagination.dto.js';

/**
 * A set of row ids to act on at once, for the checkbox column every table has.
 *
 * Capped at `MAX_PAGE_SIZE` deliberately: the UI selects within one page, so a
 * request carrying more than a page of ids did not come from the checkboxes,
 * and an uncapped `IN (...)` is a way to lock a table from a single request.
 *
 * Duplicates are removed rather than rejected — sending the same id twice is a
 * harmless client mistake, and failing the whole batch for it helps nobody.
 */
export const bulkIdsSchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1, 'Select at least one row')
    .max(MAX_PAGE_SIZE, `Select at most ${MAX_PAGE_SIZE} rows at a time`)
    .transform((ids) => [...new Set(ids)]),
});

export type BulkIdsInput = z.infer<typeof bulkIdsSchema>;
export class BulkIdsDto extends createZodDto(bulkIdsSchema) {}

/** What a bulk operation reports back. */
export interface BulkResult {
  requested: number;
  /**
   * How many rows actually moved.
   *
   * `deleted` is kept as an alias so existing delete callers and their saved
   * Postman examples stay valid, but it reads as a lie on a bulk restore —
   * prefer `affected`, which is true of either direction.
   */
  affected: number;
  /** @deprecated Use `affected`. */
  deleted: number;
  /** Ids that matched nothing — already in the target state, or never existed. */
  skipped: string[];
}

/**
 * Summarises a bulk operation from what was asked for and what was found.
 *
 * Partial success is reported, not treated as failure. Two people clearing the
 * same rows is ordinary, and failing the whole batch because one id was already
 * gone would make the second person's click do nothing at all. The caller gets
 * the count that moved and the ids that did not, so the UI can say so.
 */
export function bulkResult(
  requestedIds: readonly string[],
  foundIds: readonly string[],
): BulkResult {
  const found = new Set(foundIds);
  return {
    requested: requestedIds.length,
    affected: foundIds.length,
    deleted: foundIds.length,
    skipped: requestedIds.filter((id) => !found.has(id)),
  };
}
