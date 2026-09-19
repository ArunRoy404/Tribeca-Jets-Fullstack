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

/**
 * The shape `@nestjs/swagger` reads off a DTO class.
 *
 * It is `ApiPropertyOptions` per property, which is a JSON Schema object plus
 * `required` — so a schema converted out of Zod can be handed over almost
 * verbatim.
 */
type OpenApiProperty = Record<string, unknown> & { required: boolean };

/**
 * Zod → OpenAPI, for the documentation only.
 *
 * `io: 'input'` matters: several DTOs transform on the way in — `calendarDate`
 * parses `"2026-11-14"` into a `Date`, `optionalNumber` preprocesses `""` to
 * undefined — and the *output* type is what the service sees, not what a
 * caller sends. Documenting the output would tell everyone to post a
 * JavaScript Date.
 *
 * `unrepresentable: 'any'` keeps a schema that cannot be expressed in JSON
 * Schema from throwing and taking the whole document down with it. One
 * unrepresentable field becoming `{}` is a small loss; a 500 on `/api/docs`
 * is a total one.
 */
function toOpenApiSchema(schema: z.ZodType): Record<string, unknown> | null {
  try {
    return z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Explodes the schema's top level into the per-property metadata Swagger wants.
 *
 * Only the top level: Swagger expands a query DTO into one parameter per
 * property, and nested objects keep their own JSON Schema underneath, which it
 * renders as-is.
 */
function openApiPropertiesOf(
  schema: z.ZodType,
): Record<string, OpenApiProperty> {
  const json = toOpenApiSchema(schema);
  const properties = json?.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!properties) return {};

  const required = new Set((json?.required as string[] | undefined) ?? []);

  return Object.fromEntries(
    Object.entries(properties).map(([name, definition]) => [
      name,
      { ...describable(name, definition), required: required.has(name) },
    ]),
  );
}

/** Whether Swagger can tell what this property is without guessing. */
const TYPE_KEYS = ['type', 'enum', '$ref', 'allOf', 'oneOf', 'anyOf'];

/**
 * Guarantees every property says what it is.
 *
 * Swagger reads a property with no `type` as a **reference to another class**,
 * walks off looking for a model that does not exist, and throws "a circular
 * dependency has been detected" — which takes down the entire `/api/docs`
 * route, not just that one field. `z.coerce.date()` did exactly this: its
 * input is `unknown`, so it converted to `{}` and the whole document 500'd.
 *
 * The cause is worth fixing at the schema (see `common/dto/dates.ts`), but a
 * documentation helper must never be able to break the API it documents. So
 * anything that arrives typeless is published as free-form JSON and says so.
 */
function describable(
  name: string,
  definition: Record<string, unknown>,
): Record<string, unknown> {
  if (TYPE_KEYS.some((key) => key in definition)) return definition;

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[openapi] "${name}" has no representable type and is documented as free-form JSON. ` +
        'Give its Zod schema a concrete input type, or a .meta({ type, format }).',
    );
  }

  return {
    ...definition,
    type: 'object',
    additionalProperties: true,
    description:
      [definition.description, 'Schema could not be derived automatically.']
        .filter(Boolean)
        .join(' '),
  };
}

export function createZodDto<TSchema extends z.ZodType>(
  schema: TSchema,
): ZodDtoStatic<TSchema> {
  // Built once per DTO at module load rather than on every documentation
  // request: `createDocument` calls the factory for each route that uses the
  // DTO, and converting the same schema fifteen times is wasted work.
  const properties = openApiPropertiesOf(schema);

  class ZodDto {
    static zodSchema = schema;

    /**
     * How `@nestjs/swagger` discovers a class's properties without
     * `@ApiProperty` on every field. It is the same hook the Swagger CLI
     * plugin generates, which is why no plugin is needed here.
     *
     * Without it Swagger sees a class with no members: every request body
     * documented as an empty object, and every `@Query()` DTO rendered as
     * "No parameters" — which is exactly what /api/docs showed.
     */
    static _OPENAPI_METADATA_FACTORY(): Record<string, OpenApiProperty> {
      return properties;
    }
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
