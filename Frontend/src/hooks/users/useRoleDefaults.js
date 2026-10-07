"use client";

import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * One role's starting permissions — per module, its reach, the modules it
 * requires, and each action as default or locked. What the invite and edit
 * forms load when a role is picked.
 *
 * `static` preset: these change only when the server's rules do.
 */
export function useRoleDefaults(role, options = {}) {
  return useQuery({
    queryKey: queryKeys.users.roleDefaults(role),
    queryFn: () => usersService.roleDefaults(role),
    enabled: Boolean(role),
    ...queryPresets.static,
    ...options,
  });
}
