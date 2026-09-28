"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { uploadsService } from "@/services/uploads.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * One person's document folder.
 *
 * The client asked for "a folder for each broker that I can attach tax forms
 * to". That folder is a *query* — every live document filed about them — not a
 * second table, so there is nothing to keep in step when a file is removed.
 *
 * Reading somebody else's folder needs permission to manage users; the API
 * answers 403, and the tab is only rendered for callers who hold it.
 */
export function useUserDocuments(userId, params) {
  return useQuery({
    queryKey: queryKeys.uploads.folder(userId, params),
    queryFn: () =>
      uploadsService.list({ ...params, ownerUserId: userId, kind: "DOCUMENT" }),
    // No user, no folder — the sheet renders before an id is chosen.
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}
