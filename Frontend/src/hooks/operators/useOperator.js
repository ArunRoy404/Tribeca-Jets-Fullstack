"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * One operator, with its audit trail, fleet, trip count and the empty
 * `payments` array (Operator Payments, #17). The Trip History tab pages
 * `GET /trips?operatorId=` itself. Idle until an id is selected.
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
