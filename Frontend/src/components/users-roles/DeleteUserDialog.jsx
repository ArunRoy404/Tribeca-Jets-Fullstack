"use client";

import { X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";

export default function DeleteUserDialog() {
  const open = useUsersRolesStore((s) => s.deleteModalOpen);
  const close = useUsersRolesStore((s) => s.closeDeleteModal);
  const targetId = useUsersRolesStore((s) => s.deleteTargetId);
  const getUserById = useUsersRolesStore((s) => s.getUserById);
  const deleteUser = useUsersRolesStore((s) => s.deleteUser);

  const item = targetId ? getUserById(targetId) : null;

  const handleDelete = () => {
    if (targetId) {
      deleteUser(targetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl gap-4 bg-white border border-border shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-destructive shrink-0">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
            Delete User Account?
          </DialogTitle>
        </DialogHeader>

        <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
          Are you sure you want to delete user{" "}
          <span className="font-bold text-foreground">{item ? item.name : ""}</span> (
          <span className="font-bold text-purple">{item ? item.email : ""}</span>)? This action will revoke all permissions.
        </p>

        <div className="border-t border-border flex items-center justify-end gap-2 pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-white gap-2 px-4 shadow-sm"
          >
            <Trash2 className="size-4" />
            Delete User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
