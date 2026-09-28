"use client";

import { useMutation } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatTaskReference } from "@/lib/task";

/**
 * Any edit — a column move, a ticked checklist item, the full form. `quiet`
 * skips the success toast for the small, constant ones (a tick), which would
 * otherwise stack a toast per click.
 */
export function useUpdateTask({ quiet = false } = {}) {
  return useMutation({
    mutationFn: (payload) => tasksService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.tasks.all);
      if (!quiet) toastSuccess(`${formatTaskReference(data?.reference)} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this task"),
  });
}
