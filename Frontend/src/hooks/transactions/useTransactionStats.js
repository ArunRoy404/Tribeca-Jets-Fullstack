"use client";

import { useQuery } from "@tanstack/react-query";
import { transactionsService } from "@/services/transactions.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Money in, money out and the net, over the same filters as the list. */
export function useTransactionStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.stats(params),
    queryFn: () => transactionsService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}
