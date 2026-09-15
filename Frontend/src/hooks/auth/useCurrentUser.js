"use client";

import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The signed-in user.
 *
 * With httpOnly cookies the frontend cannot decode a token to find out who is
 * signed in, so this endpoint is the session's source of truth. Call it
 * wherever the current user is needed — React Query dedupes concurrent callers
 * into one request.
 *
 * Returns the query object as-is; components destructure what they need.
 */
export function useCurrentUser(options = {}) {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authService.currentUser,
    // `session` carries the retry and staleTime rules for auth state, so no
    // magic numbers live in this file.
    ...queryPresets.session,
    ...options,
  });
}
