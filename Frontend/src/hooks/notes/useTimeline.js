"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A record's timeline: notes and the audit entries about the same record,
 * merged newest-first by the API.
 *
 * The merge happens server-side deliberately — two lists paged independently
 * in the browser cannot be interleaved without fetching all of both.
 */
export function useTimeline(subjectType, subjectId, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.notes.timeline(subjectType, subjectId, params),
    queryFn: () =>
      notesService.timeline({ ...params, subjectType, subjectId }),
    // No subject, no timeline — the tab renders before the record has loaded.
    // `enabled` lets the caller keep the other view's query idle. Both are
    // mounted so switching tabs is instant, and firing both on every tab
    // doubled the requests for a list nobody was looking at.
    enabled: enabled && Boolean(subjectType && subjectId),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}
