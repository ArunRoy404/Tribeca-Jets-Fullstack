"use client";

import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Invites a team member.
 *
 * Call with `{ email, password, firstName, lastName, phone?, role,
 * permissions? }`.
 *
 * The API creates the account in `INVITED` status with the password the
 * inviter set, emailed with the invitation; the first sign-in activates it.
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
        "They show as Invited until their first sign-in.",
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
