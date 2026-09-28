"use client";

import { useMutation } from "@tanstack/react-query";
import { tasksService } from "@/services/tasks.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives a task — nothing is deleted, and Archived brings it back. */
export function useRemoveTask() {
  return useMutation({
    mutationFn: (id) => tasksService.remove(id),
    onSuccess: () => {
      invalidate(queryKeys.tasks.all);
      toastSuccess("Task archived", "It is under Archived, and can be restored.");
    },
    onError: (error) => toastApiError(error, "Could not archive this task"),
  });
}
