/**
 * Where-clause builders shared by every module's list endpoint.
 *
 * Each of these existed twice, written slightly differently each time, before
 * being lifted here. They are deliberately small: a list endpoint's `where` is
 * the security boundary, so it stays readable at the call site rather than
 * disappearing behind a query builder.
 */

/**
 * Case-insensitive "contains" across columns or dotted relation paths.
 *
 * Returns `{}` for an absent term so it can be spread unconditionally — the
 * alternative is a `...(query.search ? {...} : {})` ternary at every call site,
 * which is what this replaces.
 *
 * This produces an `OR`. Join it through `AND` when visibility supplies its
 * own `OR`, so neither replaces the other.
 *
 * @example ...searchAcross(query.search, ['firstName', 'email'])
 */
export function searchAcross(term: string | undefined, fields: readonly string[]): Record<string, unknown> {
  const OR = searchMatches(term, fields);
  return OR.length ? { OR } : {};
}

const MAX_SEARCH_WORDS = 6;

/** Alternatives for an existing search OR that also contains other matches. */
export function searchMatches(term: string | undefined, fields: readonly string[]): Record<string, unknown>[] {
  const phrase = term?.trim();
  if (!phrase || !fields.length) return [];

  const paths = fields.map((field) => field.split('.'));
  const matches = (contains: string) => paths.map((path) =>
    path.reduceRight<Record<string, unknown>>((condition, key) => ({ [key]: condition }), { contains, mode: 'insensitive' }),
  );
  const whole = matches(phrase);
  const words = phrase.split(/\s+/);
  // For longer input, keep the original phrase match and bound query growth.
  if (words.length < 2 || words.length > MAX_SEARCH_WORDS) return whole;

  return [...whole, { AND: words.map((word) => ({ OR: matches(word) })) }];
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
