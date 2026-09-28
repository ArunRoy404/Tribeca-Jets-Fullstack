import {
  Injectable,
  StreamableFile,
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
 *
 * **A `StreamableFile` is returned untouched.** It is not a payload to
 * describe, it is the response body — wrapping it produces
 * `{"success":true,"data":{"options":{},"stream":{}}}` where a PNG should be,
 * and the failure is invisible to anything that only checks the status code and
 * the headers. Both of those stay correct; only the bytes are wrong. Every
 * route that streams is therefore silently broken without this guard.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<unknown> | StreamableFile>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown> | StreamableFile> {
    return next.handle().pipe(
      map((payload) => {
        // The bytes are the response. Nothing to envelope.
        if (payload instanceof StreamableFile) return payload;

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
