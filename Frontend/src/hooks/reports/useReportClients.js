"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The clients ranking for `{ from, to, page, limit }`, largest revenue first. */
export function useReportClients(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.clients(params),
    queryFn: () => reportsService.clients(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
