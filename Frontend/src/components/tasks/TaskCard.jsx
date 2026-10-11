"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { PRIORITY_STYLES, CHIP_STYLES } from "./taskBadgeStyles";
import TaskChip from "./TaskChip";

function getInitial(name = "") {
  return name.charAt(0).toUpperCase();
}

/**
 * One task on the board. The due date is red only when the API says the task
 * is overdue or due today; the card can be dragged across status columns when
 * the user has EDIT access and the task is not archived.
 */
export default function TaskCard({ task, onClick, mayEdit = false, isOverlay = false }) {
  const priorityStyle = PRIORITY_STYLES[task?.priorityLabel] ?? PRIORITY_STYLES.Medium;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task?.id,
    data: { task },
    disabled: !mayEdit || task?.isArchived || isOverlay,
  });

  return (
    <div
      ref={setNodeRef}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={isOverlay ? undefined : onClick}
      role="button"
      tabIndex={isOverlay ? -1 : 0}
      onKeyDown={(e) => {
        if (!isOverlay && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "flex items-start gap-2.5 w-full bg-white border border-border rounded-lg p-3 text-left transition-all select-none",
        !isOverlay && "hover:border-purple/40 hover:shadow-sm cursor-pointer",
        mayEdit && !task?.isArchived && !isOverlay && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30 border-dashed border-purple/50 bg-purple/5 scale-[0.98]",
        isOverlay && "w-[268px] max-w-full shadow-2xl ring-2 ring-purple/50 border-purple/70 rotate-2 scale-[1.03] z-50 cursor-grabbing bg-white/95 backdrop-blur-md pointer-events-none",
      )}
    >
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2 w-full">
          <p className="flex-1 font-montserrat font-medium text-[14px] text-foreground leading-tight line-clamp-2">
            {task?.title}
          </p>
          <span className="font-montserrat text-[10px] text-muted-foreground shrink-0">{task?.reference}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskChip style={priorityStyle} dot={priorityStyle.dot}>
            {task?.priorityLabel}
          </TaskChip>
          <p
            className={cn(
              "font-montserrat font-normal text-[12px] whitespace-nowrap",
              task?.attention ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            {task?.attentionLabel ? `${task.attentionLabel} · ${task.dueLabel}` : task?.dueLabel}
          </p>
        </div>

        {(task?.client || task?.trip) && (
          <div className="flex flex-wrap items-center gap-2">
            {task?.client && <TaskChip style={CHIP_STYLES.slate}>{task.client}</TaskChip>}
            {task?.trip && <TaskChip style={CHIP_STYLES.blue}>{task.trip}</TaskChip>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-secondary/60">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex items-center justify-center rounded-full size-[26px] border font-montserrat font-medium text-[11px] shrink-0"
              style={{ backgroundColor: CHIP_STYLES.blue.bg, borderColor: CHIP_STYLES.blue.border, color: CHIP_STYLES.blue.text }}
            >
              {task?.assigneeId ? getInitial(task?.assignee) : "—"}
            </span>
            <p className="font-montserrat font-normal text-[13px] text-muted-foreground truncate">{task?.assignee}</p>
          </div>
          {task?.checklistTotal > 0 && (
            <span className="font-montserrat font-semibold text-[11px] text-purple shrink-0 bg-purple/10 px-1.5 py-0.5 rounded">
              {task.checklistDone}/{task.checklistTotal}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
