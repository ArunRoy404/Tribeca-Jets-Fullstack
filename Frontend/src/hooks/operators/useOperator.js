"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * One operator, with its audit trail and the empty `fleet` / `tripHistory` /
 * `payments` arrays the detail tabs bind to. Idle until an id is selected.
 */
export function useOperator(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.operators.detail(id),
    queryFn: () => operatorsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}
