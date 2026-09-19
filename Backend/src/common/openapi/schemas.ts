/**
 * A JSON Schema fragment, as OpenAPI 3 uses it.
 *
 * Declared here rather than imported: `@nestjs/swagger` keeps `SchemaObject`
 * behind its exports map, so reaching for it means reaching into `dist/` and
 * breaking on a patch release.
 */
type SchemaObject = Record<string, unknown>;

/**
 * The shapes every endpoint actually returns, written once.
 *
 * These mirror `common/types/api.types.ts` and the body
 * `AllExceptionsFilter` writes. They are hand-written rather than derived
 * because the runtime types are TypeScript interfaces, which leave nothing
 * behind to reflect on.
 */

export const PAGINATION_META_SCHEMA: SchemaObject = {
  type: 'object',
  description:
    'Server-side paging. The API owns paging — never slice a full list in the browser.',
  required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrevious'],
  properties: {
    page: { type: 'integer', example: 1, description: '1-based.' },
    limit: { type: 'integer', example: 10, description: 'Rows per page. Max 100.' },
    total: { type: 'integer', example: 42, description: 'Rows matching the filters, across all pages.' },
    totalPages: { type: 'integer', example: 5 },
    hasNext: { type: 'boolean', example: true },
    hasPrevious: { type: 'boolean', example: false },
  },
};

export const API_ERROR_SCHEMA: SchemaObject = {
  type: 'object',
  description: 'Every failure, in one shape, written by AllExceptionsFilter.',
  required: ['success', 'statusCode', 'message', 'path', 'timestamp'],
  properties: {
    success: { type: 'boolean', example: false },
    statusCode: { type: 'integer', example: 400 },
    message: {
      type: 'string',
      example: 'Validation failed',
      description: 'Safe to show a user. Never carries a stack trace or a database detail.',
    },
    errors: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description:
        'Present on validation failures only: one message per rejected field, keyed by field name.',
      example: { basePrice: 'The base price is required' },
    },
    path: { type: 'string', example: '/api/quotes' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const ENVELOPE_SCHEMA: SchemaObject = {
  type: 'object',
  description: 'Every successful response is wrapped by TransformInterceptor.',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      description: 'The record, or the list of records, this endpoint returns.',
    },
  },
};

export const PAGINATED_ENVELOPE_SCHEMA: SchemaObject = {
  type: 'object',
  description:
    'Every list endpoint. There are no unpaginated list endpoints in this API.',
  required: ['success', 'data', 'meta'],
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: { type: 'object' }, description: 'One page of rows.' },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
  },
};

export const BULK_RESULT_SCHEMA: SchemaObject = {
  type: 'object',
  description:
    'The result of a bulk archive or restore. Partial success is success: ids that matched nothing come back in `skipped` rather than failing the batch, because two people clearing the same rows both deserve to succeed.',
  required: ['affected', 'skipped'],
  properties: {
    affected: { type: 'integer', example: 3, description: 'How many rows actually changed.' },
    deleted: {
      type: 'integer',
      example: 3,
      description: 'Deprecated alias for `affected`, kept for existing callers.',
    },
    skipped: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      description: 'Ids that did not match a row this caller can act on.',
    },
  },
};

export const SHARED_SCHEMAS: Record<string, SchemaObject> = {
  PaginationMeta: PAGINATION_META_SCHEMA,
  ApiError: API_ERROR_SCHEMA,
  ApiEnvelope: ENVELOPE_SCHEMA,
  PaginatedEnvelope: PAGINATED_ENVELOPE_SCHEMA,
  BulkResult: BULK_RESULT_SCHEMA,
};
