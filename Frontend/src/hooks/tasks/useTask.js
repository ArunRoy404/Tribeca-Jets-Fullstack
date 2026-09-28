"use client";

import { useQuery } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One task, for its panel and the edit form — archived tasks load too. */
export function useTask(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}
