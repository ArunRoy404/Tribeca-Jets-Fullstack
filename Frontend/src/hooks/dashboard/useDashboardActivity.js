"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Recent activity the caller may read, newest first. */
export function useDashboardActivity(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(params),
    queryFn: () => dashboardService.activity(params),
    ...queryPresets.live,
    ...options,
  });
}
