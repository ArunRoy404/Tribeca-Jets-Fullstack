"use client";

import { useMutation } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatTaskReference } from "@/lib/task";

export function useCreateTask() {
  return useMutation({
    mutationFn: (payload) => tasksService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.tasks.all);
      toastSuccess(`${formatTaskReference(data?.reference)} added`);
    },
    onError: (error) => toastApiError(error, "Could not add this task"),
  });
}
