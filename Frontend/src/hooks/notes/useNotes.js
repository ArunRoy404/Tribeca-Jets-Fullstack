"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The editable half of a timeline, without the audit entries.
 *
 * What the Withdrawn view reads: `archived: true` returns only notes somebody
 * took off the record, with who did it and when.
 */
export function useNotes(subjectType, subjectId, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.notes.list(subjectType, subjectId, params),
    queryFn: () => notesService.list({ ...params, subjectType, subjectId }),
    // `enabled` lets the caller keep the other view's query idle. Both are
    // mounted so switching tabs is instant, and firing both on every tab
    // doubled the requests for a list nobody was looking at.
    enabled: enabled && Boolean(subjectType && subjectId),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}
