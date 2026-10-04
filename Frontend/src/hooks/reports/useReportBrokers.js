"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The brokers ranking for `{ from, to, page, limit }`, largest revenue first. */
export function useReportBrokers(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.brokers(params),
    queryFn: () => reportsService.brokers(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
