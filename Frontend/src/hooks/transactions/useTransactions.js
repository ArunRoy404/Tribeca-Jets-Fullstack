"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { transactionsService } from "@/services/transactions.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of the money ledger, merged by the API from the three money modules. */
export function useTransactions(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
