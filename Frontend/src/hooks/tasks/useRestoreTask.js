"use client";

import { useMutation } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatTaskReference } from "@/lib/task";

export function useRestoreTask() {
  return useMutation({
    mutationFn: (id) => tasksService.restore(id),
    onSuccess: (data) => {
      invalidate(queryKeys.tasks.all);
      toastSuccess(`${formatTaskReference(data?.reference)} restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this task"),
  });
}
