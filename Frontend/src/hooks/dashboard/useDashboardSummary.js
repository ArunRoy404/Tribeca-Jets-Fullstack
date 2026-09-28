"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The tiles for one period, compared with the period before it. */
export function useDashboardSummary(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(params),
    queryFn: () => dashboardService.summary(params),
    placeholderData: keepPreviousData,
    ...queryPresets.live,
    ...options,
  });
}
