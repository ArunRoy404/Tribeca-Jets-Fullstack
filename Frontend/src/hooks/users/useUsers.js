"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of the team directory.
 *
 * Takes the already-parsed params from `useUsersTableParams`, so the URL is the
 * only place table state lives and the query key follows it automatically —
 * changing a filter changes the key, and React Query fetches without anyone
 * wiring up an effect.
 *
 * Returns the query object as-is; components destructure what they need.
 */
export function useUsers(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.list(params),
    // Without this the table blanks out on every page change and the layout
    // jumps; with it the previous page stays put until the next one lands.
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
