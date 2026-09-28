import type { INestApplication } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import {
  PATH_METADATA,
  METHOD_METADATA,
  HTTP_CODE_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../constants/auth.constants.js';
import type { PermissionRequirement } from '../decorators/permissions.decorator.js';
import { SHARED_SCHEMAS } from './schemas.js';

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
};

type RouteFacts = {
  isPublic: boolean;
  permissions: string[];
  /**
   * The status an explicit `@HttpCode` sets, if any.
   *
   * Needed because Nest only injects a default success response when a
   * controller declares no `@ApiResponse` of its own — so a route that
   * documents a 403 by hand arrives here with no 200 at all, and without this
   * it would be published as an operation that returns nothing but errors.
   */
  httpCode?: number;
};

const ERROR = { $ref: '#/components/schemas/ApiError' };
const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ERROR } },
});

/** `/api` + `clients` + `:id/restore` → `/api/clients/{id}/restore`. */
function joinPath(...parts: (string | undefined)[]): string {
  const joined = parts
    .filter((part): part is string => Boolean(part) && part !== '/')
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`.replace(/:([^/]+)/g, '{$1}');
}

/**
 * Rebuilds "which route carries which auth metadata" from the metadata the
 * guards themselves read.
 *
 * Derived rather than hand-listed on purpose: a 403 documented by hand goes
 * stale the first time a permission changes, and a documentation page that
 * disagrees with the guard is worse than one that says nothing.
 */
function collectRouteFacts(app: INestApplication): Map<string, RouteFacts> {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);
  const facts = new Map<string, RouteFacts>();

  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;

    const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) as
      | string
      | undefined;
    const prototype = Object.getPrototypeOf(instance) as object;

    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const handler = (instance as Record<string, unknown>)[methodName];
      if (typeof handler !== 'function') continue;

      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as
        | number
        | undefined;
      const routePath = Reflect.getMetadata(PATH_METADATA, handler) as
        | string
        | undefined;
      if (verb === undefined) continue;

      const requirement = reflector.get<PermissionRequirement | undefined>(
        PERMISSIONS_KEY,
        handler,
      );

      facts.set(
        `${METHOD_NAMES[verb]} ${joinPath(controllerPath, routePath)}`,
        {
          isPublic:
            reflector.get<boolean | undefined>(IS_PUBLIC_KEY, handler) === true,
          permissions: requirement?.permissions ?? [],
          httpCode: Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
            | number
            | undefined,
        },
      );
    }
  }

  return facts;
}

/**
 * Gives every operation the responses it can actually return.
 *
 * Ninety-five routes carried a bare, undescribed `200` and nothing else —
 * no success shape, no error shape, no sign that a call could be refused.
 * Writing four `@ApiResponse` decorators on each of them would be ~380 lines
 * that drift the first time a rule changes, so this derives them instead:
 *
 * - **200/201** — the envelope, paginated when the route takes `page`.
 * - **400** — whenever the route accepts a body or a query parameter.
 * - **401** — every route the global `JwtAuthGuard` protects, which is all of
 *   them except `@Public()` ones.
 * - **403** — every route carrying `@RequirePermissions`, named so the reader
 *   can see *which* permission.
 * - **404** — every route with a path parameter. This API returns 404 rather
 *   than 403 for a record outside the caller's scope, because a 403 confirms
 *   the row exists and turns any id into an oracle; the description says so.
 *
 * Anything a controller states explicitly is left alone.
 */
export function describeResponses(
  document: OpenAPIObject,
  app: INestApplication,
  apiPrefix: string,
): OpenAPIObject {
  const facts = collectRouteFacts(app);

  document.components ??= {};
  // Generated DTO schemas win: SHARED_SCHEMAS only fills in the envelopes and
  // the error shape, which no DTO produces.
  document.components.schemas = {
    ...SHARED_SCHEMAS,
    ...document.components.schemas,
  } as NonNullable<OpenAPIObject['components']>['schemas'];

  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item ?? {})) {
      // A path item also carries non-operation keys such as `parameters`.
      if (typeof operation !== 'object' || operation === null) continue;
      const op = operation as {
        parameters?: { in: string; name: string }[];
        requestBody?: unknown;
        responses?: Record<string, unknown>;
      };
      if (!op.responses) continue;

      const withoutPrefix = path.startsWith(`/${apiPrefix}`)
        ? path.slice(apiPrefix.length + 1) || '/'
        : path;
      const route = facts.get(`${method} ${withoutPrefix}`) ?? {
        isPublic: false,
        permissions: [],
      };

      const parameters = op.parameters ?? [];
      const isPaginated = parameters.some(
        (p) => p.in === 'query' && p.name === 'page',
      );
      const hasPathParam = parameters.some((p) => p.in === 'path');
      const takesInput = Boolean(op.requestBody) || parameters.length > 0;


      /**
       * Which status this route answers with when it works.
       *
       * Nest injects a default 200/201 only when the controller declares no
       * `@ApiResponse` of its own, so a route that documents a 403 by hand —
       * which the Files module has to, because its permission depends on the
       * row's category — would otherwise be published as an operation that can
       * only fail. The code is reconstructed the same way Nest picks it: an
       * explicit `@HttpCode` wins, else POST is 201 and everything else 200.
       */
      const successCode = op.responses['201']
        ? '201'
        : op.responses['200']
          ? '200'
          : op.responses['204']
            ? '204'
            : String(route.httpCode ?? (method === 'post' ? 201 : 200));

      op.responses[successCode] ??= {};
      const success = op.responses[successCode] as
        | { description?: string; content?: unknown }
        | undefined;

      // A 204 has no body by definition, so it gets words rather than a
      // schema — an empty description reads as an undocumented endpoint.
      if (successCode === '204' && success && !success.description) {
        success.description =
          'Done. No body — the record was archived, not destroyed, and can be restored.';
      }

      const isBulk = path.includes('/bulk-');

      // Only fill in what the controller has not already said. A 204 is
      // described above and by definition carries no body, so it is skipped.
      if (success && successCode !== '204' && !success.content) {
        success.description ||= isBulk
          ? 'Applied. Partial success is success — check `skipped`.'
          : isPaginated
            ? 'One page of results, newest first.'
            : 'The record.';
        success.content = {
          'application/json': {
            schema: isBulk
              ? {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/BulkResult' },
                      },
                    },
                  ],
                }
              : {
                  $ref: isPaginated
                    ? '#/components/schemas/PaginatedEnvelope'
                    : '#/components/schemas/ApiEnvelope',
                },
          },
        };
      }

      if (takesInput && !op.responses['400']) {
        op.responses['400'] = errorResponse(
          'Validation failed. `errors` names each rejected field. Enum values are case-sensitive — `?status=sent` is rejected rather than silently corrected.',
        );
      }

      if (!route.isPublic && !op.responses['401']) {
        op.responses['401'] = errorResponse(
          'Not signed in, or the session cookie has expired. Authentication is httpOnly cookies only — no token is ever returned to the browser.',
        );
      }

      if (route.permissions.length > 0 && !op.responses['403']) {
        op.responses['403'] = errorResponse(
          `Your role does not hold ${route.permissions.join(' and ')}. A 403 means the action is unavailable to the role at all — a record you merely cannot see returns 404 instead.`,
        );
      }

      if (hasPathParam && !op.responses['404']) {
        op.responses['404'] = errorResponse(
          'No such record, **or** it is outside your scope. The two are deliberately indistinguishable: a 403 here would confirm the record exists and turn any id into an oracle.',
        );
      }
    }
  }

  return document;
}
