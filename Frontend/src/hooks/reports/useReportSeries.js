"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One chart's points: `{ bucket, on }`. */
export function useReportSeries(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.series(params),
    queryFn: () => reportsService.series(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
