import { z } from 'zod';
import { createZodDto } from './zod-dto.js';

/**
 * Rows per page when the caller does not say.
 *
 * Matches the frontend's default so an unparameterised request and a freshly
 * loaded table agree on what "page 1" contains. Changing one means changing
 * the other — see `PAGE_SIZE_OPTIONS` in the frontend's
 * `hooks/common/useTableQueryParams.js`.
 */
export const DEFAULT_PAGE_SIZE = 10;

/** Hard ceiling, so nobody can pull an entire table in one request. */
export const MAX_PAGE_SIZE = 100;

/**
 * Shared query parameters for every list endpoint.
 *
 * Every module's query DTO extends this rather than redeclaring page/limit/
 * search/sortOrder, so the defaults and the bounds are defined once.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * A closed list of sortable columns, for a module to drop into its query DTO.
 *
 * Sorting is an injection surface and an accidental-full-scan surface: a
 * caller-supplied string in Prisma's `orderBy` lets anyone sort by an
 * unindexed column, and reveals which columns exist. Rejecting it at the edge
 * also means the service can trust `query.sortBy` instead of re-checking it,
 * which is where the two modules had drifted into doing this differently.
 *
 * @example sortBy: sortableBy(['createdAt', 'email'])
 */
export function sortableBy<const T extends readonly [string, ...string[]]>(
  fields: T,
  fallback: T[number] = 'createdAt',
) {
  return z.enum(fields).default(fallback);
}

export type PaginationQuery = z.infer<typeof paginationSchema>;

export class PaginationDto extends createZodDto(paginationSchema) {}

/** Converts page/limit into Prisma's skip/take. */
export function toPrismaPagination(query: {
  page: number;
  limit: number;
}): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}
