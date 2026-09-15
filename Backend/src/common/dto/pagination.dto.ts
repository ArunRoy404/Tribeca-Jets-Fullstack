import { z } from 'zod';
import { createZodDto } from './zod-dto.js';

/**
 * Shared query parameters for every list endpoint.
 *
 * `limit` is capped at 100 so a client cannot ask for the entire clients table
 * in one request.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export class PaginationDto extends createZodDto(paginationSchema) {}

/** Converts page/limit into Prisma's skip/take. */
export function toPrismaPagination(query: {
  page: number;
  limit: number;
}): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}
