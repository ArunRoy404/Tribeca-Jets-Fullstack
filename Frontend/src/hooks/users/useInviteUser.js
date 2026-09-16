"use client";

import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Invites a team member.
 *
 * Call with `{ email, firstName, lastName, phone?, role? }`.
 *
 * The API creates the account in `INVITED` status with no usable password —
 * the invitee sets their own through the reset flow — so there is no
 * credential here to show or copy.
 */
export function useInviteUser() {
  return useMutation({
    mutationFn: usersService.invite,
    onSuccess: (data) => {
      // Headcount tiles and the roles tab's per-role counts both move, so the
      // whole `users` prefix goes rather than just the list.
      invalidate(queryKeys.users.all);

      const name = [data?.user?.firstName, data?.user?.lastName]
        .filter(Boolean)
        .join(" ");
      toastSuccess(
        `${name || data?.user?.email} was invited`,
        "They will appear as Invited until they set a password.",
      );

      // Without SMTP no mail was sent, and the invitee would wait forever for
      // an email that does not exist. Say so instead of implying success.
      if (data?.invitation?.emailSent === false && data?.invitation?.notice) {
        toastInfo("No invitation email was sent", data.invitation.notice);
      }
    },
    onError: (error) => toastApiError(error, "Could not send the invitation"),
  });
}
