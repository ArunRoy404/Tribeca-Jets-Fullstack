"use client";

import { useRouter } from "next/navigation";
import { Archive, Check, Pencil, RotateCcw } from "lucide-react";
import { useTasksStore } from "@/store/useTasksStore";
import { useRestoreTask, useTask, useUpdateTask } from "@/hooks/tasks";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { TASK_COLUMNS, toTask } from "@/lib/task";
import { PRIORITY_STYLES, CHIP_STYLES } from "./taskBadgeStyles";
import TaskChip from "./TaskChip";
import DetailSheet from "@/components/common/DetailSheet";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";
import { cn } from "@/lib/utils";

function getInitial(name = "") {
  return name.charAt(0).toUpperCase();
}

/**
 * One task. Writing controls appear only for a role that may manage tasks,
 * and Archive only for the task's author or an administrator — the same rule
 * the API enforces. An archived task offers Restore and nothing else.
 */
export default function TaskDetailSheet({ taskId, onClose }) {
  const router = useRouter();
  const openEditModal = useTasksStore((s) => s.openEditModal);
  const openArchiveModal = useTasksStore((s) => s.openArchiveModal);
  const { data } = useTask(taskId);
  const { data: me } = useCurrentUser();
  const { canWrite, scopeFor } = usePermissions();
  const update = useUpdateTask({ quiet: true });
  const restore = useRestoreTask();

  const task = data ? toTask(data) : null;
  const mayWrite = canWrite(Permission.MANAGE_TASKS) && !task?.isArchived;
  const mayArchive =
    canWrite(Permission.MANAGE_TASKS) &&
    (scopeFor(Permission.MANAGE_TASKS) === Scope.ALL || (task?.createdById && task.createdById === me?.id));
  const priorityStyle = PRIORITY_STYLES[task?.priorityLabel] ?? PRIORITY_STYLES.Medium;

  const setStatus = (status) => update.mutate({ id: task?.id, status });
  const toggleItem = (itemId) =>
    update.mutate({
      id: task?.id,
      checklist: task?.checklist?.map((item) => (item?.id === itemId ? { ...item, done: !item.done } : item)),
    });

  return (
    <DetailSheet
      open={Boolean(taskId) && Boolean(task)}
      onOpenChange={(open) => !open && onClose?.()}
      resetKey={taskId}
      maxWidthClassName="sm:data-[side=right]:max-w-150"
    >
      {task && (
        <>
          <div className="border-b border-secondary flex flex-col gap-4 pb-4 w-full">
            <div className="flex items-center gap-2">
              <p className="font-montserrat font-bold text-[20px] text-black-text">Task Details</p>
              <span className="font-montserrat text-[12px] text-muted-foreground">{task.reference}</span>
            </div>
            <p className="font-montserrat font-bold text-[14px] text-foreground">{task.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <TaskChip style={CHIP_STYLES.slate}>{task.statusLabel}</TaskChip>
              <TaskChip style={priorityStyle} dot={priorityStyle.dot}>
                {task.priorityLabel}
              </TaskChip>
              {task.isArchived && <TaskChip style={CHIP_STYLES.slate}>Archived</TaskChip>}
              {task.isRestored && <RestoredBadge at={task.restoredAtLabel} by={task.restoredByName} />}
            </div>
            {task.description && (
              <p className="font-montserrat text-[13px] text-slate whitespace-pre-line">{task.description}</p>
            )}
          </div>

          <SectionCard>
            <div className="flex gap-4 w-full">
              <div className="flex flex-1 min-w-0 flex-col gap-2 items-start border-b border-secondary pb-2">
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">Assigned to</p>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center rounded-full size-[30px] border font-montserrat font-medium text-[12px] shrink-0"
                    style={{ backgroundColor: CHIP_STYLES.blue.bg, borderColor: CHIP_STYLES.blue.border, color: CHIP_STYLES.blue.text }}
                  >
                    {task.assigneeId ? getInitial(task.assignee) : "—"}
                  </span>
                  <p className="font-montserrat font-normal text-[14px] text-foreground">{task.assignee}</p>
                </div>
              </div>
              <DetailField
                label="Due date"
                value={task.attentionLabel ? `${task.dueLabel} · ${task.attentionLabel}` : task.dueLabel}
                valueClassName={task.attention ? "text-destructive" : undefined}
              />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="Client" value={task.client ?? "—"} />
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">Trip</p>
                {task.trip ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/trips/${task.tripId}`)}
                    className="font-montserrat font-medium text-[14px] text-purple text-left hover:underline cursor-pointer"
                  >
                    {task.trip}
                  </button>
                ) : (
                  <p className="font-montserrat font-medium text-[14px] text-foreground">—</p>
                )}
              </div>
            </div>
            <DetailField label="Written by" value={task.createdBy} />
          </SectionCard>

          <div className="border-b border-secondary flex flex-col gap-2 pb-4 w-full">
            <div className="flex items-center justify-between w-full">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Checklist</p>
              <p className="font-montserrat font-bold text-[14px] text-purple">
                {task.checklistDone} / {task.checklistTotal}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {task.checklist.map((item) => (
                <label
                  key={item?.id}
                  className={cn(
                    "flex items-center gap-2.5 bg-secondary rounded-sm p-2 w-full",
                    mayWrite && "cursor-pointer",
                  )}
                >
                  {mayWrite && <Checkbox checked={Boolean(item?.done)} onCheckedChange={() => toggleItem(item?.id)} />}
                  <span
                    className={cn(
                      "font-montserrat font-medium text-[14px] text-slate",
                      item?.done && "line-through text-muted-foreground",
                    )}
                  >
                    {item?.text}
                  </span>
                </label>
              ))}
              {task.checklistTotal === 0 && (
                <p className="font-montserrat text-[12px] text-muted-foreground py-1">No checklist items.</p>
              )}
            </div>
          </div>

          {task.notes && (
            <div className="border-b border-secondary flex flex-col gap-2 pb-4 w-full">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Note</p>
              <div className="bg-secondary rounded-sm p-2 w-full">
                <p className="font-montserrat font-medium text-[14px] text-slate whitespace-pre-line">{task.notes}</p>
              </div>
            </div>
          )}

          {mayWrite && (
            <div className="flex flex-col gap-2 w-full">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Change status</p>
              <div className="flex flex-wrap gap-1 bg-secondary rounded-sm p-1 w-fit max-w-full">
                {TASK_COLUMNS.map((column) => {
                  const active = task.status === column.key;
                  return (
                    <button
                      key={column.key}
                      type="button"
                      onClick={() => !active && setStatus(column.key)}
                      className={cn(
                        "rounded-sm px-2 py-1 font-montserrat font-medium text-[10px] whitespace-nowrap cursor-pointer transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {column.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-secondary flex flex-wrap items-center justify-between gap-2 pt-4 w-full mt-auto">
            {task.isArchived ? (
              mayArchive && (
                <Button className="gap-2 px-4" onClick={() => restore.mutate(task.id)} disabled={restore.isPending}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              )
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {mayWrite && task.status !== "COMPLETED" && (
                    <Button
                      className="gap-2 px-4 bg-success hover:bg-success/90 text-white"
                      onClick={() => setStatus("COMPLETED")}
                    >
                      <Check className="size-4" />
                      Completed
                    </Button>
                  )}
                  {mayWrite && (
                    <Button variant="outline" className="gap-2 px-4" onClick={() => openEditModal(task.id)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  )}
                </div>
                {mayArchive && (
                  <Button
                    variant="outline"
                    className="gap-2 px-4 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => openArchiveModal(task.id)}
                  >
                    <Archive className="size-4" />
                    Archive
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </DetailSheet>
  );
}
