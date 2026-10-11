"use client";

import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import { useWithdrawInvitation } from "@/hooks/users";

/**
 * Confirms withdrawing one pending invitation, naming the person and the
 * address. It is the one permanent delete in the system, so the note says so
 * plainly. Open while `user` is set; `onClose` clears it.
 */
export default function WithdrawInvitationDialog({ user, onClose }) {
  const { mutate, isPending, error, reset } = useWithdrawInvitation();

  return (
    <BulkDeleteDialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (open) return;
        // The next invitation opened must not show this one's refusal.
        reset();
        onClose?.();
      }}
      items={user ? [{ id: user.id, primary: user.name, secondary: user.email }] : []}
      itemLabel="invitations"
      note="They never signed in, so the account is deleted permanently and the address is free to invite again. The audit log keeps a record of the invitation and its withdrawal."
      isPending={isPending}
      error={error ? error.message || "Could not withdraw this invitation." : null}
      onConfirm={() => mutate(user?.id, { onSuccess: () => onClose?.() })}
    />
  );
}
