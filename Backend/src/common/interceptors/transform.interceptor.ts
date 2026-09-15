import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiResponse, Paginated } from '../types/api.types.js';

/**
 * Wraps every successful response in `{ success: true, data, meta? }`.
 *
 * A single predictable envelope means the frontend can have one response
 * handler instead of per-endpoint shape checks. Services returning
 * `Paginated<T>` get their `meta` lifted alongside `data` automatically.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<unknown>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated(payload)) {
          return { success: true, data: payload.items, meta: payload.meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Paginated<unknown>).items) &&
    typeof (value as Paginated<unknown>).meta === 'object'
  );
}
