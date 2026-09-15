"use client";

import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Headcount tiles above the users table. */
export function useUserStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.users.stats,
    queryFn: usersService.stats,
    ...queryPresets.standard,
    ...options,
  });
}
