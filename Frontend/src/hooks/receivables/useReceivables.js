"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of invoices, each with its computed total, paid, balance and state. */
export function useReceivables(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.receivables.list(params),
    queryFn: () => receivablesService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
