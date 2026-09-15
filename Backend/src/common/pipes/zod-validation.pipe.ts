import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';
import { isZodDto } from '../dto/zod-dto.js';

/**
 * Global pipe that validates any parameter typed with a `createZodDto` class.
 *
 * Registered globally so controllers stay free of per-route pipe wiring; a
 * parameter whose type is not a Zod DTO passes through untouched.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { metatype } = metadata;
    if (!isZodDto(metatype)) {
      return value;
    }

    const result = metatype.zodSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      message: 'Validation failed',
      errors: formatZodIssues(result.error),
    });
  }
}

/** Flattens Zod issues into `{ "address.city": "Required" }` for the client. */
export function formatZodIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    out[path] ??= issue.message;
  }
  return out;
}
