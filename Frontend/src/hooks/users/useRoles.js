"use client";

import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * Roles and the permission matrix behind the Roles & Permissions tab.
 *
 * `static` preset: these change only when the backend's rules change, so
 * refetching them on every window focus would be pure noise. The live
 * `userCount` on each role is refreshed by invalidation after a write, not by
 * polling.
 */
export function useRoles(options = {}) {
  return useQuery({
    queryKey: queryKeys.users.roles,
    queryFn: usersService.roles,
    ...queryPresets.static,
    ...options,
  });
}
