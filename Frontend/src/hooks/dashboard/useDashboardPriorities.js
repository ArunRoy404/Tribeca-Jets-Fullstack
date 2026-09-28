"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Today's priorities, most overdue first. */
export function useDashboardPriorities(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.dashboard.priorities(params),
    queryFn: () => dashboardService.priorities(params),
    ...queryPresets.live,
    ...options,
  });
}
