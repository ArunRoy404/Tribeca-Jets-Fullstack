"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The routes ranking for `{ from, to, page, limit }`, largest revenue first. */
export function useReportRoutes(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.routes(params),
    queryFn: () => reportsService.routes(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
