"use client";

import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { toastSuccess } from "@/lib/toast";

/**
 * Withdraws a pending invitation — permanently deletes the account, which the
 * API allows only while it is still INVITED. Call with the user's id.
 *
 * The API refuses, naming them, while clients, trips or documents are
 * attached. That refusal is shown inside the confirm dialog, from the
 * mutation's `error` — not as a toast behind it — so there is no error toast.
 */
export function useWithdrawInvitation() {
  return useMutation({
    mutationFn: usersService.withdrawInvitation,
    onSuccess: (data) => {
      invalidate(queryKeys.users.all);
      // The detail sheet would otherwise sit open on a row that is gone.
      useUsersRolesStore.getState().closeUserDetail();
      toastSuccess("Invitation withdrawn", `${data?.email ?? "The address"} can be invited again.`);
    },
  });
}
