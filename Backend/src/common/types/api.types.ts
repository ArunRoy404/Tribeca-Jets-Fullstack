/** Envelope returned by every successful endpoint (see TransformInterceptor). */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * What a paginated service method returns. The interceptor lifts `meta` out of
 * the body so the envelope stays `{ success, data, meta }`.
 */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/** The authenticated principal attached to each request by JwtStrategy. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: import('../../generated/prisma/enums.js').UserRole;
}
