"use client";

import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One team member. Disabled until an id exists, so opening the detail
 *  sheet drives the fetch rather than a mount-time request for `undefined`. */
export function useUser(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}
