"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The tiles and financial summary for `{ from, to }`. */
export function useReportSummary(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.summary(params),
    queryFn: () => reportsService.summary(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
