"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useTasksStore } from "@/store/useTasksStore";
import { taskColumns } from "@/dummyData/tasks";
import { PRIORITY_STYLES, CHIP_STYLES } from "./taskBadgeStyles";
import TaskChip from "./TaskChip";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";
import { cn } from "@/lib/utils";

function getInitial(name = "") {
  return name.charAt(0).toUpperCase();
}

export default function TaskDetailSheet() {
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId);
  const closeTaskDetail = useTasksStore((s) => s.closeTaskDetail);
  const setTaskStatus = useTasksStore((s) => s.setTaskStatus);
  const toggleChecklistItem = useTasksStore((s) => s.toggleChecklistItem);
  const openEditModal = useTasksStore((s) => s.openEditModal);
  const openDeleteModal = useTasksStore((s) => s.openDeleteModal);
  const task = useTasksStore((s) => (selectedTaskId ? s.tasks.find((t) => t.id === selectedTaskId) : null));
  const priorityStyle = task ? PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium : null;
  const doneCount = task ? task.checklist.filter((item) => item.done).length : 0;

  return (
    <DetailSheet
      open={!!task}
      onOpenChange={(open) => !open && closeTaskDetail()}
      resetKey={selectedTaskId}
      maxWidthClassName="sm:data-[side=right]:max-w-150"
    >
      {task && (
        <>
          <div className="border-b border-secondary flex flex-col gap-4 pb-4 w-full">
            <p className="font-montserrat font-bold text-[20px] text-black-text">Task Details</p>
            <p className="font-montserrat font-bold text-[14px] text-foreground">{task.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <TaskChip style={CHIP_STYLES.slate}>{task.status}</TaskChip>
              <TaskChip style={priorityStyle} dot={priorityStyle.dot}>
                {task.priority}
              </TaskChip>
              {task.auto && <TaskChip style={CHIP_STYLES.indigo}>Auto</TaskChip>}
            </div>
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
                    {getInitial(task.assignee)}
                  </span>
                  <p className="font-montserrat font-normal text-[14px] text-foreground">{task.assignee}</p>
                </div>
              </div>
              <DetailField label="Due date" value={task.dueDate} valueClassName="text-destructive" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="Client" value={task.client} />
              <DetailField label="Trip" value={task.trip || "—"} valueClassName="text-purple" />
            </div>
          </SectionCard>

          <div className="border-b border-secondary flex flex-col gap-2 pb-4 w-full">
            <div className="flex items-center justify-between w-full">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Checklist</p>
              <p className="font-montserrat font-bold text-[14px] text-purple">
                {doneCount} / {task.checklist.length}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 bg-secondary rounded-sm p-2 w-full cursor-pointer"
                >
                  <Checkbox checked={item.done} onCheckedChange={() => toggleChecklistItem(task.id, item.id)} />
                  <span
                    className={cn(
                      "font-montserrat font-medium text-[14px] text-slate",
                      item.done && "line-through text-muted-foreground"
                    )}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
              {task.checklist.length === 0 && (
                <p className="font-montserrat text-[12px] text-muted-foreground py-1">No checklist items.</p>
              )}
            </div>
          </div>

          {task.notes && (
            <div className="border-b border-secondary flex flex-col gap-2 pb-4 w-full">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Note</p>
              <div className="bg-secondary rounded-sm p-2 w-full">
                <p className="font-montserrat font-medium text-[14px] text-slate">{task.notes}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            <p className="font-montserrat font-normal text-[14px] text-muted-foreground">Change status</p>
            <div className="flex flex-wrap gap-1 bg-secondary rounded-sm p-1 w-fit max-w-full">
              {taskColumns.map((column) => {
                const active = task.status === column.key;
                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => setTaskStatus(task.id, column.key)}
                    className={cn(
                      "rounded-sm px-2 py-1 font-montserrat font-medium text-[10px] whitespace-nowrap cursor-pointer transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {column.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-secondary flex flex-wrap items-center justify-between gap-2 pt-4 w-full mt-auto">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2 px-4 bg-success hover:bg-success/90 text-white"
                onClick={() => setTaskStatus(task.id, "Completed")}
              >
                <Check className="size-4" />
                Completed
              </Button>
              <Button variant="outline" className="gap-2 px-4" onClick={() => openEditModal(task)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            </div>
            <Button
              variant="outline"
              className="gap-2 px-4 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => openDeleteModal(task.id)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
