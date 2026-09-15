/**
 * React Query timing and refetch behaviour, driven by env.
 *
 * Every knob lives here so tuning cache behaviour is a deployment change, not a
 * code change — and so no hook hard-codes a `staleTime` of its own.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time only when referenced
 * statically, so each variable is spelled out rather than read through a
 * computed key.
 */

/** Parses a numeric env value, falling back when unset or malformed. */
function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Parses a boolean env value. Anything other than "true"/"false" falls back. */
function bool(value, fallback) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * `false` is a meaningful value for refetchInterval (polling off), so an unset
 * or zero value must become `false` rather than 0, which React Query would
 * treat as "poll as fast as possible".
 */
function interval(value, fallback) {
  const parsed = num(value, fallback);
  return parsed > 0 ? parsed : false;
}

const MINUTE = 60 * 1000;

export const queryConfig = {
  /** How long fetched data is considered fresh before a refetch is allowed. */
  staleTime: num(process.env.NEXT_PUBLIC_QUERY_STALE_TIME, MINUTE),

  /** How long unused data stays in cache before garbage collection. */
  gcTime: num(process.env.NEXT_PUBLIC_QUERY_GC_TIME, 5 * MINUTE),

  /** Attempts after the first failure, for retryable (network/5xx) errors. */
  retryCount: num(process.env.NEXT_PUBLIC_QUERY_RETRY_COUNT, 2),

  /** Base backoff in ms; doubles each attempt, capped by retryDelayMax. */
  retryDelay: num(process.env.NEXT_PUBLIC_QUERY_RETRY_DELAY, 1000),
  retryDelayMax: num(process.env.NEXT_PUBLIC_QUERY_RETRY_DELAY_MAX, 30 * 1000),

  refetchOnWindowFocus: bool(process.env.NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS, false),
  refetchOnMount: bool(process.env.NEXT_PUBLIC_QUERY_REFETCH_ON_MOUNT, true),
  refetchOnReconnect: bool(process.env.NEXT_PUBLIC_QUERY_REFETCH_ON_RECONNECT, true),

  /** Background polling. `false` disables it. */
  refetchInterval: interval(process.env.NEXT_PUBLIC_QUERY_REFETCH_INTERVAL, 0),

  /** Session freshness — separate because it is checked far less often. */
  authStaleTime: num(process.env.NEXT_PUBLIC_AUTH_STALE_TIME, 5 * MINUTE),

  /** Mutations are not safe to replay blindly, so this defaults to 0. */
  mutationRetryCount: num(process.env.NEXT_PUBLIC_MUTATION_RETRY_COUNT, 0),
};

/**
 * Shared retry predicate.
 *
 * Never retries a request the server already answered definitively — a 401 or a
 * 422 will not change on a second attempt, and retrying only delays the error
 * the user needs to see.
 */
export function shouldRetry(failureCount, error) {
  const status = error?.statusCode ?? 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < queryConfig.retryCount;
}

export function retryDelay(attemptIndex) {
  return Math.min(
    queryConfig.retryDelay * 2 ** attemptIndex,
    queryConfig.retryDelayMax,
  );
}

/**
 * Named option presets, so hooks describe *what kind of data* they hold
 * instead of repeating magic numbers.
 *
 * Spread one into a `useQuery` call:
 *   `useQuery({ queryKey, queryFn, ...queryPresets.session })`
 */
export const queryPresets = {
  /**
   * The signed-in user. A 401 here is the ordinary signed-out state, not an
   * error worth retrying or surfacing, so retries are off entirely.
   */
  session: {
    staleTime: queryConfig.authStaleTime,
    gcTime: queryConfig.gcTime,
    retry: false,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  },

  /** Ordinary list/detail data. Inherits the global defaults. */
  standard: {
    staleTime: queryConfig.staleTime,
    gcTime: queryConfig.gcTime,
  },

  /** Rarely-changing reference data: airports, aircraft types, roles. */
  static: {
    staleTime: num(process.env.NEXT_PUBLIC_QUERY_STATIC_STALE_TIME, 60 * MINUTE),
    gcTime: queryConfig.gcTime,
    refetchOnWindowFocus: false,
  },

  /** Dashboards and trackers that should stay close to live. */
  live: {
    staleTime: 0,
    gcTime: queryConfig.gcTime,
    refetchInterval: interval(process.env.NEXT_PUBLIC_QUERY_LIVE_INTERVAL, 30 * 1000),
    refetchOnWindowFocus: true,
  },
};
