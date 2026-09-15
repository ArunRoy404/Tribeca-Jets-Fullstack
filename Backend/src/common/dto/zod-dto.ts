import { z } from 'zod';

/**
 * Bridges a Zod schema into something Nest and Swagger both understand.
 *
 * One schema per DTO gives us runtime validation, the inferred TypeScript
 * type, and the OpenAPI definition — with no chance of the three drifting
 * apart the way hand-written `class-validator` decorators do.
 *
 * Usage:
 *   const createClientSchema = z.object({ firstName: z.string().min(1) });
 *   export class CreateClientDto extends createZodDto(createClientSchema) {}
 */
export interface ZodDtoStatic<TSchema extends z.ZodType = z.ZodType> {
  new (): z.infer<TSchema>;
  zodSchema: TSchema;
}

export function createZodDto<TSchema extends z.ZodType>(
  schema: TSchema,
): ZodDtoStatic<TSchema> {
  class ZodDto {
    static zodSchema = schema;
  }
  return ZodDto as unknown as ZodDtoStatic<TSchema>;
}

export function isZodDto(value: unknown): value is ZodDtoStatic {
  return (
    typeof value === 'function' &&
    'zodSchema' in value &&
    value.zodSchema instanceof z.ZodType
  );
}
