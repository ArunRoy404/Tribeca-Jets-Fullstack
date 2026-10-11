"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/tasks";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { toTask } from "@/lib/task";
import { toISODate } from "@/lib/date";

const LIMIT = 10;

/**
 * The notification bell: **your tasks due today or overdue** (Tasks Board,
 * #20) — real work from the API, assigned to you.
 *
 * It pulls live items requiring immediate action via
 * `GET /tasks?view=ATTENTION&assigneeId=<currentUserId>`. Clicking an item
 * opens its detail drawer in the Tasks Board.
 */
export default function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const { canAccess } = usePermissions();

  const mayViewTasks = canAccess(Module.TASKS, Action.VIEW);
  const today = toISODate(new Date());

  const { data, isPending } = useTasks(
    { view: "ATTENTION", assigneeId: me?.id, limit: LIMIT, on: today },
    { enabled: Boolean(me?.id) && mayViewTasks },
  );

  const tasks = useMemo(() => (data?.data ?? []).map(toTask), [data?.data]);
  const total = data?.meta?.total ?? 0;

  if (!mayViewTasks) return null;

  const handleSelectTask = (taskId) => {
    setOpen(false);
    router.push(`/dashboard/tasks-board?task=${taskId}`);
  };

  const handleViewAll = (view = "MINE") => {
    setOpen(false);
    router.push(`/dashboard/tasks-board?view=${view}`);
  };

  const handleOpenBoard = () => {
    setOpen(false);
    router.push("/dashboard/tasks-board");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={total ? `${total} tasks due today or overdue` : "Tasks notification center"}
        className="relative bg-secondary flex items-center justify-center rounded-lg size-9 sm:size-11 cursor-pointer shrink-0 outline-none hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-purple/50 transition-colors"
      >
        <div className="relative size-5 sm:size-6">
          <Image
            src="/dashboard/icons/bell-1.svg"
            alt=""
            width={17}
            height={17}
            className="absolute left-[3px] top-[5px] w-[17px] h-[17px]"
          />
          <Image
            src="/dashboard/icons/bell-2.svg"
            alt=""
            width={6}
            height={2}
            className="absolute left-[9px] top-[23px] w-[6px] h-[2px]"
          />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-outfit font-semibold leading-none shadow-sm">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 gap-0 shadow-2xl border border-border rounded-xl overflow-hidden bg-white z-50"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <p className="font-montserrat font-bold text-[16px] text-foreground">Notifications</p>
            {total > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold font-montserrat bg-destructive/10 text-destructive border border-destructive/20">
                {total} due
              </span>
            )}
          </div>
          {total > 0 && (
            <button
              type="button"
              onClick={() => handleViewAll("ATTENTION")}
              className="text-[12px] font-montserrat font-medium text-purple hover:underline cursor-pointer"
            >
              View all
            </button>
          )}
        </div>

        {isPending && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="size-5 animate-spin text-purple" />
            <p className="text-[12px] font-montserrat text-muted-foreground">Checking tasks due…</p>
          </div>
        )}

        {!isPending && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2.5">
            <div className="flex items-center justify-center size-10 rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="font-montserrat font-semibold text-[14px] text-foreground">All caught up</p>
              <p className="font-montserrat text-[12px] text-muted-foreground mt-0.5">
                You have no tasks due today or overdue.
              </p>
            </div>
          </div>
        )}

        {!isPending && tasks.length > 0 && (
          <div className="flex flex-col divide-y divide-border/60 max-h-[360px] overflow-y-auto">
            {tasks.map((task) => {
              const isOverdue = task.attention === "OVERDUE";
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleSelectTask(task.id)}
                  className="flex items-start gap-3 p-3.5 text-left hover:bg-secondary/50 transition-colors cursor-pointer group w-full"
                >
                  <div
                    className={cn(
                      "size-2 rounded-full shrink-0 mt-1.5",
                      isOverdue
                        ? "bg-destructive ring-4 ring-destructive/15"
                        : "bg-warning ring-4 ring-warning/15",
                    )}
                  />
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <p className="font-montserrat font-medium text-[13px] text-foreground truncate group-hover:text-purple transition-colors">
                        {task.title}
                      </p>
                      <span className="font-montserrat text-[10px] text-muted-foreground shrink-0">
                        {task.reference}
                      </span>
                    </div>

                    {(task.client || task.trip) && (
                      <p className="font-montserrat text-[12px] text-muted-foreground truncate">
                        {[task.client, task.trip].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-montserrat font-medium text-[11px] px-1.5 py-0.5 rounded-sm",
                          isOverdue
                            ? "text-destructive bg-destructive/10"
                            : "text-warning bg-warning/10",
                        )}
                      >
                        <Clock className="size-3 shrink-0" />
                        {task.attentionLabel ? `${task.attentionLabel} · ${task.dueLabel}` : task.dueLabel}
                      </span>
                      {task.priorityLabel && (
                        <span className="font-montserrat text-[10px] text-muted-foreground">
                          {task.priorityLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between p-3 border-t border-border bg-secondary/30">
          <button
            type="button"
            onClick={() => handleViewAll("MINE")}
            className="inline-flex items-center gap-1.5 font-montserrat font-medium text-[12px] text-purple hover:text-purple/80 cursor-pointer"
          >
            Open My Tasks
            <ArrowRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenBoard}
            className="font-montserrat text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Tasks Board
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
