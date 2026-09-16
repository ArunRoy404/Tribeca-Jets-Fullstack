"use client";

import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { invalidate, invalidateCurrentUser } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Updates a team member. Call with `{ id, ...changedFields }`.
 *
 * The API refuses self-demotion, deactivating your own account, touching the
 * owner account, and removing the last active administrator. Those come back
 * as ordinary 400/403s with a readable message, which `toastApiError` surfaces
 * verbatim — the server's wording is better than anything generic here.
 */
export function useUpdateUser() {
  return useMutation({
    mutationFn: usersService.update,
    onSuccess: (data, variables) => {
      invalidate(queryKeys.users.all);
      invalidate(queryKeys.users.detail(variables?.id));

      // Changing your own profile changes the name and avatar in both navs,
      // which read from the session rather than from this list.
      invalidateCurrentUser();

      toastSuccess(
        "Team member updated",
        [data?.firstName, data?.lastName].filter(Boolean).join(" ") || undefined,
      );
    },
    onError: (error) => toastApiError(error, "Could not update this team member"),
  });
}
