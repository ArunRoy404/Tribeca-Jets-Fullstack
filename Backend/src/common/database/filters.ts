/**
 * Where-clause builders shared by every module's list endpoint.
 *
 * Each of these existed twice, written slightly differently each time, before
 * being lifted here. They are deliberately small: a list endpoint's `where` is
 * the security boundary, so it stays readable at the call site rather than
 * disappearing behind a query builder.
 */

/**
 * Case-insensitive "contains" across several columns.
 *
 * Returns `{}` for an absent term so it can be spread unconditionally — the
 * alternative is a `...(query.search ? {...} : {})` ternary at every call site,
 * which is what this replaces.
 *
 * Note this produces `OR`, so it must be spread into a `where` that has no
 * other `OR` key. No caller needs one today; if one does, nest it under `AND`
 * rather than widening this helper.
 *
 * @example ...searchAcross(query.search, ['firstName', 'email'])
 */
export function searchAcross<T extends string>(
  term: string | undefined,
  fields: readonly T[],
): Record<string, unknown> {
  if (!term) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: term, mode: 'insensitive' },
    })),
  };
}

/**
 * Equality filters for whichever of `keys` the caller actually sent.
 *
 * An absent filter must mean "no constraint", never `undefined` — Prisma
 * treats an explicit `undefined` as "ignore" but an explicit `null` as "IS
 * NULL", and the difference is one typo away from a wrong result set.
 *
 * @example ...equalsAny(query, ['type', 'leadStage'])
 */
export function equalsAny<TQuery extends object, TKey extends keyof TQuery>(
  query: TQuery,
  keys: readonly TKey[],
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== null && value !== '') {
      where[key as string] = value;
    }
  }
  return where;
}

/**
 * A single-column `orderBy`, built from an already-validated sort field.
 *
 * `sortBy` is narrowed to a closed list by `sortableBy()` in the DTO, so by the
 * time it reaches here it cannot be an arbitrary column. This exists so that
 * invariant is stated in one place instead of being re-assumed per service.
 */
export function orderByField(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Record<string, 'asc' | 'desc'> {
  return { [sortBy]: sortOrder };
}
