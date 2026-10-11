"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The signed-in user's live sessions, one per device. */
export function useSessions(params = {}) {
  return useQuery({
    queryKey: queryKeys.auth.sessions(params),
    queryFn: () => authService.sessions(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}
