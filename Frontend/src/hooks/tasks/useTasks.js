"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of tasks — one board column, or the bell's due list. */
export function useTasks(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => tasksService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}
