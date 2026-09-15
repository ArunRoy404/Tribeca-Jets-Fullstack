"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of the operator directory.
 *
 * Takes the already-parsed params from `useOperatorsTableParams`, so the URL is
 * the only place table state lives and the query key follows it automatically.
 */
export function useOperators(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.operators.list(params),
    queryFn: () => operatorsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
