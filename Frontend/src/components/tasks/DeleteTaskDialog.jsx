"use client";

import { Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTasksStore } from "@/store/useTasksStore";

export default function DeleteTaskDialog() {
  const open = useTasksStore((s) => s.deleteModalOpen);
  const close = useTasksStore((s) => s.closeDeleteModal);
  const targetId = useTasksStore((s) => s.deleteTargetId);
  const getTaskById = useTasksStore((s) => s.getTaskById);
  const deleteTask = useTasksStore((s) => s.deleteTask);

  const task = targetId ? getTaskById(targetId) : null;

  const handleDelete = () => {
    if (targetId) {
      deleteTask(targetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border rounded-xl shadow-2xl" showCloseButton={false}>
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full size-9 bg-destructive shrink-0">
              <Trash2 className="size-4 text-white" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[16px] text-ink">Delete Task?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-4">
          <p className="font-montserrat text-[14px] text-slate leading-relaxed">
            Delete &ldquo;{task ? task.title : ""}&rdquo;? This cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-secondary">
            <Button type="button" variant="outline" onClick={close} className="gap-2 px-4">
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete} className="gap-2 px-4">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
