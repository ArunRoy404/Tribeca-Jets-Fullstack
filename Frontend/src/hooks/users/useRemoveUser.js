"use client";

import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { invalidate, removeQueries } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Removes a team member. Call with the user's id.
 *
 * Soft delete on the server: the row and its history survive, and every
 * session that account held is revoked in the same transaction.
 */
export function useRemoveUser() {
  return useMutation({
    mutationFn: usersService.remove,
    onSuccess: (_data, id) => {
      // Drop the detail entry outright rather than invalidating it — refetching
      // a removed user would only 404.
      removeQueries(queryKeys.users.detail(id));
      invalidate(queryKeys.users.all);

      toastSuccess(
        "Team member removed",
        "Their access was revoked immediately. History is retained.",
      );
    },
    onError: (error) => toastApiError(error, "Could not remove this team member"),
  });
}
