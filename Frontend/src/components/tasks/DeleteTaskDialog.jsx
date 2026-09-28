"use client";

import { Archive, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTasksStore } from "@/store/useTasksStore";
import { useRemoveTask, useTask } from "@/hooks/tasks";
import { toTask } from "@/lib/task";

/**
 * Archives a task. It said "Delete … This cannot be undone" — nothing in this
 * system is deleted, and the task is one click from coming back.
 */
export default function DeleteTaskDialog({ onArchived }) {
  const targetId = useTasksStore((s) => s.archiveTargetId);
  const close = useTasksStore((s) => s.closeArchiveModal);
  const { data } = useTask(targetId);
  const { mutate, isPending } = useRemoveTask();
  const task = data ? toTask(data) : null;

  const archive = () =>
    mutate(targetId, {
      onSuccess: () => {
        onArchived?.(targetId);
        close();
      },
    });

  return (
    <Dialog open={Boolean(targetId)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border rounded-xl shadow-2xl" showCloseButton={false}>
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full size-9 bg-destructive shrink-0">
              <Archive className="size-4 text-white" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[16px] text-ink">Archive Task?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-4">
          <p className="font-montserrat text-[14px] text-slate leading-relaxed">
            Archive &ldquo;{task?.title ?? ""}&rdquo;? It leaves the board and moves to Archived, where it can be restored.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-secondary">
            <Button type="button" variant="outline" onClick={close} className="gap-2 px-4">
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="button" onClick={archive} disabled={isPending} className="gap-2 px-4">
              <Archive className="size-4" />
              Archive
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
