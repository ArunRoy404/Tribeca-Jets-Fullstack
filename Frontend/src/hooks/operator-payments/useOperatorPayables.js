"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of operator bills, each with its computed total, paid, balance and state. */
export function useOperatorPayables(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorPayments.list(params),
    queryFn: () => operatorPaymentsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
