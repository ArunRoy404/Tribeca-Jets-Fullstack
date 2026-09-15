"use client";

import { X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { useRemoveUser } from "@/hooks/users";

export default function DeleteUserDialog() {
  const open = useUsersRolesStore((s) => s.deleteModalOpen);
  const close = useUsersRolesStore((s) => s.closeDeleteModal);
  // Held whole rather than looked up by id: the list refetches on success and
  // would drop the row mid-animation, leaving the dialog unable to name it.
  const target = useUsersRolesStore((s) => s.deleteTarget);

  const { mutate: removeUser, isPending, error, reset } = useRemoveUser();

  const handleDelete = () => {
    if (!target?.id) return;
    removeUser(target.id, { onSuccess: close });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset?.();
          close?.();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-6 rounded-2xl gap-4 bg-white border border-border shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-destructive shrink-0">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
            Remove team member?
          </DialogTitle>
        </DialogHeader>

        <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
          <span className="font-bold text-foreground">{target?.name}</span> (
          <span className="font-bold text-purple">{target?.email}</span>) will be signed
          out immediately and will lose access to the Command Center.
        </p>
        {/* Says what actually happens. "Delete" overstated it: the row, its
            audit trail and everything referencing it are retained. */}
        <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
          Their record and history are kept, so past trips, clients and activity stay
          intact. They can be invited again later.
        </p>

        {error && (
          <p className="font-montserrat text-[12px] text-destructive">{error.message}</p>
        )}

        <div className="border-t border-border flex items-center justify-end gap-2 pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-white gap-2 px-4 shadow-sm"
          >
            <Trash2 className="size-4" />
            {isPending ? "Removing…" : "Remove access"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
