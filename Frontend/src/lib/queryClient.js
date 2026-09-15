import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { queryConfig, retryDelay, shouldRetry } from "@/config/query.config";

/**
 * A module-level QueryClient, so cached data can be read or invalidated from
 * anywhere — hook files, axios interceptors, plain helpers — without being
 * inside a component that can call `useQueryClient()`.
 *
 * Created lazily and reused, so a fast refresh in development does not wipe the
 * cache on every edit.
 */
let client = null;

export function getQueryClient() {
  // Every timing comes from `config/query.config.js`, which reads env — so
  // cache behaviour is tunable per environment without touching code.
  client ??= new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: queryConfig.staleTime,
        gcTime: queryConfig.gcTime,
        refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
        refetchOnMount: queryConfig.refetchOnMount,
        refetchOnReconnect: queryConfig.refetchOnReconnect,
        refetchInterval: queryConfig.refetchInterval,
        retry: shouldRetry,
        retryDelay,
      },
      mutations: {
        // A mutation is not safe to replay blindly — it may have already
        // applied server-side before the response was lost.
        retry: queryConfig.mutationRetryCount,
      },
    },
  });

  return client;
}

// ---------------------------------------------------------------------------
// Global cache helpers — usable from any hook file, no component required.
// ---------------------------------------------------------------------------

/**
 * Invalidates one or more query keys, so anything currently mounted refetches.
 *
 * @param {...Array} keys - query keys, e.g. `invalidate(queryKeys.clients.all)`
 */
export function invalidate(...keys) {
  const qc = getQueryClient();
  return Promise.all(
    keys.map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}

/** Writes a value straight into the cache — used after login to seed the user. */
export function setQueryData(queryKey, data) {
  return getQueryClient().setQueryData(queryKey, data);
}

export function getQueryData(queryKey) {
  return getQueryClient().getQueryData(queryKey);
}

/** Drops a key entirely. Unlike invalidate, it does not refetch. */
export function removeQueries(...keys) {
  const qc = getQueryClient();
  keys.forEach((queryKey) => qc.removeQueries({ queryKey }));
}

/**
 * Wipes every cached query.
 *
 * Call on sign-out: leaving another user's clients, trips and financials in
 * memory for the next person to sign in on the same browser would be a real
 * data leak, not just a stale-cache annoyance.
 */
export function clearAllQueries() {
  getQueryClient().clear();
}

/** Convenience for the common case of "the signed-in user changed". */
export function invalidateCurrentUser() {
  return invalidate(queryKeys.auth.currentUser);
}
